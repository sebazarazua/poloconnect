import { apiRequest, getAccessToken, getSocketUrl } from "@/services/api/client";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

const chatIcons: ChatItem["icon"][] = [
  "trophy-outline",
  "radio-outline",
  "swap-horizontal-outline",
  "calendar-outline",
  "newspaper-outline",
  "shield-outline"
];

function normalizeChatItem(value: unknown): ChatItem | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const title = asString(value.title);
  if (!id || !title) return null;

  const icon = asString(value.icon);

  return {
    id,
    title,
    description: asString(value.description),
    members: asString(value.members, "0"),
    unread: asNumber(value.unread),
    icon: chatIcons.includes(icon as ChatItem["icon"]) ? (icon as ChatItem["icon"]) : "shield-outline",
    tone: asString(value.tone, "#1f3b73"),
    wasRecommended: typeof value.wasRecommended === "boolean" ? value.wasRecommended : false,
    recommendedLabel: asString(value.recommendedLabel, asString(value.members, "0"))
  };
}

function normalizeChatItems(value: unknown) {
  return (Array.isArray(value) ? value : [])
    .map(normalizeChatItem)
    .filter((item): item is ChatItem => Boolean(item));
}

function getCommunitySocket() {
  if (!communitySocket) {
    communitySocket = io(getSocketUrl(), {
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
  const response = await apiRequest<unknown>("/chat-rooms");
  const rooms = isRecord(response) ? response : {};

  return {
    joined: normalizeChatItems(rooms.joined),
    recommended: normalizeChatItems(rooms.recommended)
  };
}

export async function joinChatRoom(roomId: string) {
  await apiRequest<{ ok: boolean }>(`/chat-rooms/${encodeURIComponent(roomId)}/join`, { method: "POST" });
}

export async function leaveChatRoom(roomId: string) {
  await apiRequest<{ ok: boolean }>(`/chat-rooms/${encodeURIComponent(roomId)}/leave`, { method: "POST" });
}

export async function listMessages(roomId: string) {
  const response = await apiRequest<Page<ChatMessage>>(`/chat-rooms/${encodeURIComponent(roomId)}/messages?limit=50`);
  return Array.isArray(response.data) ? response.data : [];
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
