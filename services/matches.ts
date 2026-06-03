export type MatchStatus = "live" | "upcoming" | "finished";

export interface Match {
  id: string;
  time: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  competition: string;
  status: MatchStatus;
  chukker?: string;
  club: string;
  date: Date;
}

export const MATCHES: Match[] = [
  {
    id: "1-1",
    time: "14:00",
    team1: "La Dolfina",
    team2: "Ellerstina",
    score1: 8,
    score2: 7,
    competition: "Copa Argentina",
    status: "live",
    chukker: "3 de 6",
    club: "Tortugas Club",
    date: new Date(2026, 5, 1)
  },
  {
    id: "1-2",
    time: "16:30",
    team1: "Coronel Suarez",
    team2: "Indios Chapaleufu",
    score1: 5,
    score2: 3,
    competition: "Liga Profesional",
    status: "finished",
    club: "Hurlingham Club",
    date: new Date(2026, 5, 1)
  },
  {
    id: "2-1",
    time: "14:00",
    team1: "La Dolfina",
    team2: "Ellerstina",
    score1: 5,
    score2: 3,
    competition: "129° Abierto Argentino de Polo",
    status: "live",
    chukker: "Chukker 3",
    club: "Tortugas Club",
    date: new Date(2026, 5, 2)
  },
  {
    id: "2-2",
    time: "16:30",
    team1: "Coronel Suarez",
    team2: "Indios Chapaleufu",
    score1: 0,
    score2: 0,
    competition: "Torneo de Verano",
    status: "upcoming",
    club: "Hurlingham Club",
    date: new Date(2026, 5, 2)
  },
  {
    id: "2-3",
    time: "17:45",
    team1: "Monterrico",
    team2: "Las Acacias",
    score1: 0,
    score2: 0,
    competition: "Liga Profesional - Reserva",
    status: "upcoming",
    club: "Belgrano Athletic Club",
    date: new Date(2026, 5, 2)
  },
  {
    id: "2-4",
    time: "19:00",
    team1: "Santa Maria",
    team2: "Sancaleta",
    score1: 0,
    score2: 0,
    competition: "Primera Division B",
    status: "upcoming",
    club: "San Benito Club",
    date: new Date(2026, 5, 2)
  },
  {
    id: "3-1",
    time: "15:00",
    team1: "Palermo",
    team2: "Pilar",
    score1: 0,
    score2: 0,
    competition: "Copa Argentina",
    status: "upcoming",
    club: "Tortugas Club",
    date: new Date(2026, 5, 3)
  },
  {
    id: "3-2",
    time: "17:00",
    team1: "Chapaleufu",
    team2: "Flores",
    score1: 0,
    score2: 0,
    competition: "Liga Profesional",
    status: "upcoming",
    club: "San Benito Club",
    date: new Date(2026, 5, 3)
  },
  {
    id: "4-1",
    time: "14:30",
    team1: "Zona Norte",
    team2: "La Herminia",
    score1: 0,
    score2: 0,
    competition: "Torneo de Verano",
    status: "upcoming",
    club: "Belgrano Athletic Club",
    date: new Date(2026, 5, 4)
  }
];

export function getMatchById(id?: string | string[]) {
  const normalizedId = Array.isArray(id) ? id[0] : id;
  return MATCHES.find((match) => match.id === normalizedId) ?? MATCHES[2];
}
