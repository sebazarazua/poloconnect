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

export async function getLiveSpotlightEvents() {
  return apiRequest<SpotlightEvent[]>("/spotlight-events/live");
}
