import { useState } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import reportApi from "../../../api/reportApi";
import { useAuth } from "../../../hooks/useAuth";
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
    <div className="post-composer-modal" role="dialog" aria-modal="true" onClick={onClose} tabIndex={-1}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">🚩 {t('modal.reportTitle')}</div>
        <form onSubmit={handleSubmit} className="modal-body">
          <input 
            type="text" 
            placeholder={t('modal.reportReason')} 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
            className="media-caption-input"
          />
          <textarea
            placeholder={t('modal.reportDetails')}
            rows={5}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="content-textarea"
          />
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>{t('modal.cancel')}</button>
            <button type="submit" className="btn-submit" disabled={submitting || !reason.trim()}>
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


