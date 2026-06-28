import { Injectable, NotFoundException } from "@nestjs/common";
import { page } from "../common/dto/pagination.dto";
import { PrismaService } from "../database/prisma.service";
import { MatchesQueryDto, UpdateLiveStateDto } from "./dto/matches.dto";

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  async list(query: MatchesQueryDto) {
    const limit = Number(query.limit ?? 50);
    const where: any = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.date) {
      const start = new Date(`${query.date}T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      where.scheduledAt = { gte: start, lt: end };
    }
    const matches = await this.prisma.match.findMany({ where, include: this.include(), orderBy: { scheduledAt: "asc" }, take: limit + 1 });
    return page(matches.map((match) => this.toMatchDto(match)), limit);
  }

  async detail(id: string) {
    const match = await this.findMatch(id, { lineups: { include: { player: true, team: true }, orderBy: { position: "asc" } }, stats: true, events: { orderBy: { eventNumber: "desc" }, take: 50 }, ...this.include() });
    return {
      ...this.toMatchDto(match),
      stats: match.stats.map((stat: any) => ({ label: stat.label, left: stat.team1Value, right: stat.team2Value, leftValue: Number(stat.team1Percent ?? 0), rightValue: Number(stat.team2Percent ?? 0) })),
      lineups: this.toLineups(match),
      comments: match.events.map((event: any) => ({ id: event.id, time: event.matchClock, title: event.title, text: event.body, type: event.eventType })),
      youtubeUrl: match.youtubeUrl,
      videoPreviewUrl: match.videoPreviewUrl
    };
  }

  async events(id: string, query: MatchesQueryDto) {
    const match = await this.findMatch(id);
    const limit = Number(query.limit ?? 50);
    const events = await this.prisma.matchEvent.findMany({ where: { matchId: match.id }, orderBy: { eventNumber: "desc" }, take: limit + 1 });
    return page(events.map((event) => ({ id: event.id, eventNumber: event.eventNumber.toString(), time: event.matchClock, title: event.title, text: event.body, type: event.eventType })), limit);
  }

  async broadcasts(query: MatchesQueryDto) {
    const limit = Number(query.limit ?? 50);
    const matches = await this.prisma.match.findMany({ where: { deletedAt: null, youtubeUrl: { not: null } }, include: this.include(), orderBy: { scheduledAt: "desc" }, take: limit + 1 });
    return page(matches.map((match) => ({ ...this.toMatchDto(match), youtubeUrl: match.youtubeUrl, dateLabel: match.scheduledAt.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }) })), limit);
  }

  async updateLiveState(userId: string, id: string, body: UpdateLiveStateDto) {
    const match = await this.findMatch(id);
    const updated = await this.prisma.match.update({ where: { id: match.id }, data: { score1: body.score1, score2: body.score2, currentChukker: body.currentChukker, status: body.status, version: { increment: 1 } }, include: this.include() });
    if (body.title && body.body) {
      const last = await this.prisma.matchEvent.findFirst({ where: { matchId: match.id }, orderBy: { eventNumber: "desc" } });
      await this.prisma.matchEvent.create({ data: { matchId: match.id, eventNumber: BigInt(Number(last?.eventNumber ?? 0) + 1), eventType: body.eventType ?? "commentary", matchClock: body.matchClock, title: body.title, body: body.body, createdBy: userId } });
    }
    return this.toMatchDto(updated);
  }

  private include() {
    return { team1: true, team2: true, club: true, tournament: true } as const;
  }

  private async findMatch(id: string, include: any = this.include()) {
    const where = this.isUuid(id)
      ? { OR: [{ id }, { externalCode: id }], deletedAt: null }
      : { externalCode: id, deletedAt: null };

    const match = await this.prisma.match.findFirst({ where, include });
    if (!match) throw new NotFoundException("Match not found.");
    return match as any;
  }

  private toMatchDto(match: any) {
    return {
      id: match.id,
      externalCode: match.externalCode,
      time: match.scheduledAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }),
      team1: match.team1.name,
      team2: match.team2.name,
      score1: match.score1,
      score2: match.score2,
      competition: match.competitionName ?? match.tournament?.name ?? "Partido",
      status: match.status,
      chukker: match.currentChukker ? `${match.currentChukker} de ${match.totalChukkers}` : undefined,
      club: match.club?.name ?? "",
      date: match.scheduledAt.toISOString().slice(0, 10)
    };
  }

  private toLineups(match: any) {
    const grouped = { left: [] as any[], right: [] as any[] };
    for (const lineup of match.lineups ?? []) {
      const item = { number: lineup.shirtNumber ?? lineup.position, name: lineup.player.displayName, goals: lineup.goalsLabel ?? "0 goles" };
      if (lineup.teamId === match.team1Id) grouped.left.push(item);
      if (lineup.teamId === match.team2Id) grouped.right.push(item);
    }
    return grouped;
  }
}
