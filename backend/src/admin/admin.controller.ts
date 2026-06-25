import { Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CsrfGuard } from "../common/guards/csrf.guard";
import { AdminService } from "./admin.service";
import { AdminContentQueryDto, UpsertAdminContentDto } from "./dto/admin-content.dto";
import { AdminCommunityBanDto, AdminCommunityMembershipDto } from "./dto/admin-community.dto";
import { UpsertMatchDto, UpsertMatchStatDto, UpsertTournamentDto } from "./dto/admin-sports.dto";

@Roles("admin", "superadmin")
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService, private readonly config: ConfigService) {}

  private static storageName(_req: any, file: any, callback: (error: Error | null, filename: string) => void) {
    const safeExt = extname(file.originalname || "").replace(/[^a-zA-Z0-9.]/g, "") || ".bin";
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  }

  @Get("dashboard")
  dashboard() {
    return this.admin.dashboard();
  }

  @Get("content/items")
  listContent(@Query() query: AdminContentQueryDto) {
    return this.admin.listContent(query);
  }

  @UseGuards(CsrfGuard)
  @Post("content/items")
  createContent(@CurrentUser() user: RequestUser, @Body() dto: UpsertAdminContentDto) {
    return this.admin.createContent(user, dto);
  }

  @UseGuards(CsrfGuard)
  @Put("content/items/:id")
  updateContent(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpsertAdminContentDto) {
    return this.admin.updateContent(user, id, dto);
  }

  @UseGuards(CsrfGuard)
  @Delete("content/items/:id")
  deleteContent(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.admin.deleteContent(user, id);
  }

  @UseGuards(CsrfGuard)
  @Post("content/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({ destination: "uploads", filename: AdminController.storageName }),
      limits: { fileSize: 8 * 1024 * 1024 }
    })
  )
  uploadContentImage(@UploadedFile() file: any) {
    const baseUrl = this.config.get<string>("PUBLIC_BASE_URL")?.trim();
    const path = `/uploads/${file.filename}`;
    const url = baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;
    return { url, filename: file.filename, mimetype: file.mimetype, size: file.size };
  }

  @Get("community/rooms")
  listRooms() {
    return this.admin.listRooms();
  }

  @Get("community/rooms/:roomId/members")
  listRoomMembers(@Param("roomId") roomId: string) {
    return this.admin.listRoomMembers(roomId);
  }

  @Get("community/rooms/:roomId/bans")
  listRoomBans(@Param("roomId") roomId: string) {
    return this.admin.listRoomBans(roomId);
  }

  @Get("community/rooms/:roomId/moderation-history")
  listModerationHistory(@Param("roomId") roomId: string) {
    return this.admin.listRoomModerationHistory(roomId);
  }

  @UseGuards(CsrfGuard)
  @Post("community/rooms/:roomId/members/:userId/remove")
  removeMember(@CurrentUser() user: RequestUser, @Param("roomId") roomId: string, @Param("userId") targetUserId: string, @Body() dto: AdminCommunityMembershipDto) {
    return this.admin.removeMember(user, roomId, targetUserId, dto);
  }

  @UseGuards(CsrfGuard)
  @Post("community/rooms/:roomId/members/:userId/add")
  addMember(@CurrentUser() user: RequestUser, @Param("roomId") roomId: string, @Param("userId") targetUserId: string, @Body() dto: AdminCommunityMembershipDto) {
    return this.admin.addMember(user, roomId, targetUserId, dto);
  }

  @UseGuards(CsrfGuard)
  @Post("community/rooms/:roomId/members/:userId/ban")
  banMember(@CurrentUser() user: RequestUser, @Param("roomId") roomId: string, @Param("userId") targetUserId: string, @Body() dto: AdminCommunityBanDto) {
    return this.admin.banMember(user, roomId, targetUserId, dto);
  }

  @UseGuards(CsrfGuard)
  @Post("community/rooms/:roomId/members/:userId/unban")
  unbanMember(@CurrentUser() user: RequestUser, @Param("roomId") roomId: string, @Param("userId") targetUserId: string, @Body() dto: AdminCommunityMembershipDto) {
    return this.admin.unbanMember(user, roomId, targetUserId, dto);
  }

  @Get("sports/tournaments")
  listTournaments() {
    return this.admin.listTournaments();
  }

  @UseGuards(CsrfGuard)
  @Post("sports/tournaments")
  createTournament(@CurrentUser() user: RequestUser, @Body() dto: UpsertTournamentDto) {
    return this.admin.createTournament(user, dto);
  }

  @Get("sports/matches")
  listMatches() {
    return this.admin.listMatches();
  }

  @UseGuards(CsrfGuard)
  @Post("sports/matches")
  createMatch(@CurrentUser() user: RequestUser, @Body() dto: UpsertMatchDto) {
    return this.admin.createMatch(user, dto);
  }

  @UseGuards(CsrfGuard)
  @Put("sports/matches/:matchId/stats")
  upsertMatchStat(@CurrentUser() user: RequestUser, @Param("matchId") matchId: string, @Body() dto: UpsertMatchStatDto) {
    return this.admin.upsertMatchStat(user, matchId, dto);
  }
}
