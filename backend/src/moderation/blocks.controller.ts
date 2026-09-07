import { Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { CsrfGuard } from "../common/guards/csrf.guard";
import { ModerationService } from "./moderation.service";

@Controller("users")
export class BlocksController {
  constructor(private readonly moderation: ModerationService) {}

  @Get("me/blocked")
  list(@CurrentUser() user: RequestUser) {
    return this.moderation.listBlockedUsers(user.id);
  }

  @UseGuards(CsrfGuard)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post(":id/block")
  block(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.moderation.blockUser(user.id, id);
  }

  @UseGuards(CsrfGuard)
  @Delete(":id/block")
  unblock(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.moderation.unblockUser(user.id, id);
  }
}
