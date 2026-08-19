import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { RequestUser } from "../common/decorators/current-user.decorator";
import { MediaService } from "../common/media/media.service";
import { computeEffectiveMatchStatus, isWithinLiveWindow } from "../common/utils/match-status.util";
import { PrismaService } from "../database/prisma.service";
import { AdminContentQueryDto, UpsertAdminContentDto } from "./dto/admin-content.dto";
import { AdminCommunityBanDto, AdminCommunityMembershipDto } from "./dto/admin-community.dto";
import { CreateTeamDto, UpdateMatchDto, UpsertMatchDto, UpsertMatchStatDto, UpsertTournamentDto, UpsertSpotlightEventDto, UpdateSpotlightEventDto, UpsertLineupDto } from "./dto/admin-sports.dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly media: MediaService) {}

  private polohubCache: {
    expiresAt: number;
    items: Array<{
      id: string;
      type: "news";
      section: "home";
      slot: "main_news";
      title: string;
      subtitle: string;
      body: string;
      imageUrl: string;
      targetUrl: string;
      priority: number;
      sortOrder: number;
      isActive: true;
    }>;
  } | null = null;

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
    const imageUrl = await this.media.ensureStoredMediaUrl("content", dto.imageUrl, {
      allowAsset: true,
      allowGoogleImport: true
    });

    const item = await this.prisma.appContentItem.create({
      data: {
        type: dto.type,
        section: dto.section,
        slot: dto.slot,
        title: dto.title,
        subtitle: dto.subtitle,
        body: dto.body,
        imageUrl,
        storageKey: dto.storageKey ?? this.media.extractStorageKeyFromUrl(imageUrl),
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
    const imageUrl = await this.media.ensureStoredMediaUrl("content", dto.imageUrl, {
      allowAsset: true,
      allowGoogleImport: true
    });

    const item = await this.prisma.appContentItem.update({
      where: { id },
      data: {
        type: dto.type,
        section: dto.section,
        slot: dto.slot,
        title: dto.title,
        subtitle: dto.subtitle,
        body: dto.body,
        imageUrl,
        storageKey: dto.storageKey ?? this.media.extractStorageKeyFromUrl(imageUrl),
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
        clubId: dto.clubId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        levelLabel: dto.levelLabel,
        minHandicap: dto.minHandicap,
        maxHandicap: dto.maxHandicap,
        maxTeams: dto.maxTeams,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        registrationStatus: dto.registrationStatus,
        status: dto.status,
        createdBy: user.id
      }
    });

    await this.audit(user, "admin.tournament.create", "Tournament", tournament.id);
    return tournament;
  }

  async listMatches() {
    const matches = await this.prisma.match.findMany({
      where: { deletedAt: null },
      include: {
        team1: { select: { id: true, name: true, logoUrl: true } },
        team2: { select: { id: true, name: true, logoUrl: true } },
        tournament: { select: { id: true, name: true } },
        stats: true
      },
      orderBy: { scheduledAt: "desc" },
      take: 200
    });

    // The raw DB status is only ever "upcoming" (or legacy data); show the
    // admin the same computed upcoming/live/finished value the app displays.
    return matches.map((match) => ({ ...match, status: computeEffectiveMatchStatus(match) }));
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
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        // Status is never admin-selected: it starts as "upcoming" and the effective
        // upcoming/live/finished state is derived from scheduledAt/endsAt on every read.
        status: "upcoming",
        score1: dto.score1 ?? 0,
        score2: dto.score2 ?? 0,
        totalChukkers: dto.totalChukkers ?? 6,
        currentChukker: dto.currentChukker,
        competitionName: dto.competitionName,
        youtubeUrl: dto.youtubeUrl,
        backgroundImageUrl: dto.backgroundImageUrl
      }
    });

    await this.audit(user, "admin.match.create", "Match", match.id);
    return match;
  }

  async updateMatch(user: RequestUser, matchId: string, dto: UpdateMatchDto) {
    await this.ensureMatch(matchId);

    const match = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        tournamentId: dto.tournamentId,
        clubId: dto.clubId,
        team1Id: dto.team1Id,
        team2Id: dto.team2Id,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        competitionName: dto.competitionName,
        youtubeUrl: dto.youtubeUrl,
        backgroundImageUrl: dto.backgroundImageUrl,
        version: { increment: 1 }
      }
    });

    await this.audit(user, "admin.match.update", "Match", matchId);
    return match;
  }

  async deleteMatch(user: RequestUser, matchId: string) {
    await this.ensureMatch(matchId);
    await this.prisma.match.update({ where: { id: matchId }, data: { deletedAt: new Date() } });
    await this.audit(user, "admin.match.delete", "Match", matchId);
    return { ok: true };
  }

  async listTeams() {
    return this.prisma.team.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, take: 500 });
  }

  async createTeam(user: RequestUser, dto: CreateTeamDto) {
    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        slug: await this.generateUniqueTeamSlug(dto.name),
        logoUrl: dto.logoUrl
      }
    });

    await this.audit(user, "admin.team.create", "Team", team.id);
    return team;
  }

  async deleteTeam(user: RequestUser, teamId: string) {
    await this.prisma.team.update({ where: { id: teamId }, data: { deletedAt: new Date() } });
    await this.audit(user, "admin.team.delete", "Team", teamId);
    return { ok: true };
  }

  // Admins never type a slug; it's derived from the team name plus a short
  // random suffix so it stays unique without a round-trip to check availability.
  private async generateUniqueTeamSlug(name: string) {
    const base = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "equipo";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${randomBytes(3).toString("hex")}`;
      const existing = await this.prisma.team.findUnique({ where: { slug: candidate } });
      if (!existing) return candidate;
    }

    return `${base}-${randomBytes(4).toString("hex")}`;
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

  async setMatchLineup(user: RequestUser, matchId: string, dto: UpsertLineupDto) {
    const match = await this.ensureMatch(matchId);

    await this.prisma.matchLineup.deleteMany({ where: { matchId } });

    for (const [teamId, players] of [[match.team1Id, dto.team1 ?? []], [match.team2Id, dto.team2 ?? []]] as const) {
      for (let index = 0; index < players.length; index += 1) {
        const name = players[index].name?.trim();
        if (!name) continue;

        const player =
          (await this.prisma.player.findFirst({ where: { displayName: name, deletedAt: null } })) ??
          (await this.prisma.player.create({ data: { displayName: name, handicap: players[index].handicap } }));

        if (players[index].handicap !== undefined && Number(player.handicap) !== players[index].handicap) {
          await this.prisma.player.update({ where: { id: player.id }, data: { handicap: players[index].handicap } });
        }

        await this.prisma.matchLineup.create({
          data: { matchId, teamId, playerId: player.id, position: index + 1, shirtNumber: index + 1 }
        });
      }
    }

    await this.prisma.match.update({
      where: { id: matchId },
      data: { refereeMain: dto.refereeMain, refereeAssistant: dto.refereeAssistant }
    });

    await this.audit(user, "admin.match.lineup.upsert", "Match", matchId);
    return { ok: true };
  }

  async listSpotlightEvents() {
    return this.prisma.spotlightEvent.findMany({ where: { deletedAt: null }, orderBy: { scheduledAt: "desc" }, take: 200 });
  }

  async getLiveSpotlightEvents() {
    const events = await this.prisma.spotlightEvent.findMany({
      where: { deletedAt: null, scheduledAt: { lte: new Date() } },
      orderBy: { scheduledAt: "desc" },
      take: 50
    });
    return events.filter((event) => isWithinLiveWindow(event.scheduledAt, event.endsAt));
  }

  async createSpotlightEvent(user: RequestUser, dto: UpsertSpotlightEventDto) {
    const event = await this.prisma.spotlightEvent.create({
      data: {
        title: dto.title,
        description: dto.description,
        scheduledAt: new Date(dto.scheduledAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        youtubeUrl: dto.youtubeUrl,
        backgroundImageUrl: dto.backgroundImageUrl,
        createdBy: user.id
      }
    });

    await this.audit(user, "admin.spotlightEvent.create", "SpotlightEvent", event.id);
    return event;
  }

  async updateSpotlightEvent(user: RequestUser, id: string, dto: UpdateSpotlightEventDto) {
    const event = await this.prisma.spotlightEvent.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        youtubeUrl: dto.youtubeUrl,
        backgroundImageUrl: dto.backgroundImageUrl
      }
    });

    await this.audit(user, "admin.spotlightEvent.update", "SpotlightEvent", id);
    return event;
  }

  async deleteSpotlightEvent(user: RequestUser, id: string) {
    await this.prisma.spotlightEvent.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit(user, "admin.spotlightEvent.delete", "SpotlightEvent", id);
    return { ok: true };
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
    const [heroAds, compactAds, fallbackNews, branding, polohubNews] = await Promise.all([
      this.getPublicSection("home", "hero_ads"),
      this.getPublicSection("home", "compact_ads"),
      this.getPublicSection("home", "main_news"),
      this.getPublicSection("branding", "app_logo"),
      this.getPolohubNews(12)
    ]);

    const news = polohubNews.length > 0 ? polohubNews : fallbackNews;

    return {
      heroAds,
      compactAds,
      news,
      branding: {
        logo: branding[0] ?? null
      }
    };
  }

  private async getPolohubNews(limit: number) {
    const now = Date.now();
    if (this.polohubCache && this.polohubCache.expiresAt > now) {
      return this.polohubCache.items.slice(0, limit);
    }

    try {
      const response = await fetch("https://polohub.net/feed/", {
        headers: {
          "User-Agent": "PoloConnect/1.0"
        }
      });

      if (!response.ok) {
        return [];
      }

      const xml = await response.text();
      const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

      const parsed = await Promise.all(
        itemBlocks.map(async (block, index) => {
          const title = this.decodeHtmlEntities(this.extractCDataOrTag(block, "title"));
          const link = this.extractCDataOrTag(block, "link").trim();
          const description = this.decodeHtmlEntities(this.extractCDataOrTag(block, "description"));
          const categories = [...block.matchAll(/<category><!\[CDATA\[(.*?)\]\]><\/category>/g)].map((match) => match[1]).filter(Boolean);
          const contentEncoded = this.extractCDataOrTag(block, "content:encoded");
          const imageUrl = await this.resolveFeedImage(block, contentEncoded, description, link);

          if (!title || !link) {
            return null;
          }

          const subtitle = categories[0] || "Actualidad";
          const body = this.trimWords(this.stripHtml(description), 36);

          return {
            id: `polohub-${index}-${this.slugify(title)}`,
            type: "news" as const,
            section: "home" as const,
            slot: "main_news" as const,
            title,
            subtitle,
            body,
            imageUrl: imageUrl || "https://polohub.net/wp-content/uploads/2022/06/cropped-favicon-polomagazine-1-270x270.jpg",
            targetUrl: link,
            priority: 100,
            sortOrder: index + 1,
            isActive: true as const
          };
        })
      );

      const items = parsed.filter((item): item is NonNullable<typeof item> => Boolean(item)).slice(0, limit);

      this.polohubCache = {
        expiresAt: now + 1000 * 60 * 10,
        items
      };

      return items;
    } catch {
      return [];
    }
  }

  private extractCDataOrTag(xml: string, tagName: string) {
    const cdataRegex = new RegExp(`<${tagName}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, "i");
    const directRegex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i");

    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch?.[1]) return cdataMatch[1];

    const directMatch = xml.match(directRegex);
    return directMatch?.[1] ?? "";
  }

  private extractImageUrl(content: string) {
    if (!content) return "";
    const imageMatch = content.match(/<img[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+)["']/i);
    if (imageMatch?.[1]) {
      const direct = imageMatch[1].trim();
      if (this.isValidNewsImageUrl(direct)) return direct;
    }

    const srcSetMatch = content.match(/srcset=["']([^"']+)["']/i);
    if (srcSetMatch?.[1]) {
      const srcSetUrl = srcSetMatch[1].split(",")[0]?.trim()?.split(" ")[0]?.trim();
      if (srcSetUrl && this.isValidNewsImageUrl(srcSetUrl)) {
        return srcSetUrl;
      }
    }

    const plainUrlMatches = [...content.matchAll(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi)].map((match) => match[0]?.trim()).filter(Boolean) as string[];
    const preferred = plainUrlMatches.find((url) => this.isValidNewsImageUrl(url));
    return preferred ?? "";
  }

  private async resolveFeedImage(itemBlock: string, content: string, description: string, link: string) {
    const inline = this.extractImageUrl(content) || this.extractImageUrl(description);
    if (inline) return inline;

    const enclosureMatch = itemBlock.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i);
    if (enclosureMatch?.[1] && this.isValidNewsImageUrl(enclosureMatch[1])) {
      return enclosureMatch[1].trim();
    }

    const mediaContentMatch = itemBlock.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*>/i);
    if (mediaContentMatch?.[1] && this.isValidNewsImageUrl(mediaContentMatch[1])) {
      return mediaContentMatch[1].trim();
    }

    if (!link) return "";

    try {
      const response = await fetch(link, {
        headers: {
          "User-Agent": "PoloConnect/1.0"
        }
      });
      if (!response.ok) return "";

      const html = await response.text();
      const ogImage =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1] ||
        html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1] ||
        html.match(/<img[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+)["']/i)?.[1];

      if (ogImage && this.isValidNewsImageUrl(ogImage)) {
        return ogImage.trim();
      }
    } catch {
      return "";
    }

    return "";
  }

  private isValidNewsImageUrl(url: string) {
    if (!url) return false;
    const normalized = url.trim().toLowerCase();
    if (!/^https?:\/\//.test(normalized)) return false;
    if (!/\.(jpg|jpeg|png|webp)(\?|$)/.test(normalized)) return false;
    if (normalized.includes("favicon")) return false;
    return true;
  }

  private stripHtml(value: string) {
    return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  private decodeHtmlEntities(value: string) {
    return value
      .replace(/&#8217;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/&#8211;/g, "-")
      .replace(/&#8230;/g, "...")
      .replace(/&#38;/g, "&")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
  }

  private trimWords(value: string, wordLimit: number) {
    const words = value.split(/\s+/).filter(Boolean);
    if (words.length <= wordLimit) return value;
    return `${words.slice(0, wordLimit).join(" ")}...`;
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48);
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
