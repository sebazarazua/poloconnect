import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUrl, Matches, MaxLength, Min } from "class-validator";

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
  @Matches(/^(asset:[a-zA-Z0-9_\-/]+|https?:\/\/.+|\/uploads\/.+)$/)
  imageUrl!: string;
  @IsOptional() @IsString() storageKey?: string;
  @IsOptional() @IsString() @IsUrl({ require_tld: false }) targetUrl?: string;
  @Type(() => Number) @IsOptional() @IsInt() priority?: number;
  @Type(() => Number) @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @Type(() => Boolean) @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
}
