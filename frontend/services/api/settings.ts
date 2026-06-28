import { apiRequest } from "@/services/api/client";

export type NotificationPreferences = {
  app: {
    messages: boolean;
    matches: boolean;
    tournaments: boolean;
    market: boolean;
    system: boolean;
    community: boolean;
  };
  push: {
    messages: boolean;
    matches: boolean;
    tournaments: boolean;
  };
};

export type UserSettings = {
  userId: string;
  locale: string;
  theme: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  profileVisibility: string;
  notificationPreferences: NotificationPreferences;
  createdAt: string;
  updatedAt: string;
};

export type UpdateSettingsPayload = Partial<Pick<UserSettings, "locale" | "theme" | "pushEnabled" | "emailEnabled" | "profileVisibility">> & {
  notificationPreferences?: Partial<NotificationPreferences>;
};

export async function getMySettings() {
  return apiRequest<UserSettings>("/settings/me");
}

export async function updateMySettings(payload: UpdateSettingsPayload) {
  return apiRequest<UserSettings>("/settings/me", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}