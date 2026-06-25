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
