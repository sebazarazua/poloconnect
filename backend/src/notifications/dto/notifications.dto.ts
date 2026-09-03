import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class NotificationsQueryDto extends PaginationDto {
  @IsOptional() @IsString() read?: string;
}

export class PushTokenDto {
  @IsString() platform!: string;
  @IsString() token!: string;
}

export class PushTokenUnregisterDto {
  @IsString() token!: string;
}
