import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class MessageQueryDto extends PaginationDto {
  @IsOptional() @IsString() before?: string;
  @IsOptional() @IsString() @Matches(/^\d+$/) after?: string;
}

export class SendMessageDto {
  @IsString() @MaxLength(500) text!: string;
  @IsOptional() @IsString() clientMessageId?: string;
}

export class UpdateRoomNotificationsDto {
  @IsBoolean() notificationsMuted!: boolean;
}
