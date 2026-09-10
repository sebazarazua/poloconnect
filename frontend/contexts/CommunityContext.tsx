import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppState } from "react-native";
import {
  disconnectCommunitySocket,
  ensureCommunitySocketConnected,
  joinChatRoom,
  leaveChatRoom,
  listChatRooms,
  subscribeToCommunityEvents,
  updateChatRoomNotifications,
  type CommunityRealtimeEvent,
  type CommunityRealtimeEventName
} from "@/services/api/community";

export type ChatIconName =
  | "trophy-outline"
  | "radio-outline"
  | "swap-horizontal-outline"
  | "calendar-outline"
  | "newspaper-outline"
  | "shield-outline";

export interface ChatItem {
  id: string;
  title: string;
  description: string;
  members: string;
  unread: number;
  icon: ChatIconName;
  tone: string;
  wasRecommended: boolean;
  notificationsMuted: boolean;
  recommendedLabel: string;
}

interface CommunityContextValue {
  joinedChats: ChatItem[];
  recommendedChats: ChatItem[];
  roomsLoaded: boolean;
  joinChat: (id: string) => void;
  leaveChat: (id: string) => void;
  setChatNotificationsMuted: (id: string, muted: boolean) => Promise<void>;
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

export function CommunityProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, user } = useAuth();
  const [joinedChats, setJoinedChats] = useState<ChatItem[]>([]);
  const [recommendedChats, setRecommendedChats] = useState<ChatItem[]>([]);
  const [roomsLoaded, setRoomsLoaded] = useState(false);

  const refreshRooms = useCallback(async () => {
    if (!isAuthenticated) {
      setJoinedChats([]);
      setRecommendedChats([]);
      setRoomsLoaded(true);
      return;
    }

    try {
      const rooms = await listChatRooms();
      setJoinedChats(rooms.joined);
      setRecommendedChats(rooms.recommended);
    } catch {
      // Keep the last confirmed memberships on transient network failures.
      // Access removals still arrive through realtime events or a later successful refresh.
    } finally {
      setRoomsLoaded(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setRoomsLoaded(false);
    void refreshRooms();
  }, [refreshRooms]);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectCommunitySocket();
      return;
    }

    const removeRoom = (roomId: string) => {
      setJoinedChats((current) => current.filter((chat) => chat.id !== roomId));
      setRecommendedChats((current) => current.filter((chat) => chat.id !== roomId));
    };

    const handleEvent = (eventName: CommunityRealtimeEventName, event: CommunityRealtimeEvent) => {
      const isForCurrentUser = Boolean(event.userId && user?.id === event.userId);

      switch (eventName) {
        case "community_access_invalidated":
        case "community_room_deleted":
          removeRoom(event.roomId);
          void refreshRooms();
          break;
        case "community_membership_removed":
        case "community_membership_banned":
          if (isForCurrentUser) {
            removeRoom(event.roomId);
          }
          void refreshRooms();
          break;
        case "community_membership_joined":
        case "community_membership_left":
        case "community_membership_unbanned":
        case "community_room_updated":
        case "community_rooms_changed":
          void refreshRooms();
          break;
      }
    };

    const unsubscribe = subscribeToCommunityEvents(handleEvent, () => {
      void refreshRooms();
    });
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        ensureCommunitySocketConnected();
        void refreshRooms();
      }
    });

    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [isAuthenticated, refreshRooms, user?.id]);

  const joinChat = useCallback((id: string) => {
    void joinChatRoom(id).then(refreshRooms).catch(refreshRooms);
    setRecommendedChats(prev => {
      const chat = prev.find(c => c.id === id);
      if (!chat) return prev;
      setJoinedChats(j => [...j, { ...chat, unread: 0 }]);
      return prev.filter(c => c.id !== id);
    });
  }, [refreshRooms]);

  const leaveChat = useCallback((id: string) => {
    void leaveChatRoom(id).then(refreshRooms).catch(refreshRooms);
    setJoinedChats(prev => {
      const chat = prev.find(c => c.id === id);
      if (!chat) return prev;
      if (chat.wasRecommended) {
        setRecommendedChats(r => [
          ...r,
          { ...chat, unread: 0, members: chat.recommendedLabel }
        ]);
      }
      return prev.filter(c => c.id !== id);
    });
  }, [refreshRooms]);

  const setChatNotificationsMuted = useCallback(async (id: string, muted: boolean) => {
    const previousValue = joinedChats.find((chat) => chat.id === id)?.notificationsMuted ?? false;
    setJoinedChats((current) => current.map((chat) => chat.id === id ? { ...chat, notificationsMuted: muted } : chat));

    try {
      await updateChatRoomNotifications(id, muted);
    } catch (error) {
      setJoinedChats((current) => current.map((chat) => {
        if (chat.id !== id || chat.notificationsMuted !== muted) return chat;
        return { ...chat, notificationsMuted: previousValue };
      }));
      throw error;
    }
  }, [joinedChats]);

  const value = useMemo(
    () => ({ joinedChats, recommendedChats, roomsLoaded, joinChat, leaveChat, setChatNotificationsMuted }),
    [joinedChats, recommendedChats, roomsLoaded, joinChat, leaveChat, setChatNotificationsMuted]
  );

  return (
    <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>
  );
}

export function useCommunity() {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error("useCommunity must be used within CommunityProvider");
  return ctx;
}
