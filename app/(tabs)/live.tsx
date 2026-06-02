import { StyleSheet, Text, View } from "react-native";
import { Badge, Card, SectionTitle } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";

const plays = [
  "Gol de Ellerstina desde 40 yardas",
  "Cambio de caballo para el número 3",
  "Penal convertido por La Dolfina",
  "Bochazo largo y despeje defensivo"
];

export default function LiveScreen() {
  return (
    <Screen
      eyebrow="En vivo"
      title="Marcador en tiempo real"
      subtitle="Seguimiento visual de partidos activos, chukkers y jugadas principales."
    >
      <Card style={styles.matchCard}>
        <View style={styles.liveRow}>
          <Badge label="Live" />
          <Text style={styles.time}>04:21</Text>
        </View>
        <View style={styles.teams}>
          <Text style={styles.team}>La Dolfina</Text>
          <Text style={styles.points}>8</Text>
        </View>
        <View style={styles.teams}>
          <Text style={styles.team}>Ellerstina</Text>
          <Text style={styles.points}>7</Text>
        </View>
        <Text style={styles.chukker}>Chukker 3 de 6</Text>
      </Card>

      <SectionTitle title="Jugadas" />
      {plays.map((play, index) => (
        <Card key={play} style={styles.playCard}>
          <Text style={styles.minute}>{67 - index * 3}'</Text>
          <Text style={styles.play}>{play}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  matchCard: {
    backgroundColor: colors.primaryDark
  },
  liveRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18
  },
  time: {
    color: "#d8ecff",
    fontSize: 14,
    fontWeight: "800"
  },
  teams: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8
  },
  team: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800"
  },
  points: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900"
  },
  chukker: {
    color: "#cfe7ff",
    fontSize: 14,
    marginTop: 10
  },
  playCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  minute: {
    width: 42,
    color: colors.primary,
    fontWeight: "900",
    fontSize: 16
  },
  play: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "600"
  }
});
