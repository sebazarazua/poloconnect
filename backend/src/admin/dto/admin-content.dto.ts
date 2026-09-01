import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from "class-validator";

export const CONTENT_IMAGE_URL_PATTERN = /^(asset:[a-zA-Z0-9_\-/]+|https?:\/\/.+|\/(?:api\/v1\/)?(?:uploads|media)\/.+)$/;
export const CONTENT_TARGET_URL_PATTERN = /^(https?:\/\/.+|app:shop\/[a-zA-Z0-9-]+)$/;

export enum AdminContentType {
  logo = "logo",
  ad = "ad",
  banner = "banner",
  news = "news",
  generic = "generic"
}

export class AdminContentQueryDto {
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsString() slot?: string;
  @IsOptional() @IsEnum(AdminContentType) type?: AdminContentType;
}

export class UpsertAdminContentDto {
  @IsEnum(AdminContentType) type!: AdminContentType;
  @IsString() @MaxLength(120) section!: string;
  @IsString() @MaxLength(120) slot!: string;
  @IsOptional() @IsString() @MaxLength(180) title?: string;
  @IsOptional() @IsString() @MaxLength(240) subtitle?: string;
  @IsOptional() @IsString() @MaxLength(2400) body?: string;
  @IsString()
  @Matches(CONTENT_IMAGE_URL_PATTERN)
  imageUrl!: string;
  @IsOptional() @IsString() storageKey?: string;
  @IsOptional() @IsString() @Matches(CONTENT_TARGET_URL_PATTERN) targetUrl?: string;
  @Type(() => Number) @IsOptional() @IsInt() priority?: number;
  @Type(() => Number) @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @Type(() => Boolean) @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
}

export class PatchAdminContentDto {
  @IsOptional() @IsEnum(AdminContentType) type?: AdminContentType;
  @IsOptional() @IsString() @MaxLength(120) section?: string;
  @IsOptional() @IsString() @MaxLength(120) slot?: string;
  @IsOptional() @IsString() @MaxLength(180) title?: string;
  @IsOptional() @IsString() @MaxLength(240) subtitle?: string;
  @IsOptional() @IsString() @MaxLength(2400) body?: string;
  @IsOptional() @IsString() @Matches(CONTENT_IMAGE_URL_PATTERN) imageUrl?: string;
  @IsOptional() @IsString() @Matches(CONTENT_TARGET_URL_PATTERN) targetUrl?: string;
  @Type(() => Number) @IsOptional() @IsInt() priority?: number;
  @Type(() => Number) @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ReorderAdminContentDto {
  @IsString() @MaxLength(120) section!: string;
  @IsString() @MaxLength(120) slot!: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) itemIds!: string[];
}
