import { Module } from "@nestjs/common";
import { CommunityGateway } from "./community.gateway";
import { CommunityService } from "./community.service";
import { ChatRoomsController } from "./chat-rooms.controller";
import { MessagesController } from "./messages.controller";

@Module({ controllers: [ChatRoomsController, MessagesController], providers: [CommunityService, CommunityGateway] })
export class CommunityModule {}
