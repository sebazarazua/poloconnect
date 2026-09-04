import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RequestUser } from "../common/decorators/current-user.decorator";
import { MediaService } from "../common/media/media.service";
import { page, PaginationDto } from "../common/dto/pagination.dto";
import { PrismaService } from "../database/prisma.service";
import { ContactSellerDto, ProductQueryDto, ProductUpsertDto, RejectProductDto } from "./dto/marketplace.dto";
import { MercadoPagoService } from "./mercadopago.service";

const PUBLICATION_CURRENCY = "ARS";
const MP_RETURN_DEEP_LINK = "polo-connect://market-publish-return";
const DEFAULT_PENDING_PAYMENT_TTL_MINUTES = 60;

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly media: MediaService,
    private readonly mercadoPago: MercadoPagoService
  ) {}

  private async normalizeImageInputs(body: ProductUpsertDto) {
    const fromList = (body.imageUrls ?? [])
      .map((entry) => entry?.trim())
      .filter((entry): entry is string => Boolean(entry));
    const single = body.imageUrl?.trim();

    const inputs = fromList.length > 0 ? fromList : single ? [single] : [];
    const normalized: string[] = [];

    for (const input of inputs) {
      normalized.push(await this.media.ensureStoredMediaUrl("products", input, { allowGoogleImport: true }));
    }

    return normalized;
  }

  private storageKeyFromUrl(url: string) {
    return this.media.extractStorageKeyFromUrl(url);
  }

  private getPendingPaymentTtlMinutes() {
    const configured = Number(this.config.get<string>("MARKETPLACE_PENDING_PAYMENT_TTL_MINUTES", ""));
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_PENDING_PAYMENT_TTL_MINUTES;
  }

  private getPendingPaymentExpiresAt(reference = new Date()) {
    return new Date(reference.getTime() + this.getPendingPaymentTtlMinutes() * 60 * 1000);
  }

  private async discardStalePendingPaymentProducts() {
    const cutoff = new Date(Date.now() - this.getPendingPaymentTtlMinutes() * 60 * 1000);
    const staleProducts = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        status: "pending_payment",
        createdAt: { lt: cutoff }
      },
      select: { id: true }
    });

    if (staleProducts.length === 0) return;

    const productIds = staleProducts.map((product) => product.id);
    await this.prisma.$transaction([
      this.prisma.marketplacePayment.updateMany({
        where: { productId: { in: productIds }, status: "pending" },
        data: { status: "cancelled" }
      }),
      this.prisma.product.updateMany({
        where: { id: { in: productIds }, status: "pending_payment", deletedAt: null },
        data: { deletedAt: new Date(), moderationNotes: "Pago no completado dentro del plazo.", version: { increment: 1 } }
      })
    ]);
  }

  async listProducts(userId: string, query: ProductQueryDto) {
    await this.discardStalePendingPaymentProducts();
    const limit = Number(query.limit ?? 20);
    const where: any = { deletedAt: null };
    if (query.sellerId) {
      where.sellerId = query.sellerId;
      where.status = query.status ?? { not: "pending_payment" };
    } else {
      where.status = query.status ?? "active";
    }
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
    if (product.status === "pending_payment" || (product.status !== "active" && product.sellerId !== userId)) {
      throw new NotFoundException("Product not found.");
    }
    return this.toProductDto(product, true);
  }

  async createProduct(user: RequestUser, body: ProductUpsertDto) {
    await this.discardStalePendingPaymentProducts();
    const isAdmin = user.roles.includes("admin");

    if (!isAdmin && !this.mercadoPago.isConfigured()) {
      throw new BadRequestException("No se pudo iniciar el pago de la publicación. Intentá nuevamente más tarde.");
    }

    const imageUrls = await this.normalizeImageInputs(body);

    const product = await this.prisma.product.create({
      data: {
        sellerId: user.id,
        title: body.name.trim(),
        description: body.description,
        category: body.category,
        condition: body.category === "inmueble" ? "Usado" : body.status ?? "Usado",
        priceCents: Math.round(body.price * 100),
        currency: body.currency ?? "USD",
        status: isAdmin ? "active" : "pending_payment",
        location: body.location,
        images: imageUrls.length > 0
          ? {
              create: imageUrls.map((url, index) => ({
                url,
                storageKey: this.storageKeyFromUrl(url) ?? undefined,
                position: index + 1
              }))
            }
          : undefined
      },
      include: { images: true, favorites: true, seller: true }
    });

    if (isAdmin) {
      return {
        product: this.toProductDto(product, true),
        payment: { required: false, provider: null, url: null, status: null }
      };
    }

    // The listing already exists at this point; if preference creation fails we soft-delete it
    // instead of leaving an orphan "pending_payment" row the seller can never pay for or retry cleanly.
    try {
      const amountCents = this.mercadoPago.getPublicationPriceCents();
      const expiresAt = this.getPendingPaymentExpiresAt();
      const paymentRecord = await this.prisma.marketplacePayment.create({
        data: {
          productId: product.id,
          sellerId: user.id,
          amountCents,
          currency: PUBLICATION_CURRENCY,
          status: "pending"
        }
      });

      const preference = await this.mercadoPago.createPreference({
        externalReference: paymentRecord.id,
        title: `Publicación Polo Connect: ${product.title}`.slice(0, 250),
        amountCents,
        currency: PUBLICATION_CURRENCY,
        returnUrl: MP_RETURN_DEEP_LINK,
        expiresAt
      });

      await this.prisma.marketplacePayment.update({
        where: { id: paymentRecord.id },
        data: { mpPreferenceId: preference.id }
      });

      return {
        product: this.toProductDto(product, true),
        payment: { required: true, provider: "mercado_pago" as const, url: preference.initPoint, status: "pending" as const }
      };
    } catch (error) {
      this.logger.error(`Failed to create Mercado Pago preference for product ${product.id}: ${error instanceof Error ? error.message : error}`);
      await this.prisma.product.update({ where: { id: product.id }, data: { deletedAt: new Date() } });
      throw new BadRequestException("No se pudo iniciar el pago de la publicación. Intentá nuevamente más tarde.");
    }
  }

  async updateProduct(user: RequestUser, id: string, body: ProductUpsertDto) {
    const current = await this.prisma.product.findUnique({ where: { id } });
    if (!current || current.deletedAt) throw new NotFoundException("Product not found.");
    if (current.sellerId !== user.id && !user.roles.includes("admin")) throw new ForbiddenException("Product ownership required.");
    const imageUrls = await this.normalizeImageInputs(body);

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        title: body.name.trim(),
        description: body.description,
        category: body.category,
        condition: body.category === "inmueble" ? "Usado" : body.status ?? "Usado",
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
            storageKey: this.storageKeyFromUrl(url) ?? undefined,
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

  /**
   * Mercado Pago webhook receiver. Never trusts the body/query alone: it always looks the
   * payment up server-to-server before touching any state, and is idempotent against retries.
   */
  async handleMercadoPagoWebhook(input: { query: Record<string, any>; body: any; headers: Record<string, any> }) {
    const { query, body, headers } = input;
    const type = String(query?.type ?? query?.topic ?? body?.type ?? body?.topic ?? "");
    const dataId = String(query?.["data.id"] ?? body?.data?.id ?? body?.id ?? "").trim();

    if (type !== "payment" || !dataId) {
      // Other notification topics (merchant_order, etc.) or malformed pings: ack and ignore.
      return { ok: true };
    }

    const xSignature = headers?.["x-signature"] as string | undefined;
    const xRequestId = headers?.["x-request-id"] as string | undefined;
    const signatureValid = this.mercadoPago.verifyWebhookSignature({ xSignature, xRequestId, dataId });

    if (this.config.get<string>("MP_WEBHOOK_SECRET", "").trim() && !signatureValid) {
      this.logger.warn(`Rejected Mercado Pago webhook with invalid signature for payment ${dataId}.`);
      return { ok: false };
    }

    // Source of truth is always Mercado Pago's own API, never the webhook payload itself.
    const payment = await this.mercadoPago.getPayment(dataId);

    if (!payment.externalReference) {
      this.logger.warn(`Mercado Pago payment ${payment.id} has no external_reference; ignoring.`);
      return { ok: true };
    }

    const record = await this.prisma.marketplacePayment.findUnique({ where: { id: payment.externalReference } });
    if (!record) {
      this.logger.warn(`Mercado Pago payment ${payment.id} references unknown MarketplacePayment ${payment.externalReference}; ignoring.`);
      return { ok: true };
    }

    // Idempotency: this exact payment id was already fully processed by a previous webhook call.
    if (record.mpPaymentId === payment.id && record.status !== "pending") {
      return { ok: true };
    }

    const amountMatches = payment.transactionAmount === null || Math.round(payment.transactionAmount * 100) === record.amountCents;
    const currencyMatches = !payment.currencyId || payment.currencyId.toUpperCase() === record.currency.toUpperCase();

    let nextStatus: "pending" | "approved" | "rejected" | "cancelled" = "pending";
    if (payment.status === "approved") {
      nextStatus = amountMatches && currencyMatches ? "approved" : "rejected";
      if (nextStatus === "rejected") {
        this.logger.error(`Mercado Pago payment ${payment.id} approved but amount/currency mismatch for ${record.id}; treating as rejected.`);
      }
    } else if (payment.status === "rejected") {
      nextStatus = "rejected";
    } else if (payment.status === "cancelled") {
      nextStatus = "cancelled";
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.marketplacePayment.update({
        where: { id: record.id },
        data: {
          mpPaymentId: payment.id,
          status: nextStatus,
          rawWebhookPayload: body ?? undefined
        }
      });

      if (nextStatus === "approved") {
        // Only advance a listing that is still waiting on this exact payment; never clobber a
        // listing an admin already approved/rejected, or one already moved by a duplicate webhook.
        await tx.product.updateMany({
          where: { id: record.productId, status: "pending_payment" },
          data: { status: "pending_review", deletedAt: null, moderationNotes: null }
        });
      } else if (nextStatus === "rejected" || nextStatus === "cancelled") {
        await tx.product.updateMany({
          where: { id: record.productId, status: "pending_payment", deletedAt: null },
          data: { deletedAt: new Date(), moderationNotes: "Pago no completado.", version: { increment: 1 } }
        });
      }
    });

    return { ok: true };
  }

  async listProductsForAdmin(status?: string) {
    await this.discardStalePendingPaymentProducts();
    const where: any = { deletedAt: null };
    if (status) where.status = status;

    const products = await this.prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { position: "asc" } },
        seller: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return products.map((product) => ({
      ...this.toProductDto(product, true),
      lastPayment: product.payments[0]
        ? { status: product.payments[0].status, amountCents: product.payments[0].amountCents, currency: product.payments[0].currency }
        : null
    }));
  }

  async approveProduct(admin: RequestUser, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundException("Product not found.");
    if (product.status !== "pending_review") {
      throw new BadRequestException("Solo se pueden aprobar publicaciones en revisión.");
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: "active", moderationNotes: null, version: { increment: 1 } },
      include: { images: true, favorites: true, seller: true }
    });

    return this.toProductDto(updated, true);
  }

  async rejectProduct(admin: RequestUser, id: string, dto: RejectProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundException("Product not found.");
    if (product.status !== "pending_review" && product.status !== "pending_payment") {
      throw new BadRequestException("Esta publicación no se puede rechazar en su estado actual.");
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: "rejected", moderationNotes: dto.reason?.trim() || null, version: { increment: 1 } },
      include: { images: true, favorites: true, seller: true }
    });

    return this.toProductDto(updated, true);
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
