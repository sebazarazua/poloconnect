import type { ImageSourcePropType } from "react-native";
import { getApiUrl } from "@/services/api/client";

const assetImageMap: Record<string, ImageSourcePropType> = {
  "asset:app/logo": require("@/assets/logo.png"),
  "asset:home/hero-1": require("@/assets/ads/home/hero-1.png"),
  "asset:home/hero-2": require("@/assets/ads/home/hero-2.png"),
  "asset:home/hero-3": require("@/assets/ads/home/hero-3.png"),
  "asset:home/compact-1": require("@/assets/ads/home/compact-1.png"),
  "asset:home/compact-2": require("@/assets/ads/home/compact-2.png"),
  "asset:home/compact-3": require("@/assets/ads/home/compact-3.png"),
  "asset:community/slide-1": require("@/assets/ads/community/slide-1.png"),
  "asset:community/slide-2": require("@/assets/ads/community/slide-2.png"),
  "asset:community/slide-3": require("@/assets/ads/community/slide-3.png"),
  "asset:live/slide-1": require("@/assets/ads/live/slide-1.png"),
  "asset:live/slide-2": require("@/assets/ads/live/slide-2.png"),
  "asset:live/slide-3": require("@/assets/ads/live/slide-3.png")
};

function getBackendOrigin() {
  const apiUrl = getApiUrl();

  try {
    return new URL(apiUrl).origin;
  } catch {
    return "";
  }
}

function normalizeContentImageUrl(imageUrl: string) {
  const backendOrigin = getBackendOrigin();

  const normalizePath = (path: string) => {
    if (path.startsWith("/api/")) return path;
    if (path.startsWith("/media/")) return `/api/v1${path}`;
    return path;
  };

  if (imageUrl.startsWith("/")) {
    const normalizedPath = normalizePath(imageUrl);
    return backendOrigin ? `${backendOrigin}${normalizedPath}` : normalizedPath;
  }

  try {
    const parsed = new URL(imageUrl);

    if ((parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && backendOrigin) {
      const normalizedPath = normalizePath(parsed.pathname);
      return `${backendOrigin}${normalizedPath}${parsed.search}${parsed.hash}`;
    }

    return imageUrl;
  } catch {
    return backendOrigin ? `${backendOrigin}/${imageUrl.replace(/^\/+/, "")}` : imageUrl;
  }
}

export function resolveContentImageSource(imageUrl: string): ImageSourcePropType {
  if (imageUrl.startsWith("asset:")) {
    return assetImageMap[imageUrl] ?? { uri: imageUrl };
  }

  return { uri: normalizeContentImageUrl(imageUrl) };
}

export function describeContentAsset(imageUrl: string) {
  if (!imageUrl.startsWith("asset:")) {
    return "Imagen externa o subida desde panel";
  }

  const key = imageUrl.replace(/^asset:/, "");
  const [section, name] = key.split("/");

  const labels: Record<string, string> = {
    app: "Logo principal",
    home: "Home",
    community: "Community",
    live: "Live"
  };

  return `${labels[section] ?? section} · ${name}`;
}
