import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { memoryStorage } from "multer";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CsrfGuard } from "../common/guards/csrf.guard";
import { BrandsService } from "../brands/brands.service";
import { UpsertBrandDto, UpsertBrandProductDto } from "../brands/dto/brands.dto";
import { AdminService } from "./admin.service";
import { AdminContentQueryDto, PatchAdminContentDto, ReorderAdminContentDto, UpsertAdminContentDto } from "./dto/admin-content.dto";
import { AdminCommunityBanDto, AdminCommunityMembershipDto, CreateCommunityRoomDto, UpdateCommunityRoomDto } from "./dto/admin-community.dto";
import { UpsertMatchDto, UpsertMatchStatDto, UpsertTournamentDto, CreateTeamDto, UpdateMatchDto, UpsertSpotlightEventDto, UpdateSpotlightEventDto, UpsertLineupDto } from "./dto/admin-sports.dto";
import { MediaService } from "../common/media/media.service";

@Roles("admin", "superadmin")
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService, private readonly brandsService: BrandsService, private readonly media: MediaService) {}

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
  @Patch("content/items/:id")
  patchContent(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: PatchAdminContentDto) {
    return this.admin.patchContent(user, id, dto);
  }

  @UseGuards(CsrfGuard)
  @Post("content/reorder")
  reorderContent(@CurrentUser() user: RequestUser, @Body() dto: ReorderAdminContentDto) {
    return this.admin.reorderContent(user, dto);
  }

  @UseGuards(CsrfGuard)
  @Delete("content/items/:id")
  deleteContent(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.admin.deleteContent(user, id);
  }

  @UseGuards(CsrfGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post("content/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 }
    })
  )
  uploadContentImage(@UploadedFile() file: any) {
    return this.media.uploadImage("content", file);
  }

  @Get("community/rooms")
  listRooms() {
    return this.admin.listRooms();
  }

  @UseGuards(CsrfGuard)
  @Post("community/rooms")
  createRoom(@CurrentUser() user: RequestUser, @Body() dto: CreateCommunityRoomDto) {
    return this.admin.createRoom(user, dto);
  }

  @UseGuards(CsrfGuard)
  @Put("community/rooms/:roomId")
  updateRoom(@CurrentUser() user: RequestUser, @Param("roomId") roomId: string, @Body() dto: UpdateCommunityRoomDto) {
    return this.admin.updateRoom(user, roomId, dto);
  }

  @UseGuards(CsrfGuard)
  @Delete("community/rooms/:roomId")
  deleteRoom(@CurrentUser() user: RequestUser, @Param("roomId") roomId: string) {
    return this.admin.deleteRoom(user, roomId);
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
  @Put("sports/matches/:matchId")
  updateMatch(@CurrentUser() user: RequestUser, @Param("matchId") matchId: string, @Body() dto: UpdateMatchDto) {
    return this.admin.updateMatch(user, matchId, dto);
  }

  @UseGuards(CsrfGuard)
  @Delete("sports/matches/:matchId")
  deleteMatch(@CurrentUser() user: RequestUser, @Param("matchId") matchId: string) {
    return this.admin.deleteMatch(user, matchId);
  }

  @UseGuards(CsrfGuard)
  @Put("sports/matches/:matchId/stats")
  upsertMatchStat(@CurrentUser() user: RequestUser, @Param("matchId") matchId: string, @Body() dto: UpsertMatchStatDto) {
    return this.admin.upsertMatchStat(user, matchId, dto);
  }

  @UseGuards(CsrfGuard)
  @Put("sports/matches/:matchId/lineups")
  setMatchLineup(@CurrentUser() user: RequestUser, @Param("matchId") matchId: string, @Body() dto: UpsertLineupDto) {
    return this.admin.setMatchLineup(user, matchId, dto);
  }

  @UseGuards(CsrfGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post("sports/matches/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 }
    })
  )
  uploadMatchImage(@UploadedFile() file: any) {
    return this.media.uploadImage("matches", file);
  }

  @Get("sports/teams")
  listTeams() {
    return this.admin.listTeams();
  }

  @UseGuards(CsrfGuard)
  @Post("sports/teams")
  createTeam(@CurrentUser() user: RequestUser, @Body() dto: CreateTeamDto) {
    return this.admin.createTeam(user, dto);
  }

  @UseGuards(CsrfGuard)
  @Delete("sports/teams/:teamId")
  deleteTeam(@CurrentUser() user: RequestUser, @Param("teamId") teamId: string) {
    return this.admin.deleteTeam(user, teamId);
  }

  @UseGuards(CsrfGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post("sports/teams/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 }
    })
  )
  uploadTeamLogo(@UploadedFile() file: any) {
    return this.media.uploadImage("teams", file);
  }

  // Generic home-carousel highlight events (interviews, pre-match, etc.)
  @Get("sports/events")
  listSpotlightEvents() {
    return this.admin.listSpotlightEvents();
  }

  @UseGuards(CsrfGuard)
  @Post("sports/events")
  createSpotlightEvent(@CurrentUser() user: RequestUser, @Body() dto: UpsertSpotlightEventDto) {
    return this.admin.createSpotlightEvent(user, dto);
  }

  @UseGuards(CsrfGuard)
  @Put("sports/events/:eventId")
  updateSpotlightEvent(@CurrentUser() user: RequestUser, @Param("eventId") eventId: string, @Body() dto: UpdateSpotlightEventDto) {
    return this.admin.updateSpotlightEvent(user, eventId, dto);
  }

  @UseGuards(CsrfGuard)
  @Delete("sports/events/:eventId")
  deleteSpotlightEvent(@CurrentUser() user: RequestUser, @Param("eventId") eventId: string) {
    return this.admin.deleteSpotlightEvent(user, eventId);
  }

  @UseGuards(CsrfGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post("sports/events/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 }
    })
  )
  uploadSpotlightEventImage(@UploadedFile() file: any) {
    return this.media.uploadImage("events", file);
  }

  // Brands
  @Get("brands")
  listBrands() {
    return this.brandsService.adminListBrands();
  }

  @Post("brands")
  createBrand(@Body() dto: UpsertBrandDto) {
    return this.brandsService.adminCreateBrand(dto);
  }

  @Put("brands/:id")
  updateBrand(@Param("id") id: string, @Body() dto: UpsertBrandDto) {
    return this.brandsService.adminUpdateBrand(id, dto);
  }

  @Delete("brands/:id")
  deleteBrand(@Param("id") id: string) {
    return this.brandsService.adminDeleteBrand(id);
  }

  @UseGuards(CsrfGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post("brands/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!String(file.mimetype).startsWith("image/")) { cb(new BadRequestException("Only images allowed."), false); return; }
        cb(null, true);
      },
      limits: { fileSize: 8 * 1024 * 1024 }
    })
  )
  uploadBrandImage(@UploadedFile() file: any) {
    return this.media.uploadImage("brands", file);
  }

  @Get("brands/:brandId/products")
  listBrandProducts(@Param("brandId") brandId: string) {
    return this.brandsService.adminListBrandProducts(brandId);
  }

  @Post("brands/:brandId/products")
  createBrandProduct(@Param("brandId") brandId: string, @Body() dto: UpsertBrandProductDto) {
    return this.brandsService.adminCreateBrandProduct(brandId, dto);
  }

  @Put("brands/:brandId/products/:productId")
  updateBrandProduct(@Param("brandId") brandId: string, @Param("productId") productId: string, @Body() dto: UpsertBrandProductDto) {
    return this.brandsService.adminUpdateBrandProduct(brandId, productId, dto);
  }

  @Delete("brands/:brandId/products/:productId")
  deleteBrandProduct(@Param("brandId") brandId: string, @Param("productId") productId: string) {
    return this.brandsService.adminDeleteBrandProduct(brandId, productId);
  }
}
