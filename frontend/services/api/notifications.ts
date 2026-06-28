import { apiRequest } from "@/services/api/client";

export type NotificationKind = "match" | "market" | "tournament" | "message" | "system" | "community";

export type NotificationItem = {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  read: boolean;
  timeLabel: string;
  createdAt: string;
  expiresAt: string | null;
};

export type NotificationsResponse = {
  data: NotificationItem[];
  page: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
  unreadCount: number;
};

export type PushTokenPayload = {
  platform: string;
  token: string;
};

export async function getNotifications(query: { limit?: number; read?: "true" | "false" } = {}) {
  const params = new URLSearchParams();
  if (query.limit) params.set("limit", String(query.limit));
  if (query.read) params.set("read", query.read);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<NotificationsResponse>(`/notifications${suffix}`);
}

export async function markNotificationRead(id: string) {
  return apiRequest<{ ok: boolean }>(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead() {
  return apiRequest<{ ok: boolean }>("/notifications/read-all", { method: "PATCH" });
}

export async function savePushToken(payload: PushTokenPayload) {
  return apiRequest<{ ok: boolean }>("/push-tokens", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}