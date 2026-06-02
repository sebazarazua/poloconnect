import { StyleSheet, Text, View } from "react-native";
import { Badge, Card, SectionTitle } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";

const tournaments = [
  { name: "Abierto de Palermo", date: "12 Nov - 08 Dic", level: "40 goles" },
  { name: "Hurlingham Open", date: "03 Oct - 26 Oct", level: "Alto handicap" },
  { name: "Tortugas Country Club", date: "10 Sep - 28 Sep", level: "Clasificatorio" }
];

export default function TournamentsScreen() {
  return (
    <Screen
      eyebrow="Temporada"
      title="Torneos"
      subtitle="Calendario, categorías y estado de las competencias principales."
    >
      <SectionTitle title="Próximos torneos" />
      {tournaments.map((item) => (
        <Card key={item.name}>
          <View style={styles.row}>
            <View style={styles.dateBox}>
              <Text style={styles.date}>{item.date}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.level}>{item.level}</Text>
            </View>
          </View>
        </Card>
      ))}

      <SectionTitle title="Tabla actual" />
      <Card>
        {["La Dolfina", "Ellerstina", "La Natividad"].map((team, index) => (
          <View key={team} style={styles.standing}>
            <Text style={styles.rank}>{index + 1}</Text>
            <Text style={styles.team}>{team}</Text>
            <Badge label={`${9 - index} pts`} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center"
  },
  dateBox: {
    width: 88,
    minHeight: 60,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    padding: 10
  },
  date: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  info: {
    flex: 1
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  level: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4
  },
  standing: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10
  },
  rank: {
    width: 30,
    color: colors.primary,
    fontSize: 18,
    fontWeight: "900"
  },
  team: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "700"
  }
});
