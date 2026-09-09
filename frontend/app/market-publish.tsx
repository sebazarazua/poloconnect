import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useTheme, useThemeColors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { fetchProduct, uploadProductImage } from "@/services/api/market";
import { type Product, type ProductStatus, type MarketCategory } from "@/services/market";
import { useMarket } from "@/contexts/MarketContext";

const productStates: ProductStatus[] = ["Nuevo", "Usado", "Reacondicionado"];

type PublishCategory = Exclude<MarketCategory, "todos">;

const publishCategories: PublishCategory[] = ["equipamiento", "indumentaria", "vehiculos", "inmueble"];
const maxProductImages = 10;

function imageUploadErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message) {
    return message;
  }

  return "No se pudo procesar o subir la foto. Probá nuevamente.";
}

function getProductImageUpload(asset: ImagePicker.ImagePickerAsset) {
  return uploadProductImage({
    uri: asset.uri,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    file: asset.file
  });
}

export default function MarketPublishScreen() {
  const colors = useThemeColors();
  const { mode } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { t } = useLocale();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { addProduct, updateProduct, deleteProduct, refreshMarket } = useMarket();
  const [existingProduct, setExistingProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(Boolean(id));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [selectedState, setSelectedState] = useState<ProductStatus>("Nuevo");
  const [selectedCategory, setSelectedCategory] = useState<PublishCategory>("equipamiento");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [useAccountPhone, setUseAccountPhone] = useState(true);
  const [customContactPhone, setCustomContactPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const imageUploadInProgress = useRef(false);
  const nameInputRef = useRef<TextInput>(null);
  const priceInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const screenScrollRef = useRef<any>(null);

  useEffect(() => {
    if (!id) {
      setExistingProduct(null);
      setIsLoadingProduct(false);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingProduct(true);
    setLoadError(null);
    void fetchProduct(id).then((product) => {
      if (cancelled) return;
      if (product.publicationStatus === "rejected") {
        throw new Error("Las publicaciones rechazadas no se pueden editar.");
      }
      setExistingProduct(product);
      const nextImages = (product.images ?? []).filter((entry) => Boolean(entry?.trim()));
      setImageUrls(nextImages.length > 0 ? nextImages : (product.image ? [product.image] : []));
      setName(product.name);
      setSelectedState(product.status);
      setSelectedCategory(product.category);
      setPrice(String(product.price));
      setDescription(product.description);
      setCustomContactPhone(product.contactPhone ?? "");
      setUseAccountPhone(!product.contactPhone);
    }).catch((error) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "No se pudo cargar la publicación.");
    }).finally(() => {
      if (!cancelled) setIsLoadingProduct(false);
    });
    return () => { cancelled = true; };
  }, [id, loadAttempt]);

  const appendImageUrls = (urls: string[]) => {
    setImageUrls((current) => {
      const next = [...current];
      urls.forEach((url) => {
        const normalized = url.trim();
        if (!normalized) return;
        if (next.includes(normalized)) return;
        if (next.length >= maxProductImages) return;
        next.push(normalized);
      });
      return next;
    });
  };

  const normalizedPrice = Number(price.replace(/[^0-9.]/g, ""));

  const uploadImageFromLibrary = async () => {
    const availableSlots = Math.max(0, maxProductImages - imageUrls.length);
    if (availableSlots === 0) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("profile.photoPermissionTitle"), t("profile.galleryPermissionText"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: availableSlots,
      orderedSelection: true,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      shouldDownloadFromNetwork: true,
      quality: 0.8
    });

    if (result.canceled || (result.assets?.length ?? 0) === 0) return;

    const selectedAssets = result.assets.slice(0, availableSlots);

    for (const asset of selectedAssets) {
      if (!asset.uri) continue;
      const uploadedUrl = await getProductImageUpload(asset);
      appendImageUrls([uploadedUrl]);
    }

    if (result.assets.length > selectedAssets.length) {
      Alert.alert("Límite alcanzado", `Solo se agregaron ${selectedAssets.length} fotos porque el límite es ${maxProductImages}.`);
    }
  };

  const uploadImageFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("profile.photoPermissionTitle"), t("profile.cameraPermissionText"));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    const asset = result.assets[0];
    const uploadedUrl = await getProductImageUpload(asset);
    appendImageUrls([uploadedUrl]);
  };

  const runImageUpload = async (source: "camera" | "library") => {
    if (imageUploadInProgress.current) return;
    imageUploadInProgress.current = true;
    setIsUploadingImages(true);
    try {
      await (source === "camera" ? uploadImageFromCamera() : uploadImageFromLibrary());
    } catch (error) {
      if (__DEV__) console.warn("[market/image-upload]", error instanceof Error ? error.message : "Unknown upload error");
      Alert.alert("No se pudo subir la foto", imageUploadErrorMessage(error));
    } finally {
      imageUploadInProgress.current = false;
      setIsUploadingImages(false);
    }
  };

  const handlePickImage = () => {
    if (imageUploadInProgress.current || isSubmitting || isDeleting) return;
    if (imageUrls.length >= maxProductImages) {
      Alert.alert("Límite alcanzado", `Podés subir hasta ${maxProductImages} fotos por publicación.`);
      return;
    }
    Alert.alert(t("marketPublish.uploadImage"), t("marketPublish.uploadText"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.takePhoto"),
        onPress: () => {
          void runImageUpload("camera");
        }
      },
      {
        text: t("profile.chooseGallery"),
        onPress: () => {
          void runImageUpload("library");
        }
      }
    ]);
  };

  const isSubmitDisabled = useMemo(() => {
    return (
      isSubmitting ||
      isDeleting ||
      isUploadingImages ||
      imageUrls.length === 0 ||
      !name.trim() ||
      !description.trim() ||
      !Number.isFinite(normalizedPrice) ||
      normalizedPrice <= 0
    );
  }, [description, imageUrls.length, isDeleting, isSubmitting, isUploadingImages, name, normalizedPrice]);

  if (id && (isLoadingProduct || loadError || !existingProduct || existingProduct.id !== id)) {
    return (
      <Screen eyebrow={t("market.eyebrow")} title={t("marketPublish.editTitle")} showBackButton onBackPress={() => router.back()}>
        {isLoadingProduct ? <ActivityIndicator color={colors.primaryDark} /> : (
          <View style={styles.form}>
            <Text style={styles.uploadText}>{loadError ?? "No se pudo cargar la publicación."}</Text>
            <Pressable accessibilityLabel="Reintentar" style={styles.descriptionDoneButton} onPress={() => setLoadAttempt((value) => value + 1)}>
              <Ionicons name="refresh-outline" size={20} color={colors.primaryDark} />
            </Pressable>
          </View>
        )}
      </Screen>
    );
  }

  return (
    <Screen
      eyebrow={t("market.eyebrow")}
      title={existingProduct ? t("marketPublish.editTitle") : t("marketPublish.createTitle")}
      subtitle={existingProduct ? t("marketPublish.editSubtitle") : t("marketPublish.createSubtitle")}
      showBackButton
      onBackPress={() => router.back()}
      scrollViewRef={screenScrollRef}
    >
      <View style={styles.paymentBanner}>
        <View style={styles.paymentIconWrap}>
          <Ionicons name="card" size={22} color={colors.primaryDark} />
        </View>

        <View style={styles.paymentTextWrap}>
          <Text style={styles.paymentTitle}>
            {existingProduct ? t("marketPublish.editingOwn") : t("marketPublish.hasCost")}
          </Text>
          <Text style={styles.paymentText}>
            {existingProduct
              ? t("marketPublish.editingOwnText")
              : t("marketPublish.hasCostText")}
          </Text>
        </View>

        <View style={styles.paymentLogoWrap}>
          <Image
            source={mode === "dark" ? require("@/assets/logo-login.png") : require("@/assets/logo.png")}
            style={styles.paymentLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>{t("marketPublish.image")} ({imageUrls.length}/{maxProductImages})</Text>
          <Pressable
            style={[styles.uploadBox, imageUrls.length > 0 ? styles.uploadBoxWithImage : null]}
            onPress={handlePickImage}
            disabled={isUploadingImages || isSubmitting || isDeleting}
            accessibilityState={{ busy: isUploadingImages, disabled: isUploadingImages || isSubmitting || isDeleting }}
          >
            {isUploadingImages ? (
              <ActivityIndicator size="large" color={colors.primaryDark} />
            ) : imageUrls.length > 0 ? (
              <Image source={{ uri: imageUrls[0] }} style={styles.uploadPreview} resizeMode="cover" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={30} color={colors.primaryDark} />
                <Text style={styles.uploadTitle}>{t("marketPublish.uploadImage")}</Text>
                <Text style={styles.uploadText}>{t("marketPublish.uploadText")}</Text>
              </>
            )}
          </Pressable>
          {imageUrls.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageGalleryRow}>
              {imageUrls.map((url, index) => (
                <View key={`${url}-${index}`} style={styles.galleryThumbWrap}>
                  <Image source={{ uri: url }} style={styles.galleryThumb} resizeMode="cover" />
                  <View style={styles.thumbOrderBadge}>
                    <Text style={styles.thumbOrderText}>{index + 1}</Text>
                  </View>
                  <Pressable
                    style={styles.removeThumbBtn}
                    disabled={isUploadingImages || isSubmitting || isDeleting}
                    onPress={() => {
                      setImageUrls((current) => current.filter((_, currentIndex) => currentIndex !== index));
                    }}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}
          <Text style={styles.helperText}>Solo se aceptan fotos subidas desde tu dispositivo.</Text>
          <Text style={styles.helperText}>El orden queda según selección: la foto 1 será la portada.</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>{t("marketPublish.name")}</Text>
          <TextInput
            ref={nameInputRef}
            style={styles.input}
            placeholder={t("marketPublish.namePlaceholder")}
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            onSubmitEditing={() => priceInputRef.current?.focus()}
          />
        </View>

        {selectedCategory !== "inmueble" ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>{t("marketPublish.state")}</Text>
            <View style={styles.stateRow}>
              {productStates.map((state) => (
                <Pressable
                  key={state}
                  style={[styles.stateChip, selectedState === state && styles.stateChipActive]}
                  onPress={() => setSelectedState(state)}
                >
                  <Text
                    style={[
                      styles.stateChipText,
                      selectedState === state && styles.stateChipTextActive
                    ]}
                  >
                    {state === "Nuevo" ? t("marketPublish.status.new") : state === "Usado" ? t("marketPublish.status.used") : t("marketPublish.status.refurbished")}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>{t("marketPublish.productType")}</Text>
          <View style={styles.stateRow}>
            {publishCategories.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.stateChip, selectedCategory === cat && styles.stateChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.stateChipText,
                    selectedCategory === cat && styles.stateChipTextActive
                  ]}
                >
                  {t(`market.category.${cat}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>{t("marketPublish.price")}</Text>
          <TextInput
            ref={priceInputRef}
            style={styles.input}
            placeholder={t("marketPublish.pricePlaceholder")}
            placeholderTextColor={colors.muted}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            returnKeyType="next"
            onSubmitEditing={() => descriptionInputRef.current?.focus()}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>{t("marketPublish.description")}</Text>
          <TextInput
            ref={descriptionInputRef}
            style={[styles.input, styles.textArea]}
            placeholder={t("marketPublish.descriptionPlaceholder")}
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            onFocus={() => {
              setTimeout(() => {
                screenScrollRef.current?.scrollToEnd({ animated: true });
              }, 120);
            }}
            blurOnSubmit={false}
            returnKeyType="default"
          />
          <View style={styles.descriptionActions}>
            <Pressable style={styles.descriptionDoneButton} onPress={Keyboard.dismiss}>
              <Text style={styles.descriptionDoneText}>{t("common.done")}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Teléfono de contacto</Text>
          <Text style={styles.uploadText}>Elegí si querés usar tu número de cuenta o uno específico de esta publicación.</Text>
          <View style={styles.stateRow}>
            <Pressable
              style={[styles.stateChip, useAccountPhone && styles.stateChipActive]}
              onPress={() => setUseAccountPhone(true)}
            >
              <Text style={[styles.stateChipText, useAccountPhone && styles.stateChipTextActive]}>
                Usar el de mi cuenta{user?.phone ? ` (${user.phone})` : ""}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.stateChip, !useAccountPhone && styles.stateChipActive]}
              onPress={() => setUseAccountPhone(false)}
            >
              <Text style={[styles.stateChipText, !useAccountPhone && styles.stateChipTextActive]}>
                Usar otro número
              </Text>
            </Pressable>
          </View>
          {!useAccountPhone ? (
            <TextInput
              style={styles.input}
              placeholder=""
              placeholderTextColor={colors.muted}
              value={customContactPhone}
              onChangeText={setCustomContactPhone}
              keyboardType="phone-pad"
            />
          ) : null}
        </View>

        <Pressable
          style={[styles.publishButton, isSubmitDisabled && styles.publishButtonDisabled]}
          disabled={isSubmitDisabled}
          onPress={async () => {
            const payload = {
              image: imageUrls[0]?.trim() ?? "",
              images: imageUrls,
              name: name.trim(),
              price: normalizedPrice,
              status: selectedCategory === "inmueble" ? "Usado" : selectedState,
              description,
              category: selectedCategory,
              currency: existingProduct?.currency ?? "USD",
              contactPhone: useAccountPhone ? undefined : customContactPhone.trim() || undefined
            };

            try {
              setIsSubmitting(true);

              if (existingProduct) {
                await updateProduct(existingProduct.id, payload);
                router.back();
                return;
              }

              const result = await addProduct(payload);

              if (result.payment.required && result.payment.url) {
                // Opens Mercado Pago in-app and resolves when it redirects back to our deep link.
                // This is UX only: the real payment confirmation always comes from the backend webhook.
                await WebBrowser.openAuthSessionAsync(result.payment.url, "polo-connect://market-publish-return");
                void refreshMarket().catch(() => undefined);
                router.replace("/market-publish-return");
                return;
              }

              Alert.alert(t("marketPublish.publishedTitle"), t("marketPublish.publishedText"));
              router.back();
            } catch (error) {
              Alert.alert(t("marketPublish.errorTitle"), error instanceof Error ? error.message : t("marketPublish.errorFallback"));
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Ionicons name="cash-outline" size={20} color="#ffffff" />
          )}
          <Text style={styles.publishButtonText}>{existingProduct ? t("marketPublish.saveChanges") : t("market.publish")}</Text>
        </Pressable>

        {existingProduct ? (
          <Pressable
            style={[styles.deleteOwnButton, (isSubmitting || isDeleting) && styles.publishButtonDisabled]}
            disabled={isSubmitting || isDeleting || isUploadingImages}
            onPress={() => {
              Alert.alert(t("marketPublish.deleteConfirmTitle"), t("marketPublish.deleteConfirmText"), [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("marketPublish.deleteConfirmAction"),
                  style: "destructive",
                  onPress: async () => {
                    try {
                      setIsDeleting(true);
                      await deleteProduct(existingProduct.id);
                      router.back();
                    } catch (error) {
                      Alert.alert(t("marketPublish.errorTitle"), error instanceof Error ? error.message : t("marketPublish.errorFallback"));
                    } finally {
                      setIsDeleting(false);
                    }
                  }
                }
              ]);
              }
            }
          >
            {isDeleting ? (
              <ActivityIndicator color={colors.danger} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            )}
            <Text style={styles.deleteOwnButtonText}>{t("marketPublish.delete")}</Text>
          </Pressable>
        ) : null}

        <Text style={styles.helperText}>
          {t("marketPublish.helper")}
        </Text>
      </View>
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  paymentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#cfe2f5",
    backgroundColor: colors.surfaceStrong,
    padding: 14,
    marginBottom: 18
  },
  paymentIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  paymentTextWrap: {
    flex: 1,
    gap: 4
  },
  paymentTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  paymentText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  paymentLogoWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  paymentLogo: {
    width: 32,
    height: 32
  },
  form: {
    gap: 14
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 10
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800"
  },
  uploadBox: {
    height: 170,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bfd6eb",
    borderStyle: "dashed",
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
    overflow: "hidden"
  },
  uploadBoxWithImage: {
    borderStyle: "solid",
    paddingHorizontal: 0
  },
  uploadPreview: {
    width: "100%",
    height: "100%",
    borderRadius: 15
  },
  uploadTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  uploadText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center"
  },
  imageGalleryRow: {
    gap: 8,
    paddingVertical: 4
  },
  galleryThumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong
  },
  galleryThumb: {
    width: "100%",
    height: "100%"
  },
  removeThumbBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.65)"
  },
  thumbOrderBadge: {
    position: "absolute",
    left: 4,
    bottom: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10, 26, 47, 0.8)"
  },
  thumbOrderText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800"
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  textArea: {
    minHeight: 112,
    textAlignVertical: "top"
  },
  descriptionActions: {
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  descriptionDoneButton: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  descriptionDoneText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  stateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  stateChip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  stateChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  stateChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  stateChipTextActive: {
    color: "#ffffff"
  },
  publishButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4
  },
  publishButtonDisabled: {
    opacity: 0.55
  },
  publishButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800"
  },
  deleteOwnButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ffd2cc",
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 2
  },
  deleteOwnButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "800"
  },
  helperText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 10,
    marginTop: -2
  }
});
