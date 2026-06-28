import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { Socket } from "socket.io";

@WebSocketGateway({ namespace: "/ws", cors: { origin: true, credentials: true } })
export class CommunityGateway {
  @WebSocketServer() server!: Server;

  private roomChannel(roomId: string) {
    return `chat:room:${roomId}`;
  }

  @SubscribeMessage("join_room")
  join(@ConnectedSocket() client: Socket, @MessageBody() body: { roomId: string }) {
    if (!body?.roomId) {
      return { event: "joined_room", roomId: null, ok: false };
    }

    client.join(this.roomChannel(body.roomId));
    return { event: "joined_room", roomId: body.roomId };
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
}
