import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Badge, Card, SectionTitle } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";

const listings = [
  { title: "Yegua petisa", price: "USD 18.000", tag: "Caballo" },
  { title: "Montura profesional", price: "USD 1.250", tag: "Equipo" },
  { title: "Casco azul Navy", price: "USD 320", tag: "Accesorio" }
];

export default function MarketScreen() {
  return (
    <Screen
      eyebrow="Mercado"
      title="Compra y venta"
      subtitle="Equipamiento, caballos y servicios para jugadores y clubes."
    >
      <Card style={styles.searchCard}>
        <Ionicons name="search-outline" size={21} color={colors.primary} />
        <Text style={styles.searchText}>Buscar caballos, tacos, monturas...</Text>
      </Card>

      <SectionTitle title="Publicaciones" action="Publicar" />
      {listings.map((item) => (
        <Card key={item.title}>
          <View style={styles.listing}>
            <View style={styles.thumb}>
              <Ionicons name="sparkles-outline" size={26} color={colors.primary} />
            </View>
            <View style={styles.body}>
              <Badge label={item.tag} />
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.price}>{item.price}</Text>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ffffff"
  },
  searchText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "600"
  },
  listing: {
    flexDirection: "row",
    gap: 14
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  body: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 10
  },
  price: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4
  }
});
