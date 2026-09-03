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
  const cleanDescription = rawDescription.replace(contactPhoneMarkerRegex, "").trim();
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
  return description.replace(contactPhoneMarkerRegex, "").trim();
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
    currency: "USD"
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

export async function uploadProductImage(fileUri: string) {
  const fileName = fileUri.split("/").pop() || `product-${Date.now()}.jpg`;
  const lowerName = fileName.toLowerCase();
  const mimeType =
    lowerName.endsWith(".png")
      ? "image/png"
      : lowerName.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";

  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType
  } as any);

  const response = await apiRequest<UploadProductImageResponse>("/products/upload", {
    method: "POST",
    body: formData
  });

  return normalizeImageUrl(response.url);
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
