import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useLocale } from "@/contexts/LocaleContext";
import { fetchTournament, listTournaments, type Tournament } from "@/services/api/tournaments";

export default function TeamRegisterScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { t } = useLocale();
  const { tournamentId } = useLocalSearchParams<{ tournamentId?: string }>();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    if (tournamentId) {
      void fetchTournament(tournamentId).then((tournament) => setTournaments([tournament]));
      return;
    }

    void listTournaments({ registrationStatus: "open" }).then(setTournaments);
  }, [tournamentId]);

  const callContact = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <Screen
      eyebrow={t("teamRegister.eyebrow")}
      title={t("teamRegister.title")}
      subtitle={t("teamRegister.subtitle")}
      showBackButton
      onBackPress={() => router.back()}
    >
      {/* Info banner */}
      <View style={styles.infoBanner}>
        <View style={styles.infoBannerIcon}>
          <Ionicons name="information-circle" size={20} color={colors.primaryDark} />
        </View>
        <Text style={styles.infoBannerText}>
          {t("teamRegister.info")}
        </Text>
      </View>

      {/* Section label */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{t("teamRegister.available").toUpperCase()}</Text>
        <View style={styles.sectionCount}>
          <Text style={styles.sectionCountText}>{tournaments.length}</Text>
        </View>
      </View>

      <View style={styles.list}>
        {tournaments.map((tournament) => (
          <View key={tournament.id} style={styles.card}>
            {/* Left: club info */}
            <View style={styles.cardLeft}>
              <Text style={styles.clubName}>{(tournament.club ?? tournament.name).toUpperCase()}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="bar-chart-outline" size={13} color={colors.muted} />
                <Text style={styles.metaText}>{tournament.handicapRange ?? tournament.level ?? t("teamRegister.categoryTbd")}</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="people-outline" size={13} color={colors.muted} />
                <Text style={styles.metaText}>{tournament.teamCount} {t("teamRegister.teams")}{tournament.maxTeams ? ` / ${tournament.maxTeams}` : ""}</Text>
              </View>
            </View>

            {/* Right: contact */}
            <Pressable
              style={styles.contactCol}
              onPress={() => tournament.contactPhone ? callContact(tournament.contactPhone) : undefined}
              accessibilityLabel={t("teamRegister.callA11y", { name: tournament.contactName ?? t("teamRegister.tournamentContact") })}
            >
              <Text style={styles.contactLabel}>{t("teamRegister.contact").toUpperCase()}</Text>
              <Text style={styles.contactName}>{tournament.contactName ?? t("teamRegister.contactTbd")}</Text>
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={12} color={colors.primary} />
                <Text style={styles.phoneText}>{tournament.contactPhone ?? t("teamRegister.noPhone")}</Text>
              </View>
              <View style={styles.chevron}>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </View>
            </Pressable>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20
  },
  infoBannerIcon: {
    flexShrink: 0
  },
  infoBannerText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600"
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8
  },
  sectionCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6
  },
  sectionCountText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  list: {
    gap: 10
  },
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: "hidden"
  },
  cardLeft: {
    flex: 1,
    padding: 16,
    gap: 6
  },
  clubName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
    lineHeight: 17
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  metaText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600"
  },
  contactCol: {
    width: 130,
    backgroundColor: colors.surfaceStrong,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    padding: 14,
    gap: 3,
    alignItems: "flex-start",
    justifyContent: "center",
    position: "relative"
  },
  contactLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 2
  },
  contactName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2
  },
  phoneText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700"
  },
  chevron: {
    position: "absolute",
    right: 10,
    top: "50%",
    marginTop: -8
  }
});
