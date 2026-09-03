import { apiRequest } from "@/services/api/client";

export type SpotlightEvent = {
  id: string;
  title: string;
  description?: string | null;
  scheduledAt: string;
  endsAt?: string | null;
  youtubeUrl?: string | null;
  backgroundImageUrl?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeSpotlightEvent(value: unknown): SpotlightEvent | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id);
  const title = asString(value.title);
  if (!id || !title) return null;

  return {
    id,
    title,
    description: asString(value.description) || null,
    scheduledAt: asString(value.scheduledAt),
    endsAt: asString(value.endsAt) || null,
    youtubeUrl: asString(value.youtubeUrl) || null,
    backgroundImageUrl: asString(value.backgroundImageUrl) || null
  };
}

export async function getLiveSpotlightEvents() {
  const response = await apiRequest<unknown>("/spotlight-events/live");
  return (Array.isArray(response) ? response : [])
    .map(normalizeSpotlightEvent)
    .filter((event): event is SpotlightEvent => Boolean(event));
}
