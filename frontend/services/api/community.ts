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
  messageNumber?: string;
  clientMessageId?: string;
  isMe?: boolean;
};

type IncomingSocketMessage = {
  roomId: string;
  message: ChatMessage;
};

type JoinRoomAck = {
  roomId: string | null;
  ok: boolean;
};

const communityEventNames = [
  "community_membership_removed",
  "community_membership_banned",
  "community_membership_unbanned",
  "community_membership_joined",
  "community_membership_left",
  "community_room_deleted",
  "community_room_updated",
  "community_rooms_changed",
  "community_access_invalidated"
] as const;

export type CommunityRealtimeEventName = (typeof communityEventNames)[number];

export type CommunityRealtimeEvent = {
  roomId: string;
  userId?: string;
  reason?: string;
  isPermanent?: boolean;
  expiresAt?: string | null;
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

export function refreshCommunitySocketAuth() {
  if (communitySocket) {
    communitySocket.auth = { token: getAccessToken() };
  }
}

export function ensureCommunitySocketConnected() {
  const socket = getCommunitySocket();
  const wasConnected = socket.connected;
  refreshCommunitySocketAuth();
  if (!socket.connected) {
    socket.connect();
  }
  return wasConnected;
}

export function disconnectCommunitySocket() {
  if (!communitySocket) return;
  communitySocket.disconnect();
  communitySocket = null;
}

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
    notificationsMuted: value.notificationsMuted === true,
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

    communitySocket.io.on("reconnect_attempt", refreshCommunitySocketAuth);
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

export async function updateChatRoomNotifications(roomId: string, notificationsMuted: boolean) {
  return apiRequest<{ ok: boolean; notificationsMuted: boolean }>(`/chat-rooms/${encodeURIComponent(roomId)}/notifications`, {
    method: "PATCH",
    body: JSON.stringify({ notificationsMuted })
  });
}

async function getMessagePage(roomId: string, query: { limit: number; after?: string }) {
  const params = new URLSearchParams({ limit: String(query.limit) });
  if (query.after) params.set("after", query.after);
  return apiRequest<Page<ChatMessage>>(`/chat-rooms/${encodeURIComponent(roomId)}/messages?${params.toString()}`);
}

export async function listMessages(roomId: string) {
  const response = await getMessagePage(roomId, { limit: 50 });
  return Array.isArray(response.data) ? response.data : [];
}

export async function listMessagesAfter(roomId: string, after: string) {
  const messages: ChatMessage[] = [];
  let cursor = after;

  while (true) {
    const response = await getMessagePage(roomId, { limit: 100, after: cursor });
    messages.push(...(Array.isArray(response.data) ? response.data : []));

    if (!response.page.hasMore || !response.page.nextCursor || response.page.nextCursor === cursor) {
      break;
    }

    cursor = response.page.nextCursor;
  }

  return messages;
}

export async function sendMessage(roomId: string, text: string, clientMessageId: string) {
  return apiRequest<ChatMessage>(`/chat-rooms/${encodeURIComponent(roomId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, clientMessageId })
  });
}

export function subscribeToRoomMessages(
  roomId: string,
  onMessage: (message: ChatMessage) => void,
  onJoined: () => void
) {
  const socket = getCommunitySocket();
  refreshCommunitySocketAuth();

  const handler = (payload: IncomingSocketMessage) => {
    if (payload?.roomId !== roomId || !payload?.message) {
      return;
    }

    onMessage(payload.message);
  };

  socket.on("message_received", handler);

  const joinRoom = () => {
    socket.emit("join_room", { roomId }, (response: JoinRoomAck) => {
      if (response?.ok && response.roomId === roomId) {
        onJoined();
      }
    });
  };

  socket.on("connect", joinRoom);
  if (socket.connected) {
    joinRoom();
  } else {
    socket.connect();
  }

  return () => {
    socket.off("message_received", handler);
    socket.off("connect", joinRoom);
    if (socket.connected) {
      socket.emit("leave_room", { roomId });
    }
  };
}

export function subscribeToCommunityEvents(
  onEvent: (eventName: CommunityRealtimeEventName, event: CommunityRealtimeEvent) => void,
  onReconnect?: () => void
) {
  const socket = getCommunitySocket();
  let hasConnected = socket.connected;
  refreshCommunitySocketAuth();

  const handlers = communityEventNames.map((eventName) => {
    const handler = (event: CommunityRealtimeEvent) => {
      if (event?.roomId) {
        onEvent(eventName, event);
      }
    };

    socket.on(eventName, handler);
    return { eventName, handler };
  });

  const handleConnect = () => {
    if (hasConnected) {
      onReconnect?.();
    }
    hasConnected = true;
  };

  socket.on("connect", handleConnect);
  if (!socket.connected) {
    socket.connect();
  }

  return () => {
    handlers.forEach(({ eventName, handler }) => {
      socket.off(eventName, handler);
    });
    socket.off("connect", handleConnect);
  };
}
