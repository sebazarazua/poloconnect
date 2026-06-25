import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { CommunityService } from "./community.service";
import { MessageQueryDto, SendMessageDto } from "./dto/community.dto";

@Controller("chat-rooms/:roomId/messages")
export class MessagesController {
  constructor(private readonly community: CommunityService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Param("roomId") roomId: string, @Query() query: MessageQueryDto) {
    return this.community.listMessages(user.id, roomId, query);
  }

  @Post()
  send(@CurrentUser() user: RequestUser, @Param("roomId") roomId: string, @Body() body: SendMessageDto) {
    return this.community.sendMessage(user.id, roomId, body.text, body.clientMessageId);
  }
}
