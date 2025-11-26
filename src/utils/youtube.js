// Utilities for detecting and parsing YouTube URLs in free text

// Updated regex to better match YouTube URLs (including shorts, embed, etc.)
const YOUTUBE_REGEX = /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?[^\s]+|embed\/[\w-]+|shorts\/[\w-]+|v\/[\w-]+)|youtu\.be\/[\w-]+))/gi;

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
      
      // Handle /embed/<id>, /shorts/<id>, /v/<id>
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "v");
      if (idx >= 0 && parts[idx + 1]) {
        return parts[idx + 1];
      }
    }
  } catch (err) {
    // If URL parsing fails, try regex fallback
    const regexMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (regexMatch && regexMatch[1]) {
      return regexMatch[1];
    }
  }
  return null;
}

export function isYoutubeUrl(url) {
  return Boolean(getYoutubeVideoId(url));
}

export function extractYoutubeMatches(text) {
  if (!text || typeof text !== "string") return [];
  const matches = [];
  let m;
  // Reset regex lastIndex to avoid issues with global regex
  const regex = new RegExp(YOUTUBE_REGEX.source, YOUTUBE_REGEX.flags);
  regex.lastIndex = 0;
  while ((m = regex.exec(text)) !== null) {
    const url = m[1] || m[0]; // Fallback to full match if capture group fails
    const id = getYoutubeVideoId(url);
    if (id && url) {
      matches.push({ url, videoId: id, index: m.index, length: url.length });
    }
    // Prevent infinite loop if regex doesn't advance
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
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


