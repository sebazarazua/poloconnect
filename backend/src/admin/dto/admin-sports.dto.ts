import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export enum AdminMatchStatus {
  upcoming = "upcoming",
  live = "live",
  finished = "finished",
  cancelled = "cancelled"
}

export class UpsertTournamentDto {
  @IsString() @MaxLength(140) name!: string;
  @IsString() @MaxLength(140) slug!: string;
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() levelLabel?: string;
  @Type(() => Number) @IsOptional() minHandicap?: number;
  @Type(() => Number) @IsOptional() maxHandicap?: number;
  @Type(() => Number) @IsOptional() @IsInt() @Min(2) maxTeams?: number;
}

export class UpsertMatchDto {
  @IsOptional() @IsString() externalCode?: string;
  @IsOptional() @IsString() tournamentId?: string;
  @IsOptional() @IsString() clubId?: string;
  @IsString() team1Id!: string;
  @IsString() team2Id!: string;
  @IsDateString() scheduledAt!: string;
  @IsEnum(AdminMatchStatus) status!: AdminMatchStatus;
  @Type(() => Number) @IsOptional() @IsInt() @Min(0) score1?: number;
  @Type(() => Number) @IsOptional() @IsInt() @Min(0) score2?: number;
  @Type(() => Number) @IsOptional() @IsInt() @Min(1) totalChukkers?: number;
  @Type(() => Number) @IsOptional() @IsInt() @Min(1) currentChukker?: number;
  @IsOptional() @IsString() competitionName?: string;
  @IsOptional() @IsString() youtubeUrl?: string;
}

export class UpsertMatchStatDto {
  @IsString() statKey!: string;
  @IsString() label!: string;
  @IsString() team1Value!: string;
  @IsString() team2Value!: string;
}
