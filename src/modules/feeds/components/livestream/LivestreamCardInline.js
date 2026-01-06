import { Video, Users, Play, MoreVertical, Flag, Radio } from "lucide-react";
import { cn } from "../../../../utils/cn";
import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import useLivestreamPreview from "./hooks/useLivestreamPreview";
import ReportLivestreamModal from "../modals/ReportLivestreamModal";

/**
 * LivestreamCardInline - Component hiển thị livestream trong feed (giống PostCard)
 * Được sử dụng để hiển thị xen kẽ với posts thông thường
 */
export default function LivestreamCardInline({ livestream, onClick }) {
  const viewerCount = livestream?.viewCount ?? 0;
  const previewContainerRef = useRef(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  
  // Subscribe to live video stream - chỉ subscribe nếu status là "live"
  const { hasVideo, isConnecting } = useLivestreamPreview(
    livestream?.status === "live" ? livestream : null,
    previewContainerRef
  );

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Không hiển thị card nếu livestream không còn live
  if (!livestream || livestream.status !== "live") {
    return null;
  }

  return (
    <>
    <article
      className={cn(
        "post-card",
        /* Base Styles - Livestream Design */
        "bg-card text-card-foreground rounded-xl",
        "shadow-[0_2px_8px_rgba(239,68,68,0.08)] p-4 mb-0",
        "border-2 border-danger/20 relative overflow-hidden"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3 relative z-10">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            {/* Broadcaster Avatar */}
            {livestream.broadcasterAvatar ? (
              <img
                src={livestream.broadcasterAvatar}
                alt={livestream.broadcasterName || "Broadcaster"}
                className={cn(
                  "w-10 h-10 rounded-2xl object-cover",
                  "border-2 border-danger/30"
                )}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
            ) : null}
            {/* Fallback Avatar */}
            <div
              className={cn(
                "w-10 h-10 rounded-2xl",
                "bg-gradient-to-br from-danger/20 to-danger/10",
                "flex items-center justify-center",
                "border-2 border-danger/30",
                livestream.broadcasterAvatar ? "hidden" : ""
              )}
            >
              {livestream.broadcasterName ? (
                <span className="text-lg font-bold text-danger">
                  {livestream.broadcasterName[0]?.toUpperCase() || "L"}
                </span>
              ) : (
              <Video size={20} className="text-danger" />
              )}
            </div>
            {/* LIVE Badge - Điều chỉnh vị trí để không bị che */}
            <div
              className={cn(
                "absolute -top-1 -right-1 z-30",
                "flex items-center gap-1 px-2 py-0.5 rounded-full",
                "bg-gradient-to-r from-danger via-danger to-danger/90",
                "text-white font-extrabold text-[10px] uppercase tracking-wide",
                "shadow-[0_2px_8px_rgba(239,68,68,0.5)]",
                "border-2 border-card",
                "animate-pulse-subtle"
              )}
            >
              <Radio size={8} className="animate-pulse" />
              <span className="drop-shadow-sm">LIVE</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            {/* Broadcaster Name và Viewer count cùng hàng */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {livestream.broadcasterName && (
                <h4
                  className={cn(
                    "font-semibold text-[0.95rem]",
                    "text-foreground"
                  )}
                >
                  {livestream.broadcasterName}
                </h4>
              )}
              {/* Viewer count - inline với tên */}
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full",
                  "bg-gradient-to-r from-danger/15 to-danger/10",
                  "border border-danger/20",
                  "text-danger text-xs font-bold",
                  "shadow-sm"
                )}
              >
                <Users size={12} className="animate-pulse" />
                <span className="font-extrabold">{viewerCount}</span>
                <span className="text-[10px] font-medium">người đang xem</span>
              </div>
            </div>
            {/* Title */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-sm font-medium text-foreground">
                {livestream.title || "Livestream đang phát"}
              </span>
            </div>
            {livestream.description && (
              <p className="text-muted-foreground text-xs mt-1 m-0 line-clamp-2">
                {livestream.description}
              </p>
            )}
          </div>
        </div>
        {/* Menu button for report */}
        <div className="relative" ref={menuRef}>
            <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={cn(
              "p-2 rounded-full",
              "text-muted-foreground"
            )}
            aria-label="Menu"
          >
            <MoreVertical size={18} />
          </button>
          {/* Dropdown menu */}
          {showMenu && (
            <div
              className={cn(
                "absolute right-0 top-full mt-2 w-48",
                "bg-card border border-border/30 rounded-lg shadow-lg",
                "py-2 z-50",
                "animate-in fade-in slide-in-from-top-2 duration-200"
              )}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReportModal(true);
                  setShowMenu(false);
                }}
                className={cn(
                  "w-full px-4 py-2.5 text-left text-sm",
                  "flex items-center gap-2",
                  "hover:bg-muted/50 transition-colors",
                  "text-foreground"
                )}
              >
                <Flag size={16} />
                <span>Báo cáo livestream</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Video Preview Area - Full width, tràn viền trái phải */}
      <div
        ref={previewContainerRef}
        className={cn(
          "relative w-[calc(100%+2rem)] aspect-video overflow-hidden -mx-4 my-3",
          "bg-gradient-to-br from-muted/40 to-muted/20",
          "flex items-center justify-center",
          "cursor-pointer"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        {/* Live Video Stream - Auto-play when available */}
        {hasVideo ? (
          <div className="absolute inset-0 w-full h-full">
            {/* Video element will be appended here by useLivestreamPreview */}
          </div>
        ) : (
          <>
            {/* Fallback: Show avatar when camera is off or no video */}
            {livestream.broadcasterAvatar ? (
              <img
                src={livestream.broadcasterAvatar}
                alt={livestream.broadcasterName || "Broadcaster"}
                className={cn(
                  "w-full h-full object-cover"
                )}
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallbackIcon = e.target.nextElementSibling;
                  if (fallbackIcon) fallbackIcon.style.display = 'flex';
                }}
              />
            ) : null}
            {/* Fallback icon - shown if no avatar or image fails */}
            <div 
              className={cn(
                "flex items-center justify-center absolute inset-0",
                livestream.broadcasterAvatar ? "hidden" : ""
        )}
      >
        <Video size={48} className={cn("text-muted-foreground")} />
            </div>
          </>
        )}
        
        {/* Loading indicator */}
        {isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-danger border-t-transparent" />
          </div>
        )}
        
      </div>

      {/* Footer */}
      <div className="mt-3 border-t border-border/30 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Video size={16} />
            <span>Đang phát trực tiếp</span>
          </div>
          <button
            className={cn(
              "px-4 py-2 rounded-full",
              "bg-danger text-white",
              "font-semibold text-sm",
              "shadow-lg shadow-danger/30"
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
    
    {/* Report Modal */}
    <ReportLivestreamModal
      open={showReportModal}
      livestream={livestream}
      onClose={() => setShowReportModal(false)}
      onSubmitted={() => {
        setShowReportModal(false);
        alert("Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét và xử lý.");
      }}
    />
    </>
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
    broadcasterName: PropTypes.string,
    broadcasterAvatar: PropTypes.string,
    thumbnailUrl: PropTypes.string,
    previewUrl: PropTypes.string,
    imageUrl: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func,
};

