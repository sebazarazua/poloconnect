import { Ionicons } from "@expo/vector-icons";
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

interface Product {
  id: string;
  name: string;
  price: number;
  category: "todos" | "equipamiento" | "indumentaria" | "vehiculos";
  image: string;
  isFavorite?: boolean;
}

const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Silla Butet\nUsada",
    price: 3200,
    category: "equipamiento",
    image: "https://via.placeholder.com/180x180/8B4513/FFFFFF?text=Silla+Butet"
  },
  {
    id: "2",
    name: "Casco Kep\nItalia",
    price: 980,
    category: "equipamiento",
    image: "https://via.placeholder.com/180x180/000000/FFFFFF?text=Casco+Kep"
  },
  {
    id: "3",
    name: "Camisa La Martina\nOficial",
    price: 120,
    category: "indumentaria",
    image: "https://via.placeholder.com/180x180/000000/FFFFFF?text=Camisa"
  },
  {
    id: "4",
    name: "Botas de Polo\nPremium",
    price: 350,
    category: "equipamiento",
    image: "https://via.placeholder.com/180x180/654321/FFFFFF?text=Botas"
  },
  {
    id: "5",
    name: "Vehiculo Transporte",
    price: 15000,
    category: "vehiculos",
    image: "https://via.placeholder.com/180x180/CCCCCC/000000?text=Vehiculo"
  },
  {
    id: "6",
    name: "Set de Tacos\nProfesional",
    price: 450,
    category: "equipamiento",
    image: "https://via.placeholder.com/180x180/C0C0C0/000000?text=Tacos"
  }
];

type CategoryFilter = "todos" | "equipamiento" | "indumentaria" | "vehiculos";

export default function MarketScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("todos");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      const matchesCategory = selectedCategory === "todos" || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <View style={styles.productCardContainer}>
      <Pressable style={styles.productCard}>
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
              name={favorites.has(item.id) ? "heart" : "heart-outline"}
              size={24}
              color={favorites.has(item.id) ? colors.primary : "#ffffff"}
            />
          </Pressable>
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
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
    borderColor: colors.border
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
