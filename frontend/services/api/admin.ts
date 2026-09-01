import { apiRequest } from "@/services/api/client";

export type AdminContentItem = {
  id: string;
  type: "logo" | "ad" | "banner" | "news" | "generic";
  section: string;
  slot: string;
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  imageUrl: string;
  targetUrl?: string | null;
  priority: number;
  sortOrder: number;
  isActive: boolean;
};

export type UpsertAdminContentPayload = Omit<AdminContentItem, "id" | "sortOrder"> & { sortOrder?: number };

export type AdminCommunityRoom = {
  id: string;
  title: string;
  description?: string | null;
  kind: string;
  icon?: string | null;
  tone?: string | null;
  externalCode?: string | null;
  isRecommended: boolean;
  isPublic: boolean;
  createdAt: string;
  _count?: { memberships: number };
};

export type UpsertAdminCommunityRoomPayload = {
  title: string;
  description?: string;
  kind?: string;
  icon?: string;
  tone?: string;
  externalCode?: string;
  isRecommended?: boolean;
  isPublic?: boolean;
};

export type CommunityBan = {
  id: string;
  roomId: string;
  userId: string;
  reason?: string | null;
  isPermanent: boolean;
  expiresAt?: string | null;
  revokedAt?: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
  };
};

export type AdminTournament = {
  id: string;
  name: string;
  slug: string;
  clubId?: string | null;
  startDate: string;
  endDate?: string | null;
  levelLabel?: string | null;
  minHandicap?: number | null;
  maxHandicap?: number | null;
  maxTeams?: number | null;
  contactName?: string | null;
  contactPhone?: string | null;
  registrationStatus?: string;
  status?: string;
  createdAt: string;
};

export type UpsertAdminTournamentPayload = {
  name: string;
  slug: string;
  clubId?: string;
  startDate: string;
  endDate?: string;
  levelLabel?: string;
  minHandicap?: number;
  maxHandicap?: number;
  maxTeams?: number;
  contactName?: string;
  contactPhone?: string;
  registrationStatus?: string;
  status?: string;
};

export async function getAdminDashboard() {
  return apiRequest<{ counters: Record<string, number>; recentActivity: Array<{ id: string; action: string; createdAt: string }> }>("/admin/dashboard");
}

export async function listAdminContent() {
  return apiRequest<AdminContentItem[]>("/admin/content/items");
}

export async function createAdminContent(payload: UpsertAdminContentPayload) {
  return apiRequest<AdminContentItem>("/admin/content/items", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateAdminContent(id: string, payload: UpsertAdminContentPayload) {
  return apiRequest<AdminContentItem>(`/admin/content/items/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function patchAdminContent(id: string, payload: Partial<UpsertAdminContentPayload>) {
  return apiRequest<AdminContentItem>(`/admin/content/items/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function reorderAdminContent(section: string, slot: string, itemIds: string[]) {
  return apiRequest<AdminContentItem[]>("/admin/content/reorder", {
    method: "POST",
    body: JSON.stringify({ section, slot, itemIds })
  });
}

export async function uploadAdminContentImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<{ url: string; filename: string; mimetype: string; size: number }>("/admin/content/upload", {
    method: "POST",
    body: formData
  });
}

export async function deleteAdminContent(id: string) {
  return apiRequest<{ ok: boolean }>(`/admin/content/items/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export async function listCommunityRooms() {
  return apiRequest<AdminCommunityRoom[]>("/admin/community/rooms");
}

export async function createCommunityRoom(payload: UpsertAdminCommunityRoomPayload) {
  return apiRequest<AdminCommunityRoom>("/admin/community/rooms", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateCommunityRoom(roomId: string, payload: Partial<UpsertAdminCommunityRoomPayload>) {
  return apiRequest<AdminCommunityRoom>(`/admin/community/rooms/${encodeURIComponent(roomId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteCommunityRoom(roomId: string) {
  return apiRequest<{ ok: boolean }>(`/admin/community/rooms/${encodeURIComponent(roomId)}`, {
    method: "DELETE"
  });
}

export async function listCommunityMembers(roomId: string) {
  return apiRequest<Array<{ userId: string; user: { id: string; firstName: string; lastName: string; username: string } }>>(`/admin/community/rooms/${encodeURIComponent(roomId)}/members`);
}

export async function listCommunityBans(roomId: string) {
  return apiRequest<CommunityBan[]>(`/admin/community/rooms/${encodeURIComponent(roomId)}/bans`);
}

export async function banCommunityMember(roomId: string, userId: string, reason?: string) {
  return apiRequest<{ ok: boolean }>(`/admin/community/rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(userId)}/ban`, {
    method: "POST",
    body: JSON.stringify({ reason, isPermanent: true })
  });
}

export async function unbanCommunityMember(roomId: string, userId: string, reason?: string) {
  return apiRequest<{ ok: boolean }>(`/admin/community/rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(userId)}/unban`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function removeCommunityMember(roomId: string, userId: string, reason?: string) {
  return apiRequest<{ ok: boolean }>(`/admin/community/rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(userId)}/remove`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function addCommunityMember(roomId: string, userId: string, reason?: string) {
  return apiRequest<{ ok: boolean }>(`/admin/community/rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(userId)}/add`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function listAdminTournaments() {
  return apiRequest<AdminTournament[]>("/admin/sports/tournaments");
}

export async function createAdminTournament(payload: UpsertAdminTournamentPayload) {
  return apiRequest<AdminTournament>("/admin/sports/tournaments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export type AdminTeam = {
  id: string;
  name: string;
  logoUrl?: string | null;
};

export type AdminMatch = {
  id: string;
  externalCode?: string | null;
  tournamentId?: string | null;
  clubId?: string | null;
  team1Id: string;
  team2Id: string;
  team1: { id: string; name: string; logoUrl?: string | null };
  team2: { id: string; name: string; logoUrl?: string | null };
  tournament?: { id: string; name: string } | null;
  scheduledAt: string;
  endsAt?: string | null;
  status: "upcoming" | "live" | "finished" | "cancelled";
  score1: number;
  score2: number;
  currentChukker?: number | null;
  totalChukkers: number;
  competitionName?: string | null;
  youtubeUrl?: string | null;
  backgroundImageUrl?: string | null;
};

export type UpsertAdminMatchPayload = {
  externalCode?: string;
  tournamentId?: string;
  team1Id: string;
  team2Id: string;
  scheduledAt: string;
  endsAt?: string;
  score1?: number;
  score2?: number;
  totalChukkers?: number;
  currentChukker?: number;
  competitionName?: string;
  youtubeUrl?: string;
  backgroundImageUrl?: string;
};

export type UpdateAdminMatchPayload = Partial<Omit<UpsertAdminMatchPayload, "externalCode">>;

export async function listAdminTeams() {
  return apiRequest<AdminTeam[]>("/admin/sports/teams");
}

export async function createAdminTeam(payload: { name: string; logoUrl?: string }) {
  return apiRequest<AdminTeam>("/admin/sports/teams", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminTeam(id: string) {
  return apiRequest<{ ok: boolean }>(`/admin/sports/teams/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export async function uploadAdminTeamLogo(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<{ url: string }>("/admin/sports/teams/upload", {
    method: "POST",
    body: formData
  });
}

export async function listAdminMatches() {
  return apiRequest<AdminMatch[]>("/admin/sports/matches");
}

export async function createAdminMatch(payload: UpsertAdminMatchPayload) {
  return apiRequest<AdminMatch>("/admin/sports/matches", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateAdminMatch(id: string, payload: UpdateAdminMatchPayload) {
  return apiRequest<AdminMatch>(`/admin/sports/matches/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminMatch(id: string) {
  return apiRequest<{ ok: boolean }>(`/admin/sports/matches/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export async function uploadAdminMatchImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<{ url: string }>("/admin/sports/matches/upload", {
    method: "POST",
    body: formData
  });
}

export type AdminSpotlightEvent = {
  id: string;
  title: string;
  description?: string | null;
  scheduledAt: string;
  endsAt?: string | null;
  youtubeUrl?: string | null;
  backgroundImageUrl?: string | null;
};

export type UpsertAdminSpotlightEventPayload = {
  title: string;
  description?: string;
  scheduledAt: string;
  endsAt?: string;
  youtubeUrl?: string;
  backgroundImageUrl?: string;
};

export async function listAdminSpotlightEvents() {
  return apiRequest<AdminSpotlightEvent[]>("/admin/sports/events");
}

export async function createAdminSpotlightEvent(payload: UpsertAdminSpotlightEventPayload) {
  return apiRequest<AdminSpotlightEvent>("/admin/sports/events", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateAdminSpotlightEvent(id: string, payload: Partial<UpsertAdminSpotlightEventPayload>) {
  return apiRequest<AdminSpotlightEvent>(`/admin/sports/events/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminSpotlightEvent(id: string) {
  return apiRequest<{ ok: boolean }>(`/admin/sports/events/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export async function uploadAdminSpotlightEventImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<{ url: string }>("/admin/sports/events/upload", {
    method: "POST",
    body: formData
  });
}

export async function upsertAdminMatchStat(matchId: string, payload: { statKey: string; label: string; team1Value: string; team2Value: string }) {
  return apiRequest<{ ok: boolean }>(`/admin/sports/matches/${encodeURIComponent(matchId)}/stats`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export type LineupPlayerInput = { name: string; handicap?: number };

export async function setAdminMatchLineup(matchId: string, payload: { team1: LineupPlayerInput[]; team2: LineupPlayerInput[]; refereeMain?: string; refereeAssistant?: string }) {
  return apiRequest<{ ok: boolean }>(`/admin/sports/matches/${encodeURIComponent(matchId)}/lineups`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}
