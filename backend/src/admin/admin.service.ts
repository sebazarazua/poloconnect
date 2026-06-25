import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { RequestUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../database/prisma.service";
import { AdminContentQueryDto, UpsertAdminContentDto } from "./dto/admin-content.dto";
import { AdminCommunityBanDto, AdminCommunityMembershipDto } from "./dto/admin-community.dto";
import { UpsertMatchDto, UpsertMatchStatDto, UpsertTournamentDto } from "./dto/admin-sports.dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [users, products, rooms, matches, tournaments, contentItems, activity] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.chatRoom.count({ where: { deletedAt: null } }),
      this.prisma.match.count({ where: { deletedAt: null } }),
      this.prisma.tournament.count({ where: { deletedAt: null } }),
      this.prisma.appContentItem.count({ where: { deletedAt: null } }),
      this.prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 })
    ]);

    return {
      counters: { users, products, rooms, matches, tournaments, contentItems },
      recentActivity: activity
    };
  }

  async listContent(query: AdminContentQueryDto) {
    const where: Prisma.AppContentItemWhereInput = { deletedAt: null };
    if (query.section) where.section = query.section;
    if (query.slot) where.slot = query.slot;
    if (query.type) where.type = query.type;

    return this.prisma.appContentItem.findMany({
      where,
      orderBy: [{ priority: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }]
    });
  }

  async createContent(user: RequestUser, dto: UpsertAdminContentDto) {
    const item = await this.prisma.appContentItem.create({
      data: {
        type: dto.type,
        section: dto.section,
        slot: dto.slot,
        title: dto.title,
        subtitle: dto.subtitle,
        body: dto.body,
        imageUrl: dto.imageUrl,
        storageKey: dto.storageKey,
        targetUrl: dto.targetUrl,
        priority: dto.priority ?? 0,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        createdBy: user.id,
        updatedBy: user.id
      }
    });

    await this.audit(user, "admin.content.create", "AppContentItem", item.id, { section: item.section, slot: item.slot });
    return item;
  }

  async updateContent(user: RequestUser, id: string, dto: UpsertAdminContentDto) {
    await this.ensureContent(id);
    const item = await this.prisma.appContentItem.update({
      where: { id },
      data: {
        type: dto.type,
        section: dto.section,
        slot: dto.slot,
        title: dto.title,
        subtitle: dto.subtitle,
        body: dto.body,
        imageUrl: dto.imageUrl,
        storageKey: dto.storageKey,
        targetUrl: dto.targetUrl,
        priority: dto.priority ?? 0,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        updatedBy: user.id
      }
    });

    await this.audit(user, "admin.content.update", "AppContentItem", id, { section: item.section, slot: item.slot });
    return item;
  }

  async deleteContent(user: RequestUser, id: string) {
    await this.ensureContent(id);
    await this.prisma.appContentItem.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: user.id } });
    await this.audit(user, "admin.content.delete", "AppContentItem", id);
    return { ok: true };
  }

  async listRooms() {
    return this.prisma.chatRoom.findMany({ where: { deletedAt: null }, orderBy: { title: "asc" } });
  }

  async listRoomMembers(roomId: string) {
    await this.ensureRoom(roomId);
    return this.prisma.chatMembership.findMany({
      where: { roomId, leftAt: null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, username: true, status: true } }
      },
      orderBy: { joinedAt: "asc" }
    });
  }

  async listRoomBans(roomId: string) {
    await this.ensureRoom(roomId);
    return this.prisma.communityBan.findMany({
      where: { roomId },
      include: { user: { select: { id: true, firstName: true, lastName: true, username: true, email: true } } },
      orderBy: { createdAt: "desc" }
    });
  }

  async listRoomModerationHistory(roomId: string) {
    await this.ensureRoom(roomId);
    return this.prisma.communityModerationAction.findMany({ where: { roomId }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  async removeMember(user: RequestUser, roomId: string, targetUserId: string, dto: AdminCommunityMembershipDto) {
    await this.ensureRoom(roomId);
    await this.prisma.chatMembership.updateMany({ where: { roomId, userId: targetUserId, leftAt: null }, data: { leftAt: new Date() } });
    await this.logModeration(user, roomId, targetUserId, "removed", dto.reason);
    return { ok: true };
  }

  async addMember(user: RequestUser, roomId: string, targetUserId: string, dto: AdminCommunityMembershipDto) {
    await this.ensureRoom(roomId);
    await this.prisma.chatMembership.upsert({
      where: { roomId_userId: { roomId, userId: targetUserId } },
      update: { leftAt: null, joinedAt: new Date() },
      create: { roomId, userId: targetUserId }
    });
    await this.logModeration(user, roomId, targetUserId, "added", dto.reason);
    return { ok: true };
  }

  async banMember(user: RequestUser, roomId: string, targetUserId: string, dto: AdminCommunityBanDto) {
    await this.ensureRoom(roomId);
    await this.prisma.chatMembership.updateMany({ where: { roomId, userId: targetUserId, leftAt: null }, data: { leftAt: new Date() } });

    const ban = await this.prisma.communityBan.upsert({
      where: { roomId_userId: { roomId, userId: targetUserId } },
      update: {
        reason: dto.reason,
        isPermanent: dto.isPermanent ?? true,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy: user.id,
        revokedAt: null,
        revokedBy: null,
        createdAt: new Date()
      },
      create: {
        roomId,
        userId: targetUserId,
        reason: dto.reason,
        isPermanent: dto.isPermanent ?? true,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy: user.id
      }
    });

    await this.logModeration(user, roomId, targetUserId, "banned", dto.reason, {
      isPermanent: ban.isPermanent,
      expiresAt: ban.expiresAt
    });

    return { ok: true };
  }

  async unbanMember(user: RequestUser, roomId: string, targetUserId: string, dto: AdminCommunityMembershipDto) {
    await this.ensureRoom(roomId);
    await this.prisma.communityBan.updateMany({
      where: { roomId, userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date(), revokedBy: user.id }
    });

    await this.logModeration(user, roomId, targetUserId, "unbanned", dto.reason);
    return { ok: true };
  }

  async listTournaments() {
    return this.prisma.tournament.findMany({ where: { deletedAt: null }, orderBy: { startDate: "desc" }, take: 200 });
  }

  async createTournament(user: RequestUser, dto: UpsertTournamentDto) {
    const tournament = await this.prisma.tournament.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        levelLabel: dto.levelLabel,
        minHandicap: dto.minHandicap,
        maxHandicap: dto.maxHandicap,
        maxTeams: dto.maxTeams,
        createdBy: user.id
      }
    });

    await this.audit(user, "admin.tournament.create", "Tournament", tournament.id);
    return tournament;
  }

  async listMatches() {
    return this.prisma.match.findMany({
      where: { deletedAt: null },
      include: {
        team1: { select: { id: true, name: true } },
        team2: { select: { id: true, name: true } },
        tournament: { select: { id: true, name: true } },
        stats: true
      },
      orderBy: { scheduledAt: "desc" },
      take: 200
    });
  }

  async createMatch(user: RequestUser, dto: UpsertMatchDto) {
    const match = await this.prisma.match.create({
      data: {
        externalCode: dto.externalCode,
        tournamentId: dto.tournamentId,
        clubId: dto.clubId,
        team1Id: dto.team1Id,
        team2Id: dto.team2Id,
        scheduledAt: new Date(dto.scheduledAt),
        status: dto.status,
        score1: dto.score1 ?? 0,
        score2: dto.score2 ?? 0,
        totalChukkers: dto.totalChukkers ?? 6,
        currentChukker: dto.currentChukker,
        competitionName: dto.competitionName,
        youtubeUrl: dto.youtubeUrl
      }
    });

    await this.audit(user, "admin.match.create", "Match", match.id);
    return match;
  }

  async upsertMatchStat(user: RequestUser, matchId: string, dto: UpsertMatchStatDto) {
    await this.ensureMatch(matchId);

    const stat = await this.prisma.matchStat.upsert({
      where: { matchId_statKey: { matchId, statKey: dto.statKey } },
      update: {
        label: dto.label,
        team1Value: dto.team1Value,
        team2Value: dto.team2Value
      },
      create: {
        matchId,
        statKey: dto.statKey,
        label: dto.label,
        team1Value: dto.team1Value,
        team2Value: dto.team2Value
      }
    });

    await this.audit(user, "admin.match.stat.upsert", "Match", matchId, { statKey: dto.statKey });
    return stat;
  }

  async getPublicSection(section: string, slot?: string) {
    const now = new Date();
    return this.prisma.appContentItem.findMany({
      where: {
        deletedAt: null,
        section,
        slot: slot ?? undefined,
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
      },
      orderBy: [{ priority: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }]
    });
  }

  async getPublicHomeContent() {
    const [heroAds, compactAds, news, branding] = await Promise.all([
      this.getPublicSection("home", "hero_ads"),
      this.getPublicSection("home", "compact_ads"),
      this.getPublicSection("home", "main_news"),
      this.getPublicSection("branding", "app_logo")
    ]);

    return {
      heroAds,
      compactAds,
      news,
      branding: {
        logo: branding[0] ?? null
      }
    };
  }

  private async ensureContent(id: string) {
    const item = await this.prisma.appContentItem.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundException("Content item not found.");
    return item;
  }

  private async ensureRoom(roomId: string) {
    const room = await this.prisma.chatRoom.findFirst({ where: { id: roomId, deletedAt: null } });
    if (!room) throw new NotFoundException("Chat room not found.");
    return room;
  }

  private async ensureMatch(matchId: string) {
    const match = await this.prisma.match.findFirst({ where: { id: matchId, deletedAt: null } });
    if (!match) throw new NotFoundException("Match not found.");
    return match;
  }

  private async logModeration(user: RequestUser, roomId: string, targetUserId: string, action: "added" | "removed" | "banned" | "unbanned", reason?: string, metadata: Record<string, unknown> = {}) {
    await this.prisma.communityModerationAction.create({
      data: {
        roomId,
        actorUserId: user.id,
        targetUserId,
        action,
        reason,
        metadata: metadata as Prisma.InputJsonValue
      }
    });

    await this.audit(user, `admin.community.${action}`, "ChatRoom", roomId, { targetUserId, reason, ...metadata });
  }

  private async audit(user: RequestUser, action: string, resourceType: string, resourceId?: string, metadata: Record<string, unknown> = {}) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action,
        resourceType,
        resourceId,
        metadata: metadata as Prisma.InputJsonValue
      }
    });
  }
}
