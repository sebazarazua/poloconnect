import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Badge, Card, SectionTitle } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";

const posts = [
  { author: "Club Chapaleufú", text: "Entrenamiento abierto este sábado a las 10 hs.", tag: "Evento" },
  { author: "Sofía M.", text: "Busco equipo para torneo de mediano handicap.", tag: "Jugador" },
  { author: "Polo Norte", text: "Nueva clínica de taqueo y estrategia defensiva.", tag: "Clínica" }
];

export default function CommunityScreen() {
  return (
    <Screen
      eyebrow="Comunidad"
      title="Conectá con el polo"
      subtitle="Clubes, jugadores, entrenadores y novedades en un mismo lugar."
    >
      <View style={styles.metrics}>
        <Card style={styles.metricCard}>
          <Text style={styles.metric}>128</Text>
          <Text style={styles.metricLabel}>clubes</Text>
        </Card>
        <Card style={styles.metricCard}>
          <Text style={styles.metric}>2.4k</Text>
          <Text style={styles.metricLabel}>miembros</Text>
        </Card>
      </View>

      <SectionTitle title="Actividad reciente" />
      {posts.map((post) => (
        <Card key={post.author}>
          <View style={styles.postHeader}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.postInfo}>
              <Text style={styles.author}>{post.author}</Text>
              <Text style={styles.text}>{post.text}</Text>
            </View>
          </View>
          <View style={styles.footer}>
            <Badge label={post.tag} />
            <Text style={styles.reply}>Responder</Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: "row",
    gap: 12
  },
  metricCard: {
    flex: 1,
    alignItems: "center"
  },
  metric: {
    color: colors.primaryDark,
    fontSize: 28,
    fontWeight: "900"
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2
  },
  postHeader: {
    flexDirection: "row",
    gap: 12
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  postInfo: {
    flex: 1
  },
  author: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  text: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 4
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14
  },
  reply: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800"
  }
});
