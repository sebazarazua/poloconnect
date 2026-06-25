import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class TournamentsQueryDto extends PaginationDto {
  @IsOptional() @Type(() => Number) month?: number;
  @IsOptional() @Type(() => Number) year?: number;
  @IsOptional() @IsString() registrationStatus?: string;
}

class RegistrationPlayerDto {
  @IsString() displayName!: string;
  @Type(() => Number) @IsNumber() handicap!: number;
  @Type(() => Number) @IsNumber() position!: number;
}

export class RegisterTeamDto {
  @IsString() teamName!: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => RegistrationPlayerDto) players!: RegistrationPlayerDto[];
}
