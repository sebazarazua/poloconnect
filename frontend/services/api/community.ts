import { apiRequest } from "@/services/api/client";
import type { ChatItem } from "@/contexts/CommunityContext";

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  time: string;
  createdAt?: string;
  isMe: boolean;
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
