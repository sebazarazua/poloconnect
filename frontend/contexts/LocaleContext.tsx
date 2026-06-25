import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";

export type Locale = "es-AR" | "en-US";

type TranslationParams = Record<string, string | number>;
type TranslationKey = keyof typeof translations["es-AR"];

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
};

const translations = {
  "es-AR": {
    "home.welcome": "¡Bienvenido, {name}!",
    "home.live": "EN VIVO",
    "home.watchLive": "Ver en vivo",
    "home.quickAccess": "Accesos rápidos",
    "home.calendar": "Calendario",
    "home.teamRegister": "Anota tu equipo",
    "home.broadcast": "Partidos Emitidos",
    "home.news": "Noticias",
    "live.eyebrow": "Partidos",
    "live.title": "En vivo",
    "live.subtitle": "Segui resultados, horarios y transmisiones del circuito.",
    "live.today": "Hoy",
    "live.all": "Todos",
    "live.liveOnly": "En vivo ({count})",
    "live.liveBadge": "VIVO",
    "live.empty": "No hay partidos para esta fecha.",
    "community.eyebrow": "Comunidad",
    "community.title": "Chats de polo",
    "community.subtitle": "Sumate a conversaciones de torneos, clubes y mercado.",
    "community.joined": "Tus chats",
    "community.recommended": "Recomendados",
    "community.members": "miembros",
    "community.availableNow": "Disponible ahora",
    "community.new": "Nuevo",
    "community.nextTournament": "Próximo torneo",
    "community.join": "Unirme",
    "community.joinedDescriptions.palermo": "Fixture, resultados y conversación oficial del torneo.",
    "community.joinedDescriptions.match": "Chat activo por el partido destacado de la semana.",
    "community.joinedDescriptions.market": "Altas, bajas y rumores confirmados por Polo Connect.",
    "community.recommendedDescriptions.hurlingham": "Cobertura oficial, cruces y debate del campeonato.",
    "community.recommendedDescriptions.news": "Un chat para seguir novedades importantes del circuito.",
    "community.recommendedDescriptions.tortugas": "Comunidad temporal para partidos, horarios y resultados."
  },
  "en-US": {
    "home.welcome": "Welcome, {name}!",
    "home.live": "LIVE",
    "home.watchLive": "Watch live",
    "home.quickAccess": "Quick access",
    "home.calendar": "Calendar",
    "home.teamRegister": "Register your team",
    "home.broadcast": "Broadcast match",
    "home.news": "News",
    "live.eyebrow": "Matches",
    "live.title": "Live",
    "live.subtitle": "Follow scores, schedules, and broadcasts from the circuit.",
    "live.today": "Today",
    "live.all": "All",
    "live.liveOnly": "Live ({count})",
    "live.liveBadge": "LIVE",
    "live.empty": "There are no matches for this date.",
    "community.eyebrow": "Community",
    "community.title": "Polo chats",
    "community.subtitle": "Join tournament, club, and market conversations.",
    "community.joined": "Your chats",
    "community.recommended": "Recommended",
    "community.members": "members",
    "community.availableNow": "Available now",
    "community.new": "New",
    "community.nextTournament": "Next tournament",
    "community.join": "Join",
    "community.joinedDescriptions.palermo": "Fixtures, results, and official tournament conversation.",
    "community.joinedDescriptions.match": "Active chat for the week's featured match.",
    "community.joinedDescriptions.market": "Transfers, departures, and confirmed rumors from Polo Connect.",
    "community.recommendedDescriptions.hurlingham": "Official coverage, brackets, and championship debate.",
    "community.recommendedDescriptions.news": "A chat for important updates from the circuit.",
    "community.recommendedDescriptions.tortugas": "Temporary community for matches, schedules, and results."
  }
} as const;

const LocaleContext = createContext<LocaleContextValue | null>(null);

function interpolate(template: string, params: TranslationParams = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    params[key] === undefined ? match : String(params[key])
  );
}

export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<Locale>("es-AR");

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => {
      return interpolate(translations[locale][key] ?? translations["es-AR"][key], params);
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t
    }),
    [locale, t]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }

  return context;
}
