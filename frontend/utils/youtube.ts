const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{6,15}$/;

/**
 * Single source of truth for turning any supported YouTube URL shape into a bare video ID.
 * Supports: watch?v=, youtu.be/, live/, embed/, shorts/, with or without www./protocol.
 */
export function extractYouTubeVideoId(url?: string | null): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");

    let candidate: string | null = null;

    if (host === "youtu.be") {
      candidate = parsed.pathname.replace(/^\/+/, "").split("/")[0] || null;
    } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      candidate = parsed.searchParams.get("v");

      if (!candidate) {
        const pathMatch = parsed.pathname.match(/^\/(live|embed|shorts)\/([a-zA-Z0-9_-]+)/);
        if (pathMatch) candidate = pathMatch[2];
      }
    }

    if (candidate && VIDEO_ID_PATTERN.test(candidate)) {
      return candidate;
    }

    return null;
  } catch {
    return null;
  }
}
