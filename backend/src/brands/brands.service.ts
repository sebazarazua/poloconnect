import { Injectable, NotFoundException } from "@nestjs/common";
import { MediaService } from "../common/media/media.service";
import { PrismaService } from "../database/prisma.service";
import { UpsertBrandDto, UpsertBrandProductDto } from "./dto/brands.dto";

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService, private readonly media: MediaService) {}

  async listBrands() {
    const brands = await this.prisma.brand.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        description: true,
        whatsapp: true,
        phone: true,
        email: true,
        website: true,
        sortOrder: true,
        _count: { select: { products: { where: { isActive: true, deletedAt: null } } } }
      }
    });
    return brands.map((b) => ({ ...b, productCount: b._count.products }));
  }

  async getBrand(id: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, isActive: true, deletedAt: null }
    });
    if (!brand) throw new NotFoundException("Brand not found.");
    return brand;
  }

  async listBrandProducts(brandId: string) {
    await this.ensureBrand(brandId);
    return this.prisma.brandProduct.findMany({
      where: { brandId, isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 20
    });
  }

  // Admin methods
  async adminListBrands() {
    return this.prisma.brand.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: { where: { deletedAt: null } } } } }
    });
  }

  async adminCreateBrand(dto: UpsertBrandDto) {
    const logoUrl = dto.logoUrl
      ? await this.media.ensureStoredMediaUrl("brands", dto.logoUrl, { allowGoogleImport: true })
      : null;

    return this.prisma.brand.create({
      data: {
        name: dto.name.trim(),
        slug: dto.slug.trim().toLowerCase(),
        logoUrl,
        description: dto.description,
        whatsapp: dto.whatsapp,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0
      }
    });
  }

  async adminUpdateBrand(id: string, dto: UpsertBrandDto) {
    await this.ensureBrand(id);
    const logoUrl = dto.logoUrl
      ? await this.media.ensureStoredMediaUrl("brands", dto.logoUrl, { allowGoogleImport: true })
      : null;

    return this.prisma.brand.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        slug: dto.slug.trim().toLowerCase(),
        logoUrl,
        description: dto.description,
        whatsapp: dto.whatsapp,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0
      }
    });
  }

  async adminDeleteBrand(id: string) {
    await this.ensureBrand(id);
    await this.prisma.brand.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  async adminListBrandProducts(brandId: string) {
    await this.ensureBrand(brandId);
    return this.prisma.brandProduct.findMany({
      where: { brandId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
    });
  }

  async adminCreateBrandProduct(brandId: string, dto: UpsertBrandProductDto) {
    await this.ensureBrand(brandId);
    const imageUrl = dto.imageUrl
      ? await this.media.ensureStoredMediaUrl("brand-products", dto.imageUrl, { allowGoogleImport: true })
      : null;

    return this.prisma.brandProduct.create({
      data: {
        brandId,
        name: dto.name.trim(),
        description: dto.description.trim(),
        priceCents: dto.price != null ? Math.round(dto.price * 100) : null,
        currency: dto.currency ?? "USD",
        imageUrl,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0
      }
    });
  }

  async adminUpdateBrandProduct(brandId: string, productId: string, dto: UpsertBrandProductDto) {
    await this.ensureBrandProduct(brandId, productId);
    const imageUrl = dto.imageUrl
      ? await this.media.ensureStoredMediaUrl("brand-products", dto.imageUrl, { allowGoogleImport: true })
      : null;

    return this.prisma.brandProduct.update({
      where: { id: productId },
      data: {
        name: dto.name.trim(),
        description: dto.description.trim(),
        priceCents: dto.price != null ? Math.round(dto.price * 100) : null,
        currency: dto.currency ?? "USD",
        imageUrl,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0
      }
    });
  }

  async adminDeleteBrandProduct(brandId: string, productId: string) {
    await this.ensureBrandProduct(brandId, productId);
    await this.prisma.brandProduct.update({ where: { id: productId }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  private async ensureBrand(id: string) {
    const brand = await this.prisma.brand.findFirst({ where: { id, deletedAt: null } });
    if (!brand) throw new NotFoundException("Brand not found.");
    return brand;
  }

  private async ensureBrandProduct(brandId: string, productId: string) {
    const product = await this.prisma.brandProduct.findFirst({ where: { id: productId, brandId, deletedAt: null } });
    if (!product) throw new NotFoundException("Brand product not found.");
    return product;
  }
}
