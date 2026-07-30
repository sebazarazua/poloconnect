import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpsertBrandDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) sortOrder?: number;
}

export class UpsertBrandProductDto {
  @IsString() name!: string;
  @IsString() description!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) sortOrder?: number;
}
