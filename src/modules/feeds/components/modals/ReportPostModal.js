import { useState } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import reportApi from "../../../../api/reportApi";
import { useAuth } from "../../../../hooks/useAuth";
import { cn } from "../../../../utils/cn";
export default function ReportPostModal({ open, post, onClose, onSubmitted }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuth();
  console.log("Reporting post:", post);
  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    try {
      setSubmitting(true);
      // Call API to create report
      const payload = {
        ReporterId: user?.id,
        ReporterRole: user?.role || "user",
        TargetType: "post",
        TargetId: post?.id,
        TargetOwnerId: post?.ownerId, // id chủ sở hữu bài viết
        Reason: reason.trim(),
        Description: details.trim(),
        Status: "Pending",
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
      };
      await reportApi.createReport(payload);
      onSubmitted?.({ postId: post?.id, reason: reason.trim(), details: details.trim() });
      onClose?.();
    } catch (error) {
      // Optionally handle error (e.g., show toast)
      // eslint-disable-next-line no-console
      console.error("Report submission failed", error);
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
          🚩 {t('modal.reportTitle')}
        </div>
        <form onSubmit={handleSubmit} className={cn(
          "p-5 flex flex-col gap-3 relative z-10"
        )}>
          <input 
            type="text" 
            placeholder={t('modal.reportReason')} 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
            className={cn(
              "w-full px-4 py-3 border-[0.5px] border-border/20 rounded-lg",
              "bg-background text-foreground text-sm outline-none",
              "transition-all duration-200",
              "focus:border-primary focus:ring-2 focus:ring-primary/10",
              "placeholder:text-muted-foreground/60"
            )}
          />
          <textarea
            placeholder={t('modal.reportDetails')}
            rows={5}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
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
              {t('modal.cancel')}
            </button>
            <button 
              type="submit" 
              disabled={submitting || !reason.trim()}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium",
                "cursor-pointer transition-all duration-200 border-none",
                "bg-danger text-primary-foreground",
                "hover:opacity-90",
                "active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              )}
            >
              {submitting ? t('modal.sending') : t('modal.sendReport')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

ReportPostModal.propTypes = {
  open: PropTypes.bool,
  post: PropTypes.object,
  onClose: PropTypes.func,
  onSubmitted: PropTypes.func,
};


