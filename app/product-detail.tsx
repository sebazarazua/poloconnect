import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useMarket } from "@/contexts/MarketContext";
import { getProductById } from "@/services/market";

type ProductTab = "detalle" | "vendedor";

const tabs: { id: ProductTab; label: string }[] = [
  { id: "detalle", label: "Detalle" },
  { id: "vendedor", label: "Vendedor" }
];

const mockVendor = {
  name: "Juan Martinez",
  location: "Buenos Aires, Argentina",
  rating: 4.8,
  reviews: 42,
  phone: "+54 11 4523-7890",
  email: "jmartinez@correo.com",
  description: "Vendedor de equipamiento polo con más de 10 años de experiencia."
};

export default function ProductDetailScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isFavorite, toggleFavorite } = useMarket();
  const product = useMemo(() => getProductById(id), [id]);
  const [activeTab, setActiveTab] = useState<ProductTab>("detalle");

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (_evt, gestureState) => gestureState.dx > 6,
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => gestureState.dx > 6,
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx > 40) {
          router.back();
        }
      }
    })
  ).current;

  if (!product) {
    return (
      <Screen title="Producto no encontrado" showBackButton onBackPress={() => router.back()}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Producto no disponible</Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Screen
        title={product.name}
        subtitle={`USD ${product.price.toLocaleString()}`}
        showBackButton
        onBackPress={() => router.back()}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Product Image */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: product.image }}
              style={styles.productImage}
            />
            <Pressable
              style={styles.favoriteButton}
              onPress={() => toggleFavorite(product.id)}
            >
              <Ionicons
                name={isFavorite(product.id) ? "heart" : "heart-outline"}
                size={28}
                color={isFavorite(product.id) ? colors.primary : "#ffffff"}
              />
            </Pressable>
          </View>

          {/* Product Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{product.status.toUpperCase()}</Text>
            </View>

            <Text style={styles.productName}>{product.name}</Text>

            <View style={styles.priceRow}>
              <Text style={styles.price}>USD {product.price.toLocaleString()}</Text>
              <Text style={styles.category}>{product.category.toUpperCase()}</Text>
            </View>

            <Text style={styles.description}>{product.description}</Text>

            <Pressable style={styles.contactButton}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#ffffff" />
              <Text style={styles.contactButtonText}>Contactar vendedor</Text>
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Tab Content */}
          {activeTab === "detalle" ? (
            <View style={styles.tabContent}>
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Información del producto</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Categoría:</Text>
                  <Text style={styles.detailValue}>{product.category}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Estado:</Text>
                  <Text style={styles.detailValue}>{product.status}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Precio:</Text>
                  <Text style={styles.detailValue}>USD {product.price.toLocaleString()}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Descripción</Text>
                  <Text style={styles.descriptionFull}>{product.description}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {activeTab === "vendedor" ? (
            <View style={styles.tabContent}>
              <View style={styles.vendorCard}>
                <View style={styles.vendorHeader}>
                  <View style={styles.vendorAvatar}>
                    <Text style={styles.vendorAvatarText}>JM</Text>
                  </View>
                  <View style={styles.vendorInfo}>
                    <Text style={styles.vendorName}>{mockVendor.name}</Text>
                    <Text style={styles.vendorLocation}>{mockVendor.location}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color={colors.primary} />
                      <Text style={styles.ratingText}>
                        {mockVendor.rating} ({mockVendor.reviews} reseñas)
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.vendorDescription}>{mockVendor.description}</Text>

                <View style={styles.contactInfo}>
                  <View style={styles.contactRow}>
                    <Ionicons name="call-outline" size={16} color={colors.primary} />
                    <Text style={styles.contactValue}>{mockVendor.phone}</Text>
                  </View>

                  <View style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={16} color={colors.primary} />
                    <Text style={styles.contactValue}>{mockVendor.email}</Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <Pressable style={styles.callButton}>
                    <Ionicons name="call" size={18} color="#ffffff" />
                    <Text style={styles.callButtonText}>Llamar</Text>
                  </Pressable>

                  <Pressable style={styles.whatsappButton}>
                    <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                    <Text style={styles.whatsappButtonText}>WhatsApp</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </Screen>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  errorText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "600"
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.background
  },
  productImage: {
    width: "100%",
    height: "100%"
  },
  favoriteButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center"
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  statusText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "700"
  },
  productName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 28
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  price: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "800"
  },
  category: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  description: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18
  },
  contactButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4
  },
  contactButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700"
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 16,
    gap: 0
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    marginBottom: -1
  },
  tabText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600"
  },
  activeTabText: {
    color: colors.primary
  },
  tabContent: {
    marginBottom: 20
  },
  detailSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    marginBottom: 12
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600"
  },
  detailValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  descriptionFull: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18
  },
  vendorCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16
  },
  vendorHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start"
  },
  vendorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  vendorAvatarText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800"
  },
  vendorInfo: {
    flex: 1,
    gap: 4
  },
  vendorName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800"
  },
  vendorLocation: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "500"
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2
  },
  ratingText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600"
  },
  vendorDescription: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18
  },
  contactInfo: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  contactValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600"
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 8
  },
  callButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  callButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700"
  },
  whatsappButton: {
    flex: 1,
    backgroundColor: "#25D366",
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  whatsappButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700"
  }
});
