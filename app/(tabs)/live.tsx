import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SectionTitle } from "@/components/Card";
import { AdCarousel } from "@/components/AdCarousel";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";

interface Match {
  id: string;
  time: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  competition: string;
  status: "live" | "upcoming" | "finished";
  chukker?: string;
  club: string;
  date: Date;
}

const MATCHES: Match[] = [
  // Junio 1
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
    team1: "Coronel Suárez",
    team2: "Indios Chapaleufú",
    score1: 5,
    score2: 3,
    competition: "Liga Profesional",
    status: "finished",
    club: "Hurlingham Club",
    date: new Date(2026, 5, 1)
  },
  // Junio 2 (Hoy)
  {
    id: "2-1",
    time: "14:00",
    team1: "La Dolfina",
    team2: "Ellerstina",
    score1: 8,
    score2: 7,
    competition: "Copa Argentina",
    status: "live",
    chukker: "3 de 6",
    club: "Tortugas Club",
    date: new Date(2026, 5, 2)
  },
  {
    id: "2-2",
    time: "16:30",
    team1: "Coronel Suárez",
    team2: "Indios Chapaleufú",
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
    team1: "Santa María",
    team2: "Sancaleta",
    score1: 0,
    score2: 0,
    competition: "Primera División B",
    status: "upcoming",
    club: "San Benito Club",
    date: new Date(2026, 5, 2)
  },
  // Junio 3
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
    team1: "Chapaleufú",
    team2: "Flores",
    score1: 0,
    score2: 0,
    competition: "Liga Profesional",
    status: "upcoming",
    club: "San Benito Club",
    date: new Date(2026, 5, 3)
  },
  // Junio 4
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

const TODAY = new Date(2026, 5, 2); // June 2, 2026

export default function LiveScreen() {
  const [filterTab, setFilterTab] = useState<"todos" | "vivo">("todos");
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const date = new Date(TODAY);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const dayMatches = useMemo(() => {
    return MATCHES.filter((m) => {
      const matchDate = new Date(m.date);
      matchDate.setHours(0, 0, 0, 0);
      const selectedDateNorm = new Date(selectedDate);
      selectedDateNorm.setHours(0, 0, 0, 0);
      return matchDate.getTime() === selectedDateNorm.getTime();
    });
  }, [selectedDate]);

  const liveCount = useMemo(() => {
    return dayMatches.filter((m) => m.status === "live").length;
  }, [dayMatches]);

  const filteredMatches = useMemo(() => {
    return filterTab === "vivo"
      ? dayMatches.filter((m) => m.status === "live")
      : dayMatches;
  }, [filterTab, dayMatches]);

  const matchesByCompetition = useMemo(() => {
    const grouped: Record<string, Match[]> = {};
    filteredMatches.forEach((match) => {
      if (!grouped[match.competition]) {
        grouped[match.competition] = [];
      }
      grouped[match.competition].push(match);
    });
    return grouped;
  }, [filteredMatches]);

  return (
    <Screen
      eyebrow="En vivo"
      title="Transmisiones en vivo"
      subtitle="Sigue los partidos en tiempo real."
    >
      <AdCarousel height={95} />

      {/* Header con navegación de fechas */}
      <View style={styles.dateHeaderContainer}>
        <View style={styles.dateNavigation}>
          <Pressable
            onPress={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() - 1);
              setSelectedDate(newDate);
            }}
            style={styles.dateNavButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>

          <View style={styles.dateDisplay}>
            <Text style={styles.dateDisplayText}>
              {selectedDate.toLocaleDateString("es-ES", {
                weekday: "short",
                day: "numeric",
                month: "short"
              }).toUpperCase()}
            </Text>
            {selectedDate.getTime() === TODAY.getTime() && (
              <Text style={styles.todayLabel}>HOY</Text>
            )}
          </View>

          <Pressable
            onPress={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() + 1);
              setSelectedDate(newDate);
            }}
            style={styles.dateNavButton}
          >
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </Pressable>
        </View>

        {/* Filter tabs */}
        <View style={styles.filterTabs}>
          <Pressable
            style={[
              styles.filterTab,
              filterTab === "todos" && styles.filterTabActive
            ]}
            onPress={() => setFilterTab("todos")}
          >
            <Text
              style={[
                styles.filterTabText,
                filterTab === "todos" && styles.filterTabTextActive
              ]}
            >
              TODOS
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterTab,
              filterTab === "vivo" && styles.filterTabActive
            ]}
            onPress={() => setFilterTab("vivo")}
          >
            <Text
              style={[
                styles.filterTabText,
                filterTab === "vivo" && styles.filterTabTextActive
              ]}
            >
              VIVO ({liveCount})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Matches por competencia */}
      {Object.keys(matchesByCompetition).length > 0 ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {Object.entries(matchesByCompetition).map(
            ([competition, matches]) => (
              <View key={competition}>
                <SectionTitle title={competition} />
                {matches.map((match) => (
                  <Pressable key={match.id} style={styles.matchCard}>
                    <View style={styles.matchHeader}>
                      <Text style={styles.time}>{match.time}</Text>
                      {match.status === "live" && (
                        <View style={styles.liveIndicator}>
                          <View style={styles.liveDot} />
                          <Text style={styles.liveText}>EN VIVO</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.matchContent}>
                      <View style={styles.teamSection}>
                        <Text style={styles.teamName}>{match.team1}</Text>
                        <Text style={styles.score}>{match.score1}</Text>
                      </View>

                      <View style={styles.vs}>
                        <Text style={styles.vsText}>-</Text>
                        {match.status === "live" && match.chukker && (
                          <Text style={styles.chukker}>{match.chukker}</Text>
                        )}
                      </View>

                      <View style={styles.teamSection}>
                        <Text style={styles.teamName}>{match.team2}</Text>
                        <Text style={styles.score}>{match.score2}</Text>
                      </View>
                    </View>

                    {match.club && (
                      <Text style={styles.club}>{match.club}</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            )
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons
            name="calendar-outline"
            size={48}
            color={colors.muted}
          />
          <Text style={styles.emptyText}>
            No hay partidos para este día
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateHeaderContainer: {
    marginBottom: 16
  },
  dateNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4
  },
  dateNavButton: {
    padding: 8
  },
  dateDisplay: {
    alignItems: "center",
    gap: 4
  },
  dateDisplayText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700"
  },
  todayLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "600"
  },
  filterTabs: {
    flexDirection: "row",
    gap: 10
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterTabText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700"
  },
  filterTabTextActive: {
    color: "#ffffff"
  },
  matchCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12
  },
  matchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  time: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: 12
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary
  },
  liveText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700"
  },
  matchContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  teamSection: {
    flex: 1,
    alignItems: "center"
  },
  teamName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6
  },
  score: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "900"
  },
  vs: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  vsText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "600"
  },
  chukker: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600"
  },
  club: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "500"
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60
  },
  emptyText: {
    color: colors.muted,
    fontSize: 16,
    marginTop: 16,
    fontWeight: "500"
  }
});
