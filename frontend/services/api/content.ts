import { apiRequest } from "@/services/api/client";

export type ContentItem = {
  id: string;
  type: "logo" | "ad" | "banner" | "news" | "generic";
  section: string;
  slot: string;
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  imageUrl: string;
  targetUrl?: string | null;
  priority: number;
  sortOrder: number;
  isActive: boolean;
};

export type HomeContentPayload = {
  heroAds: ContentItem[];
  compactAds: ContentItem[];
  news: ContentItem[];
  branding: {
    logo: ContentItem | null;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeContentItem(value: unknown): ContentItem | null {
  if (!isRecord(value)) return null;

  return {
    id: asString(value.id, `content-${asString(value.section)}-${asString(value.slot)}-${asNumber(value.sortOrder)}`),
    type: ["logo", "ad", "banner", "news", "generic"].includes(asString(value.type))
      ? (value.type as ContentItem["type"])
      : "generic",
    section: asString(value.section),
    slot: asString(value.slot),
    title: typeof value.title === "string" ? value.title : null,
    subtitle: typeof value.subtitle === "string" ? value.subtitle : null,
    body: typeof value.body === "string" ? value.body : null,
    imageUrl: asString(value.imageUrl),
    targetUrl: typeof value.targetUrl === "string" ? value.targetUrl : null,
    priority: asNumber(value.priority),
    sortOrder: asNumber(value.sortOrder),
    isActive: typeof value.isActive === "boolean" ? value.isActive : true
  };
}

function normalizeContentArray(value: unknown, requireImage = false) {
  return asArray(value)
    .map(normalizeContentItem)
    .filter((item): item is ContentItem => Boolean(item && (!requireImage || item.imageUrl)));
}

export async function getHomeContent() {
  const response = await apiRequest<unknown>("/content/home");
  const payload = isRecord(response) ? response : {};
  const branding = isRecord(payload.branding) ? payload.branding : {};

  return {
    heroAds: normalizeContentArray(payload.heroAds, true),
    compactAds: normalizeContentArray(payload.compactAds, true),
    news: normalizeContentArray(payload.news),
    branding: {
      logo: normalizeContentItem(branding.logo)
    }
  };
}

export async function getSectionContent(section: string, slot?: string) {
  const query = slot ? `?slot=${encodeURIComponent(slot)}` : "";
  const response = await apiRequest<unknown>(`/content/section/${encodeURIComponent(section)}${query}`);
  return normalizeContentArray(response, true);
}
