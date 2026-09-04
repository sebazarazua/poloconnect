import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useLocale } from "@/contexts/LocaleContext";
import { useMarket } from "@/contexts/MarketContext";
import { contactSeller } from "@/services/api/market";
import { fetchProduct } from "@/services/api/market";
import type { Product } from "@/services/market";

type ProductTab = "detalle" | "vendedor";

const fallbackVendor = {
  id: "fallback",
  name: "Juan Martinez",
  location: "Buenos Aires, Argentina",
  rating: 4.8,
  reviews: 42,
  phone: "+54 11 4523-7890",
  email: "jmartinez@correo.com",
  description: "Vendedor de equipamiento polo con más de 10 años de experiencia."
};

function normalizePhone(phone?: string) {
  if (!phone) return "";
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return "";
  return hasPlus ? `+${digits}` : digits;
}

function whatsappPhone(phone?: string) {
  return normalizePhone(phone).replace(/^\+/, "");
}

export default function ProductDetailScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { t } = useLocale();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { products, isFavorite, toggleFavorite } = useMarket();
  const cachedProduct = useMemo(() => products.find((item) => item.id === id), [id, products]);
  const [product, setProduct] = useState<Product | undefined>(cachedProduct);
  const [activeTab, setActiveTab] = useState<ProductTab>("detalle");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageCarouselWidth, setImageCarouselWidth] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const imageCarouselRef = useRef<ScrollView>(null);
  const viewerCarouselRef = useRef<ScrollView>(null);

  useEffect(() => {
    setProduct(cachedProduct);
    if (!id) return;
    void fetchProduct(id).then(setProduct);
  }, [cachedProduct, id]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product?.id]);

  useEffect(() => {
    if (!viewerOpen) {
      return;
    }

    const timer = setTimeout(() => {
      viewerCarouselRef.current?.scrollTo({
        x: Dimensions.get("window").width * activeImageIndex,
        animated: false
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [activeImageIndex, viewerOpen]);

  const vendor = product?.seller ?? fallbackVendor;
  const effectivePhone = product?.contactPhone ?? vendor.phone;
  const productImages = product?.images?.length ? product.images : [product?.image ?? ""];
  const activeImage = productImages[activeImageIndex] ?? productImages[0] ?? product?.image ?? "";
  const carouselPageWidth = imageCarouselWidth || (Dimensions.get("window").width - 32);

  const handleCallSeller = async () => {
    if (!product) return;

    const phone = normalizePhone(effectivePhone);
    if (!phone) {
      Alert.alert(t("product.noPhone"));
      return;
    }

    const telUrl = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(telUrl);
    if (!canOpen) {
      Alert.alert("No se pudo abrir el marcador");
      return;
    }

    await contactSeller(product.id, { contactType: "phone", message: `Llamada solicitada por ${product.name}` }).catch(() => undefined);
    await Linking.openURL(telUrl);
  };

  const handleWhatsappSeller = async () => {
    if (!product) return;

    const phone = whatsappPhone(effectivePhone);
    if (!phone) {
      Alert.alert(t("product.noPhone"));
      return;
    }

    const text = `Hola, vi tu producto en Polo Connect y me interesa. Producto: ${product.name}. Precio: USD ${product.price.toLocaleString()}.`;
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    const canOpen = await Linking.canOpenURL(waUrl);
    if (!canOpen) {
      Alert.alert("No se pudo abrir WhatsApp");
      return;
    }

    await contactSeller(product.id, { contactType: "whatsapp", message: text }).catch(() => undefined);
    await Linking.openURL(waUrl);
  };

  if (!product) {
    return (
      <Screen title={t("product.notFoundTitle")} showBackButton onBackPress={() => router.back()}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{t("product.notAvailable")}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      <Screen
        title={product.name}
        subtitle={`USD ${product.price.toLocaleString()}`}
        showBackButton
        onBackPress={() => router.back()}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Product Image */}
          <View
            style={styles.imageContainer}
            onLayout={(event) => {
              const nextWidth = Math.round(event.nativeEvent.layout.width);
              if (nextWidth > 0 && nextWidth !== imageCarouselWidth) {
                setImageCarouselWidth(nextWidth);
              }
            }}
          >
            <ScrollView
              ref={imageCarouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const width = event.nativeEvent.layoutMeasurement.width;
                if (!width) return;
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                setActiveImageIndex(nextIndex);
              }}
            >
              {productImages.map((imageUrl, index) => (
                <Pressable
                  key={`${imageUrl}-${index}`}
                  style={[styles.carouselSlide, { width: carouselPageWidth }]}
                  onPress={() => {
                    setActiveImageIndex(index);
                    setViewerOpen(true);
                  }}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
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
            {productImages.length > 1 ? (
              <View style={styles.carouselCounterPill}>
                <Text style={styles.carouselCounterText}>{activeImageIndex + 1}/{productImages.length}</Text>
              </View>
            ) : null}
          </View>
          {productImages.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
              {productImages.map((imageUrl, index) => (
                <Pressable
                  key={`${imageUrl}-${index}`}
                  style={[styles.galleryThumbWrap, activeImageIndex === index && styles.galleryThumbWrapActive]}
                  onPress={() => {
                    setActiveImageIndex(index);
                    imageCarouselRef.current?.scrollTo({
                      x: carouselPageWidth * index,
                      animated: true
                    });
                  }}
                >
                  <Image source={{ uri: imageUrl }} style={styles.galleryThumb} resizeMode="cover" />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {/* Product Info Card */}
          <View style={styles.infoCard}>
            {product.category !== "inmueble" ? (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{product.status.toUpperCase()}</Text>
              </View>
            ) : null}

            <Text style={styles.productName}>{product.name}</Text>

            <View style={styles.priceRow}>
              <Text style={styles.price}>USD {product.price.toLocaleString()}</Text>
              <Text style={styles.category}>{product.category.toUpperCase()}</Text>
            </View>

            <Text style={styles.description}>{product.description}</Text>

            <Pressable style={styles.contactButton} onPress={() => { void handleWhatsappSeller(); }}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#ffffff" />
              <Text style={styles.contactButtonText}>{t("product.contactSeller")}</Text>
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {([
              { id: "detalle", label: t("product.tab.detail") },
              { id: "vendedor", label: t("product.tab.vendor") }
            ] as Array<{ id: ProductTab; label: string }>).map((tab) => (
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
                <Text style={styles.sectionTitle}>{t("product.info")}</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t("product.category")}</Text>
                  <Text style={styles.detailValue}>{product.category}</Text>
                </View>

                {product.category !== "inmueble" ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t("product.status")}</Text>
                    <Text style={styles.detailValue}>{product.status}</Text>
                  </View>
                ) : null}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t("product.price")}</Text>
                  <Text style={styles.detailValue}>USD {product.price.toLocaleString()}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>{t("product.description")}</Text>
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
                    <Text style={styles.vendorName}>{vendor.name}</Text>
                    <Text style={styles.vendorLocation}>{vendor.location ?? t("product.locationMissing")}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color={colors.primary} />
                      <Text style={styles.ratingText}>
                        {vendor.rating ?? 0} ({vendor.reviews ?? 0} {t("product.reviews")})
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.vendorDescription}>{t("product.verifiedVendor")}</Text>

                <View style={styles.contactInfo}>
                  <View style={styles.contactRow}>
                    <Ionicons name="call-outline" size={16} color={colors.primary} />
                    <Text style={styles.contactValue}>{effectivePhone ?? t("product.noPhone")}</Text>
                  </View>

                  <View style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={16} color={colors.primary} />
                    <Text style={styles.contactValue}>{vendor.email ?? t("product.noEmail")}</Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <Pressable style={styles.callButton} onPress={() => { void handleCallSeller(); }}>
                    <Ionicons name="call" size={18} color="#ffffff" />
                    <Text style={styles.callButtonText}>{t("product.call")}</Text>
                  </Pressable>

                  <Pressable style={styles.whatsappButton} onPress={() => { void handleWhatsappSeller(); }}>
                    <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                    <Text style={styles.whatsappButtonText}>WhatsApp</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </Screen>
      {viewerOpen ? (
        <View style={styles.viewerOverlay}>
          <Pressable style={styles.viewerCloseBtn} onPress={() => setViewerOpen(false)}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <ScrollView
            ref={viewerCarouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const width = event.nativeEvent.layoutMeasurement.width;
              if (!width) return;
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(nextIndex);
            }}
          >
            {productImages.map((imageUrl, index) => (
              <ScrollView
                key={`${imageUrl}-viewer-${index}`}
                style={styles.viewerPage}
                contentContainerStyle={styles.viewerPageContent}
                minimumZoomScale={1}
                maximumZoomScale={4}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                centerContent
              >
                <Image source={{ uri: imageUrl }} style={styles.viewerImage} resizeMode="contain" />
              </ScrollView>
            ))}
          </ScrollView>
          <View style={styles.viewerCounterPill}>
            <Text style={styles.viewerCounterText}>{activeImageIndex + 1}/{productImages.length}</Text>
          </View>
        </View>
      ) : null}
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
  carouselSlide: {
    height: "100%"
  },
  productImage: {
    width: "100%",
    height: "100%"
  },
  carouselCounterPill: {
    position: "absolute",
    left: 12,
    bottom: 12,
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)"
  },
  carouselCounterText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800"
  },
  galleryRow: {
    gap: 8,
    paddingTop: 2,
    paddingBottom: 10,
    paddingHorizontal: 2
  },
  galleryThumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong
  },
  galleryThumbWrapActive: {
    borderColor: colors.primary,
    borderWidth: 2
  },
  galleryThumb: {
    width: "100%",
    height: "100%"
  },
  viewerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 40
  },
  viewerCloseBtn: {
    position: "absolute",
    top: 52,
    right: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50
  },
  viewerPage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height
  },
  viewerPageContent: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    alignItems: "center",
    justifyContent: "center"
  },
  viewerImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.8
  },
  viewerCounterPill: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  viewerCounterText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800"
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
