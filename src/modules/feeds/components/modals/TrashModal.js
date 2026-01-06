import { useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { cn } from "../../../../utils/cn";
import PostCard from "../post/PostCard";
import { useSharedAudioPlayer } from "../../../../hooks/useSharedAudioPlayer";
import { mapPostForCard } from "../../../../utils/postTransformers";
import { Trash2 } from "lucide-react";

export default function TrashModal({ open, posts, loading, onClose, onRestore, onClear }) {
  const { t } = useTranslation();
  const {
    playingPost,
    setPlayingPost,
    sharedAudioRef,
    sharedCurrentTime,
    sharedDuration,
    sharedIsPlaying,
    handleSeek,
  } = useSharedAudioPlayer();

  const transformedPosts = useMemo(
    () =>
      (posts || []).map((p) => {
        const mapped = mapPostForCard(p, t);
        // Ẩn menu quản lý để tránh nhầm với thao tác khôi phục
        return { ...mapped, canManage: false };
      }),
    [posts, t]
  );

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  
  if (!open) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000]",
        "flex items-center justify-center p-4"
      )}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      tabIndex={-1}
    >
      <div 
        className={cn(
          "w-full max-w-[680px] max-h-[90vh] bg-card text-card-foreground",
          "rounded-lg border-[0.5px] border-border/20 shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
          "overflow-hidden flex flex-col relative"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          "p-5 border-b border-border/30 font-semibold text-lg",
          "bg-card/80 backdrop-blur-sm flex-shrink-0 relative z-10",
          "flex justify-between items-center"
        )}>
          <span className={cn("inline-flex items-center gap-2")}>
            <Trash2 size={18} />
            {t('modal.trash')}
          </span>
          <button 
            type="button" 
            onClick={onClear}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium",
              "bg-danger/10 text-danger",
              "cursor-pointer transition-all duration-200",
              "hover:bg-danger/20",
              "active:scale-95"
            )}
          >
            {t('modal.clearAll')}
          </button>
        </div>
        <div className={cn(
          "flex-1 overflow-y-auto p-5 relative z-10"
        )}>
          {loading ? (
            <p className={cn("text-muted-foreground text-center py-8")}>
              {t('common.loading') || 'Loading...'}
            </p>
          ) : transformedPosts.length === 0 ? (
            <div className={cn("text-center py-12")}>
              <p className={cn("text-muted-foreground")}>
                {t('modal.emptyTrash')}
              </p>
            </div>
          ) : (
            <div className={cn("flex flex-col gap-4")}>
              {transformedPosts.map((post) => (
                  <div 
                  key={post.id}
                    className={cn(
                    "rounded-xl border-[0.5px] border-border/20 bg-card shadow-md",
                    "overflow-hidden"
                    )}
                  >
                  <PostCard
                    post={post}
                    playingPost={playingPost}
                    setPlayingPost={setPlayingPost}
                    sharedAudioRef={sharedAudioRef}
                    sharedCurrentTime={sharedCurrentTime}
                    sharedDuration={sharedDuration}
                    sharedIsPlaying={sharedIsPlaying}
                    onSeek={handleSeek}
                    onDelete={() => onRestore(post.id)}
                    disableCommentButton
                    hideMenu
                  />
                  <div className={cn("flex justify-end px-4 pb-4 pt-2 border-t border-border/20")}>
                      <button
                        type="button"
                      onClick={() => onRestore(post.id)}
                        className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold",
                          "bg-gradient-to-r from-primary/20 to-primary/10 text-primary",
                          "border-[0.5px] border-primary/30 cursor-pointer transition-all duration-300",
                          "hover:from-primary/30 hover:to-primary/20 hover:border-primary/40",
                          "hover:shadow-md active:scale-95"
                        )}
                      >
                        {t('modal.restore')}
                      </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={cn(
          "p-5 border-t border-border/30 flex-shrink-0 relative z-10",
          "flex justify-end"
        )}>
          <button 
            type="button" 
            onClick={onClose}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-medium",
              "cursor-pointer transition-all duration-200",
              "bg-muted/30 text-foreground",
              "hover:bg-muted/50",
              "active:scale-95"
            )}
          >
            {t('modal.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

TrashModal.propTypes = {
  open: PropTypes.bool,
  posts: PropTypes.array,
  loading: PropTypes.bool,
  onClose: PropTypes.func,
  onRestore: PropTypes.func,
  onClear: PropTypes.func,
};
