import { useState } from "react";
import PropTypes from "prop-types";

export default function ReportPostModal({ open, post, onClose, onSubmitted }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    try {
      setSubmitting(true);
      // FE-only: simulate success without API
      onSubmitted?.({ postId: post?.id, reason: reason.trim(), details: details.trim() });
      onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="post-composer-modal" role="dialog" aria-modal="true" onClick={onClose} tabIndex={-1}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">🚩 Báo cáo bài viết</div>
        <form onSubmit={handleSubmit} className="modal-body">
          <input 
            type="text" 
            placeholder="Lý do báo cáo (bắt buộc)" 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
            className="media-caption-input"
          />
          <textarea
            placeholder="Chi tiết (tuỳ chọn)"
            rows={5}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="content-textarea"
          />
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>Hủy</button>
            <button type="submit" className="btn-submit" disabled={submitting || !reason.trim()}>
              {submitting ? "Đang gửi..." : "Gửi báo cáo"}
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


