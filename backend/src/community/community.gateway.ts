import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({ namespace: "/ws", cors: { origin: true, credentials: true } })
export class CommunityGateway {
  @WebSocketServer() server!: Server;

  @SubscribeMessage("join_room")
  join(@MessageBody() body: { roomId: string }) {
    return { event: "joined_room", roomId: body.roomId };
  }

  @SubscribeMessage("message_send")
  message(@MessageBody() body: any) {
    this.server.to(`chat:room:${body.roomId}`).emit("message_received", body);
    return { event: "message_ack", clientMessageId: body.clientMessageId };
  }
}
