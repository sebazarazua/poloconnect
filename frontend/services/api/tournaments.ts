import { apiRequest } from "@/services/api/client";

type Page<T> = {
  data: T[];
  page: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type Tournament = {
  id: string;
  name: string;
  date: string;
  month: number;
  year: number;
  day: number;
  level?: string;
  club?: string;
  handicapRange?: string;
  teamCount: number;
  maxTeams?: number;
  contactName?: string;
  contactPhone?: string;
  registrations?: unknown[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeTournament(value: unknown): Tournament | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const name = asString(value.name);
  if (!id || !name) return null;

  return {
    id,
    name,
    date: asString(value.date),
    month: asNumber(value.month),
    year: asNumber(value.year),
    day: asNumber(value.day),
    level: asString(value.level) || undefined,
    club: asString(value.club) || undefined,
    handicapRange: asString(value.handicapRange) || undefined,
    teamCount: asNumber(value.teamCount),
    maxTeams: typeof value.maxTeams === "number" && Number.isFinite(value.maxTeams) ? value.maxTeams : undefined,
    contactName: asString(value.contactName) || undefined,
    contactPhone: asString(value.contactPhone) || undefined,
    registrations: Array.isArray(value.registrations) ? value.registrations : undefined
  };
}

export async function listTournaments(params: { month?: number; year?: number; registrationStatus?: string } = {}) {
  const search = new URLSearchParams({ limit: "50" });
  if (params.month !== undefined) search.set("month", String(params.month + 1));
  if (params.year !== undefined) search.set("year", String(params.year));
  if (params.registrationStatus) search.set("registrationStatus", params.registrationStatus);

  const response = await apiRequest<Page<Tournament>>(`/tournaments?${search.toString()}`);
  return (Array.isArray(response.data) ? response.data : [])
    .map(normalizeTournament)
    .filter((tournament): tournament is Tournament => Boolean(tournament));
}

export async function fetchTournament(id: string) {
  const tournament = await apiRequest<Tournament>(`/tournaments/${encodeURIComponent(id)}`);
  const normalizedTournament = normalizeTournament(tournament);
  if (!normalizedTournament) {
    throw new Error("Torneo invÃ¡lido.");
  }

  return normalizedTournament;
}
