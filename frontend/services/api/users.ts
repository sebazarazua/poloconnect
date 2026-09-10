import { File as NativeFile } from "expo-file-system";
import { Platform } from "react-native";
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
  file?: File;
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
      fileName = image.file?.name || image.fileName?.trim() || "avatar.jpg";
    } else {
      // Expo 57 serializes File bytes; the legacy { uri, name, type } part is rejected on iOS and Android.
      const source = new NativeFile(image.uri);
      if (!source.exists) throw new Error("La foto ya no está disponible. Seleccionala nuevamente.");
      file = source;
      fileName = source.name;
    }

    if (!file.size) throw new Error("La foto está vacía o no se pudo leer.");
    if (file.size > 6 * 1024 * 1024) throw new Error("La imagen supera el límite permitido de 6 MB.");

    const formData = new FormData();
    formData.append("file", file, fileName);
    return await apiRequest<AuthUser>("/users/me/avatar", {
      method: "POST",
      body: formData,
      signal: controller.signal
    });
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

export async function deleteMyAccount() {
  return apiRequest<{ ok: boolean }>("/users/me", {
    method: "DELETE"
  });
}
