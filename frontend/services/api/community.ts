import { apiRequest, getAccessToken } from "@/services/api/client";
import { getApiUrl } from "@/services/api/client";
import { io, Socket } from "socket.io-client";
import type { ChatItem } from "@/contexts/CommunityContext";

export type ChatMessage = {
  id: string;
  userId: string;
  avatarUrl?: string;
  userName: string;
  text: string;
  time: string;
  createdAt?: string;
  isMe?: boolean;
};

type IncomingSocketMessage = {
  roomId: string;
  message: ChatMessage;
};

type RoomsResponse = {
  joined: ChatItem[];
  recommended: ChatItem[];
};

type Page<T> = {
  data: T[];
  page: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

let communitySocket: Socket | null = null;

function getWsBaseUrl() {
  return getApiUrl().replace(/\/api\/v1\/?$/, "");
}

function getCommunitySocket() {
  if (!communitySocket) {
    communitySocket = io(`${getWsBaseUrl()}/ws`, {
      auth: { token: getAccessToken() },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 400,
      reconnectionDelayMax: 4000
    });
  }

  return communitySocket;
}

export async function listChatRooms() {
  return apiRequest<RoomsResponse>("/chat-rooms");
}

export async function joinChatRoom(roomId: string) {
  await apiRequest<{ ok: boolean }>(`/chat-rooms/${encodeURIComponent(roomId)}/join`, { method: "POST" });
}

export async function leaveChatRoom(roomId: string) {
  await apiRequest<{ ok: boolean }>(`/chat-rooms/${encodeURIComponent(roomId)}/leave`, { method: "POST" });
}

export async function listMessages(roomId: string) {
  const response = await apiRequest<Page<ChatMessage>>(`/chat-rooms/${encodeURIComponent(roomId)}/messages?limit=50`);
  return response.data;
}

export async function sendMessage(roomId: string, text: string) {
  return apiRequest<ChatMessage>(`/chat-rooms/${encodeURIComponent(roomId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, clientMessageId: `local-${Date.now()}` })
  });
}

export function subscribeToRoomMessages(roomId: string, onMessage: (message: ChatMessage) => void) {
  const socket = getCommunitySocket();

  const handler = (payload: IncomingSocketMessage) => {
    if (payload?.roomId !== roomId || !payload?.message) {
      return;
    }

    onMessage(payload.message);
  };

  socket.emit("join_room", { roomId });
  socket.on("message_received", handler);

  return () => {
    socket.off("message_received", handler);
    socket.emit("leave_room", { roomId });
  };
}
