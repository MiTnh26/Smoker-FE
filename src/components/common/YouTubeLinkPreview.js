import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { getYoutubeThumbnailUrl } from "../../utils/youtube";

const oEmbedCache = new Map();

export default function YouTubeLinkPreview({ url, videoId }) {
  const [title, setTitle] = useState("");
  const [thumb, setThumb] = useState(() => getYoutubeThumbnailUrl(videoId));
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const oembedUrl = useMemo(() => {
    const encoded = encodeURIComponent(String(url || ""));
    return `https://www.youtube.com/oembed?url=${encoded}&format=json`;
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    async function fetchOEmbed() {
      if (!oembedUrl) {
        setLoading(false);
        return;
      }
      try {
        if (oEmbedCache.has(oembedUrl)) {
          const cached = oEmbedCache.get(oembedUrl);
          if (!cancelled && mountedRef.current) {
            setTitle(cached.title || "YouTube Video");
            setThumb(cached.thumbnail_url || getYoutubeThumbnailUrl(videoId));
            setLoading(false);
          }
          return;
        }
        const res = await fetch(oembedUrl);
        if (!res.ok) throw new Error("oEmbed request failed");
        const data = await res.json();
        oEmbedCache.set(oembedUrl, data);
        if (!cancelled && mountedRef.current) {
          setTitle(data.title || "YouTube Video");
          setThumb(data.thumbnail_url || getYoutubeThumbnailUrl(videoId));
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled && mountedRef.current) {
          setTitle("YouTube Video");
          setThumb(getYoutubeThumbnailUrl(videoId));
          setLoading(false);
        }
      }
    }
    fetchOEmbed();
    return () => { cancelled = true; };
  }, [oembedUrl, videoId]);

  const openInNewTab = () => {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {}
  };

  const hostLabel = (() => {
    const re = /^https?:\/\/([^/]+)/i;
    const m = re.exec(String(url || ""));
    const host = m?.[1] || "youtube.com";
    return host.replace(/^www\./i, "");
  })();

  return (
    <button
      type="button"
      className="yt-preview-card"
      onClick={openInNewTab}
      style={{
        textAlign: "left",
        cursor: "pointer",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        overflow: "hidden",
        background: "#111",
        marginTop: 8,
        padding: 0
      }}
    >
      {thumb && (
        <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: "#000" }}>
          <img
            src={thumb}
            alt={title || "YouTube thumbnail"}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
          />
          {/* Play badge */}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "9999px",
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
                <path d="M8 5v14l11-7z"></path>
              </svg>
            </div>
          </div>
        </div>
      )}
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{title || (loading ? "Đang tải..." : "YouTube Video")}</div>
        <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>{hostLabel}</div>
      </div>
    </button>
  );
}

YouTubeLinkPreview.propTypes = {
  url: PropTypes.string.isRequired,
  videoId: PropTypes.string
};


