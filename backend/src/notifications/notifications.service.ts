import { Injectable } from "@nestjs/common";
import { NotificationKind, Prisma } from "@prisma/client";
import { page } from "../common/dto/pagination.dto";
import { PrismaService } from "../database/prisma.service";
import { NotificationsQueryDto, PushTokenDto } from "./dto/notifications.dto";
import { NotificationPreferences, SettingsService } from "../settings/settings.service";

const PUSH_KIND_BY_NOTIFICATION: Partial<Record<NotificationKind, keyof NotificationPreferences["push"]>> = {
  message: "messages",
  match: "matches",
  tournament: "tournaments"
};

const APP_KIND_BY_NOTIFICATION: Partial<Record<NotificationKind, keyof NotificationPreferences["app"]>> = {
  message: "messages",
  match: "matches",
  tournament: "tournaments",
  market: "market",
  system: "system"
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly settings: SettingsService) {}

  async list(userId: string, query: NotificationsQueryDto) {
    const limit = Number(query.limit ?? 20);
    const where: any = { userId };
    if (query.read === "false") where.readAt = null;
    if (query.read === "true") where.readAt = { not: null };
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: limit + 1 }),
      this.prisma.notification.count({ where: { userId, readAt: null } })
    ]);

    return {
      ...page(notifications.map((notification) => this.toNotificationDto(notification)), limit),
      unreadCount
    };
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }

  async savePushToken(userId: string, body: PushTokenDto) {
    await this.prisma.pushToken.upsert({ where: { token: body.token }, update: { userId, platform: body.platform, enabled: true, lastSeenAt: new Date() }, create: { userId, platform: body.platform, token: body.token, lastSeenAt: new Date() } });
    return { ok: true };
  }

  async notifyUser(userId: string, payload: { kind: NotificationKind; title: string; body: string; data?: Prisma.InputJsonValue; expiresAt?: Date | null }) {
    const appEnabled = await this.isAppNotificationEnabled(userId, payload.kind);
    if (!appEnabled) {
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        kind: payload.kind,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        expiresAt: payload.expiresAt ?? null
      }
    });

    void this.maybeSendPush(userId, notification.kind, notification.title, notification.body, payload.data);
    return this.toNotificationDto(notification);
  }

  async notifyUsers(userIds: string[], payload: { kind: NotificationKind; title: string; body: string; data?: Prisma.InputJsonValue; expiresAt?: Date | null }) {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) return [];

    const appEnabledFlags = await Promise.all(uniqueIds.map((userId) => this.isAppNotificationEnabled(userId, payload.kind)));
    const eligibleIds = uniqueIds.filter((_, index) => appEnabledFlags[index]);
    if (eligibleIds.length === 0) return [];

    const notifications = await this.prisma.$transaction(
      eligibleIds.map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            kind: payload.kind,
            title: payload.title,
            body: payload.body,
            data: payload.data ?? {},
            expiresAt: payload.expiresAt ?? null
          }
        })
      )
    );

    await Promise.all(notifications.map((notification) => this.maybeSendPush(notification.userId, notification.kind, notification.title, notification.body, payload.data)));
    return notifications.map((notification) => this.toNotificationDto(notification));
  }

  async notifyRoomMembers(roomId: string, senderId: string, payload: { kind: NotificationKind; title: string; body: string; data?: Prisma.InputJsonValue }) {
    const memberships = await this.prisma.chatMembership.findMany({ where: { roomId, leftAt: null, userId: { not: senderId } }, select: { userId: true } });
    return this.notifyUsers(memberships.map((membership) => membership.userId), payload);
  }

  private toNotificationDto(notification: {
    id: string;
    userId: string;
    kind: NotificationKind;
    title: string;
    body: string;
    data: Prisma.JsonValue;
    readAt: Date | null;
    createdAt: Date;
    expiresAt: Date | null;
  }) {
    return {
      ...notification,
      read: Boolean(notification.readAt),
      timeLabel: this.formatRelativeTime(notification.createdAt),
      createdAt: notification.createdAt.toISOString()
    };
  }

  private async maybeSendPush(userId: string, kind: NotificationKind, title: string, body: string, data?: Prisma.InputJsonValue) {
    const pushPreferenceKey = PUSH_KIND_BY_NOTIFICATION[kind];
    if (!pushPreferenceKey) return;

    const settings = await this.settings.getMe(userId);
    if (!settings.pushEnabled || !settings.notificationPreferences.push[pushPreferenceKey]) return;

    const tokens = await this.prisma.pushToken.findMany({ where: { userId, enabled: true } });
    if (tokens.length === 0) return;

    const messages = tokens.map((token) => ({
      to: token.token,
      sound: "default",
      title,
      body,
      data: { ...(typeof data === "object" && data ? (data as Record<string, unknown>) : {}), kind, userId }
    }));

    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(messages)
      });
    } catch {
      // Push delivery should never block the main user flow.
    }
  }

  private formatRelativeTime(createdAt: Date) {
    const diffMs = Date.now() - createdAt.getTime();
    const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

    if (diffMinutes < 60) {
      return `Hace ${diffMinutes} min`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `Hace ${diffHours} h`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return diffDays === 1 ? "Ayer" : `Hace ${diffDays} días`;
  }

  async isAppNotificationEnabled(userId: string, kind: NotificationKind) {
    const appPreferenceKey = APP_KIND_BY_NOTIFICATION[kind];
    if (!appPreferenceKey) return false;

    const settings = await this.settings.getMe(userId);
    return settings.notificationPreferences.app[appPreferenceKey];
  }
}
