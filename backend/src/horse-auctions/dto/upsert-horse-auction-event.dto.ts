import { Type } from "class-transformer";
import { IsDateString, IsEmail, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";

export class UpsertHorseAuctionEventDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsString()
  organizer!: string;

  @IsString()
  venue!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsDateString()
  eventDate!: string;

  @IsString()
  contactName!: string;

  @IsOptional()
  @IsString()
  contactPhone?: string | null;

  @IsOptional()
  @IsEmail()
  contactEmail?: string | null;

  @IsOptional()
  @IsString()
  websiteUrl?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpsertHorseAuctionHorseDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lotNumber?: number | null;

  @IsString()
  horseName!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsString()
  ownerName!: string;

  @IsOptional()
  @IsString()
  damName?: string | null;

  @IsOptional()
  @IsString()
  sireName?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  reservePriceCents!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  breed?: string | null;

  @IsOptional()
  @IsString()
  sex?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(40)
  ageYears?: number | null;

  @IsOptional()
  @IsString()
  coatColor?: string | null;

  @IsOptional()
  @IsString()
  contactPhone?: string | null;

  @IsOptional()
  @IsEmail()
  contactEmail?: string | null;
}
