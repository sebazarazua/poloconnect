import { apiRequest } from "@/services/api/client";

export type ReportContentType = "user" | "chat_message" | "marketplace_listing" | "horse" | "image" | "other";
export type ReportReason = "inappropriate" | "harassment" | "spam" | "scam" | "false_information" | "sexual_content" | "violence" | "hate_speech" | "impersonation" | "rights_violation" | "other";
export type ReportStatus = "pending" | "in_review" | "resolved" | "dismissed";
export type ModerationActionType = "report_status_changed" | "content_hidden" | "content_deleted" | "user_warned" | "user_temporarily_suspended" | "user_permanently_banned" | "user_restored" | "content_restored";

export type ReportPayload = {
  contentType: ReportContentType;
  contentId?: string;
  reportedUserId?: string;
  reason: ReportReason;
  description?: string;
  context?: Record<string, unknown>;
};

export type ModerationUser = { id: string; firstName: string; lastName: string; username: string; avatarUrl?: string | null; email?: string };
export type ModerationReport = {
  id: string;
  contentType: ReportContentType;
  contentId?: string | null;
  reason: ReportReason;
  description?: string | null;
  status: ReportStatus;
  priority: number;
  internalNote?: string | null;
  actionTaken?: string | null;
  createdAt: string;
  reporter?: ModerationUser | null;
  reportedUser?: ModerationUser | null;
  moderator?: ModerationUser | null;
  _count?: { actions: number };
};

type Page<T> = { data: T[]; page: { limit: number; nextCursor: string | null; hasMore: boolean } };

export async function createReport(payload: ReportPayload) {
  return apiRequest<{ id: string }>("/reports", { method: "POST", body: JSON.stringify(payload) });
}

export async function blockUser(id: string) {
  return apiRequest<{ ok: boolean }>(`/users/${encodeURIComponent(id)}/block`, { method: "POST" });
}

export async function unblockUser(id: string) {
  return apiRequest<{ ok: boolean }>(`/users/${encodeURIComponent(id)}/block`, { method: "DELETE" });
}

export async function listBlockedUsers() {
  return apiRequest<Array<{ blockerUserId: string; blockedUserId: string; createdAt: string; blocked: ModerationUser }>>("/users/me/blocked");
}

export async function listAdminReports(status?: ReportStatus) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<Page<ModerationReport>>(`/admin/moderation/reports${query}`);
}

export async function updateAdminReport(id: string, payload: { status?: ReportStatus; internalNote?: string; actionTaken?: string }) {
  return apiRequest<ModerationReport>(`/admin/moderation/reports/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function applyAdminModerationAction(id: string, payload: { action: ModerationActionType; note?: string; durationDays?: number }) {
  return apiRequest<ModerationReport>(`/admin/moderation/reports/${encodeURIComponent(id)}/actions`, { method: "POST", body: JSON.stringify(payload) });
}

export async function listAdminSanctions() {
  return apiRequest<Page<any>>("/admin/moderation/sanctions?active=true");
}

export async function listAdminModerationActions() {
  return apiRequest<Page<{ id: string; action: ModerationActionType; note?: string | null; createdAt: string; targetUser?: ModerationUser | null; moderator?: ModerationUser | null; report?: { id: string; reason: ReportReason; status: ReportStatus } | null }>>("/admin/moderation/actions");
}

export async function revokeAdminSanction(id: string, note?: string) {
  return apiRequest<{ ok: boolean }>(`/admin/moderation/sanctions/${encodeURIComponent(id)}/revoke`, { method: "POST", body: JSON.stringify({ note }) });
}
