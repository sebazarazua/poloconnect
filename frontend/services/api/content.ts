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

export async function getHomeContent() {
  return apiRequest<HomeContentPayload>("/content/home");
}

export async function getSectionContent(section: string, slot?: string) {
  const query = slot ? `?slot=${encodeURIComponent(slot)}` : "";
  return apiRequest<ContentItem[]>(`/content/section/${encodeURIComponent(section)}${query}`);
}
