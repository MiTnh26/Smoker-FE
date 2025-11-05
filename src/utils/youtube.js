// Utilities for detecting and parsing YouTube URLs in free text

const YOUTUBE_REGEX = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?[^\s]+|youtu\.be\/[\w-]+))(?![^\s]*\])/gi;

export function getYoutubeVideoId(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      // https://youtu.be/<id>
      const first = u.pathname.split("/").find(Boolean);
      return first || null;
    }
    if (u.hostname.includes("youtube.com")) {
      // https://www.youtube.com/watch?v=<id>
      const v = u.searchParams.get("v");
      if (v) return v;
      // Fallbacks for /embed/<id> or /shorts/<id>
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "embed" || p === "shorts");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
  } catch {}
  return null;
}

export function isYoutubeUrl(url) {
  return Boolean(getYoutubeVideoId(url));
}

export function extractYoutubeMatches(text) {
  if (!text || typeof text !== "string") return [];
  const matches = [];
  let m;
  const regex = new RegExp(YOUTUBE_REGEX);
  while ((m = regex.exec(text)) !== null) {
    const url = m[1];
    const id = getYoutubeVideoId(url);
    if (id) {
      matches.push({ url, videoId: id, index: m.index, length: url.length });
    }
  }
  return matches;
}

export function splitTextWithYouTube(text) {
  const segments = [];
  const matches = extractYoutubeMatches(text);
  if (matches.length === 0) return [{ type: "text", text }];
  let cursor = 0;
  for (const match of matches) {
    if (match.index > cursor) {
      segments.push({ type: "text", text: text.slice(cursor, match.index) });
    }
    segments.push({ type: "youtube", url: match.url, videoId: match.videoId });
    cursor = match.index + match.length;
  }
  if (cursor < text.length) {
    segments.push({ type: "text", text: text.slice(cursor) });
  }
  return segments;
}

export function getYoutubeThumbnailUrl(videoId, quality = "hqdefault") {
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}


