import { Type } from "class-transformer";
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class ProductQueryDto extends PaginationDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() sellerId?: string;
}

export class ProductUpsertDto {
  @IsString() name!: string;
  @IsString() description!: string;
  @IsIn(["equipamiento", "indumentaria", "vehiculos", "inmueble"]) category!: any;
  @IsIn(["Nuevo", "Usado", "Reacondicionado"]) status!: any;
  @Type(() => Number) @IsNumber() @Min(1) price!: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) imageUrls?: string[];
  @IsOptional() @IsString() location?: string;
}

export class ContactSellerDto {
  @IsOptional() @IsString() message?: string;
  @IsOptional() @IsString() contactType?: string;
}

export class RejectProductDto {
  @IsOptional() @IsString() reason?: string;
}
