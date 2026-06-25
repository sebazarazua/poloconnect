import { apiRequest } from "@/services/api/client";
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
  return response.data;
}

export async function listMyProducts() {
  const response = await apiRequest<Page<Product>>("/products/me?limit=100");
  return response.data;
}

export async function listFavorites() {
  const response = await apiRequest<Page<Product>>("/favorites?limit=100");
  return response.data;
}

export async function fetchProduct(id: string) {
  return apiRequest<Product>(`/products/${encodeURIComponent(id)}`);
}

export async function createProduct(product: ProductPayload) {
  return apiRequest<ProductPublicationResult>("/products", {
    method: "POST",
    body: JSON.stringify(toBackendProduct(product))
  });
}

export async function updateProduct(id: string, product: ProductPayload) {
  return apiRequest<Product>(`/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(toBackendProduct(product))
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
