import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpsertTournamentDto {
  @IsString() @MaxLength(140) name!: string;
  @IsString() @MaxLength(140) slug!: string;
  @IsOptional() @IsString() clubId?: string;
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() levelLabel?: string;
  @Type(() => Number) @IsOptional() minHandicap?: number;
  @Type(() => Number) @IsOptional() maxHandicap?: number;
  @Type(() => Number) @IsOptional() @IsInt() @Min(2) maxTeams?: number;
  @IsOptional() @IsString() @MaxLength(120) contactName?: string;
  @IsOptional() @IsString() @MaxLength(60) contactPhone?: string;
  @IsOptional() @IsString() @MaxLength(40) registrationStatus?: string;
  @IsOptional() @IsString() @MaxLength(40) status?: string;
}

export class UpsertMatchDto {
  @IsOptional() @IsString() externalCode?: string;
  @IsOptional() @IsString() tournamentId?: string;
  @IsOptional() @IsString() clubId?: string;
  @IsString() team1Id!: string;
  @IsString() team2Id!: string;
  @IsDateString() scheduledAt!: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @Type(() => Number) @IsOptional() @IsInt() @Min(0) score1?: number;
  @Type(() => Number) @IsOptional() @IsInt() @Min(0) score2?: number;
  @Type(() => Number) @IsOptional() @IsInt() @Min(1) totalChukkers?: number;
  @Type(() => Number) @IsOptional() @IsInt() @Min(1) currentChukker?: number;
  @IsOptional() @IsString() competitionName?: string;
  @IsOptional() @IsString() youtubeUrl?: string;
  @IsOptional() @IsString() backgroundImageUrl?: string;
}

export class UpdateMatchDto {
  @IsOptional() @IsString() tournamentId?: string;
  @IsOptional() @IsString() clubId?: string;
  @IsOptional() @IsString() team1Id?: string;
  @IsOptional() @IsString() team2Id?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() competitionName?: string;
  @IsOptional() @IsString() youtubeUrl?: string;
  @IsOptional() @IsString() backgroundImageUrl?: string;
}

export class UpsertMatchStatDto {
  @IsString() statKey!: string;
  @IsString() label!: string;
  @IsString() team1Value!: string;
  @IsString() team2Value!: string;
}

export class CreateTeamDto {
  @IsString() @MaxLength(140) name!: string;
  @IsOptional() @IsString() logoUrl?: string;
}

export class LineupPlayerDto {
  @IsString() @MaxLength(140) name!: string;
  @Type(() => Number) @IsOptional() handicap?: number;
}

export class UpsertLineupDto {
  team1!: LineupPlayerDto[];
  team2!: LineupPlayerDto[];
  @IsOptional() @IsString() @MaxLength(140) refereeMain?: string;
  @IsOptional() @IsString() @MaxLength(140) refereeAssistant?: string;
}

export class UpsertSpotlightEventDto {
  @IsString() @MaxLength(140) title!: string;
  @IsOptional() @IsString() @MaxLength(280) description?: string;
  @IsDateString() scheduledAt!: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() youtubeUrl?: string;
  @IsOptional() @IsString() backgroundImageUrl?: string;
}

export class UpdateSpotlightEventDto {
  @IsOptional() @IsString() @MaxLength(140) title?: string;
  @IsOptional() @IsString() @MaxLength(280) description?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() youtubeUrl?: string;
  @IsOptional() @IsString() backgroundImageUrl?: string;
}
