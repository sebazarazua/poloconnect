import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { resolveContentImageSource } from "@/services/content-images";
import { type Brand, type BrandProduct, getBrand, listBrandProducts, listBrands } from "@/services/api/brands";

export default function BrandCatalogScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [brandList, setBrandList] = useState<Brand[]>([]);
  const [products, setProducts] = useState<BrandProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizedWebsite = normalizeWebsite(brand?.website);

  const openExternal = async (url: string, errorMessage: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert("No se pudo abrir", errorMessage);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("No se pudo abrir", errorMessage);
    }
  };

  useEffect(() => {
    if (!id) {
      void listBrands()
        .then((items) => setBrandList(items))
        .catch(() => setBrandList([]))
        .finally(() => setLoading(false));
      return;
    }
    void Promise.all([getBrand(id), listBrandProducts(id)])
      .then(([b, p]) => { setBrand(b); setProducts(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const formatPrice = (product: BrandProduct) => {
    if (!product.priceCents) return null;
    const price = product.priceCents / 100;
    return `${product.currency ?? "USD"} ${price.toLocaleString("es-AR")}`;
  };

  if (!id) {
    return (
      <Screen title="Marcas" showBackButton onBackPress={() => router.back()}>
        {loading ? (
          <View style={styles.emptyState}><Text style={styles.emptyText}>Cargando marcas...</Text></View>
        ) : brandList.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetags-outline" size={44} color={colors.muted} />
            <Text style={styles.emptyText}>Todavia no hay marcas cargadas</Text>
          </View>
        ) : (
          <View style={styles.listGrid}>
            {brandList.map((item) => (
              <Pressable key={item.id} style={styles.listTile} onPress={() => router.push({ pathname: "/brand-catalog", params: { id: item.id } })}>
                {item.logoUrl ? (
                  <Image source={resolveContentImageSource(item.logoUrl)} style={styles.listTileLogo} resizeMode="contain" />
                ) : (
                  <View style={[styles.listTileLogo, styles.listTileLogoFallback]}>
                    <Ionicons name="storefront-outline" size={28} color={colors.primary} />
                  </View>
                )}
                <Text style={styles.listTileName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.listTileMeta}>{item.productCount ?? 0} productos</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Screen>
    );
  }

  return (
    <Screen title="" hideHeader showBackButton onBackPress={() => router.back()}>
      {brand && (
        <>
          <View style={styles.profileHeader}>
            <View style={styles.profileTopRow}>
              {brand.logoUrl ? (
                <Image source={resolveContentImageSource(brand.logoUrl)} style={styles.profileLogo} resizeMode="contain" />
              ) : (
                <View style={[styles.profileLogo, styles.profileLogoFallback]}>
                  <Ionicons name="storefront-outline" size={24} color={colors.primary} />
                </View>
              )}

              <View style={styles.profileTextCol}>
                <View style={styles.profileNameRow}>
                  <Text style={styles.profileName}>{brand.name}</Text>
                  <Ionicons name="checkmark-circle" size={16} color="#0a66c2" style={{ marginTop: 1 }} />
                </View>
                {brand.description ? <Text style={styles.profileDesc}>{brand.description}</Text> : null}
              </View>
            </View>
          </View>

          <View style={styles.contactRow}>
            {brand.whatsapp ? (
              <Pressable
                style={[styles.contactBtn, styles.contactBtnWa]}
                onPress={() => {
                  const n = brand.whatsapp!.replace(/\D/g, "");
                  void openExternal(`https://wa.me/${n}`, "El WhatsApp de esta marca no es válido.");
                }}
              >
                <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                <Text style={styles.contactBtnText}>WhatsApp</Text>
              </Pressable>
            ) : null}
            {brand.phone ? (
              <Pressable
                style={[styles.contactBtn, styles.contactBtnSecondary]}
                onPress={() => void openExternal(`tel:${brand.phone}`, "No se pudo abrir el marcador.")}
              >
                <Ionicons name="call-outline" size={14} color={colors.primaryDark} />
                <Text style={styles.contactBtnText}>Llamar</Text>
              </Pressable>
            ) : null}
            {brand.email ? (
              <Pressable
                style={[styles.contactBtn, styles.contactBtnSecondary]}
                onPress={() => void openExternal(`mailto:${brand.email}`, "No se pudo abrir el correo.")}
              >
                <Ionicons name="mail-outline" size={14} color={colors.primaryDark} />
                <Text style={styles.contactBtnText}>Email</Text>
              </Pressable>
            ) : null}
            {normalizedWebsite ? (
              <Pressable
                style={[styles.contactBtn, styles.contactBtnSecondary]}
                onPress={() => void openExternal(normalizedWebsite, "El sitio web de esta marca no es válido.")}
              >
                <Ionicons name="globe-outline" size={14} color={colors.primaryDark} />
                <Text style={styles.contactBtnText}>Sitio web</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.divider} />
        </>
      )}

      {loading ? (
        <View style={styles.emptyState}><Text style={styles.emptyText}>Cargando productos...</Text></View>
      ) : products.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={44} color={colors.muted} />
          <Text style={styles.emptyText}>No hay productos disponibles</Text>
        </View>
      ) : (
        <View style={styles.productsGrid}>
          {products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              {product.imageUrl ? (
                <Image source={resolveContentImageSource(product.imageUrl)} style={styles.productImage} resizeMode="cover" />
              ) : (
                <View style={[styles.productImage, styles.productImageFallback]}>
                  <Ionicons name="image-outline" size={30} color={colors.muted} />
                </View>
              )}
              <View style={styles.productBody}>
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>
                {formatPrice(product) ? <Text style={styles.productPrice}>{formatPrice(product)}</Text> : null}

                <View style={styles.productContactRow}>
                  {brand?.whatsapp ? (
                    <Pressable
                      style={styles.inlineContactBtn}
                      onPress={() => {
                        const n = brand.whatsapp!.replace(/\D/g, "");
                        const msg = encodeURIComponent(`Hola! Me interesa: ${product.name}`);
                        void openExternal(`https://wa.me/${n}?text=${msg}`, "El WhatsApp de esta marca no es válido.");
                      }}
                    >
                      <Ionicons name="logo-whatsapp" size={13} color="#25D366" />
                    </Pressable>
                  ) : null}
                  {brand?.phone ? (
                    <Pressable style={styles.inlineContactBtn} onPress={() => void openExternal(`tel:${brand.phone}`, "No se pudo abrir el marcador.")}>
                      <Ionicons name="call-outline" size={13} color={colors.primaryDark} />
                    </Pressable>
                  ) : null}
                  {brand?.email ? (
                    <Pressable style={styles.inlineContactBtn} onPress={() => void openExternal(`mailto:${brand.email}`, "No se pudo abrir el correo.")}>
                      <Ionicons name="mail-outline" size={13} color={colors.primaryDark} />
                    </Pressable>
                  ) : null}
                  {normalizedWebsite ? (
                    <Pressable style={styles.inlineContactBtn} onPress={() => void openExternal(normalizedWebsite, "El sitio web de esta marca no es válido.")}>
                      <Ionicons name="globe-outline" size={13} color={colors.primaryDark} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  profileHeader: { paddingTop: 0, paddingBottom: 8, gap: 8 },
  profileTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  profileTextCol: { flex: 1, gap: 4, paddingTop: 2 },
  profileLogo: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border },
  profileLogoFallback: { alignItems: "center", justifyContent: "center" },
  profileNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileName: { color: colors.text, fontSize: 20, fontWeight: "900", lineHeight: 24 },
  profileDesc: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  contactRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 2 },
  contactBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, minHeight: 30 },
  contactBtnWa: { backgroundColor: "rgba(37, 211, 102, 0.14)", borderWidth: 1, borderColor: "rgba(37, 211, 102, 0.35)" },
  contactBtnSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  contactBtnText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  productsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  productCard: { width: "48%", backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  productImage: { width: "100%", height: 140, backgroundColor: colors.surfaceStrong },
  productImageFallback: { alignItems: "center", justifyContent: "center" },
  productBody: { padding: 10, gap: 5 },
  productName: { color: colors.text, fontSize: 14, fontWeight: "800", lineHeight: 18 },
  productDesc: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  productPrice: { color: colors.primary, fontSize: 14, fontWeight: "900", marginTop: 2 },
  productContactRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  inlineContactBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceStrong
  },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  emptyText: { color: colors.muted, fontSize: 14 },
  listGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  listTile: { width: "48%", backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, alignItems: "center", gap: 8 },
  listTileLogo: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.surfaceStrong },
  listTileLogoFallback: { alignItems: "center", justifyContent: "center" },
  listTileName: { color: colors.text, fontSize: 14, fontWeight: "800", textAlign: "center" },
  listTileMeta: { color: colors.muted, fontSize: 12, fontWeight: "700" }
});

function normalizeWebsite(website?: string | null) {
  const raw = website?.trim();
  if (!raw) return null;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.href;
  } catch {
    return null;
  }
}
