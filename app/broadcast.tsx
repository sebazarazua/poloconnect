import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SectionTitle } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";

interface BroadcastMatch {
  id: string;
  team1: string;
  team2: string;
  date: Date;
  dateLabel: string;
  time: string;
  score1: number;
  score2: number;
  youtubeUrl: string;
  club: string;
}

// Today is June 2, 2026 (Monday)
const TODAY = new Date(2026, 5, 2); // June 2

const broadcasts: BroadcastMatch[] = [
  // Today
  {
    id: "1",
    team1: "San Martín",
    team2: "Tandil",
    date: new Date(2026, 5, 2),
    dateLabel: "Lunes, 2 de junio",
    time: "14:00 hs",
    score1: 6,
    score2: 5,
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    club: "Open"
  },
  // Yesterday
  {
    id: "2",
    team1: "Coronel Suárez",
    team2: "La Paula",
    date: new Date(2026, 5, 1),
    dateLabel: "Domingo, 1 de junio",
    time: "15:00 hs",
    score1: 9,
    score2: 6,
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    club: "Open"
  },
  {
    id: "3",
    team1: "Belgrano",
    team2: "Monterrayo",
    date: new Date(2026, 5, 1),
    dateLabel: "Domingo, 1 de junio",
    time: "16:30 hs",
    score1: 7,
    score2: 7,
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    club: "Abierto"
  },
  // Last week
  {
    id: "4",
    team1: "La 36 Polo Club",
    team2: "Cañuelas",
    date: new Date(2026, 4, 30),
    dateLabel: "Sábado, 30 de mayo",
    time: "14:00 hs",
    score1: 10,
    score2: 8,
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    club: "Torneo Regional"
  },
  {
    id: "5",
    team1: "Hurlingham",
    team2: "Tortugas CC",
    date: new Date(2026, 4, 28),
    dateLabel: "Jueves, 28 de mayo",
    time: "18:00 hs",
    score1: 8,
    score2: 6,
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    club: "Open"
  },
  {
    id: "6",
    team1: "Palermo",
    team2: "Santa Paula",
    date: new Date(2026, 4, 26),
    dateLabel: "Martes, 26 de mayo",
    time: "19:30 hs",
    score1: 11,
    score2: 9,
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    club: "Abierto"
  },
  // Last month
  {
    id: "7",
    team1: "La Dolfina",
    team2: "Ellerstina",
    date: new Date(2026, 4, 15),
    dateLabel: "Viernes, 15 de mayo",
    time: "16:30 hs",
    score1: 8,
    score2: 7,
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    club: "AAP"
  },
  {
    id: "8",
    team1: "Magdalena",
    team2: "Tordillo",
    date: new Date(2026, 4, 10),
    dateLabel: "Domingo, 10 de mayo",
    time: "15:00 hs",
    score1: 7,
    score2: 5,
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    club: "Torneo Regional"
  },
  // Older
  {
    id: "9",
    team1: "Independencia",
    team2: "Sportsman",
    date: new Date(2026, 3, 28),
    dateLabel: "Martes, 28 de abril",
    time: "16:00 hs",
    score1: 10,
    score2: 8,
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    club: "Open"
  },
  {
    id: "10",
    team1: "Junín",
    team2: "San Martín",
    date: new Date(2026, 3, 15),
    dateLabel: "Miércoles, 15 de abril",
    time: "14:30 hs",
    score1: 6,
    score2: 6,
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    club: "Regional"
  },
  {
    id: "11",
    team1: "Fortabat",
    team2: "Ayacucho",
    date: new Date(2026, 2, 20),
    dateLabel: "Sábado, 20 de marzo",
    time: "15:00 hs",
    score1: 9,
    score2: 7,
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    club: "Abierto"
  }
];

type TimeSegment =
  | "today"
  | "yesterday"
  | "lastWeek"
  | "lastMonth"
  | string;

export default function BroadcastScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (evt, gestureState) => {
        const { dx } = gestureState;
        return dx > 6;
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        const { dx } = gestureState;
        return dx > 6;
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx } = gestureState;
        if (dx > 40) {
          router.back();
        }
      }
    })
  ).current;

  const groupedBroadcasts = useMemo(() => {
    const grouped: Record<TimeSegment, BroadcastMatch[]> = {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: []
    };

    const yesterday = new Date(TODAY);
    yesterday.setDate(yesterday.getDate() - 1);

    const weekAgo = new Date(TODAY);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(TODAY);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    broadcasts.forEach((broadcast) => {
      const broadcastDate = broadcast.date;

      // Today
      if (
        broadcastDate.toDateString() === TODAY.toDateString()
      ) {
        grouped.today.push(broadcast);
      }
      // Yesterday
      else if (
        broadcastDate.toDateString() === yesterday.toDateString()
      ) {
        grouped.yesterday.push(broadcast);
      }
      // Last week (7 days ago to 2 days ago)
      else if (
        broadcastDate > weekAgo &&
        broadcastDate < yesterday
      ) {
        grouped.lastWeek.push(broadcast);
      }
      // Last month (30 days ago to 8 days ago)
      else if (
        broadcastDate > monthAgo &&
        broadcastDate <= weekAgo
      ) {
        grouped.lastMonth.push(broadcast);
      }
      // Older - group by month/year
      else {
        const monthKey = broadcastDate.toLocaleString("es-ES", {
          month: "long",
          year: "numeric"
        });
        if (!grouped[monthKey]) {
          grouped[monthKey] = [];
        }
        (grouped[monthKey] as BroadcastMatch[]).push(broadcast);
      }
    });

    return grouped;
  }, []);

  const handleWatchPress = async (youtubeUrl: string) => {
    try {
      await Linking.openURL(youtubeUrl);
    } catch (error) {
      console.error("Error opening URL:", error);
    }
  };

  const getTimeSegmentLabel = (segment: TimeSegment): string => {
    switch (segment) {
      case "today":
        return "Hoy";
      case "yesterday":
        return "Ayer";
      case "lastWeek":
        return "Última semana";
      case "lastMonth":
        return "Último mes";
      default:
        return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
  };

  const BroadcastItem = ({ broadcast }: { broadcast: BroadcastMatch }) => (
    <Pressable
      key={broadcast.id}
      style={({ pressed }) => [
        styles.matchCard,
        pressed && styles.matchCardPressed
      ]}
      onPress={() =>
        setExpandedId(expandedId === broadcast.id ? null : broadcast.id)
      }
    >
      <View style={styles.matchContent}>
        <View style={styles.dateTimeRow}>
          <Text style={styles.dateTime}>
            {broadcast.dateLabel} • {broadcast.time}
          </Text>
        </View>

        <View style={styles.teamsRow}>
          <View style={styles.teamBlock}>
            <Text style={styles.teamName}>{broadcast.team1}</Text>
          </View>

          <View style={styles.scoreBlock}>
            <Text style={styles.score}>{broadcast.score1}</Text>
            <Text style={styles.scoreLabel}>-</Text>
            <Text style={styles.score}>{broadcast.score2}</Text>
          </View>

          <View style={styles.teamBlock}>
            <Text style={styles.teamName}>{broadcast.team2}</Text>
          </View>
        </View>

        <View style={styles.clubRow}>
          <Ionicons name="shield-outline" size={14} color={colors.muted} />
          <Text style={styles.clubText}>{broadcast.club}</Text>
        </View>

        {expandedId === broadcast.id && (
          <Pressable
            style={({ pressed }) => [
              styles.watchButton,
              pressed && styles.watchButtonPressed
            ]}
            onPress={() => handleWatchPress(broadcast.youtubeUrl)}
          >
            <Ionicons name="play-circle" size={18} color="#ffffff" />
            <Text style={styles.watchButtonText}>Ver en YouTube</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );

  const segmentOrder: TimeSegment[] = ["today", "yesterday", "lastWeek", "lastMonth"];
  const otherSegments = Object.keys(groupedBroadcasts).filter(
    (key) => !segmentOrder.includes(key as TimeSegment)
  ) as TimeSegment[];

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Screen
        title="Partidos Emitidos"
        showBackButton
        onBackPress={() => router.back()}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {segmentOrder.map((segment) => {
            const matches = groupedBroadcasts[segment];
            if (!matches || matches.length === 0) return null;

            return (
              <View key={segment}>
                <SectionTitle
                  title={getTimeSegmentLabel(segment)}
                  action={matches.length.toString()}
                />
                <View style={styles.section}>
                  {matches.map((broadcast) => (
                    <BroadcastItem key={broadcast.id} broadcast={broadcast} />
                  ))}
                </View>
              </View>
            );
          })}

          {otherSegments.map((segment) => {
            const matches = groupedBroadcasts[segment];
            if (!matches || matches.length === 0) return null;

            return (
              <View key={segment}>
                <SectionTitle
                  title={getTimeSegmentLabel(segment)}
                  action={matches.length.toString()}
                />
                <View style={styles.section}>
                  {matches.map((broadcast) => (
                    <BroadcastItem key={broadcast.id} broadcast={broadcast} />
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  section: {
    gap: 10,
    marginBottom: 16
  },
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  matchCardPressed: {
    backgroundColor: colors.surfaceStrong
  },
  matchContent: {
    padding: 16
  },
  dateTimeRow: {
    marginBottom: 12
  },
  dateTime: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600"
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12
  },
  teamBlock: {
    flex: 1
  },
  teamName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20
  },
  scoreBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8
  },
  score: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900"
  },
  scoreLabel: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "600"
  },
  clubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  clubText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600"
  },
  watchButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.primary,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  watchButtonPressed: {
    backgroundColor: colors.primaryDark,
    opacity: 0.9
  },
  watchButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  }
});
