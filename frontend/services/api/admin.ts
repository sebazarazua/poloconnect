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

export async function createAdminContent(payload: Omit<AdminContentItem, "id">) {
  return apiRequest<AdminContentItem>("/admin/content/items", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateAdminContent(id: string, payload: Omit<AdminContentItem, "id">) {
  return apiRequest<AdminContentItem>(`/admin/content/items/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
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
  return apiRequest<Array<{ id: string; title: string; kind: string }>>("/admin/community/rooms");
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
