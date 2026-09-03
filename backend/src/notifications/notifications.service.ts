import { Injectable, Logger } from "@nestjs/common";
import { NotificationKind, Prisma } from "@prisma/client";
import { page } from "../common/dto/pagination.dto";
import { PrismaService } from "../database/prisma.service";
import { NotificationsQueryDto, PushTokenDto, PushTokenUnregisterDto } from "./dto/notifications.dto";
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

const EXPO_PUSH_SEND_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
const EXPO_PUSH_BATCH_SIZE = 100;

type ExpoPushTicket = {
  status?: string;
  id?: string;
  message?: string;
  details?: { error?: string };
};

type ExpoPushSendResponse = {
  data?: ExpoPushTicket[];
};

type ExpoPushReceipt = {
  status?: string;
  message?: string;
  details?: { error?: string };
};

type ExpoPushReceiptResponse = {
  data?: Record<string, ExpoPushReceipt>;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

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

  async unregisterPushToken(userId: string, body: PushTokenUnregisterDto) {
    await this.prisma.pushToken.updateMany({
      where: { userId, token: body.token },
      data: { enabled: false, lastSeenAt: new Date() }
    });
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

  async sendTestPush(userId: string) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        kind: "system",
        title: "Polo Connect",
        body: "Notificacion de prueba",
        data: { kind: "system", route: "/notifications", test: true }
      }
    });

    const tokensQueued = await this.sendPushToUserTokens(userId, notification.title, notification.body, notification.data);
    return { ok: true, notificationId: notification.id, tokensQueued };
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

    await this.sendPushToUserTokens(userId, title, body, { ...(typeof data === "object" && data ? (data as Record<string, unknown>) : {}), kind });
  }

  private async sendPushToUserTokens(userId: string, title: string, body: string, data?: Prisma.InputJsonValue) {
    const tokens = await this.prisma.pushToken.findMany({ where: { userId, enabled: true } });
    if (tokens.length === 0) return 0;

    const messages = tokens.map((pushToken) => ({
      token: pushToken.token,
      message: {
        to: pushToken.token,
        sound: "default",
        title,
        body,
        data: typeof data === "object" && data ? (data as Record<string, unknown>) : {}
      }
    }));

    for (let index = 0; index < messages.length; index += EXPO_PUSH_BATCH_SIZE) {
      const batch = messages.slice(index, index + EXPO_PUSH_BATCH_SIZE);

      try {
        const response = await fetch(EXPO_PUSH_SEND_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(batch.map((entry) => entry.message))
        });

        if (!response.ok) {
          this.logger.warn(`Expo push send failed with status ${response.status}`);
          continue;
        }

        const payload = (await response.json()) as ExpoPushSendResponse;
        const receiptTokenPairs: Array<{ receiptId: string; token: string }> = [];
        const tokensToDisable: string[] = [];

        payload.data?.forEach((ticket, ticketIndex) => {
          const token = batch[ticketIndex]?.token;
          if (!token) return;

          if (ticket.status === "ok" && ticket.id) {
            receiptTokenPairs.push({ receiptId: ticket.id, token });
            return;
          }

          if (ticket.details?.error === "DeviceNotRegistered") {
            tokensToDisable.push(token);
          }

          if (ticket.status === "error") {
            this.logger.warn(`Expo push ticket error: ${ticket.details?.error ?? ticket.message ?? "unknown"}`);
          }
        });

        await this.disablePushTokens(tokensToDisable);
        this.scheduleReceiptCheck(receiptTokenPairs);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Expo push send exception: ${message}`);
      }
    }

    return tokens.length;
  }

  private scheduleReceiptCheck(receiptTokenPairs: Array<{ receiptId: string; token: string }>) {
    if (receiptTokenPairs.length === 0) return;

    const timeout = setTimeout(() => {
      void this.checkExpoReceipts(receiptTokenPairs);
    }, 15_000);

    timeout.unref?.();
  }

  private async checkExpoReceipts(receiptTokenPairs: Array<{ receiptId: string; token: string }>) {
    const receiptIds = receiptTokenPairs.map((entry) => entry.receiptId);
    const tokenByReceiptId = new Map(receiptTokenPairs.map((entry) => [entry.receiptId, entry.token]));

    try {
      const response = await fetch(EXPO_PUSH_RECEIPTS_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ids: receiptIds })
      });

      if (!response.ok) {
        this.logger.warn(`Expo push receipt check failed with status ${response.status}`);
        return;
      }

      const payload = (await response.json()) as ExpoPushReceiptResponse;
      const tokensToDisable: string[] = [];

      for (const [receiptId, receipt] of Object.entries(payload.data ?? {})) {
        if (receipt.details?.error === "DeviceNotRegistered") {
          const token = tokenByReceiptId.get(receiptId);
          if (token) tokensToDisable.push(token);
        }

        if (receipt.status === "error") {
          this.logger.warn(`Expo push receipt error: ${receipt.details?.error ?? receipt.message ?? "unknown"}`);
        }
      }

      await this.disablePushTokens(tokensToDisable);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Expo push receipt exception: ${message}`);
    }
  }

  private async disablePushTokens(tokens: string[]) {
    const uniqueTokens = [...new Set(tokens.filter(Boolean))];
    if (uniqueTokens.length === 0) return;

    await this.prisma.pushToken.updateMany({
      where: { token: { in: uniqueTokens } },
      data: { enabled: false }
    });
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
