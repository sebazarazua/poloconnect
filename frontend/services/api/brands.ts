import { apiRequest } from "@/services/api/client";

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  sortOrder: number;
  productCount?: number;
};

export type BrandProduct = {
  id: string;
  brandId: string;
  name: string;
  description: string;
  priceCents?: number | null;
  currency: string;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
};

export async function listBrands(): Promise<Brand[]> {
  return apiRequest<Brand[]>("/brands");
}

export async function getBrand(id: string): Promise<Brand> {
  return apiRequest<Brand>(`/brands/${encodeURIComponent(id)}`);
}

export async function listBrandProducts(brandId: string): Promise<BrandProduct[]> {
  return apiRequest<BrandProduct[]>(`/brands/${encodeURIComponent(brandId)}/products`);
}

// Admin
export async function adminListBrands(): Promise<Brand[]> {
  return apiRequest<Brand[]>("/admin/brands");
}

export async function adminCreateBrand(payload: Omit<Brand, "id" | "productCount">): Promise<Brand> {
  return apiRequest<Brand>("/admin/brands", { method: "POST", body: JSON.stringify(payload) });
}

export async function adminUpdateBrand(id: string, payload: Omit<Brand, "id" | "productCount">): Promise<Brand> {
  return apiRequest<Brand>(`/admin/brands/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function adminDeleteBrand(id: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/admin/brands/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function adminListBrandProducts(brandId: string): Promise<BrandProduct[]> {
  return apiRequest<BrandProduct[]>(`/admin/brands/${encodeURIComponent(brandId)}/products`);
}

export async function adminCreateBrandProduct(brandId: string, payload: {
  name: string; description: string; price?: number; currency?: string; imageUrl?: string; isActive?: boolean; sortOrder?: number;
}): Promise<BrandProduct> {
  return apiRequest<BrandProduct>(`/admin/brands/${encodeURIComponent(brandId)}/products`, { method: "POST", body: JSON.stringify(payload) });
}

export async function adminUpdateBrandProduct(brandId: string, productId: string, payload: {
  name: string; description: string; price?: number; currency?: string; imageUrl?: string; isActive?: boolean; sortOrder?: number;
}): Promise<BrandProduct> {
  return apiRequest<BrandProduct>(`/admin/brands/${encodeURIComponent(brandId)}/products/${encodeURIComponent(productId)}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function adminDeleteBrandProduct(brandId: string, productId: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/admin/brands/${encodeURIComponent(brandId)}/products/${encodeURIComponent(productId)}`, { method: "DELETE" });
}

export async function uploadBrandImage(fileOrUri: File | Blob | string): Promise<string> {
  const formData = new FormData();

  if (typeof fileOrUri === "string") {
    const filename = fileOrUri.split("/").pop() ?? "image.jpg";
    const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeTypes: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
    formData.append("file", { uri: fileOrUri, name: filename, type: mimeTypes[ext] ?? "image/jpeg" } as any);
  } else {
    const inferredName = typeof File !== "undefined" && fileOrUri instanceof File ? fileOrUri.name : "brand-logo.png";
    formData.append("file", fileOrUri, inferredName);
  }

  const result = await apiRequest<{ url: string }>("/admin/brands/upload", { method: "POST", body: formData as any, headers: {} });
  return result.url;
}
