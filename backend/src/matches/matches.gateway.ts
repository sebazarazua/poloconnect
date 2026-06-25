import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({ namespace: "/ws", cors: { origin: true, credentials: true } })
export class MatchesGateway {
  @WebSocketServer() server!: Server;

  @SubscribeMessage("subscribe_match")
  subscribe(@MessageBody() body: { matchId: string }) {
    return { event: "match_subscribed", matchId: body.matchId };
  }
}
