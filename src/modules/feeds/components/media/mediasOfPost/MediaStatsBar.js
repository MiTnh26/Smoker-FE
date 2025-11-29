import PropTypes from "prop-types";
import { cn } from "../../../../../utils/cn";

export default function MediaStatsBar({
  mediaLiked,
  mediaLikesCount,
  commentsCount,
  sharesCount,
  onLikeClick,
  onShareClick,
  disabled,
  shareButtonRef
}) {
  return (
    <div className="flex gap-6 p-4 px-6 border-b border-border/30">
      <button
        className={cn(
          "flex items-center gap-2 text-foreground",
          "bg-transparent border-none cursor-pointer",
          "px-1 py-1 rounded transition-all duration-200",
          "hover:bg-muted/30",
          mediaLiked && "text-danger",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={onLikeClick}
        disabled={disabled}
        aria-label="Like"
      >
        <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill={mediaLiked ? "currentColor" : "none"} stroke="currentColor">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span className="font-semibold text-[0.95rem]">{mediaLikesCount}</span>
      </button>
      <div className="flex items-center gap-2 text-foreground px-1 py-1">
        <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="font-semibold text-[0.95rem]">{commentsCount}</span>
      </div>
      {onShareClick && (
        <button
          ref={shareButtonRef}
          className={cn(
            "flex items-center gap-2 text-foreground",
            "bg-transparent border-none cursor-pointer",
            "px-1 py-1 rounded transition-all duration-200",
            "hover:bg-muted/30"
          )}
          onClick={onShareClick}
          aria-label="Share"
        >
          <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <span className="font-semibold text-[0.95rem]">{sharesCount || 0}</span>
        </button>
      )}
    </div>
  );
}

MediaStatsBar.propTypes = {
  mediaLiked: PropTypes.bool.isRequired,
  mediaLikesCount: PropTypes.number.isRequired,
  commentsCount: PropTypes.number.isRequired,
  sharesCount: PropTypes.number,
  onLikeClick: PropTypes.func.isRequired,
  onShareClick: PropTypes.func,
  disabled: PropTypes.bool,
  shareButtonRef: PropTypes.object
};

