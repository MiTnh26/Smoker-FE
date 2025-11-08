import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

export default function TrashModal({ open, posts, loading, onClose, onRestore, onClear }) {
  const { t, i18n } = useTranslation();
  if (!open) return null;
  return (
    <div className="post-composer-modal" role="dialog" aria-modal="true" onClick={onClose} tabIndex={-1}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          🗑️ {t('modal.trash')}
          <button type="button" className="btn-cancel" onClick={onClear}>{t('modal.clearAll')}</button>
        </div>
        <div className="modal-body" style={{ maxHeight: 420, overflow: 'auto' }}>
          {loading ? (
            <p className="text-gray-400">{t('common.loading') || 'Loading...'}</p>
          ) : posts.length === 0 ? (
            <p className="text-gray-400">{t('modal.emptyTrash')}</p>
          ) : (
            <div className="space-y-2">
              {posts.map((p) => {
                const id = p._id || p.postId || p.id;
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', border: '1px solid rgba(var(--border),0.5)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: 14 }}>{p.title || p.caption || p.content?.slice(0, 48) || `${t('feed.shareTitle')} ${id}`}</strong>
                      <span style={{ color: 'rgb(var(--muted-foreground))', fontSize: 12 }}>{new Date(p.createdAt).toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}</span>
                    </div>
                    <button type="button" className="btn-submit" onClick={() => onRestore(id)}>{t('modal.restore')}</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>{t('modal.close')}</button>
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


