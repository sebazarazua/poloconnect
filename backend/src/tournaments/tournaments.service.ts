import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { page } from "../common/dto/pagination.dto";
import { PrismaService } from "../database/prisma.service";
import { RegisterTeamDto, TournamentsQueryDto } from "./dto/tournaments.dto";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async list(query: TournamentsQueryDto) {
    const limit = Number(query.limit ?? 50);
    const where: any = { deletedAt: null };
    if (query.registrationStatus) where.registrationStatus = query.registrationStatus;
    if (query.month && query.year) {
      const start = new Date(Date.UTC(query.year, query.month - 1, 1));
      const end = new Date(Date.UTC(query.year, query.month, 1));
      where.startDate = { gte: start, lt: end };
    }
    const tournaments = await this.prisma.tournament.findMany({ where, include: { club: true, registrations: true }, orderBy: { startDate: "asc" }, take: limit + 1 });
    return page(tournaments.map((tournament) => this.toTournamentDto(tournament)), limit);
  }

  async detail(id: string) {
    const tournament = await this.find(id);
    return this.toTournamentDto(tournament, true);
  }

  async registerTeam(userId: string, id: string, body: RegisterTeamDto) {
    const tournament = await this.find(id);
    if (tournament.registrationStatus !== "open") throw new BadRequestException("Tournament registration is closed.");
    if (tournament.maxTeams && tournament.registrations.length >= tournament.maxTeams) throw new BadRequestException("Tournament is full.");
    const totalHandicap = body.players.reduce((sum, player) => sum + Number(player.handicap), 0);
    const registration = await this.prisma.tournamentRegistration.create({
      data: {
        tournamentId: tournament.id,
        teamName: body.teamName.trim(),
        captainUserId: userId,
        contactPhone: body.contactPhone,
        notes: body.notes,
        totalHandicap,
        players: {
          create: await Promise.all(body.players.map(async (player) => ({
            position: player.position,
            player: { create: { displayName: player.displayName.trim(), handicap: player.handicap } }
          })))
        }
      },
      include: { players: { include: { player: true } } }
    });
    void this.notifications.notifyUser(userId, {
      kind: "tournament",
      title: "Inscripción recibida",
      body: `Tu equipo ${body.teamName.trim()} quedó registrado en ${tournament.name}.`,
      data: { tournamentId: tournament.id, registrationId: registration.id }
    });
    return registration;
  }

  async registrations(id: string) {
    const tournament = await this.find(id);
    return this.prisma.tournamentRegistration.findMany({ where: { tournamentId: tournament.id }, include: { players: { include: { player: true } }, captain: true } });
  }

  private async find(id: string) {
    const tournament = await this.prisma.tournament.findFirst({ where: { OR: [{ id }, { slug: id }], deletedAt: null }, include: { club: true, registrations: true } });
    if (!tournament) throw new NotFoundException("Tournament not found.");
    return tournament;
  }

  private toTournamentDto(tournament: any, detail = false) {
    return {
      id: tournament.id,
      name: tournament.name,
      date: tournament.startDate.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }),
      month: tournament.startDate.getUTCMonth(),
      year: tournament.startDate.getUTCFullYear(),
      day: tournament.startDate.getUTCDate(),
      level: tournament.levelLabel,
      club: tournament.club?.name,
      handicapRange: tournament.minHandicap !== null && tournament.maxHandicap !== null ? `Desde ${tournament.minHandicap} a ${tournament.maxHandicap} goles` : undefined,
      teamCount: tournament.registrations?.length ?? 0,
      maxTeams: tournament.maxTeams,
      contactName: tournament.contactName,
      contactPhone: tournament.contactPhone,
      registrations: detail ? tournament.registrations : undefined
    };
  }
}
