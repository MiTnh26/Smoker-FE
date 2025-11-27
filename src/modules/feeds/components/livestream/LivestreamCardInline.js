import { Video, Users, Play } from "lucide-react";
import { cn } from "../../../../utils/cn";
import PropTypes from "prop-types";

/**
 * LivestreamCardInline - Component hiển thị livestream trong feed (giống PostCard)
 * Được sử dụng để hiển thị xen kẽ với posts thông thường
 */
export default function LivestreamCardInline({ livestream, onClick }) {
  const viewerCount = livestream.viewCount ?? 0;

  return (
    <article
      className={cn(
        "post-card",
        /* Base Styles - Instagram-inspired Minimalist Design */
        "bg-card text-card-foreground rounded-lg",
        "shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4 mb-0",
        "border-[0.5px] border-border/20 relative overflow-hidden",
        /* Transitions */
        "transition-all duration-200 ease-out",
        /* Hover States - Subtle, no movement */
        "hover:shadow-[0_2px_4px_rgba(0,0,0,0.08)]",
        "hover:border-border/30",
        /* Livestream specific - red accent border on hover */
        "hover:border-danger/30"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-1.5 relative">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div
              className={cn(
                "w-14 h-14 rounded-2xl",
                "bg-gradient-to-br from-danger/20 to-danger/10",
                "flex items-center justify-center",
                "border-2 border-danger/30 ring-2 ring-danger/10",
                "transition-all duration-500 ease-out",
                "hover:border-danger/50 hover:ring-danger/20",
                "hover:shadow-[0_8px_24px_rgba(239,68,68,0.25)]",
                "hover:scale-110 hover:rotate-3",
                "shadow-[0_4px_12px_rgba(239,68,68,0.12)]"
              )}
            >
              <Video size={24} className="text-danger" />
            </div>
            {/* LIVE Badge */}
            <div
              className={cn(
                "absolute -top-1 -right-1",
                "flex items-center gap-1 px-2 py-0.5 rounded-full",
                "bg-gradient-to-r from-danger to-danger/90 text-primary-foreground",
                "font-bold text-[10px] shadow-lg",
                "border-2 border-card"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full bg-primary-foreground",
                  "animate-pulse"
                )}
              />
              LIVE
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4
              className={cn(
                "font-semibold text-[0.95rem] mb-1",
                "text-foreground whitespace-nowrap",
                "overflow-hidden text-ellipsis",
                "flex items-center gap-2"
              )}
            >
              <span>{livestream.title || "Livestream đang phát"}</span>
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-lg",
                  "bg-danger/10 text-danger text-[0.75rem] font-semibold"
                )}
              >
                <Users size={12} />
                {viewerCount} người đang xem
              </div>
              {livestream.description && (
                <p className="text-muted-foreground text-[0.75rem] m-0 line-clamp-1">
                  {livestream.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Video Preview Area */}
      <div
        className={cn(
          "relative w-full aspect-video rounded-xl overflow-hidden mt-3 mb-3",
          "bg-gradient-to-br from-muted/40 to-muted/20",
          "flex items-center justify-center",
          "border border-border/20",
          "group cursor-pointer"
        )}
      >
        <Video size={48} className={cn("text-muted-foreground")} />
        {/* Overlay on hover */}
        <div
          className={cn(
            "absolute inset-0 bg-black/40 backdrop-blur-sm",
            "flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full",
              "bg-danger text-primary-foreground",
              "font-semibold text-sm shadow-lg"
            )}
          >
            <Play size={20} />
            Xem livestream
          </div>
        </div>
        {/* LIVE indicator on preview */}
        <div
          className={cn(
            "absolute top-2 left-2",
            "flex items-center gap-1 px-2 py-1 rounded-full",
            "bg-danger text-primary-foreground text-[10px] font-bold shadow-lg"
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full bg-primary-foreground",
              "animate-pulse"
            )}
          />
          LIVE
        </div>
      </div>

      {/* Footer - Similar to PostCard */}
      <div className="mt-3 border-t border-border/30 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Video size={16} />
            <span>Đang phát trực tiếp</span>
          </div>
          <button
            className={cn(
              "px-4 py-2 rounded-full",
              "bg-danger text-primary-foreground",
              "font-semibold text-sm",
              "shadow-lg shadow-danger/30",
              "transition-all duration-200",
              "hover:bg-danger/90 hover:shadow-danger/40",
              "active:scale-95"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            Xem ngay
          </button>
        </div>
      </div>
    </article>
  );
}

LivestreamCardInline.propTypes = {
  livestream: PropTypes.shape({
    livestreamId: PropTypes.string.isRequired,
    title: PropTypes.string,
    description: PropTypes.string,
    viewCount: PropTypes.number,
    startTime: PropTypes.string,
    agoraChannelName: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func,
};

