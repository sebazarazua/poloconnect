import { Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { CommunityService } from "./community.service";

@Controller("chat-rooms")
export class ChatRoomsController {
  constructor(private readonly community: CommunityService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.community.listRooms(user.id);
  }

  @Post(":roomId/join")
  join(@CurrentUser() user: RequestUser, @Param("roomId") roomId: string) {
    return this.community.joinRoom(user.id, roomId);
  }

  @Post(":roomId/leave")
  leave(@CurrentUser() user: RequestUser, @Param("roomId") roomId: string) {
    return this.community.leaveRoom(user.id, roomId);
  }
}
