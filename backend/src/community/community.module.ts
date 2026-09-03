import { Module } from "@nestjs/common";
import { CommunityGateway } from "./community.gateway";
import { CommunityService } from "./community.service";
import { ChatRoomsController } from "./chat-rooms.controller";
import { MessagesController } from "./messages.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [ChatRoomsController, MessagesController],
  providers: [CommunityService, CommunityGateway],
  exports: [CommunityGateway]
})
export class CommunityModule {}
