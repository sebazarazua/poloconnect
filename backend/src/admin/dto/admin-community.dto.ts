import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class AdminCommunityBanDto {
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
  @Type(() => Boolean) @IsOptional() @IsBoolean() isPermanent?: boolean;
  @IsOptional() @IsDateString() expiresAt?: string;
}

export class AdminCommunityMembershipDto {
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

export class CreateCommunityRoomDto {
  @IsString() @MaxLength(140) title!: string;
  @IsOptional() @IsString() @MaxLength(600) description?: string;
  @IsOptional() @IsString() @MaxLength(40) kind?: string;
  @IsOptional() @IsString() @MaxLength(60) icon?: string;
  @IsOptional() @IsString() @MaxLength(20) tone?: string;
  @IsOptional() @IsString() @MaxLength(80) externalCode?: string;
  @IsOptional() @IsBoolean() isRecommended?: boolean;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}

export class UpdateCommunityRoomDto {
  @IsOptional() @IsString() @MaxLength(140) title?: string;
  @IsOptional() @IsString() @MaxLength(600) description?: string;
  @IsOptional() @IsString() @MaxLength(40) kind?: string;
  @IsOptional() @IsString() @MaxLength(60) icon?: string;
  @IsOptional() @IsString() @MaxLength(20) tone?: string;
  @IsOptional() @IsString() @MaxLength(80) externalCode?: string;
  @IsOptional() @IsBoolean() isRecommended?: boolean;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}
