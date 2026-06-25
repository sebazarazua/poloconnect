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

export async function listTournaments(params: { month?: number; year?: number; registrationStatus?: string } = {}) {
  const search = new URLSearchParams({ limit: "50" });
  if (params.month !== undefined) search.set("month", String(params.month + 1));
  if (params.year !== undefined) search.set("year", String(params.year));
  if (params.registrationStatus) search.set("registrationStatus", params.registrationStatus);

  const response = await apiRequest<Page<Tournament>>(`/tournaments?${search.toString()}`);
  return response.data;
}

export async function fetchTournament(id: string) {
  return apiRequest<Tournament>(`/tournaments/${encodeURIComponent(id)}`);
}
