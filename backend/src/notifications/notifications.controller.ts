import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { NotificationsQueryDto, PushTokenDto } from "./dto/notifications.dto";
import { NotificationsService } from "./notifications.service";

@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("notifications")
  list(@CurrentUser() user: RequestUser, @Query() query: NotificationsQueryDto) {
    return this.notifications.list(user.id, query);
  }

  @Patch("notifications/:id/read")
  read(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Patch("notifications/read-all")
  readAll(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Post("push-tokens")
  pushToken(@CurrentUser() user: RequestUser, @Body() body: PushTokenDto) {
    return this.notifications.savePushToken(user.id, body);
  }
}
