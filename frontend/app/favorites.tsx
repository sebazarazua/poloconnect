import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useMarket } from "@/contexts/MarketContext";

export default function FavoritesScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { favoriteProducts, toggleFavorite } = useMarket();

  return (
    <Screen
      eyebrow="Mercado"
      title="Favoritos"
      subtitle="Tus publicaciones guardadas para revisar rapido antes de comprar."
      showBackButton
      onBackPress={() => router.back()}
    >
      <View style={styles.list}>
        {favoriteProducts.map((product) => (
          <View key={product.id} style={styles.card}>
            <Image source={{ uri: product.image }} style={styles.image} />

            <View style={styles.info}>
              <Text style={styles.name}>{product.name.replace("\n", " ")}</Text>
              <Text style={styles.price}>USD {product.price.toLocaleString()}</Text>
            </View>

            <Pressable
              style={styles.removeButton}
              onPress={() => toggleFavorite(product.id)}
              accessibilityLabel={`Quitar ${product.name} de favoritos`}
            >
              <Ionicons name="heart" size={20} color={colors.danger} />
            </Pressable>
          </View>
        ))}

        {favoriteProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={46} color={colors.muted} />
            <Text style={styles.emptyTitle}>Todavia no guardaste productos</Text>
            <Text style={styles.emptyText}>Marcá el corazon en mercado para verlos aca.</Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  list: {
    gap: 12
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12
  },
  image: {
    width: 74,
    height: 74,
    borderRadius: 12,
    backgroundColor: colors.surfaceStrong
  },
  info: {
    flex: 1,
    gap: 6
  },
  name: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700"
  },
  price: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "900"
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 40,
    marginTop: 10
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 12
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center"
  }
});