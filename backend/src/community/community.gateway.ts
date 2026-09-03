import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Server } from "socket.io";
import { Socket } from "socket.io";
import { PrismaService } from "../database/prisma.service";

@WebSocketGateway({ namespace: "/ws" })
export class CommunityGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) {}

  private roomChannel(roomId: string) {
    return `chat:room:${roomId}`;
  }

  private userChannel(userId: string) {
    return `user:${userId}`;
  }

  async handleConnection(client: Socket) {
    const userId = await this.authenticate(client);
    if (!userId) {
      client.disconnect(true);
      return;
    }

    client.data.userId = userId;
    client.join(this.userChannel(userId));
  }

  @SubscribeMessage("join_room")
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: { roomId: string }) {
    if (!body?.roomId) {
      return { event: "joined_room", roomId: null, ok: false };
    }

    const userId = await this.authenticate(client);
    if (!userId || !(await this.canJoinRoom(userId, body.roomId))) {
      return { event: "joined_room", roomId: body.roomId, ok: false };
    }

    client.join(this.roomChannel(body.roomId));
    return { event: "joined_room", roomId: body.roomId, ok: true };
  }

  @SubscribeMessage("leave_room")
  leave(@ConnectedSocket() client: Socket, @MessageBody() body: { roomId: string }) {
    if (body?.roomId) {
      client.leave(this.roomChannel(body.roomId));
    }
    return { event: "left_room", roomId: body?.roomId ?? null };
  }

  emitMessage(roomId: string, message: Record<string, unknown>) {
    this.server.to(this.roomChannel(roomId)).emit("message_received", { roomId, message });
  }

  emitMembershipJoined(roomId: string, userId: string) {
    const payload = { roomId, userId };
    this.server.to(this.roomChannel(roomId)).emit("community_membership_joined", payload);
    this.server.to(this.userChannel(userId)).emit("community_membership_joined", payload);
  }

  emitMembershipLeft(roomId: string, userId: string) {
    const payload = { roomId, userId };
    this.server.to(this.roomChannel(roomId)).emit("community_membership_left", payload);
    this.server.to(this.userChannel(userId)).emit("community_membership_left", payload);
  }

  emitMembershipRemoved(roomId: string, userId: string) {
    const payload = { roomId, userId, reason: "removed" };
    this.server.to(this.roomChannel(roomId)).emit("community_membership_removed", payload);
    this.server.to(this.userChannel(userId)).emit("community_membership_removed", payload);
    this.server.to(this.userChannel(userId)).emit("community_access_invalidated", payload);
  }

  emitMembershipBanned(roomId: string, userId: string, metadata: Record<string, unknown> = {}) {
    const payload = { roomId, userId, reason: "banned", ...metadata };
    this.server.to(this.roomChannel(roomId)).emit("community_membership_banned", payload);
    this.server.to(this.userChannel(userId)).emit("community_membership_banned", payload);
    this.server.to(this.userChannel(userId)).emit("community_access_invalidated", payload);
  }

  emitMembershipUnbanned(roomId: string, userId: string) {
    const payload = { roomId, userId, reason: "unbanned" };
    this.server.to(this.userChannel(userId)).emit("community_membership_unbanned", payload);
    this.server.emit("community_rooms_changed", payload);
  }

  emitRoomUpdated(roomId: string) {
    const payload = { roomId, reason: "room_updated" };
    this.server.to(this.roomChannel(roomId)).emit("community_room_updated", payload);
    this.server.emit("community_rooms_changed", payload);
  }

  emitRoomDeleted(roomId: string, userIds: string[]) {
    const payload = { roomId, reason: "room_deleted" };
    this.server.to(this.roomChannel(roomId)).emit("community_room_deleted", payload);
    for (const userId of userIds) {
      this.server.to(this.userChannel(userId)).emit("community_room_deleted", payload);
      this.server.to(this.userChannel(userId)).emit("community_access_invalidated", payload);
    }
    this.server.emit("community_rooms_changed", payload);
  }

  private async authenticate(client: Socket) {
    const existingUserId = typeof client.data.userId === "string" ? client.data.userId : null;
    if (existingUserId) {
      const user = await this.prisma.user.findFirst({
        where: { id: existingUserId, deletedAt: null, status: "active" },
        select: { id: true }
      });
      return user?.id ?? null;
    }

    const authToken = client.handshake.auth?.token;
    const authHeader = client.handshake.headers.authorization;
    const token =
      typeof authToken === "string"
        ? authToken
        : typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    if (!token) return null;

    try {
      const payload = await this.jwt.verifyAsync(token, { secret: this.config.get<string>("JWT_ACCESS_SECRET") });
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, deletedAt: null, status: "active" },
        select: { id: true }
      });
      return user?.id ?? null;
    } catch {
      return null;
    }
  }

  private async canJoinRoom(userId: string, roomId: string) {
    const now = new Date();
    const [room, membership, activeBan] = await Promise.all([
      this.prisma.chatRoom.findFirst({ where: { id: roomId, deletedAt: null }, select: { id: true } }),
      this.prisma.chatMembership.findFirst({ where: { userId, roomId, leftAt: null }, select: { roomId: true } }),
      this.prisma.communityBan.findFirst({
        where: {
          userId,
          roomId,
          revokedAt: null,
          OR: [{ isPermanent: true }, { expiresAt: { gt: now } }]
        },
        select: { id: true }
      })
    ]);

    return Boolean(room && membership && !activeBan);
  }
}
