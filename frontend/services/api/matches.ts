import { apiRequest } from "@/services/api/client";
import type { Match } from "@/services/matches";

type Page<T> = {
  data: T[];
  page: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type MatchDetail = Match & {
  stats?: Array<{ label: string; left: string; right: string; leftValue: number; rightValue: number }>;
  lineups?: {
    left: Array<{ number: number; name: string; handicap?: number; goals?: string }>;
    right: Array<{ number: number; name: string; handicap?: number; goals?: string }>;
  };
  referees?: { main?: string; assistant?: string };
  comments?: Array<{ id?: string; time?: string; title: string; text: string; type?: string }>;
  youtubeUrl?: string;
  videoPreviewUrl?: string;
};

// A bare "YYYY-MM-DD" string is parsed by `new Date()` as UTC midnight, which
// rolls to the wrong local day for any timezone behind UTC (e.g. Argentina).
// Appending a time-less local anchor keeps it on the intended calendar day.
function parseDateOnly(value: string) {
  return new Date(`${String(value).slice(0, 10)}T00:00:00`);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeStatus(value: unknown): Match["status"] {
  return value === "live" || value === "finished" || value === "cancelled" || value === "upcoming"
    ? value
    : "upcoming";
}

function normalizeMatch(match: unknown): Match | null {
  if (!isRecord(match)) return null;

  return {
    ...(match as Partial<Match>),
    id: asString(match.id, `match-${Date.now()}`),
    time: asString(match.time, "00:00"),
    team1: asString(match.team1, "Equipo 1"),
    team2: asString(match.team2, "Equipo 2"),
    score1: asNumber(match.score1),
    score2: asNumber(match.score2),
    competition: asString(match.competition, "Partido"),
    status: normalizeStatus(match.status),
    club: asString(match.club),
    date: parseDateOnly(match.date as any),
    chukker: asString(match.chukker) || undefined,
    team1LogoUrl: asString(match.team1LogoUrl) || undefined,
    team2LogoUrl: asString(match.team2LogoUrl) || undefined,
    backgroundImageUrl: asString(match.backgroundImageUrl) || undefined
  };
}

export async function listMatches(date?: Date, status?: "live" | "upcoming" | "finished" | "cancelled") {
  const params = new URLSearchParams({ limit: "50" });
  if (date) params.set("date", date.toISOString().slice(0, 10));
  if (status) params.set("status", status);
  const response = await apiRequest<Page<Match>>(`/matches?${params.toString()}`);
  return (Array.isArray(response.data) ? response.data : [])
    .map(normalizeMatch)
    .filter((match): match is Match => Boolean(match));
}

export async function fetchMatch(id: string) {
  const detail = await apiRequest<MatchDetail>(`/matches/${encodeURIComponent(id)}`);
  const normalizedMatch = normalizeMatch(detail);
  if (!normalizedMatch) {
    throw new Error("Partido invÃ¡lido.");
  }

  return { ...detail, ...normalizedMatch, date: parseDateOnly(detail.date as any) };
}

export async function listBroadcasts() {
  const response = await apiRequest<Page<MatchDetail>>("/broadcasts?limit=50");
  return (Array.isArray(response.data) ? response.data : [])
    .map((match) => {
      const normalizedMatch = normalizeMatch(match);
      return normalizedMatch ? { ...match, ...normalizedMatch, date: parseDateOnly(match.date as any) } : null;
    })
    .filter((match): match is MatchDetail => Boolean(match));
}

export async function updateMatchLiveState(
  id: string,
  payload: {
    score1?: number;
    score2?: number;
    currentChukker?: number;
    status?: "upcoming" | "live" | "finished" | "cancelled";
    title?: string;
    body?: string;
    eventType?: string;
    matchClock?: string;
  }
) {
  return apiRequest<Match>(`/matches/${encodeURIComponent(id)}/live-state`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}
