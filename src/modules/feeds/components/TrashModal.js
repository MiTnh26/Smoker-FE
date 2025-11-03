import PropTypes from "prop-types";

export default function TrashModal({ open, posts, onClose, onRestore, onClear }) {
  if (!open) return null;
  return (
    <div className="post-composer-modal" role="dialog" aria-modal="true" onClick={onClose} tabIndex={-1}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          🗑️ Thùng rác
          <button type="button" className="btn-cancel" onClick={onClear}>Xóa tất cả</button>
        </div>
        <div className="modal-body" style={{ maxHeight: 420, overflow: 'auto' }}>
          {posts.length === 0 ? (
            <p className="text-gray-400">Không có bài trong thùng rác.</p>
          ) : (
            <div className="space-y-2">
              {posts.map((p) => {
                const id = p._id || p.postId || p.id;
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', border: '1px solid rgba(var(--border),0.5)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: 14 }}>{p.title || p.caption || p.content?.slice(0, 48) || `Bài viết ${id}`}</strong>
                      <span style={{ color: 'rgb(var(--muted-foreground))', fontSize: 12 }}>{new Date(p.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                    <button type="button" className="btn-submit" onClick={() => onRestore(id)}>Khôi phục</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

TrashModal.propTypes = {
  open: PropTypes.bool,
  posts: PropTypes.array,
  onClose: PropTypes.func,
  onRestore: PropTypes.func,
  onClear: PropTypes.func,
};


