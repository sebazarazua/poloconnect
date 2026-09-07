import { Module } from "@nestjs/common";
import { CommunityGateway } from "./community.gateway";
import { CommunityService } from "./community.service";
import { ChatRoomsController } from "./chat-rooms.controller";
import { MessagesController } from "./messages.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { ModerationModule } from "../moderation/moderation.module";

@Module({
  imports: [NotificationsModule, ModerationModule],
  controllers: [ChatRoomsController, MessagesController],
  providers: [CommunityService, CommunityGateway],
  exports: [CommunityGateway]
})
export class CommunityModule {}
