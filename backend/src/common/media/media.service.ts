import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";
import { existsSync, readFileSync } from "fs";
import { basename, extname } from "path";
import { PrismaService } from "../../database/prisma.service";

export type MediaUploadResult = {
  url: string;
  storageKey: string;
  filename: string;
  mimetype: string;
  size: number;
};

type UploadedMediaFile = {
  buffer?: Buffer;
  mimetype?: string;
  originalname?: string;
  size: number;
};

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private readonly maxImportBytes = 8 * 1024 * 1024;
  private s3Client: S3Client | null = null;

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (!this.isConfigured()) {
      return;
    }

    await this.migrateLegacyMedia();
  }

  isConfigured() {
    return Boolean(this.config.get<string>("S3_BUCKET")?.trim() && this.config.get<string>("S3_ACCESS_KEY")?.trim() && this.config.get<string>("S3_SECRET_KEY")?.trim());
  }

  async uploadImage(scope: string, file: UploadedMediaFile): Promise<MediaUploadResult> {
    if (!this.isConfigured()) {
      throw new BadRequestException("S3 media storage is not configured.");
    }

    if (!file?.buffer?.length) {
      throw new BadRequestException("Image file is required.");
    }

    const storageKey = `${scope}/${Date.now()}-${randomBytes(8).toString("hex")}${this.fileExtension(file)}`;
    await this.getClient().send(new PutObjectCommand({
      Bucket: this.getBucket(),
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype || "application/octet-stream"
    }));

    return {
      url: this.mediaUrl(storageKey),
      storageKey,
      filename: storageKey.split("/").pop() ?? storageKey,
      mimetype: file.mimetype,
      size: file.size
    };
  }

  async fetchMedia(storageKey: string) {
    if (!this.isConfigured()) {
      throw new BadRequestException("S3 media storage is not configured.");
    }

    try {
      return await this.getClient().send(new GetObjectCommand({ Bucket: this.getBucket(), Key: storageKey }));
    } catch (error: any) {
      const status = error?.$metadata?.httpStatusCode;
      const code = error?.Code || error?.name || "UnknownError";
      this.logger.error(`Failed to fetch media key \"${storageKey}\" from bucket \"${this.getBucket()}\": ${code} (status ${status ?? "n/a"}).`);

      if (code === "NoSuchKey" || status === 404) {
        throw new NotFoundException("Media file not found.");
      }

      if (code === "AccessDenied" || status === 403) {
        throw new BadRequestException("S3 access denied while reading media. Check IAM policy for GetObject permissions.");
      }

      throw new NotFoundException("Media file not found.");
    }
  }

  mediaUrl(storageKey: string) {
    const normalizedKey = storageKey.replace(/^\/+/, "");
    const mediaBaseUrl = this.getMediaBaseUrl();

    if (mediaBaseUrl) {
      return `${mediaBaseUrl}/${normalizedKey}`;
    }

    const normalizedPrefix = this.config.get<string>("API_PREFIX", "api/v1").replace(/^\/+|\/+$/g, "");
    return `/${normalizedPrefix}/media/${normalizedKey}`;
  }

  extractStorageKeyFromUrl(url?: string | null) {
    const normalized = url?.trim();
    if (!normalized) return null;

    const normalizedPrefix = this.config.get<string>("API_PREFIX", "api/v1").replace(/^\/+|\/+$/g, "");
    const prefixedMediaPath = `/${normalizedPrefix}/media/`;

    if (normalized.startsWith(prefixedMediaPath)) {
      return normalized.slice(prefixedMediaPath.length);
    }

    if (normalized.startsWith("/media/")) {
      return normalized.replace(/^\/media\//, "");
    }

    try {
      const parsed = new URL(normalized);
      if (parsed.pathname.startsWith(prefixedMediaPath)) {
        return parsed.pathname.slice(prefixedMediaPath.length);
      }

      if (parsed.pathname.startsWith("/media/")) {
        return parsed.pathname.replace(/^\/media\//, "");
      }

      const mediaBaseUrl = this.getMediaBaseUrl();
      if (mediaBaseUrl && this.matchesBaseUrl(parsed, mediaBaseUrl)) {
        return parsed.pathname.replace(/^\/+/, "");
      }
    } catch {
      // Ignore malformed URLs.
    }

    return null;
  }

  async ensureStoredMediaUrl(
    scope: string,
    url: string,
    options?: { allowAsset?: boolean; allowGoogleImport?: boolean }
  ) {
    const normalized = url?.trim();
    if (!normalized) {
      throw new BadRequestException("Image URL is required.");
    }

    if (options?.allowAsset && normalized.startsWith("asset:")) {
      return normalized;
    }

    const existingStorageKey = this.extractStorageKeyFromUrl(normalized);
    if (existingStorageKey) {
      return this.mediaUrl(existingStorageKey);
    }

    if (/^https?:\/\//i.test(normalized)) {
      if (!options?.allowGoogleImport || !this.isGoogleHostedImageUrl(normalized)) {
        throw new BadRequestException("Only uploaded media URLs are allowed.");
      }

      const imported = await this.importImageFromUrl(scope, normalized);
      return imported.url;
    }

    throw new BadRequestException("Only uploaded media URLs are allowed.");
  }

  extractLegacyUploadPath(url?: string | null) {
    const normalized = url?.trim();
    if (!normalized) return null;

    if (normalized.startsWith("/uploads/")) {
      return normalized;
    }

    try {
      const parsed = new URL(normalized);
      if ((parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && parsed.pathname.startsWith("/uploads/")) {
        return parsed.pathname;
      }
    } catch {
      // Ignore malformed URLs.
    }

    return null;
  }

  private getClient() {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: this.config.get<string>("S3_REGION")?.trim() || "us-east-1",
        endpoint: this.config.get<string>("S3_ENDPOINT")?.trim() || undefined,
        forcePathStyle: String(this.config.get<string>("S3_FORCE_PATH_STYLE") ?? (this.config.get<string>("S3_ENDPOINT") ? "true" : "false")).toLowerCase() === "true",
        credentials: {
          accessKeyId: this.config.get<string>("S3_ACCESS_KEY")?.trim() || "",
          secretAccessKey: this.config.get<string>("S3_SECRET_KEY")?.trim() || ""
        }
      });
    }

    return this.s3Client;
  }

  private getBucket() {
    const bucket = this.config.get<string>("S3_BUCKET")?.trim();
    if (!bucket) {
      throw new BadRequestException("S3 bucket is not configured.");
    }

    return bucket;
  }

  private getMediaBaseUrl() {
    const baseUrl = this.config.get<string>("MEDIA_BASE_URL")?.trim();
    if (!baseUrl) {
      return null;
    }

    return baseUrl.replace(/\/+$/, "");
  }

  private matchesBaseUrl(candidate: URL, baseUrl: string) {
    try {
      const parsedBase = new URL(baseUrl);
      return candidate.origin === parsedBase.origin && candidate.pathname.startsWith(parsedBase.pathname.replace(/\/+$/, ""));
    } catch {
      return false;
    }
  }

  private fileExtension(file: UploadedMediaFile) {
    const ext = extname(file.originalname || "").replace(/[^a-zA-Z0-9.]/g, "");
    if (ext) return ext;

    if (file.mimetype?.includes("png")) return ".png";
    if (file.mimetype?.includes("webp")) return ".webp";
    if (file.mimetype?.includes("gif")) return ".gif";
    return ".jpg";
  }

  private async migrateLegacyMedia() {
    const legacyContentItems = await this.prisma.appContentItem.findMany({
      where: { imageUrl: { startsWith: "/uploads/" } },
      select: { id: true, imageUrl: true }
    });
    const legacyProductImages = await this.prisma.productImage.findMany({
      where: { url: { startsWith: "/uploads/" } },
      select: { id: true, productId: true, url: true }
    });
    const legacyAvatars = await this.prisma.user.findMany({
      where: { avatarUrl: { startsWith: "/uploads/" } },
      select: { id: true, avatarUrl: true }
    });
    const legacyBrands = await this.prisma.brand.findMany({
      where: { logoUrl: { startsWith: "/uploads/" } },
      select: { id: true, logoUrl: true }
    });
    const legacyBrandProducts = await this.prisma.brandProduct.findMany({
      where: { imageUrl: { startsWith: "/uploads/" } },
      select: { id: true, imageUrl: true }
    });
    const legacyHorseEvents = await this.prisma.horseAuctionEvent.findMany({
      where: { imageUrl: { startsWith: "/uploads/" } },
      select: { id: true, imageUrl: true }
    });
    const legacyHorseImages = await this.prisma.horseAuctionHorse.findMany({
      where: { imageUrl: { startsWith: "/uploads/" } },
      select: { id: true, imageUrl: true }
    });

    const migratedCount = [
      ...legacyContentItems.map((item) => this.migrateRecordImage({ scope: "content", recordLabel: "AppContentItem", recordId: item.id, legacyUrl: item.imageUrl, update: (url, storageKey) => this.prisma.appContentItem.update({ where: { id: item.id }, data: { imageUrl: url, storageKey } }) })),
      ...legacyProductImages.map((item) => this.migrateRecordImage({ scope: "products", recordLabel: "ProductImage", recordId: item.id, legacyUrl: item.url, update: (url, storageKey) => this.prisma.productImage.update({ where: { id: item.id }, data: { url, storageKey } }) })),
      ...legacyAvatars.map((item) => this.migrateRecordImage({ scope: "avatars", recordLabel: "User", recordId: item.id, legacyUrl: item.avatarUrl, update: (url) => this.prisma.user.update({ where: { id: item.id }, data: { avatarUrl: url } }) })),
      ...legacyBrands.map((item) => this.migrateRecordImage({ scope: "brands", recordLabel: "Brand", recordId: item.id, legacyUrl: item.logoUrl, update: (url) => this.prisma.brand.update({ where: { id: item.id }, data: { logoUrl: url } }) })),
      ...legacyBrandProducts.map((item) => this.migrateRecordImage({ scope: "brand-products", recordLabel: "BrandProduct", recordId: item.id, legacyUrl: item.imageUrl, update: (url) => this.prisma.brandProduct.update({ where: { id: item.id }, data: { imageUrl: url } }) })),
      ...legacyHorseEvents.map((item) => this.migrateRecordImage({ scope: "horse-events", recordLabel: "HorseAuctionEvent", recordId: item.id, legacyUrl: item.imageUrl, update: (url) => this.prisma.horseAuctionEvent.update({ where: { id: item.id }, data: { imageUrl: url } }) })),
      ...legacyHorseImages.map((item) => this.migrateRecordImage({ scope: "horse-images", recordLabel: "HorseAuctionHorse", recordId: item.id, legacyUrl: item.imageUrl, update: (url) => this.prisma.horseAuctionHorse.update({ where: { id: item.id }, data: { imageUrl: url } }) }))
    ];

    const results = await Promise.all(migratedCount);
    const migrated = results.reduce((sum, value) => sum + value, 0);

    if (migrated > 0) {
      this.logger.log(`Migrated ${migrated} legacy upload(s) to remote media storage.`);
    }
  }

  private async migrateRecordImage(params: {
    scope: string;
    recordLabel: string;
    recordId: string;
    legacyUrl: string | null;
    update: (url: string, storageKey?: string) => Promise<any>;
  }) {
    const legacyPath = this.extractLegacyUploadPath(params.legacyUrl);
    if (!legacyPath) return 0;

    const filePath = `${process.cwd()}${legacyPath.replace(/^\//, "\\")}`;
    if (!existsSync(filePath)) {
      this.logger.warn(`Skipping ${params.recordLabel} ${params.recordId}: local file not found at ${legacyPath}.`);
      return 0;
    }

    const storageKey = `${params.scope}/${params.recordId}-${randomBytes(6).toString("hex")}${extname(filePath) || ".jpg"}`;
    await this.getClient().send(new PutObjectCommand({
      Bucket: this.getBucket(),
      Key: storageKey,
      Body: readFileSync(filePath),
      ContentType: this.mimeFromPath(filePath)
    }));

    await params.update(this.mediaUrl(storageKey), storageKey);
    return 1;
  }

  private mimeFromPath(filePath: string) {
    const lower = filePath.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".gif")) return "image/gif";
    return "image/jpeg";
  }

  private isGoogleHostedImageUrl(url: string) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();

      return (
        host === "googleusercontent.com" ||
        host.endsWith(".googleusercontent.com") ||
        host === "gstatic.com" ||
        host.endsWith(".gstatic.com") ||
        host === "googleapis.com" ||
        host.endsWith(".googleapis.com")
      );
    } catch {
      return false;
    }
  }

  private async importImageFromUrl(scope: string, url: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new BadRequestException(`Could not download external image (status ${response.status}).`);
    }

    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!contentType.startsWith("image/")) {
      throw new BadRequestException("External URL does not point to an image.");
    }

    const contentLength = Number(response.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > this.maxImportBytes) {
      throw new BadRequestException("External image is too large.");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) {
      throw new BadRequestException("External image is empty.");
    }

    if (buffer.length > this.maxImportBytes) {
      throw new BadRequestException("External image is too large.");
    }

    const filename = this.safeFilenameFromUrl(url, contentType);
    return this.uploadImage(scope, {
      buffer,
      mimetype: contentType,
      originalname: filename,
      size: buffer.length
    });
  }

  private safeFilenameFromUrl(url: string, contentType: string) {
    try {
      const parsed = new URL(url);
      const candidate = basename(parsed.pathname || "");
      if (candidate && /\.[a-zA-Z0-9]+$/.test(candidate)) {
        return candidate;
      }
    } catch {
      // Ignore malformed URLs.
    }

    if (contentType.includes("png")) return "imported-image.png";
    if (contentType.includes("webp")) return "imported-image.webp";
    if (contentType.includes("gif")) return "imported-image.gif";
    return "imported-image.jpg";
  }
}