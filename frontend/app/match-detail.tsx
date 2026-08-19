import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Screen } from "@/components/Screen";
import { YouTubeLivePlayer } from "@/components/YouTubeLivePlayer";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useLocale } from "@/contexts/LocaleContext";
import { resolveTeamLogoSource } from "@/constants/teamLogos";
import { getMatchById } from "@/services/matches";
import { fetchMatch, type MatchDetail } from "@/services/api/matches";

const youtubeLiveUrl = "https://www.youtube.com/live/zY3JUrfPtTo";

type MatchTab = "live" | "stats" | "lineups" | "comments";

export default function MatchDetailScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { t } = useLocale();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const fallbackMatch = useMemo(() => getMatchById(id), [id]);
  const [match, setMatch] = useState<MatchDetail>(fallbackMatch);
  const [activeTab, setActiveTab] = useState<MatchTab>("live");

  useEffect(() => {
    if (!id) return;
    void fetchMatch(id).then(setMatch);
  }, [id]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (_evt, gestureState) => gestureState.dx > 6,
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => gestureState.dx > 6,
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx > 40) {
          router.back();
        }
      }
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Screen
        title={t("match.title")}
        subtitle={`${match.club ? `${match.club} - ` : ""}${match.date.toLocaleDateString("es-AR", { day: "numeric", month: "long" })}, ${match.time} hs`}
        showBackButton
        onBackPress={() => router.back()}
      >
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Text style={styles.competition}>{match.competition.toUpperCase()}</Text>
          </View>
          {match.status === "live" ? (
            <View style={styles.liveBadgeWrap}>
              <View style={styles.liveBadge}>
                <Ionicons name="play" size={10} color="#ffffff" />
                <Text style={styles.liveBadgeText}>{t("match.live").toUpperCase()}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.scoreRow}>
            <TeamSummary name={match.team1} logoUrl={match.team1LogoUrl} initials={getInitials(match.team1)} />
            <Text style={styles.score}>
              {match.score1} - {match.score2}
            </Text>
            <TeamSummary name={match.team2} logoUrl={match.team2LogoUrl} initials={getInitials(match.team2)} />
          </View>
        </View>

        <View style={styles.tabs}>
          {([
            { id: "live", label: t("match.tab.live") },
            { id: "stats", label: t("match.tab.stats") },
            { id: "lineups", label: t("match.tab.lineups") },
            { id: "comments", label: t("match.tab.comments") }
          ] as Array<{ id: MatchTab; label: string }>).map((tab) => (
            <Pressable
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "live" ? <LivePanel youtubeUrl={match.youtubeUrl} /> : null}
        {activeTab === "stats" ? <StatsPanel leftTeam={match.team1} rightTeam={match.team2} items={match.stats ?? []} /> : null}
        {activeTab === "lineups" ? <LineupsPanel leftTeam={match.team1} rightTeam={match.team2} items={match.lineups ?? { left: [], right: [] }} referees={match.referees} /> : null}
        {activeTab === "comments" ? <CommentsPanel items={match.comments ?? []} /> : null}
      </Screen>
    </View>
  );
}

function TeamSummary({ name, logoUrl, initials }: { name: string; logoUrl?: string; initials: string }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { t } = useLocale();

  return (
    <View style={styles.teamSummary}>
      <View style={styles.teamLogo}>
        <Image
          source={resolveTeamLogoSource(name, logoUrl, 116)}
          style={styles.teamLogoImg}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.teamName} numberOfLines={1}>
        {name.toUpperCase()}
      </Text>
    </View>
  );
}

function LivePanel({ youtubeUrl = youtubeLiveUrl }: { youtubeUrl?: string }) {
  const styles = createStyles(useThemeColors());

  return <YouTubeLivePlayer videoUrl={youtubeUrl} style={styles.videoCard} />;
}

function StatsPanel({ leftTeam, rightTeam, items }: { leftTeam: string; rightTeam: string; items: NonNullable<MatchDetail["stats"]> }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { t } = useLocale();

  if (items.length === 0) {
    return (
      <View style={styles.panel}>
        <Text style={styles.emptyStateText}>{t("match.statsUnavailable")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{t("match.statsTitle")}</Text>
      <View style={styles.statsTeams}>
        <Text style={styles.statsTeam}>{getInitials(leftTeam)}</Text>
        <Text style={styles.statsTeam}>{getInitials(rightTeam)}</Text>
      </View>
      {items.map((stat) => (
        <View key={stat.label} style={styles.statRow}>
          <Text style={styles.statLabel}>{stat.label}</Text>
          <View style={styles.statValues}>
            <Text style={styles.statValue}>{stat.left}</Text>
            <View style={styles.statBars}>
              <View style={styles.statTrack}>
                <View style={[styles.leftStatFill, { width: `${stat.leftValue}%` }]} />
              </View>
              <View style={styles.statTrack}>
                <View style={[styles.rightStatFill, { width: `${stat.rightValue}%` }]} />
              </View>
            </View>
            <Text style={styles.statValue}>{stat.right}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

type LineupItem = { number: number; name: string; handicap?: number; goals?: string };

function LineupsPanel({
  leftTeam,
  rightTeam,
  items,
  referees
}: {
  leftTeam: string;
  rightTeam: string;
  items: { left: LineupItem[]; right: LineupItem[] };
  referees?: { main?: string; assistant?: string };
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { t } = useLocale();
  const hasLineups = items.left.length > 0 || items.right.length > 0;
  const refereeEntries = [
    referees?.main ? { role: t("match.referee.main"), name: referees.main } : null,
    referees?.assistant ? { role: t("match.referee.assistant"), name: referees.assistant } : null
  ].filter(Boolean) as Array<{ role: string; name: string }>;

  if (!hasLineups) {
    return (
      <View style={styles.panel}>
        <Text style={styles.emptyStateText}>{t("match.lineupsUnavailable")}</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.lineupsGrid}>
        <LineupCard team={leftTeam} players={items.left} />
        <LineupCard team={rightTeam} players={items.right} />
      </View>
      {refereeEntries.length > 0 ? (
        <View style={styles.refereeCard}>
          <Text style={styles.refereeTitle}>{t("match.referees")}</Text>
          <View style={styles.refereeGrid}>
            {refereeEntries.map((entry) => (
              <View key={entry.role} style={styles.refereeItem}>
                <Text style={styles.refereeRole}>{entry.role}</Text>
                <Text style={styles.refereeName}>{entry.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function LineupCard({ team, players }: { team: string; players: LineupItem[] }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { t } = useLocale();
  const totalHandicap = players.reduce((sum, player) => sum + (player.handicap ?? 0), 0);

  return (
    <View style={styles.lineupCard}>
      <Text style={styles.lineupTeam}>{team.toUpperCase()}</Text>
      {players.map((player) => (
        <View key={player.name} style={styles.playerCard}>
          <Text style={styles.playerNumber}>{t("match.playerNumber", { number: player.number })}</Text>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.playerGoals}>{player.handicap !== undefined ? `${player.handicap} hcp` : ""}</Text>
        </View>
      ))}
      {players.some((player) => player.handicap !== undefined) ? (
        <Text style={styles.handicap}>{t("match.totalHandicap", { value: totalHandicap })}</Text>
      ) : null}
    </View>
  );
}

type MatchComment = { id?: string; time?: string; title: string; text: string; type?: string };

function CommentsPanel({ items }: { items: MatchComment[] }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { t } = useLocale();

  if (items.length === 0) {
    return (
      <View style={styles.panel}>
        <Text style={styles.emptyStateText}>{t("match.commentsUnavailable")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      {items.map((comment, index) => (
        <View key={comment.id ?? `${comment.time ?? index}-${comment.title}`} style={styles.commentRow}>
          <Text style={styles.commentTime}>{comment.time ?? "--"}</Text>
          <View style={styles.commentContent}>
            <Text style={styles.commentTitle}>{comment.title}</Text>
            <Text style={styles.commentText}>{comment.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
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

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1
  },
  scoreCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 14
  },
  scoreHeader: {
    alignItems: "center",
    justifyContent: "center"
  },
  competition: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  liveBadgeWrap: {
    alignItems: "center",
    marginTop: 8
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    backgroundColor: "#e21f2f",
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  liveBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900"
  },
  chukker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 8,
    textTransform: "uppercase"
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18
  },
  teamSummary: {
    width: 96,
    alignItems: "center",
    gap: 8
  },
  teamLogo: {
    width: 58,
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  teamLogoImg: {
    width: 58,
    height: 58
  },
  teamName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900"
  },
  score: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 38,
    fontWeight: "900",
    textAlign: "center"
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 14
  },
  tab: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent"
  },
  activeTab: {
    borderBottomColor: colors.primary
  },
  tabText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  activeTabText: {
    color: colors.primary
  },
  videoCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.primaryDark,
    marginBottom: 28
  },
  videoImage: {
    borderRadius: 16
  },
  videoOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5, 15, 28, 0.32)",
    padding: 12
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5, 15, 28, 0.3)"
  },
  videoFooter: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  liveVideoText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900"
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.32)"
  },
  progressFill: {
    width: "58%",
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary
  },
  progressThumb: {
    position: "absolute",
    left: "58%",
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.background
  },
  videoTime: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900"
  },
  panelTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 16
  },
  chukkerTrack: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  chukkerStepWrap: {
    flex: 1,
    alignItems: "center",
    borderTopWidth: 2,
    borderTopColor: colors.border,
    paddingTop: 0
  },
  chukkerStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -17,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface
  },
  activeChukkerStep: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  chukkerStepText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  activeChukkerStepText: {
    color: "#ffffff"
  },
  panel: {
    marginBottom: 10
  },
  emptyStateText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24
  },
  statsTeams: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  statsTeam: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900"
  },
  statRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 12
  },
  statLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 8
  },
  statValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  statValue: {
    width: 42,
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  statBars: {
    flex: 1,
    flexDirection: "row",
    gap: 8
  },
  statTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border
  },
  leftStatFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary
  },
  rightStatFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primaryDark
  },
  lineupsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12
  },
  lineupCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12
  },
  lineupTeam: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10
  },
  playerCard: {
    borderRadius: 10,
    backgroundColor: colors.background,
    padding: 10,
    marginBottom: 8
  },
  playerNumber: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700"
  },
  playerName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2
  },
  playerGoals: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2
  },
  handicap: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase",
    marginTop: 2
  },
  refereeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12
  },
  refereeTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 12
  },
  refereeGrid: {
    flexDirection: "row",
    gap: 8
  },
  refereeItem: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.background,
    padding: 10,
    alignItems: "center"
  },
  refereeRole: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  refereeName: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 4
  },
  commentRow: {
    flexDirection: "row",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 12
  },
  commentTime: {
    width: 46,
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  commentContent: {
    flex: 1
  },
  commentTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  commentText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
  }
});
