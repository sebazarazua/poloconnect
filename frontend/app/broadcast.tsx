import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { AppColors, useThemeColors } from "@/constants/theme";
import { useLocale } from "@/contexts/LocaleContext";
import { listBroadcasts } from "@/services/api/matches";

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

type TimeSegment =
  | "today"
  | "yesterday"
  | "lastWeek"
  | "lastMonth"
  | string;

export default function BroadcastScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { locale, t } = useLocale();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastMatch[]>([]);

  useEffect(() => {
    void listBroadcasts().then((items) => {
      setBroadcasts(items.map((item) => ({
        id: item.id,
        team1: item.team1,
        team2: item.team2,
        date: item.date,
        dateLabel: item.date.toLocaleDateString(locale, {
          weekday: "long",
          day: "numeric",
          month: "long"
        }),
        time: item.time.includes("hs") ? item.time : `${item.time} hs`,
        score1: item.score1,
        score2: item.score2,
        youtubeUrl: item.youtubeUrl ?? "https://www.youtube.com/",
        club: item.club || item.competition
      })));
    });
  }, [locale]);

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    broadcasts.forEach((broadcast) => {
      const broadcastDate = new Date(broadcast.date);
      broadcastDate.setHours(0, 0, 0, 0);

      // Today
      if (
        broadcastDate.toDateString() === today.toDateString()
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
        const monthKey = broadcastDate.toLocaleString(locale, {
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
  }, [broadcasts]);

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
        return t("broadcast.today");
      case "yesterday":
        return t("broadcast.yesterday");
      case "lastWeek":
        return t("broadcast.lastWeek");
      case "lastMonth":
        return t("broadcast.lastMonth");
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
            <Text style={styles.watchButtonText}>{t("broadcast.watchYoutube")}</Text>
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
        title={t("broadcast.title")}
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

const createStyles = (colors: AppColors) => StyleSheet.create({
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
