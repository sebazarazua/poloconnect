import type { ImageSourcePropType } from "react-native";
import { resolveApiMediaUrl } from "@/services/api/client";

const assetImageMap: Record<string, ImageSourcePropType> = {
  "asset:app/logo": require("@/assets/logo.png")
};

function normalizeContentImageUrl(imageUrl: string) {
  return resolveApiMediaUrl(imageUrl) ?? imageUrl;
}

export function resolveContentImageSource(imageUrl?: string | null): ImageSourcePropType {
  const normalizedImageUrl = typeof imageUrl === "string" ? imageUrl : "";

  if (!normalizedImageUrl) {
    return assetImageMap["asset:app/logo"];
  }

  if (normalizedImageUrl.startsWith("asset:")) {
    return assetImageMap[normalizedImageUrl] ?? assetImageMap["asset:app/logo"];
  }

  // Local previews (data:/blob: URIs from a file picker) must bypass the API media resolver.
  if (normalizedImageUrl.startsWith("data:") || normalizedImageUrl.startsWith("blob:")) {
    return { uri: normalizedImageUrl };
  }

  return { uri: normalizeContentImageUrl(normalizedImageUrl) };
}

export function describeContentAsset(imageUrl?: string | null) {
  const normalizedImageUrl = typeof imageUrl === "string" ? imageUrl : "";

  if (!normalizedImageUrl || !normalizedImageUrl.startsWith("asset:")) {
    return "Imagen externa o subida desde panel";
  }

  const key = normalizedImageUrl.replace(/^asset:/, "");
  const [section, name] = key.split("/");

  const labels: Record<string, string> = {
    app: "Logo principal",
    home: "Home",
    community: "Community",
    live: "Live"
  };

  return `${labels[section] ?? section} · ${name}`;
}
