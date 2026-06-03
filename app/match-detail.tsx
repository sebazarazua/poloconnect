import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Image,
  ImageBackground,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";
import { getTeamLogoSource } from "@/constants/teamLogos";
import { getMatchById } from "@/services/matches";

const videoPreview = require("../assets/home-match-bg.png");

type MatchTab = "live" | "stats" | "lineups" | "comments";

const tabs: { id: MatchTab; label: string }[] = [
  { id: "live", label: "En vivo" },
  { id: "stats", label: "Estadisticas" },
  { id: "lineups", label: "Formaciones" },
  { id: "comments", label: "Comentarios" }
];

const stats = [
  { label: "Goles", left: "5", right: "3", leftValue: 62, rightValue: 38 },
  { label: "Tiros al arco", left: "12", right: "8", leftValue: 60, rightValue: 40 },
  { label: "Faltas", left: "4", right: "6", leftValue: 40, rightValue: 60 },
  { label: "Penales convertidos", left: "2", right: "1", leftValue: 67, rightValue: 33 },
  { label: "Posesion del balon", left: "58%", right: "42%", leftValue: 58, rightValue: 42 },
  { label: "Metros recorridos", left: "14.2k", right: "11.8k", leftValue: 55, rightValue: 45 }
];

const lineups = {
  left: [
    { number: 1, name: "Adolfo Cambiaso", goals: "+2 goles" },
    { number: 2, name: "David Stirling", goals: "+1 goles" },
    { number: 3, name: "Juan Martin Nero", goals: "+2 goles" },
    { number: 4, name: "Pablo Mac Donough", goals: "0 goles" }
  ],
  right: [
    { number: 1, name: "Gonzalo Pieres Jr.", goals: "+1 goles" },
    { number: 2, name: "Facundo Pieres", goals: "+1 goles" },
    { number: 3, name: "Nicolas Pieres", goals: "+1 goles" },
    { number: 4, name: "Mariano Aguerre", goals: "0 goles" }
  ]
};

const comments = [
  {
    time: "72:00",
    title: "Gol de La Dolfina",
    text: "Adolfo Cambiaso convierte desde mitad de cancha tras una gran jugada colectiva."
  },
  {
    time: "68:45",
    title: "Falta",
    text: "Facundo Pieres comete infraccion sobre David Stirling. Penal para La Dolfina."
  },
  {
    time: "64:10",
    title: "Gol de La Dolfina",
    text: "Juan Martin Nero define tras un penal ejecutado rapidamente."
  },
  {
    time: "58:20",
    title: "Gol de Ellerstina",
    text: "Gonzalo Pieres Jr. anota en transicion rapida y descuenta para Ellerstina."
  },
  {
    time: "48:00",
    title: "Inicio chukker 3",
    text: "Comienza el tercer chukker. La Dolfina mantiene la ventaja."
  },
  {
    time: "42:15",
    title: "Gol de La Dolfina",
    text: "David Stirling amplia la diferencia con una corrida individual."
  }
];

export default function MatchDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const match = useMemo(() => getMatchById(id), [id]);
  const [activeTab, setActiveTab] = useState<MatchTab>("live");

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
        title="Detalle del partido"
        subtitle={`${match.club} - ${match.time} hs`}
        showBackButton
        onBackPress={() => router.back()}
      >
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Text style={styles.competition}>{match.competition.toUpperCase()}</Text>
          </View>
          <Text style={styles.chukker}>{match.chukker ?? "Por comenzar"}</Text>
          {match.status === "live" ? (
            <View style={styles.liveBadgeWrap}>
              <View style={styles.liveBadge}>
                <Ionicons name="play" size={10} color="#ffffff" />
                <Text style={styles.liveBadgeText}>EN VIVO</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.scoreRow}>
            <TeamSummary name={match.team1} initials={getInitials(match.team1)} />
            <Text style={styles.score}>
              {match.score1} - {match.score2}
            </Text>
            <TeamSummary name={match.team2} initials={getInitials(match.team2)} />
          </View>
        </View>

        <View style={styles.tabs}>
          {tabs.map((tab) => (
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

        {activeTab === "live" ? <LivePanel /> : null}
        {activeTab === "stats" ? <StatsPanel leftTeam={match.team1} rightTeam={match.team2} /> : null}
        {activeTab === "lineups" ? <LineupsPanel leftTeam={match.team1} rightTeam={match.team2} /> : null}
        {activeTab === "comments" ? <CommentsPanel /> : null}
      </Screen>
    </View>
  );
}

function TeamSummary({ name, initials }: { name: string; initials: string }) {
  return (
    <View style={styles.teamSummary}>
      <View style={styles.teamLogo}>
        <Image
          source={getTeamLogoSource(name, 116)}
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

function LivePanel() {
  return (
    <View>
      <ImageBackground
        source={videoPreview}
        style={styles.videoCard}
        imageStyle={styles.videoImage}
        resizeMode="cover"
      >
        <View style={styles.videoOverlay}>
          <View style={styles.playButton}>
            <Ionicons name="play" size={38} color="#ffffff" />
          </View>
          <View style={styles.videoFooter}>
            <Text style={styles.liveVideoText}>LIVE</Text>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
              <View style={styles.progressThumb} />
            </View>
            <Text style={styles.videoTime}>72:00</Text>
          </View>
        </View>
      </ImageBackground>

      <Text style={styles.panelTitle}>Chukkers</Text>
      <View style={styles.chukkerTrack}>
        {[1, 2, 3, 4, 5, 6, 7].map((item) => (
          <View key={item} style={styles.chukkerStepWrap}>
            <View style={[styles.chukkerStep, item === 3 && styles.activeChukkerStep]}>
              <Text style={[styles.chukkerStepText, item === 3 && styles.activeChukkerStepText]}>
                {item}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function StatsPanel({ leftTeam, rightTeam }: { leftTeam: string; rightTeam: string }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Estadisticas del partido</Text>
      <View style={styles.statsTeams}>
        <Text style={styles.statsTeam}>{getInitials(leftTeam)}</Text>
        <Text style={styles.statsTeam}>{getInitials(rightTeam)}</Text>
      </View>
      {stats.map((stat) => (
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

function LineupsPanel({ leftTeam, rightTeam }: { leftTeam: string; rightTeam: string }) {
  return (
    <View>
      <View style={styles.lineupsGrid}>
        <LineupCard team={leftTeam} players={lineups.left} />
        <LineupCard team={rightTeam} players={lineups.right} />
      </View>
      <View style={styles.refereeCard}>
        <Text style={styles.refereeTitle}>Arbitros</Text>
        <View style={styles.refereeGrid}>
          {["Martin Pascual", "Esteban Ferrari", "Juan Bollini"].map((name) => (
            <View key={name} style={styles.refereeItem}>
              <Text style={styles.refereeRole}>Campo</Text>
              <Text style={styles.refereeName}>{name}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function LineupCard({
  team,
  players
}: {
  team: string;
  players: { number: number; name: string; goals: string }[];
}) {
  return (
    <View style={styles.lineupCard}>
      <Text style={styles.lineupTeam}>{team.toUpperCase()}</Text>
      {players.map((player) => (
        <View key={player.name} style={styles.playerCard}>
          <Text style={styles.playerNumber}>N° {player.number}</Text>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.playerGoals}>{player.goals}</Text>
        </View>
      ))}
      <Text style={styles.handicap}>Handicap total: 10</Text>
    </View>
  );
}

function CommentsPanel() {
  return (
    <View style={styles.panel}>
      {comments.map((comment) => (
        <View key={`${comment.time}-${comment.title}`} style={styles.commentRow}>
          <Text style={styles.commentTime}>{comment.time}</Text>
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

const styles = StyleSheet.create({
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
    backgroundColor: "#ffffff",
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
    height: 198,
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
    backgroundColor: "#ffffff"
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
    backgroundColor: "#ffffff",
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
    backgroundColor: "#ffffff",
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
