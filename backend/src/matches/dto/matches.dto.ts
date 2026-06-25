import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class MatchesQueryDto extends PaginationDto {
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsIn(["live", "upcoming", "finished", "cancelled"]) status?: any;
}

export class UpdateLiveStateDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) score1?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) score2?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) currentChukker?: number;
  @IsOptional() @IsIn(["live", "upcoming", "finished", "cancelled"]) status?: any;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() eventType?: string;
  @IsOptional() @IsString() matchClock?: string;
}
