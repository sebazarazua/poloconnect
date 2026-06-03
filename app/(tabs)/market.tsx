import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";
import { useMarket } from "@/contexts/MarketContext";
import { type Product, type MarketCategory } from "@/services/market";

export default function MarketScreen() {
  const router = useRouter();
  const { products, favoriteIds, isFavorite, toggleFavorite } = useMarket();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>("todos");

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory === "todos" || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, searchQuery, selectedCategory]);

  const renderProductCard = ({ item }: { item: Product }) => (
    <View style={styles.productCardContainer}>
      <Pressable 
        style={styles.productCard}
        onPress={() => router.push(`/product-detail?id=${item.id}`)}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image }}
            style={styles.productImage}
          />
          <Pressable
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(item.id)}
          >
            <Ionicons
              name={isFavorite(item.id) ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite(item.id) ? colors.primary : "#ffffff"}
            />
          </Pressable>
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>USD {item.price.toLocaleString()}</Text>
        </View>
      </Pressable>
    </View>
  );

  return (
    <Screen
      eyebrow="Mercado"
      title="Compra y venta"
      subtitle="Equipamiento, caballos y servicios para jugadores y clubes."
    >
      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryAction} onPress={() => router.push("/favorites")}>
          <Ionicons name="heart-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.secondaryActionText}>Favoritos</Text>
          <View style={styles.counterBadge}>
            <Text style={styles.counterBadgeText}>{favoriteIds.size}</Text>
          </View>
        </Pressable>

        <Pressable style={styles.primaryAction} onPress={() => router.push("/market-publish")}>
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.primaryActionText}>Publicar</Text>
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar productos"
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Tabs */}
      <View style={styles.categoriesContainer}>
        {(["todos", "equipamiento", "indumentaria", "vehiculos"] as const).map((category) => (
          <Pressable
            key={category}
            style={[
              styles.categoryTab,
              selectedCategory === category && styles.categoryTabActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === category && styles.categoryTabTextActive
              ]}
            >
              {category.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        scrollEnabled={false}
        contentContainerStyle={styles.gridContainer}
      />

      {filteredProducts.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyText}>No hay productos</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16
  },
  secondaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  secondaryActionText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800"
  },
  counterBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6
  },
  counterBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  primaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  primaryActionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800"
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "500"
  },
  categoriesContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
    paddingHorizontal: 0
  },
  categoryTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  categoryTabText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700"
  },
  categoryTabTextActive: {
    color: "#ffffff"
  },
  gridContainer: {
    paddingBottom: 20
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12
  },
  productCardContainer: {
    flex: 1
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    minHeight: 280
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.background
  },
  productImage: {
    width: "100%",
    height: "100%"
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center"
  },
  productInfo: {
    padding: 12,
    gap: 4
  },
  productName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16
  },
  productPrice: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800"
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12
  },
  emptyText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "600"
  }
});
