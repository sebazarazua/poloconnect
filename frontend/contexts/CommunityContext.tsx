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
import { joinChatRoom, leaveChatRoom, listChatRooms } from "@/services/api/community";

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
  recommendedLabel: string;
}

interface CommunityContextValue {
  joinedChats: ChatItem[];
  recommendedChats: ChatItem[];
  joinChat: (id: string) => void;
  leaveChat: (id: string) => void;
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

export function CommunityProvider({ children }: PropsWithChildren) {
  const { isAuthenticated } = useAuth();
  const [joinedChats, setJoinedChats] = useState<ChatItem[]>([]);
  const [recommendedChats, setRecommendedChats] = useState<ChatItem[]>([]);

  const refreshRooms = useCallback(async () => {
    if (!isAuthenticated) {
      setJoinedChats([]);
      setRecommendedChats([]);
      return;
    }

    try {
      const rooms = await listChatRooms();
      setJoinedChats(rooms.joined);
      setRecommendedChats(rooms.recommended);
    } catch {
      setJoinedChats([]);
      setRecommendedChats([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refreshRooms();
  }, [refreshRooms]);

  const joinChat = useCallback((id: string) => {
    void joinChatRoom(id).then(refreshRooms);
    setRecommendedChats(prev => {
      const chat = prev.find(c => c.id === id);
      if (!chat) return prev;
      setJoinedChats(j => [...j, { ...chat, unread: 0 }]);
      return prev.filter(c => c.id !== id);
    });
  }, [refreshRooms]);

  const leaveChat = useCallback((id: string) => {
    void leaveChatRoom(id).then(refreshRooms);
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

  const value = useMemo(
    () => ({ joinedChats, recommendedChats, joinChat, leaveChat }),
    [joinedChats, recommendedChats, joinChat, leaveChat]
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
