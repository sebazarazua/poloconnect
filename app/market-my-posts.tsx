import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useMarket } from "@/contexts/MarketContext";

export default function MarketMyPostsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { myProducts, deleteProduct } = useMarket();

  return (
    <Screen
      eyebrow="Mercado"
      title="Mis publicaciones"
      subtitle="Edita o elimina tus avisos creados."
      showBackButton
      onBackPress={() => router.back()}
    >
      {myProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="albums-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>Todavía no publicaste nada</Text>
          <Text style={styles.emptyText}>Usá Publicar para crear tu primer aviso.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {myProducts.map((product) => (
            <View key={product.id} style={styles.card}>
              <Image source={{ uri: product.image }} style={styles.image} />

              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={2}>
                  {product.name.replace("\n", " ")}
                </Text>
                <Text style={styles.price}>USD {product.price.toLocaleString()}</Text>

                <View style={styles.actions}>
                  <Pressable
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => router.push(`/market-publish?id=${product.id}`)}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.primaryDark} />
                    <Text style={styles.actionText}>Editar</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteProduct(product.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={[styles.actionText, styles.deleteText]}>Eliminar</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  list: {
    gap: 12,
    paddingBottom: 8
  },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12
  },
  image: {
    width: 82,
    height: 82,
    borderRadius: 12,
    backgroundColor: colors.surfaceStrong
  },
  body: {
    flex: 1,
    gap: 8
  },
  name: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800"
  },
  price: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "900"
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  actionButton: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6
  },
  editButton: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "#cfe2f5"
  },
  deleteButton: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: "#ffd2cc"
  },
  actionText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  },
  deleteText: {
    color: colors.danger
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16
  }
});