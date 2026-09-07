import { ModerationActionType, ReportContentType, ReportReason, ReportStatus, UserSanctionType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class CreateReportDto {
  @IsEnum(ReportContentType) contentType!: ReportContentType;
  @IsOptional() @IsString() contentId?: string;
  @IsOptional() @IsString() reportedUserId?: string;
  @IsEnum(ReportReason) reason!: ReportReason;
  @IsOptional() @IsString() @MaxLength(1500) description?: string;
  @IsOptional() @IsObject() context?: Record<string, unknown>;
}

export class ReportQueryDto extends PaginationDto {
  @IsOptional() @IsEnum(ReportStatus) status?: ReportStatus;
  @IsOptional() @IsEnum(ReportContentType) contentType?: ReportContentType;
  @IsOptional() @IsEnum(ReportReason) reason?: ReportReason;
  @IsOptional() @IsString() userId?: string;
}

export class UpdateReportDto {
  @IsOptional() @IsEnum(ReportStatus) status?: ReportStatus;
  @IsOptional() @IsString() @MaxLength(2000) internalNote?: string;
  @IsOptional() @IsString() @MaxLength(400) actionTaken?: string;
}

export class ApplyModerationActionDto {
  @IsEnum(ModerationActionType) action!: ModerationActionType;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) durationDays?: number;
}

export class ModerationActionQueryDto extends PaginationDto {
  @IsOptional() @IsString() reportId?: string;
  @IsOptional() @IsString() userId?: string;
}

export class SanctionQueryDto extends PaginationDto {
  @IsOptional() @IsEnum(UserSanctionType) type?: UserSanctionType;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() active?: string;
}
