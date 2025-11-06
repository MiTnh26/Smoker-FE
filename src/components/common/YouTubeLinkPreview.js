import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { getYoutubeThumbnailUrl } from "../../utils/youtube";
import "../../styles/modules/feeds/YouTubeLinkPreview.css";

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
      /* eslint-disable-next-line */
      } catch (e) {
        // Log for diagnostics; fallback UI below
        // eslint-disable-next-line no-console
        console.error("YouTube oEmbed fetch failed:", e);
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
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const hostLabel = (() => {
    const re = /^https?:\/\/([^/]+)/i;
    const m = re.exec(String(url || ""));
    const host = m?.[1] || "youtube.com";
    return host.replace(/^www\./i, "");
  })();

  return (
    <button type="button" className="yt-preview-card" onClick={openInNewTab}>
      {thumb && (
        <div className="yt-thumb">
          <img
            src={thumb}
            alt={title || "YouTube thumbnail"}
            className="yt-thumb-img"
            loading="lazy"
          />
          <div className="yt-play-overlay">
            <div className="yt-play-badge">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
                <path d="M8 5v14l11-7z"></path>
              </svg>
            </div>
          </div>
        </div>
      )}
      <div className="yt-body">
        <div className="yt-title">{title || (loading ? "Đang tải..." : "YouTube Video")}</div>
        <div className="yt-host">{hostLabel}</div>
      </div>
    </button>
  );
}

YouTubeLinkPreview.propTypes = {
  url: PropTypes.string.isRequired,
  videoId: PropTypes.string
};


