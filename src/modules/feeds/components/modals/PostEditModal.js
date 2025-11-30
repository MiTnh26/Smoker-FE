import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { updatePost } from "../../../../api/postApi";
import { cn } from "../../../../utils/cn";

export default function PostEditModal({ open, post, onClose, onUpdated }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const images = Array.isArray(post?.medias?.images) ? post.medias.images : [];
  const videos = Array.isArray(post?.medias?.videos) ? post.medias.videos : [];
  const audioSrc = post?.audioSrc || null;

  useEffect(() => {
    if (open && post) {
      setTitle(post.title || post.audioTitle || "");
      setContent(post.content || post.description || "");
    }
  }, [open, post]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;
    try {
      setSubmitting(true);
      const payload = {};
      if (title.trim()) payload.title = title.trim();
      if (content.trim()) payload.content = content.trim();
      const res = await updatePost(post.id, payload);
      const updated = res?.data || res;
      onUpdated?.(updated?.data || updated);
      onClose?.();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[EDIT] Update post failed", err);
      alert(t('modal.postFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className={cn(
        "fixed inset-0 bg-black/75 backdrop-blur-xl z-[1000]",
        "flex items-center justify-center p-4"
      )}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      tabIndex={-1}
    >
      <div 
        className={cn(
          "w-full max-w-[520px] bg-card text-card-foreground",
          "rounded-lg border-[0.5px] border-border/20 shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
          "overflow-hidden relative"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          "p-5 border-b border-border/30 font-semibold text-lg",
          "bg-card/80 backdrop-blur-sm relative z-10"
        )}>
          ✏️ {t('feed.edit')}
        </div>
        <form onSubmit={handleSubmit} className={cn(
          "p-5 flex flex-col gap-3 relative z-10"
        )}>
          {(images.length > 0 || videos.length > 0 || audioSrc) && (
            <div className="media-preview" style={{ marginBottom: 12 }}>
              {images.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Ảnh ({images.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {images.map((img, idx) => (
                      <img key={img.id || idx} src={img.url} alt={`img-${idx}`} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                    ))}
                  </div>
                </div>
              )}

              {videos.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Video ({videos.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {videos.map((v, idx) => (
                      <video key={v.id || idx} src={v.url} controls style={{ width: '100%', maxHeight: 280, borderRadius: 8, background: '#000' }} />
                    ))}
                  </div>
                </div>
              )}

              {audioSrc && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Nhạc</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {post?.thumbnail && (
                      <img src={post.thumbnail} alt="thumb" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{post?.audioTitle || post?.title || 'Bài nhạc'}</div>
                      <div style={{ color: 'rgb(var(--muted-foreground))', fontSize: 12 }}>{post?.artistName || ''}</div>
                      <audio controls src={audioSrc} style={{ width: '100%', marginTop: 6 }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <textarea
            rows={5}
            placeholder={t('input.content')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={cn(
              "w-full resize-y bg-background text-foreground",
              "border-[0.5px] border-border/20 rounded-lg p-4",
              "font-inherit text-base leading-6 outline-none",
              "transition-all duration-200",
              "focus:border-primary focus:ring-2 focus:ring-primary/10",
              "placeholder:text-muted-foreground/60"
            )}
          />
          <div className={cn(
            "flex gap-2 justify-end pt-4 border-t border-border/30 mt-2"
          )}>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={submitting}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium",
                "cursor-pointer transition-all duration-200",
                "bg-muted/30 text-foreground",
                "hover:bg-muted/50",
                "active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              )}
            >
              {t('action.cancel')}
            </button>
            <button 
              type="submit" 
              disabled={submitting || (!title.trim() && !content.trim())}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium",
                "cursor-pointer transition-all duration-200 border-none",
                "bg-primary text-primary-foreground",
                "hover:opacity-90",
                "active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              )}
            >
              {submitting ? t('action.saving') : t('action.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

PostEditModal.propTypes = {
  open: PropTypes.bool,
  post: PropTypes.object,
  onClose: PropTypes.func,
  onUpdated: PropTypes.func,
};


