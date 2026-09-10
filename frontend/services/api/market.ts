import { File as NativeFile } from "expo-file-system";
import { Platform } from "react-native";
import { apiRequest, resolveApiMediaUrl } from "@/services/api/client";
import type { Product } from "@/services/market";

type Page<T> = {
  data: T[];
  page: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type ProductPayload = Omit<Product, "id" | "ownerId">;

export type ProductPublicationResult = {
  product: Product;
  payment: {
    required: boolean;
    provider: "mercado_pago" | null;
    url: string | null;
    status: "pending" | "approved" | "rejected" | "cancelled" | "refunded" | null;
    canResume?: boolean;
  };
};

type UploadProductImageResponse = {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
};

const categoryFallbackImage: Record<string, string> = {
  equipamiento: "https://images.pexels.com/photos/1174104/pexels-photo-1174104.jpeg?auto=compress&cs=tinysrgb&w=1200",
  indumentaria: "https://images.pexels.com/photos/1124465/pexels-photo-1124465.jpeg?auto=compress&cs=tinysrgb&w=1200",
  vehiculos: "https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg?auto=compress&cs=tinysrgb&w=1200",
  inmueble: "https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=1200"
};

const contactPhoneMarkerPrefix = "<!--pc:contactPhone=";
const contactPhoneMarkerRegex = /<!--pc:contactPhone=([^>]*)-->/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asProductArray(response: Page<Product>) {
  return Array.isArray(response.data) ? response.data : [];
}

function normalizeImageUrl(imageUrl?: string) {
  if (!imageUrl) return "";
  return resolveApiMediaUrl(imageUrl) ?? "";
}

function decodeContactPhone(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function normalizeProduct(product: unknown): Product | null {
  if (!isRecord(product)) return null;

  const rawDescription = asString(product.description);
  const markerMatch = rawDescription.match(contactPhoneMarkerRegex);
  const contactPhone = markerMatch?.[1]?.trim() ? decodeContactPhone(markerMatch[1].trim()) : undefined;
  const cleanDescription = rawDescription.replace(contactPhoneMarkerRegex, "");
  const categoryValue = asString(product.category);
  const category = categoryValue in categoryFallbackImage ? categoryValue as Product["category"] : "equipamiento";
  const image = normalizeImageUrl(asString(product.image));
  const images = (Array.isArray(product.images) ? product.images : []).map((entry) => normalizeImageUrl(entry));
  const fallback = categoryFallbackImage[category] ?? categoryFallbackImage.equipamiento;
  const resolvedImage = image || images[0] || fallback;
  const seller = isRecord(product.seller) ? product.seller : null;

  return {
    ...(product as Partial<Product>),
    id: asString(product.id, `product-${Date.now()}`),
    ownerId: asString(product.ownerId) || undefined,
    name: asString(product.name, "Producto"),
    price: asNumber(product.price),
    category,
    status: ["Nuevo", "Usado", "Reacondicionado"].includes(asString(product.status))
      ? asString(product.status) as Product["status"]
      : "Usado",
    description: cleanDescription,
    contactPhone,
    seller: seller
      ? {
          id: asString(seller.id),
          name: asString(seller.name, "Vendedor"),
          location: asString(seller.location) || undefined,
          rating: asNumber(seller.rating),
          reviews: asNumber(seller.reviews),
          phone: contactPhone || asString(seller.phone) || undefined,
          email: asString(seller.email) || undefined
        }
      : undefined,
    image: resolvedImage,
    images: images.length > 0 ? images : [resolvedImage]
  };
}

function stripContactPhoneMarker(description: string) {
  return description.replace(contactPhoneMarkerRegex, "");
}

function encodeDescription(description: string, contactPhone?: string) {
  const clean = stripContactPhoneMarker(description);
  const normalizedPhone = contactPhone?.trim();
  if (!normalizedPhone) {
    return clean;
  }

  return `${clean}\n\n${contactPhoneMarkerPrefix}${encodeURIComponent(normalizedPhone)}-->`;
}

function toBackendProduct(product: ProductPayload) {
  const imageUrls = (product.images ?? [])
    .map((entry) => entry?.trim())
    .filter((entry): entry is string => Boolean(entry));
  const mainImage = product.image?.trim() ?? "";

  if (imageUrls.length === 0 && mainImage) {
    imageUrls.push(mainImage);
  }

  return {
    name: product.name,
    description: encodeDescription(product.description, product.contactPhone),
    category: product.category,
    status: product.status,
    price: product.price,
    imageUrl: mainImage,
    imageUrls,
    currency: product.currency ?? "USD"
  };
}

export async function listProducts() {
  const response = await apiRequest<Page<Product>>("/products?limit=100");
  return asProductArray(response).map(normalizeProduct).filter((product): product is Product => Boolean(product));
}

export async function listMyProducts() {
  const response = await apiRequest<Page<Product>>("/products/me?limit=100");
  return asProductArray(response).map(normalizeProduct).filter((product): product is Product => Boolean(product));
}

export async function listFavorites() {
  const response = await apiRequest<Page<Product>>("/favorites?limit=100");
  return asProductArray(response).map(normalizeProduct).filter((product): product is Product => Boolean(product));
}

export async function fetchProduct(id: string) {
  const product = await apiRequest<Product>(`/products/${encodeURIComponent(id)}`);
  const normalizedProduct = normalizeProduct(product);
  if (!normalizedProduct) {
    throw new Error("Producto invÃ¡lido.");
  }

  return normalizedProduct;
}

export async function createProduct(product: ProductPayload) {
  const response = await apiRequest<ProductPublicationResult>("/products", {
    method: "POST",
    body: JSON.stringify(toBackendProduct(product))
  });

  return {
    ...response,
    product: normalizeProduct(response.product) ?? response.product
  };
}

export async function updateProduct(id: string, product: ProductPayload) {
  const response = await apiRequest<Product>(`/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(toBackendProduct(product))
  });

  const normalizedProduct = normalizeProduct(response);
  if (!normalizedProduct) {
    throw new Error("Producto invÃ¡lido.");
  }

  return normalizedProduct;
}

export async function uploadProductImage(image: { uri: string; fileName?: string | null; mimeType?: string | null; file?: File }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    let file: Blob;
    let fileName: string;
    if (Platform.OS === "web") {
      const source = image.file ?? await fetch(image.uri, { signal: controller.signal }).then((response) => {
        if (!response.ok) throw new Error("No se pudo leer la foto seleccionada.");
        return response.blob();
      });
      if (!source) throw new Error("No se pudo leer la foto seleccionada.");
      file = source;
      fileName = image.file?.name || image.fileName?.trim() || "product.jpg";
    } else {
      // Expo 57 fetch needs file bytes; RN's legacy { uri, name, type } part is rejected.
      const source = new NativeFile(image.uri);
      if (!source.exists) throw new Error("La foto ya no está disponible. Seleccionala nuevamente.");
      file = source;
      fileName = source.name;
    }

    if (!file.size) throw new Error("La foto está vacía o no se pudo leer.");
    if (file.size > 8 * 1024 * 1024) throw new Error("La imagen supera el límite permitido de 8 MB.");

    const formData = new FormData();
    formData.append("file", file, fileName);
    const response = await apiRequest<UploadProductImageResponse>("/products/upload", {
      method: "POST",
      body: formData,
      signal: controller.signal
    });

    const url = normalizeImageUrl(response.url);
    if (!url) throw new Error("El servidor no devolvió la foto subida. Probá nuevamente.");
    return url;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("La subida de la foto tardó demasiado. Revisá tu conexión y probá nuevamente.");
    if (error instanceof TypeError && /network|fetch/i.test(error.message)) {
      throw new Error("No se pudo conectar para subir la foto. Revisá tu conexión y probá nuevamente.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function syncProductPayment(productId?: string, paymentId?: string) {
  if (!productId && !paymentId) throw new Error("No se pudo identificar el pago a verificar.");
  const path = productId
    ? `/products/${encodeURIComponent(productId)}/payment/sync`
    : "/marketplace/payments/sync";
  return apiRequest<ProductPublicationResult>(path, {
    method: "POST",
    body: JSON.stringify(paymentId ? { paymentId } : {})
  });
}

export async function resumeProductPayment(productId: string) {
  return apiRequest<ProductPublicationResult>(`/products/${encodeURIComponent(productId)}/payment/resume`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function deleteProduct(id: string) {
  await apiRequest<{ ok: boolean }>(`/products/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function addFavorite(id: string) {
  await apiRequest<{ ok: boolean }>(`/products/${encodeURIComponent(id)}/favorite`, { method: "POST" });
}

export async function removeFavorite(id: string) {
  await apiRequest<{ ok: boolean }>(`/products/${encodeURIComponent(id)}/favorite`, { method: "DELETE" });
}

export async function contactSeller(id: string, payload: { contactType: "phone" | "whatsapp"; message?: string }) {
  await apiRequest<{ ok: boolean }>(`/products/${encodeURIComponent(id)}/contact`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
