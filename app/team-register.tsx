import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";

interface Tournament {
  id: string;
  club: string;
  handicapRange: string;
  teamCount: number;
  contactName: string;
  contactPhone: string;
}

const tournaments: Tournament[] = [
  {
    id: "1",
    club: "La Dolfina Polo Ranch",
    handicapRange: "Desde 0 a 4 goles",
    teamCount: 8,
    contactName: "Pedro Gomez",
    contactPhone: "1145563333"
  },
  {
    id: "2",
    club: "Hurlingham Club",
    handicapRange: "Desde 0 a 4 goles",
    teamCount: 8,
    contactName: "Pedro Gomez",
    contactPhone: "1145563333"
  },
  {
    id: "3",
    club: "Ellerstina Polo Club",
    handicapRange: "Desde 0 a 4 goles",
    teamCount: 8,
    contactName: "Pedro Gomez",
    contactPhone: "1145563333"
  },
  {
    id: "4",
    club: "Campo Argentino de Polo",
    handicapRange: "Desde 0 a 4 goles",
    teamCount: 8,
    contactName: "Pedro Gomez",
    contactPhone: "1145563333"
  },
  {
    id: "5",
    club: "Cuba Polo Club",
    handicapRange: "Desde 0 a 4 goles",
    teamCount: 8,
    contactName: "Pedro Gomez",
    contactPhone: "1145563333"
  },
  {
    id: "6",
    club: "Pilará Polo Club",
    handicapRange: "Desde 0 a 4 goles",
    teamCount: 8,
    contactName: "Pedro Gomez",
    contactPhone: "1145563333"
  },
  {
    id: "7",
    club: "R.C. Cría Polo",
    handicapRange: "Desde 0 a 4 goles",
    teamCount: 8,
    contactName: "Pedro Gomez",
    contactPhone: "1145563333"
  },
  {
    id: "8",
    club: "San Martín Polo Club",
    handicapRange: "Desde 0 a 6 goles",
    teamCount: 12,
    contactName: "Jorge Alvarez",
    contactPhone: "1167892200"
  },
  {
    id: "9",
    club: "Tortugas Country Club",
    handicapRange: "Desde 4 a 8 goles",
    teamCount: 6,
    contactName: "Marcos Ruiz",
    contactPhone: "1134455678"
  }
];

export default function TeamRegisterScreen() {
  const router = useRouter();

  const callContact = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <Screen
      eyebrow="Torneo con inscripción abierta"
      title="Anotá a tu equipo"
      subtitle="Sumate a la competencia."
      showBackButton
      onBackPress={() => router.back()}
    >
      {/* Info banner */}
      <View style={styles.infoBanner}>
        <View style={styles.infoBannerIcon}>
          <Ionicons name="information-circle" size={20} color={colors.primaryDark} />
        </View>
        <Text style={styles.infoBannerText}>
          Contactá directamente al responsable del torneo para inscribir tu equipo.
        </Text>
      </View>

      {/* Section label */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>TORNEOS DISPONIBLES</Text>
        <View style={styles.sectionCount}>
          <Text style={styles.sectionCountText}>{tournaments.length}</Text>
        </View>
      </View>

      <View style={styles.list}>
        {tournaments.map((t) => (
          <View key={t.id} style={styles.card}>
            {/* Left: club info */}
            <View style={styles.cardLeft}>
              <Text style={styles.clubName}>{t.club.toUpperCase()}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="bar-chart-outline" size={13} color={colors.muted} />
                <Text style={styles.metaText}>{t.handicapRange}</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="people-outline" size={13} color={colors.muted} />
                <Text style={styles.metaText}>{t.teamCount} equipos</Text>
              </View>
            </View>

            {/* Right: contact */}
            <Pressable
              style={styles.contactCol}
              onPress={() => callContact(t.contactPhone)}
              accessibilityLabel={`Llamar a ${t.contactName}`}
            >
              <Text style={styles.contactLabel}>CONTACTO</Text>
              <Text style={styles.contactName}>{t.contactName}</Text>
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={12} color={colors.primary} />
                <Text style={styles.phoneText}>{t.contactPhone}</Text>
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

const styles = StyleSheet.create({
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
