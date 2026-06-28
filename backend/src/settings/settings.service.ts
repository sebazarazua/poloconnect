import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

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

const SHARED_NOTIFICATION_KEYS: Array<keyof NotificationPreferences["push"]> = ["messages", "matches", "tournaments"];

export type ResolvedUserSettings = {
  userId: string;
  locale: string;
  theme: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  profileVisibility: string;
  notificationPreferences: NotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  app: {
    messages: true,
    matches: true,
    tournaments: true,
    market: true,
    system: true,
    community: true
  },
  push: {
    messages: true,
    matches: true,
    tournaments: true
  }
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<ResolvedUserSettings> {
    const settings = await this.prisma.userSettings.upsert({ where: { userId }, update: {}, create: { userId } });
    return this.resolveSettings(settings);
  }

  async updateMe(userId: string, body: any): Promise<ResolvedUserSettings> {
    const current = await this.prisma.userSettings.upsert({ where: { userId }, update: {}, create: { userId } });
    const nextPreferences = this.syncNotificationChannels(this.mergeNotificationPreferences(current.notificationPreferences, body?.notificationPreferences));
    const nextPushEnabled = typeof body?.pushEnabled === "boolean"
      ? body.pushEnabled
      : SHARED_NOTIFICATION_KEYS.some((key) => nextPreferences.push[key]);

    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      update: {
        locale: typeof body?.locale === "string" ? body.locale : current.locale,
        theme: typeof body?.theme === "string" ? body.theme : current.theme,
        pushEnabled: nextPushEnabled,
        emailEnabled: typeof body?.emailEnabled === "boolean" ? body.emailEnabled : current.emailEnabled,
        profileVisibility: typeof body?.profileVisibility === "string" ? body.profileVisibility : current.profileVisibility,
        notificationPreferences: nextPreferences as unknown as Prisma.InputJsonValue
      },
      create: {
        userId,
        locale: typeof body?.locale === "string" ? body.locale : current.locale,
        theme: typeof body?.theme === "string" ? body.theme : current.theme,
        pushEnabled: nextPushEnabled,
        emailEnabled: typeof body?.emailEnabled === "boolean" ? body.emailEnabled : current.emailEnabled,
        profileVisibility: typeof body?.profileVisibility === "string" ? body.profileVisibility : current.profileVisibility,
        notificationPreferences: nextPreferences as unknown as Prisma.InputJsonValue
      }
    });

    return this.resolveSettings(settings);
  }

  private resolveSettings(settings: {
    userId: string;
    locale: string;
    theme: string;
    pushEnabled: boolean;
    emailEnabled: boolean;
    profileVisibility: string;
    notificationPreferences: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): ResolvedUserSettings {
    return {
      userId: settings.userId,
      locale: settings.locale,
      theme: settings.theme,
      pushEnabled: settings.pushEnabled,
      emailEnabled: settings.emailEnabled,
      profileVisibility: settings.profileVisibility,
      notificationPreferences: this.syncNotificationChannels(this.mergeNotificationPreferences(settings.notificationPreferences)),
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt
    };
  }

  private syncNotificationChannels(preferences: NotificationPreferences): NotificationPreferences {
    const nextPush = { ...preferences.push };

    for (const key of SHARED_NOTIFICATION_KEYS) {
      nextPush[key] = preferences.app[key];
    }

    return {
      app: { ...preferences.app },
      push: nextPush
    };
  }

  private mergeNotificationPreferences(value?: Prisma.JsonValue, override?: unknown): NotificationPreferences {
    const base = this.normalizePreferences(value);
    const patch = this.normalizePreferences(override);

    return {
      app: { ...base.app, ...patch.app },
      push: { ...base.push, ...patch.push }
    };
  }

  private normalizePreferences(value?: Prisma.JsonValue | unknown): Partial<NotificationPreferences> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    const candidate = value as Record<string, unknown>;
    return {
      app: this.normalizeGroup(candidate.app, DEFAULT_NOTIFICATION_PREFERENCES.app),
      push: this.normalizeGroup(candidate.push, DEFAULT_NOTIFICATION_PREFERENCES.push)
    };
  }

  private normalizeGroup<T extends Record<string, boolean>>(value: unknown, defaults: T): T {
    const normalized: Record<string, boolean> = { ...defaults };

    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [key, defaultValue] of Object.entries(defaults)) {
        const nextValue = (value as Record<string, unknown>)[key];
        normalized[key] = typeof nextValue === "boolean" ? nextValue : defaultValue;
      }
    }

    return normalized as T;
  }
}