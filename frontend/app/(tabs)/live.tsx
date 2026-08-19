import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SectionTitle } from "@/components/Card";
import { AdCarousel } from "@/components/AdCarousel";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { formatLiveDate } from "@/constants/i18n";
import { resolveTeamLogoSource } from "@/constants/teamLogos";
import { useLocale } from "@/contexts/LocaleContext";
import { type ContentItem, getSectionContent } from "@/services/api/content";
import { resolveContentImageSource } from "@/services/content-images";
import { listMatches } from "@/services/api/matches";

interface Match {
  id: string;
  time: string;
  team1: string;
  team2: string;
  team1LogoUrl?: string;
  team2LogoUrl?: string;
  score1: number;
  score2: number;
  competition: string;
  status: "live" | "upcoming" | "finished" | "cancelled";
  chukker?: string;
  club: string;
  date: Date;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const liveAds = [
  require("../../assets/ads/live/slide-1.png"),
  require("../../assets/ads/live/slide-2.png"),
  require("../../assets/ads/live/slide-3.png")
];

export default function LiveScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { locale, t } = useLocale();
  const [filterTab, setFilterTab] = useState<"todos" | "vivo">("todos");
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const [matches, setMatches] = useState<Match[]>([]);
  const [remoteAds, setRemoteAds] = useState<ContentItem[]>([]);

  useEffect(() => {
    void listMatches(selectedDate).then(setMatches);
  }, [selectedDate]);

  useEffect(() => {
    void getSectionContent("live", "ads")
      .then((items) => setRemoteAds(items))
      .catch(() => setRemoteAds([]));
  }, []);

  const adImages = useMemo(
    () => (remoteAds.length > 0 ? remoteAds.map((item) => resolveContentImageSource(item.imageUrl)) : liveAds),
    [remoteAds]
  );

  const adTargetUrls = useMemo(
    () => (remoteAds.length > 0 ? remoteAds.map((item) => item.targetUrl ?? undefined) : []),
    [remoteAds]
  );

  const dayMatches = useMemo(() => {
    return matches.filter((m) => {
      const matchDate = new Date(m.date);
      matchDate.setHours(0, 0, 0, 0);
      const selectedDateNorm = new Date(selectedDate);
      selectedDateNorm.setHours(0, 0, 0, 0);
      return matchDate.getTime() === selectedDateNorm.getTime();
    });
  }, [matches, selectedDate]);

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
      eyebrow={t("live.eyebrow")}
      title={t("live.title")}
      subtitle={t("live.subtitle")}
    >
      <AdCarousel images={adImages} targetUrls={adTargetUrls} height={95} />

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
              {formatLiveDate(locale, selectedDate).toUpperCase()}
            </Text>
            {selectedDate.getTime() === today.getTime() && (
              <Text style={styles.todayLabel}>{t("live.today").toUpperCase()}</Text>
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
                {t("live.all").toUpperCase()}
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
                {t("live.liveOnly", { count: liveCount }).toUpperCase()}
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
                  <Pressable
                    key={match.id}
                    style={({ pressed }) => [
                      styles.matchCard,
                      pressed && styles.matchCardPressed
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/match-detail",
                        params: { id: match.id }
                      })
                    }
                  >
                    <View style={styles.matchHeader}>
                      <Text style={styles.time}>{match.time}</Text>
                      {match.status === "live" && (
                        <View style={styles.liveIndicator}>
                          <View style={styles.liveDot} />
                          <Text style={styles.liveText}>{t("live.liveBadge")}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.matchContent}>
                      <View style={styles.teamBlock}>
                        <View style={styles.teamLogoPlaceholder}>
                          <Image
                            source={resolveTeamLogoSource(match.team1, match.team1LogoUrl)}
                            style={styles.teamLogoImg}
                            resizeMode="cover"
                          />
                        </View>
                        <Text style={styles.teamName} numberOfLines={2}>{match.team1}</Text>
                      </View>

                      <View style={styles.scoreBlock}>
                        <Text style={styles.score}>
                          {match.score1} - {match.score2}
                        </Text>
                        {match.status === "live" && match.chukker && (
                          <Text style={styles.chukker}>{match.chukker}</Text>
                        )}
                      </View>

                      <View style={styles.teamBlock}>
                        <View style={styles.teamLogoPlaceholder}>
                          <Image
                            source={resolveTeamLogoSource(match.team2, match.team2LogoUrl)}
                            style={styles.teamLogoImg}
                            resizeMode="cover"
                          />
                        </View>
                        <Text style={styles.teamName} numberOfLines={2}>{match.team2}</Text>
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
          <Text style={styles.emptyText}>{t("live.emptyDay")}</Text>
        </View>
      )}
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
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
  matchCardPressed: {
    backgroundColor: colors.surfaceStrong,
    opacity: 0.86
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
  teamBlock: {
    width: 84,
    alignItems: "center",
    gap: 8
  },
  teamLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  teamLogoImg: {
    width: 56,
    height: 56
  },
  teamName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  scoreBlock: {
    flex: 1,
    alignItems: "center",
    gap: 4
  },
  score: {
    color: colors.primaryDark,
    fontSize: 28,
    fontWeight: "900"
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
