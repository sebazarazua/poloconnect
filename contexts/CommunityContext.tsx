import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";

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

const INITIAL_JOINED: ChatItem[] = [
  {
    id: "palermo",
    title: "Abierto de Palermo 2026",
    description: "Fixture, resultados y conversación oficial del torneo.",
    members: "1.8k miembros",
    unread: 6,
    icon: "trophy-outline",
    tone: "#d8ecff",
    wasRecommended: false,
    recommendedLabel: ""
  },
  {
    id: "dolfina",
    title: "La Dolfina vs Ellerstina",
    description: "Chat activo por el partido destacado de la semana.",
    members: "842 miembros",
    unread: 2,
    icon: "radio-outline",
    tone: "#e8f7f4",
    wasRecommended: false,
    recommendedLabel: ""
  },
  {
    id: "mercado",
    title: "Mercado de jugadores",
    description: "Altas, bajas y rumores confirmados por Polo Connect.",
    members: "526 miembros",
    unread: 0,
    icon: "swap-horizontal-outline",
    tone: "#fff4dc",
    wasRecommended: false,
    recommendedLabel: ""
  }
];

const INITIAL_RECOMMENDED: ChatItem[] = [
  {
    id: "hurlingham",
    title: "Hurlingham Open",
    description: "Cobertura oficial, cruces y debate del campeonato.",
    members: "1.2k miembros",
    unread: 0,
    icon: "calendar-outline",
    tone: "#eaf5ff",
    wasRecommended: true,
    recommendedLabel: "Disponible ahora"
  },
  {
    id: "noticias",
    title: "Noticias del alto handicap",
    description: "Un chat para seguir novedades importantes del circuito.",
    members: "298 miembros",
    unread: 0,
    icon: "newspaper-outline",
    tone: "#eef8e8",
    wasRecommended: true,
    recommendedLabel: "Nuevo"
  },
  {
    id: "tortugas",
    title: "Tortugas Country Club",
    description: "Comunidad temporal para partidos, horarios y resultados.",
    members: "415 miembros",
    unread: 0,
    icon: "shield-outline",
    tone: "#f1edff",
    wasRecommended: true,
    recommendedLabel: "Próximo torneo"
  }
];

export function CommunityProvider({ children }: PropsWithChildren) {
  const [joinedChats, setJoinedChats] = useState<ChatItem[]>(INITIAL_JOINED);
  const [recommendedChats, setRecommendedChats] = useState<ChatItem[]>(INITIAL_RECOMMENDED);

  const joinChat = useCallback((id: string) => {
    setRecommendedChats(prev => {
      const chat = prev.find(c => c.id === id);
      if (!chat) return prev;
      setJoinedChats(j => [...j, { ...chat, unread: 0 }]);
      return prev.filter(c => c.id !== id);
    });
  }, []);

  const leaveChat = useCallback((id: string) => {
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
  }, []);

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
