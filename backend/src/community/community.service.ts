import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { page } from "../common/dto/pagination.dto";
import { PrismaService } from "../database/prisma.service";
import { MessageQueryDto } from "./dto/community.dto";

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async listRooms(userId: string) {
    const now = new Date();
    const activeBans = await this.prisma.communityBan.findMany({
      where: {
        userId,
        revokedAt: null,
        OR: [{ isPermanent: true }, { expiresAt: { gt: now } }]
      },
      select: { roomId: true }
    });
    const bannedRoomIds = activeBans.map((ban) => ban.roomId);

    const memberships = await this.prisma.chatMembership.findMany({ where: { userId, leftAt: null, roomId: { notIn: bannedRoomIds } }, include: { room: { include: { memberships: { where: { leftAt: null } }, messages: { orderBy: { messageNumber: "desc" }, take: 1 } } } } });
    const joinedIds = memberships.map((entry) => entry.roomId);
    const recommended = await this.prisma.chatRoom.findMany({ where: { deletedAt: null, isPublic: true, id: { notIn: [...joinedIds, ...bannedRoomIds] } }, include: { memberships: { where: { leftAt: null } } }, take: 20 });
    return { joined: memberships.map((entry) => this.toRoomDto(entry.room, 0, false)), recommended: recommended.map((room) => this.toRoomDto(room, 0, true)) };
  }

  async joinRoom(userId: string, roomId: string) {
    await this.ensureRoom(roomId);
    await this.ensureNoActiveBan(userId, roomId);
    await this.prisma.chatMembership.upsert({ where: { roomId_userId: { roomId, userId } }, update: { leftAt: null, joinedAt: new Date() }, create: { roomId, userId } });
    return { ok: true };
  }

  async leaveRoom(userId: string, roomId: string) {
    await this.prisma.chatMembership.updateMany({ where: { roomId, userId, leftAt: null }, data: { leftAt: new Date() } });
    return { ok: true };
  }

  async listMessages(userId: string, roomId: string, query: MessageQueryDto) {
    await this.ensureNoActiveBan(userId, roomId);
    await this.ensureMembership(userId, roomId);
    const limit = Number(query.limit ?? 50);
    const messages = await this.prisma.chatMessage.findMany({
      where: { roomId, deletedAt: null },
      include: { user: true },
      orderBy: { messageNumber: "desc" },
      take: limit + 1
    });
    return page(messages.reverse().map((message) => this.toMessageDto(message, userId)), limit);
  }

  async sendMessage(userId: string, roomId: string, text: string, clientMessageId?: string) {
    await this.ensureNoActiveBan(userId, roomId);
    await this.ensureMembership(userId, roomId);
    const last = await this.prisma.chatMessage.findFirst({ where: { roomId }, orderBy: { messageNumber: "desc" } });
    const messageNumber = BigInt(Number(last?.messageNumber ?? 0) + 1);
    const sanitized = text.trim().replace(/[<>]/g, "");
    const message = await this.prisma.chatMessage.create({ data: { roomId, userId, messageNumber, body: text.trim(), bodySanitized: sanitized }, include: { user: true } });
    return { ...this.toMessageDto(message, userId), clientMessageId };
  }

  private async ensureRoom(roomId: string) {
    const room = await this.prisma.chatRoom.findFirst({ where: { id: roomId, deletedAt: null } });
    if (!room) throw new NotFoundException("Chat room not found.");
    return room;
  }

  private async ensureMembership(userId: string, roomId: string) {
    const membership = await this.prisma.chatMembership.findFirst({ where: { userId, roomId, leftAt: null } });
    if (!membership) throw new ForbiddenException("Join the room before reading or sending messages.");
  }

  private async ensureNoActiveBan(userId: string, roomId?: string) {
    const now = new Date();
    const ban = await this.prisma.communityBan.findFirst({
      where: {
        userId,
        roomId,
        revokedAt: null,
        OR: [{ isPermanent: true }, { expiresAt: { gt: now } }]
      }
    });
    if (ban) {
      throw new ForbiddenException("You are banned from this community.");
    }
  }

  private toRoomDto(room: any, unread = 0, wasRecommended = false) {
    const memberCount = room.memberships?.length ?? 0;
    return {
      id: room.id,
      title: room.title,
      description: room.description,
      members: `${memberCount} miembros`,
      memberCount,
      unread,
      icon: room.icon ?? "chatbubbles-outline",
      tone: room.tone ?? "#d8ecff",
      wasRecommended,
      recommendedLabel: wasRecommended ? "Disponible ahora" : ""
    };
  }

  private toMessageDto(message: any, userId: string) {
    return {
      id: message.id,
      userId: message.userId,
      userName: message.userId === userId ? "Vos" : `${message.user.firstName} ${message.user.lastName}`.trim(),
      text: message.bodySanitized,
      time: new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(message.createdAt),
      createdAt: message.createdAt,
      messageNumber: message.messageNumber.toString(),
      isMe: message.userId === userId
    };
  }
}
