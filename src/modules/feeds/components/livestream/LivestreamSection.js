import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { PlayCircle, RefreshCw } from "lucide-react";
import LivestreamCard from "./LivestreamCard";
import livestreamApi from "../../../../api/livestreamApi";
import { cn } from "../../../../utils/cn";

const POLL_INTERVAL = Number(process.env.REACT_APP_LIVESTREAM_POLL_INTERVAL || 30000);

export default function LivestreamSection({ onGoLive, onSelectStream, refreshKey }) {
  const [livestreams, setLivestreams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const hasStreams = useMemo(() => livestreams.length > 0, [livestreams]);

  const loadStreams = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await livestreamApi.getActiveLivestreams();
      setLivestreams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[LivestreamSection] Failed to load streams:", err);
      setError("Không thể tải livestream. Vui lòng thử lại.");
      setLivestreams([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStreams();
    const interval = setInterval(loadStreams, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadStreams]);

  useEffect(() => {
    if (refreshKey === undefined) return;
    loadStreams();
  }, [refreshKey, loadStreams]);

  if (!hasStreams && !isLoading && !error) {
    return null;
  }

  return (
    <section
      className={cn(
        "mb-6 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur-sm",
        "transition-colors"
      )}
    >
      <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-foreground">
          <PlayCircle className="h-5 w-5 text-danger" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-danger">Live Now</p>
            <h3 className="text-lg font-semibold text-foreground">Livestream đang phát</h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadStreams}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-sm text-foreground transition hover:border-primary/60 hover:text-primary"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={onGoLive}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90"
          >
            Bắt đầu live
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {isLoading && !hasStreams ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-40 animate-pulse rounded-2xl border border-border/70 bg-muted/40"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {livestreams.map((stream) => (
            <LivestreamCard
              key={stream.livestreamId}
              livestream={stream}
              onClick={() => onSelectStream?.(stream)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

LivestreamSection.propTypes = {
  onGoLive: PropTypes.func,
  onSelectStream: PropTypes.func,
  refreshKey: PropTypes.number,
};

