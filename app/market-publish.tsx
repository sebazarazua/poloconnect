import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";
import { type ProductStatus, type MarketCategory } from "@/services/market";
import { useMarket } from "@/contexts/MarketContext";

const productStates: ProductStatus[] = ["Nuevo", "Usado", "Reacondicionado"];

type PublishCategory = Exclude<MarketCategory, "todos">;

const publishCategories: { value: PublishCategory; label: string }[] = [
  { value: "equipamiento", label: "Equipamiento" },
  { value: "indumentaria", label: "Indumentaria" },
  { value: "vehiculos", label: "Vehículos" },
  { value: "inmueble", label: "Inmueble" }
];

export default function MarketPublishScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { products, addProduct, updateProduct, deleteProduct } = useMarket();
  const existingProduct = useMemo(() => products.find((product) => product.id === id), [id, products]);
  const [imageUrl, setImageUrl] = useState("");
  const [name, setName] = useState("");
  const [selectedState, setSelectedState] = useState<ProductStatus>("Nuevo");
  const [selectedCategory, setSelectedCategory] = useState<PublishCategory>("equipamiento");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!existingProduct) {
      return;
    }

    setImageUrl(existingProduct.image);
    setName(existingProduct.name);
    setSelectedState(existingProduct.status);
    setSelectedCategory(existingProduct.category);
    setPrice(String(existingProduct.price));
    setDescription(existingProduct.description);
  }, [existingProduct]);

  const normalizedPrice = Number(price.replace(/[^0-9.]/g, ""));

  const isSubmitDisabled = useMemo(() => {
    return (
      !imageUrl.trim() ||
      !name.trim() ||
      !description.trim() ||
      !Number.isFinite(normalizedPrice) ||
      normalizedPrice <= 0
    );
  }, [description, imageUrl, name, normalizedPrice]);

  return (
    <Screen
      eyebrow="Mercado"
      title={existingProduct ? "Editar publicación" : "Publicar producto"}
      subtitle={
        existingProduct
          ? "Actualizá los datos de tu aviso propio."
          : "Completa los datos, aboná la publicación y tu aviso quedará listo para revisión."
      }
      showBackButton
      onBackPress={() => router.back()}
    >
      <View style={styles.paymentBanner}>
        <View style={styles.paymentIconWrap}>
          <Ionicons name="card" size={22} color={colors.primaryDark} />
        </View>

        <View style={styles.paymentTextWrap}>
          <Text style={styles.paymentTitle}>
            {existingProduct ? "Editando publicación propia" : "La publicación tiene costo"}
          </Text>
          <Text style={styles.paymentText}>
            {existingProduct
              ? "Podés ajustar el contenido y guardar los cambios."
              : "Antes de subir el aviso tenés que abonar la tarifa del mercado."}
          </Text>
        </View>

        <View style={styles.paymentLogoWrap}>
          <Image
            source={require("@/assets/logo.png")}
            style={styles.paymentLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Imagen</Text>
          <Pressable style={styles.uploadBox}>
            <Ionicons name="cloud-upload-outline" size={30} color={colors.primaryDark} />
            <Text style={styles.uploadTitle}>Subir imagen</Text>
            <Text style={styles.uploadText}>
              Tocá para agregar una imagen o pegá un enlace.
            </Text>
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="URL de la imagen"
            placeholderTextColor={colors.muted}
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Casco Kep Italia"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Estado</Text>
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
                  {state}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Tipo de producto</Text>
          <View style={styles.stateRow}>
            {publishCategories.map((cat) => (
              <Pressable
                key={cat.value}
                style={[styles.stateChip, selectedCategory === cat.value && styles.stateChipActive]}
                onPress={() => setSelectedCategory(cat.value)}
              >
                <Text
                  style={[
                    styles.stateChipText,
                    selectedCategory === cat.value && styles.stateChipTextActive
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Precio</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 250000"
            placeholderTextColor={colors.muted}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Descripcion</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Contá el estado, medidas, detalles y cualquier dato útil"
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        <Pressable
          style={[styles.publishButton, isSubmitDisabled && styles.publishButtonDisabled]}
          disabled={isSubmitDisabled}
          onPress={() => {
            const payload = {
              image: imageUrl.trim(),
              name: name.trim(),
              price: normalizedPrice,
              status: selectedState,
              description: description.trim(),
              category: selectedCategory
            };

            if (existingProduct) {
              updateProduct(existingProduct.id, payload);
            } else {
              addProduct(payload);
            }

            router.back();
          }}
        >
          <Ionicons name="cash-outline" size={20} color="#ffffff" />
          <Text style={styles.publishButtonText}>{existingProduct ? "Guardar cambios" : "Publicar"}</Text>
        </Pressable>

        {existingProduct ? (
          <Pressable
            style={styles.deleteOwnButton}
            onPress={() => {
              deleteProduct(existingProduct.id);
              router.back();
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#b42318" />
            <Text style={styles.deleteOwnButtonText}>Eliminar publicación</Text>
          </Pressable>
        ) : null}

        <Text style={styles.helperText}>
          El aviso se habilita solo después de confirmar el pago de publicación.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  paymentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#cfe2f5",
    backgroundColor: "#eef6ff",
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
    backgroundColor: "#ffffff",
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
    minHeight: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bfd6eb",
    borderStyle: "dashed",
    backgroundColor: "#f9fcff",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18
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
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#ffffff",
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  textArea: {
    minHeight: 112,
    textAlignVertical: "top"
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
    backgroundColor: "#ffffff",
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
    backgroundColor: "#fff1ef",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 2
  },
  deleteOwnButtonText: {
    color: "#b42318",
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