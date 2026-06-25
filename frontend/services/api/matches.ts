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
    left: Array<{ number: number; name: string; goals: string }>;
    right: Array<{ number: number; name: string; goals: string }>;
  };
  comments?: Array<{ id?: string; time?: string; title: string; text: string; type?: string }>;
  youtubeUrl?: string;
  videoPreviewUrl?: string;
};

function normalizeMatch(match: Match): Match {
  return { ...match, date: new Date(match.date) };
}

export async function listMatches(date?: Date, status?: "live" | "upcoming" | "finished") {
  const params = new URLSearchParams({ limit: "50" });
  if (date) params.set("date", date.toISOString().slice(0, 10));
  if (status) params.set("status", status);
  const response = await apiRequest<Page<Match>>(`/matches?${params.toString()}`);
  return response.data.map(normalizeMatch);
}

export async function fetchMatch(id: string) {
  const detail = await apiRequest<MatchDetail>(`/matches/${encodeURIComponent(id)}`);
  return { ...detail, date: new Date(detail.date) };
}

export async function listBroadcasts() {
  const response = await apiRequest<Page<MatchDetail>>("/broadcasts?limit=50");
  return response.data.map((match) => ({ ...match, date: new Date(match.date) }));
}
