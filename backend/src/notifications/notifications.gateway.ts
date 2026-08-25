import { SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({ namespace: "/ws" })
export class NotificationsGateway {
  @WebSocketServer() server!: Server;

  @SubscribeMessage("notifications_subscribe")
  subscribe() {
    return { event: "notifications_subscribed" };
  }
}
