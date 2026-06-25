import { Injectable } from "@nestjs/common";
import { page } from "../common/dto/pagination.dto";
import { PrismaService } from "../database/prisma.service";
import { NotificationsQueryDto, PushTokenDto } from "./dto/notifications.dto";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: NotificationsQueryDto) {
    const limit = Number(query.limit ?? 20);
    const where: any = { userId };
    if (query.read === "false") where.readAt = null;
    if (query.read === "true") where.readAt = { not: null };
    const notifications = await this.prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: limit + 1 });
    return page(notifications.map((notification) => ({ ...notification, read: Boolean(notification.readAt), timeLabel: notification.createdAt.toISOString() })), limit);
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
}
