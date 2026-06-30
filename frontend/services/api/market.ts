import { apiRequest, getApiUrl } from "@/services/api/client";
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

function normalizeImageUrl(imageUrl?: string) {
  if (!imageUrl) return "";

  const apiBase = getApiUrl().replace(/\/api\/v1\/?$/, "");

  if (/^https?:\/\//i.test(imageUrl)) {
    // In Expo Go, localhost/127.0.0.1 points to the device itself, not the dev machine.
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(imageUrl)) {
      const apiHost = apiBase.match(/^https?:\/\/([^/]+)/i)?.[1];
      if (!apiHost) return imageUrl;
      return imageUrl.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, `http://${apiHost}`);
    }
    return imageUrl;
  }

  if (!imageUrl.startsWith("/")) return imageUrl;

  return `${apiBase}${imageUrl}`;
}

function normalizeProduct(product: Product): Product {
  const image = normalizeImageUrl(product.image);
  const images = (product.images ?? []).map((entry) => normalizeImageUrl(entry));
  const fallback = categoryFallbackImage[product.category] ?? categoryFallbackImage.equipamiento;
  const resolvedImage = image || images[0] || fallback;

  return {
    ...product,
    image: resolvedImage,
    images: images.length > 0 ? images : [resolvedImage]
  };
}

function toBackendProduct(product: ProductPayload) {
  return {
    name: product.name,
    description: product.description,
    category: product.category,
    status: product.status,
    price: product.price,
    imageUrl: product.image,
    currency: "USD"
  };
}

export async function listProducts() {
  const response = await apiRequest<Page<Product>>("/products?limit=100");
  return response.data.map((product) => normalizeProduct(product));
}

export async function listMyProducts() {
  const response = await apiRequest<Page<Product>>("/products/me?limit=100");
  return response.data.map((product) => normalizeProduct(product));
}

export async function listFavorites() {
  const response = await apiRequest<Page<Product>>("/favorites?limit=100");
  return response.data.map((product) => normalizeProduct(product));
}

export async function fetchProduct(id: string) {
  const product = await apiRequest<Product>(`/products/${encodeURIComponent(id)}`);
  return normalizeProduct(product);
}

export async function createProduct(product: ProductPayload) {
  const response = await apiRequest<ProductPublicationResult>("/products", {
    method: "POST",
    body: JSON.stringify(toBackendProduct(product))
  });

  return {
    ...response,
    product: normalizeProduct(response.product)
  };
}

export async function updateProduct(id: string, product: ProductPayload) {
  const response = await apiRequest<Product>(`/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(toBackendProduct(product))
  });

  return normalizeProduct(response);
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
