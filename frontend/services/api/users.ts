import { apiRequest, resolveApiMediaUrl } from "@/services/api/client";
import type { AuthUser } from "@/services/auth";

export type UpdateProfilePayload = {
  firstName: string;
  lastName: string;
  username?: string;
};

export type UploadableImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export function resolveUploadedUrl(url?: string | null) {
  return resolveApiMediaUrl(url);
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
