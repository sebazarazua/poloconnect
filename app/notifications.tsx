import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";

type NotificationKind = "match" | "market" | "tournament" | "message" | "system";

interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  timeLabel: string;
  read: boolean;
}

const kindMeta: Record<NotificationKind, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  match: { icon: "radio-sharp", color: "#0a66c2", bg: "#d8ecff" },
  market: { icon: "pricetag-sharp", color: "#147d6f", bg: "#d5f0eb" },
  tournament: { icon: "trophy-sharp", color: "#b7791f", bg: "#fef3dc" },
  message: { icon: "chatbubble-sharp", color: "#7c3aed", bg: "#ede9fe" },
  system: { icon: "notifications-sharp", color: "#6f8499", bg: "#edf6ff" }
};

const notifications: AppNotification[] = [
  {
    id: "1",
    kind: "tournament",
    title: "Nuevo torneo disponible",
    body: "La Dolfina Polo Ranch abrió inscripciones para el torneo de 0 a 4 goles.",
    timeLabel: "Hace 5 min",
    read: false
  },
  {
    id: "2",
    kind: "match",
    title: "Partido en vivo ahora",
    body: "San Martín vs Tandil está transmitiendo en este momento. ¡No te lo pierdas!",
    timeLabel: "Hace 23 min",
    read: false
  },
  {
    id: "3",
    kind: "market",
    title: "Tu publicación fue aprobada",
    body: "Tu aviso en el mercado quedó activo y ya es visible para todos los usuarios.",
    timeLabel: "Hace 1 hora",
    read: false
  },
  {
    id: "4",
    kind: "message",
    title: "Pedro Gomez te escribió",
    body: "«Hola, me interesa el casco. ¿Todavía está disponible?»",
    timeLabel: "Hace 2 horas",
    read: true
  },
  {
    id: "5",
    kind: "tournament",
    title: "Resultado actualizado",
    body: "Hurlingham Club 9 - Coronel Suárez 6. Torneo Regional, jornada 3.",
    timeLabel: "Ayer, 18:45",
    read: true
  },
  {
    id: "6",
    kind: "market",
    title: "Producto guardado en baja de precio",
    body: "La Silla Butet que tenés guardada bajó su precio a USD 2.800.",
    timeLabel: "Ayer, 12:10",
    read: true
  },
  {
    id: "7",
    kind: "system",
    title: "Bienvenido a Polo Connect",
    body: "Tu cuenta está activa. Explorá torneos, mercado y partidos en vivo.",
    timeLabel: "31 de mayo",
    read: true
  }
];

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();

  return (
    <Screen
      eyebrow="Centro de actividad"
      title="Notificaciones"
      showBackButton
      onBackPress={() => router.back()}
    >
      {notifications.map((n) => {
        const meta = kindMeta[n.kind];

        return (
          <View key={n.id} style={[styles.card, !n.read && styles.cardUnread]}>
            <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={18} color={meta.color} />
            </View>

            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, !n.read && styles.titleBold]} numberOfLines={1}>
                  {n.title}
                </Text>
                <Text style={styles.time}>{n.timeLabel}</Text>
              </View>
              <Text style={styles.text} numberOfLines={2}>
                {n.body}
              </Text>
            </View>
          </View>
        );
      })}

      {notifications.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={46} color={colors.muted} />
          <Text style={styles.emptyTitle}>Sin notificaciones</Text>
          <Text style={styles.emptyText}>Cuando haya actividad la vas a ver acá.</Text>
        </View>
      )}
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    position: "relative"
  },
  cardUnread: {
    backgroundColor: colors.surfaceStrong,
    borderColor: "#bfd8f0"
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  body: {
    flex: 1,
    gap: 4
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600"
  },
  titleBold: {
    fontWeight: "800"
  },
  time: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 0
  },
  text: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  }
});
