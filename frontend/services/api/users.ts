import { apiRequest, getApiUrl } from "@/services/api/client";
import type { AuthUser } from "@/services/auth";

export type UpdateProfilePayload = {
  firstName: string;
  lastName: string;
};

export type UploadableImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export function resolveUploadedUrl(url?: string | null) {
  if (!url) return undefined;

  const apiUrl = getApiUrl();
  const origin = apiUrl.replace(/\/api\/.*$/, "");
  const normalizePath = (value: string) => {
    if (value.startsWith("/api/")) return value;
    if (value.startsWith("/media/")) return `/api/v1${value}`;
    return value;
  };

  if (/^https?:\/\//i.test(url)) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url)) {
      try {
        const parsed = new URL(url);
        const normalizedPath = normalizePath(parsed.pathname);
        return `${origin}${normalizedPath}${parsed.search}${parsed.hash}`;
      } catch {
        return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, origin);
      }
    }

    return url;
  }

  const path = url.startsWith("/") ? url : `/${url}`;
  return `${origin}${normalizePath(path)}`;
}

export async function updateMyProfile(payload: UpdateProfilePayload) {
  return apiRequest<AuthUser>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function uploadMyAvatar(image: UploadableImage) {
  const formData = new FormData();
  const name = image.fileName || `avatar-${Date.now()}.jpg`;
  const type = image.mimeType || "image/jpeg";

  formData.append("file", {
    uri: image.uri,
    name,
    type
  } as unknown as Blob);

  return apiRequest<AuthUser>("/users/me/avatar", {
    method: "POST",
    body: formData
  });
}
