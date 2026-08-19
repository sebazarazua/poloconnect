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

function normalizeMatch(match: Match): Match {
  return { ...match, date: parseDateOnly(match.date as any) };
}

export async function listMatches(date?: Date, status?: "live" | "upcoming" | "finished" | "cancelled") {
  const params = new URLSearchParams({ limit: "50" });
  if (date) params.set("date", date.toISOString().slice(0, 10));
  if (status) params.set("status", status);
  const response = await apiRequest<Page<Match>>(`/matches?${params.toString()}`);
  return response.data.map(normalizeMatch);
}

export async function fetchMatch(id: string) {
  const detail = await apiRequest<MatchDetail>(`/matches/${encodeURIComponent(id)}`);
  return { ...detail, date: parseDateOnly(detail.date as any) };
}

export async function listBroadcasts() {
  const response = await apiRequest<Page<MatchDetail>>("/broadcasts?limit=50");
  return response.data.map((match) => ({ ...match, date: parseDateOnly(match.date as any) }));
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
