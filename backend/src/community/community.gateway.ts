import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Server } from "socket.io";
import { Socket } from "socket.io";
import { PrismaService } from "../database/prisma.service";

@WebSocketGateway({ namespace: "/ws" })
export class CommunityGateway {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) {}

  private roomChannel(roomId: string) {
    return `chat:room:${roomId}`;
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

  private async authenticate(client: Socket) {
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
    const [membership, activeBan] = await Promise.all([
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

    return Boolean(membership && !activeBan);
  }
}
