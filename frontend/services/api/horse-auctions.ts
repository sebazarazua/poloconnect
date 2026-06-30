import { apiRequest, getApiUrl } from "@/services/api/client";

export type UploadableImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export function resolveAuctionImageUrl(url?: string | null) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;

  const apiUrl = getApiUrl();
  const origin = apiUrl.replace(/\/api\/.*$/, "");
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}

export type HorseAuctionEvent = {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string | null;
  organizer: string;
  venue: string;
  city: string;
  country: string;
  eventDate: string;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  notes?: string | null;
  horseCount: number;
  startingPriceCents?: number | null;
};

export type HorseAuctionHorse = {
  id: string;
  lotNumber?: number | null;
  horseName: string;
  imageUrl?: string | null;
  ownerName: string;
  reservePriceCents: number;
  currency: string;
  breed?: string | null;
  sex?: string | null;
  ageYears?: number | null;
  coatColor?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
};

export type HorseAuctionDetail = Omit<HorseAuctionEvent, "horseCount" | "startingPriceCents"> & {
  horses: HorseAuctionHorse[];
};

export async function listHorseAuctions() {
  return apiRequest<HorseAuctionEvent[]>("/horse-auctions");
}

export async function getHorseAuction(id: string) {
  return apiRequest<HorseAuctionDetail>(`/horse-auctions/${encodeURIComponent(id)}`);
}

export type UpsertHorseAuctionEventPayload = {
  slug: string;
  title: string;
  imageUrl?: string | null;
  organizer: string;
  venue: string;
  city: string;
  country?: string;
  eventDate: string;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  notes?: string | null;
};

export type UpsertHorseAuctionHorsePayload = {
  lotNumber?: number | null;
  horseName: string;
  imageUrl?: string | null;
  ownerName: string;
  reservePriceCents: number;
  currency?: string;
  breed?: string | null;
  sex?: string | null;
  ageYears?: number | null;
  coatColor?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
};

export type HorseAuctionAdminEvent = UpsertHorseAuctionEventPayload & {
  id: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  horses: Array<
    UpsertHorseAuctionHorsePayload & {
      id: string;
      eventId: string;
      createdAt: string;
      updatedAt: string;
    }
  >;
};

export async function listHorseAuctionsAdmin() {
  return apiRequest<HorseAuctionAdminEvent[]>("/admin/horse-auctions");
}

export async function createHorseAuctionEvent(payload: UpsertHorseAuctionEventPayload) {
  return apiRequest<HorseAuctionAdminEvent>("/admin/horse-auctions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateHorseAuctionEvent(eventId: string, payload: UpsertHorseAuctionEventPayload) {
  return apiRequest<HorseAuctionAdminEvent>(`/admin/horse-auctions/${encodeURIComponent(eventId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteHorseAuctionEvent(eventId: string) {
  return apiRequest<{ ok: boolean }>(`/admin/horse-auctions/${encodeURIComponent(eventId)}`, {
    method: "DELETE"
  });
}

export async function createHorseAuctionHorse(eventId: string, payload: UpsertHorseAuctionHorsePayload) {
  return apiRequest<{ id: string }>(`/admin/horse-auctions/${encodeURIComponent(eventId)}/horses`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateHorseAuctionHorse(horseId: string, payload: UpsertHorseAuctionHorsePayload) {
  return apiRequest<{ id: string }>(`/admin/horse-auctions/horses/${encodeURIComponent(horseId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteHorseAuctionHorse(horseId: string) {
  return apiRequest<{ ok: boolean }>(`/admin/horse-auctions/horses/${encodeURIComponent(horseId)}`, {
    method: "DELETE"
  });
}

async function uploadAuctionImage(path: "/admin/horse-auctions/upload/event" | "/admin/horse-auctions/upload/horse", image: UploadableImage) {
  const formData = new FormData();
  const name = image.fileName || `auction-image-${Date.now()}.jpg`;
  const type = image.mimeType || "image/jpeg";

  formData.append("file", {
    uri: image.uri,
    name,
    type
  } as unknown as Blob);

  return apiRequest<{ url: string; filename: string; mimetype: string; size: number }>(path, {
    method: "POST",
    body: formData
  });
}

export async function uploadHorseAuctionEventImage(image: UploadableImage) {
  return uploadAuctionImage("/admin/horse-auctions/upload/event", image);
}

export async function uploadHorseAuctionHorseImage(image: UploadableImage) {
  return uploadAuctionImage("/admin/horse-auctions/upload/horse", image);
}
