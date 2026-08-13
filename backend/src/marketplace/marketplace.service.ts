import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RequestUser } from "../common/decorators/current-user.decorator";
import { page, PaginationDto } from "../common/dto/pagination.dto";
import { PrismaService } from "../database/prisma.service";
import { ContactSellerDto, ProductQueryDto, ProductUpsertDto } from "./dto/marketplace.dto";

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  private normalizeImageInputs(body: ProductUpsertDto) {
    const fromList = (body.imageUrls ?? [])
      .map((entry) => entry?.trim())
      .filter((entry): entry is string => Boolean(entry));
    const single = body.imageUrl?.trim();

    if (fromList.length > 0) {
      return fromList;
    }

    return single ? [single] : [];
  }

  async listProducts(userId: string, query: ProductQueryDto) {
    const limit = Number(query.limit ?? 20);
    const where: any = { deletedAt: null };
    if (query.sellerId) where.sellerId = query.sellerId;
    else where.status = query.status ?? "active";
    if (query.category) where.category = query.category;
    if (query.search) where.OR = [{ title: { contains: query.search, mode: "insensitive" } }, { description: { contains: query.search, mode: "insensitive" } }];
    if (query.cursor) where.id = { lt: query.cursor };
    const products = await this.prisma.product.findMany({
      where,
      include: { images: { orderBy: { position: "asc" } }, favorites: { where: { userId } }, seller: true },
      orderBy: { createdAt: "desc" },
      take: limit + 1
    });
    return page(products.map((product) => this.toProductDto(product)), limit);
  }

  async getProduct(userId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { images: { orderBy: { position: "asc" } }, favorites: { where: { userId } }, seller: true }
    });
    if (!product) throw new NotFoundException("Product not found.");
    return this.toProductDto(product, true);
  }

  async createProduct(user: RequestUser, body: ProductUpsertDto) {
    const isAdmin = user.roles.includes("admin");
    const paymentUrl = this.config.get<string>("MP_PUBLICATION_PAYMENT_URL", "").trim();

    if (!isAdmin && !paymentUrl) {
      throw new InternalServerErrorException("Marketplace payment link is not configured.");
    }

    const imageUrls = this.normalizeImageInputs(body);

    const product = await this.prisma.product.create({
      data: {
        sellerId: user.id,
        title: body.name.trim(),
        description: body.description.trim(),
        category: body.category,
        condition: body.status,
        priceCents: Math.round(body.price * 100),
        currency: body.currency ?? "USD",
        status: isAdmin ? "active" : "pending_review",
        location: body.location,
        images: imageUrls.length > 0
          ? {
              create: imageUrls.map((url, index) => ({
                url,
                position: index + 1
              }))
            }
          : undefined
      },
      include: { images: true, favorites: true, seller: true }
    });

    return {
      product: this.toProductDto(product, true),
      payment: {
        required: !isAdmin,
        provider: !isAdmin ? "mercado_pago" : null,
        url: !isAdmin ? paymentUrl : null
      }
    };
  }

  async updateProduct(user: RequestUser, id: string, body: ProductUpsertDto) {
    const current = await this.prisma.product.findUnique({ where: { id } });
    if (!current || current.deletedAt) throw new NotFoundException("Product not found.");
    if (current.sellerId !== user.id && !user.roles.includes("admin")) throw new ForbiddenException("Product ownership required.");
    const imageUrls = this.normalizeImageInputs(body);

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        title: body.name.trim(),
        description: body.description.trim(),
        category: body.category,
        condition: body.status,
        priceCents: Math.round(body.price * 100),
        currency: body.currency ?? current.currency,
        location: body.location,
        version: { increment: 1 }
      },
      include: { images: true, favorites: { where: { userId: user.id } }, seller: true }
    });

    if (imageUrls.length > 0) {
      await this.prisma.$transaction([
        this.prisma.productImage.deleteMany({ where: { productId: id } }),
        this.prisma.productImage.createMany({
          data: imageUrls.map((url, index) => ({
            productId: id,
            url,
            position: index + 1
          }))
        })
      ]);
    }

    return this.getProduct(user.id, id);
  }

  async deleteProduct(user: RequestUser, id: string) {
    const current = await this.prisma.product.findUnique({ where: { id } });
    if (!current || current.deletedAt) throw new NotFoundException("Product not found.");
    if (current.sellerId !== user.id && !user.roles.includes("admin")) throw new ForbiddenException("Product ownership required.");
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date(), version: { increment: 1 } } });
    return { ok: true };
  }

  async addFavorite(userId: string, productId: string) {
    await this.ensureProduct(productId);
    await this.prisma.productFavorite.upsert({ where: { userId_productId: { userId, productId } }, update: {}, create: { userId, productId } });
    return { ok: true };
  }

  async removeFavorite(userId: string, productId: string) {
    await this.prisma.productFavorite.deleteMany({ where: { userId, productId } });
    return { ok: true };
  }

  async listFavorites(userId: string, query: PaginationDto) {
    const limit = Number(query.limit ?? 20);
    const favorites = await this.prisma.productFavorite.findMany({
      where: { userId, product: { deletedAt: null, status: "active" } },
      include: { product: { include: { images: { orderBy: { position: "asc" } }, favorites: { where: { userId } }, seller: true } } },
      orderBy: { createdAt: "desc" },
      take: limit + 1
    });
    return page(favorites.map((favorite) => this.toProductDto(favorite.product)), limit);
  }

  async contactSeller(userId: string, productId: string, body: ContactSellerDto) {
    const product = await this.ensureProduct(productId);
    const contact = await this.prisma.sellerContact.create({ data: { productId, buyerId: userId, sellerId: product.sellerId, contactType: body.contactType ?? "in_app", message: body.message } });
    return { ok: true, contactId: contact.id, sellerId: product.sellerId };
  }

  private async ensureProduct(productId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new NotFoundException("Product not found.");
    return product;
  }

  private toProductDto(product: any, includeSeller = false) {
    const image = product.images?.[0]?.url ?? "";
    return {
      id: product.id,
      ownerId: product.sellerId,
      name: product.title,
      price: Math.round(product.priceCents / 100),
      priceCents: product.priceCents,
      currency: product.currency,
      category: product.category,
      image,
      images: product.images?.map((entry: any) => entry.url) ?? [],
      status: product.condition,
      publicationStatus: product.status,
      description: product.description,
      isFavorite: (product.favorites?.length ?? 0) > 0,
      createdAt: product.createdAt,
      seller: includeSeller ? { id: product.seller.id, name: `${product.seller.firstName} ${product.seller.lastName}`, phone: product.seller.phone, email: product.seller.email, rating: 0, reviews: 0, location: product.location } : undefined
    };
  }
}
