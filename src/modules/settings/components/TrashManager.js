import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getTrashedPosts, restorePost } from "../../../api/postApi";
import TrashModal from "../../feeds/components/TrashModal";

export default function TrashManager() {
  const { t } = useTranslation();
  const [showTrash, setShowTrash] = useState(false);
  const [trashedPosts, setTrashedPosts] = useState([]);
  const [loadingTrashed, setLoadingTrashed] = useState(false);

  // Lấy entityAccountId của user hiện tại
  const getCurrentEntityAccountId = () => {
    try {
      const raw = localStorage.getItem("session");
      const session = raw ? JSON.parse(raw) : null;
      if (!session) return null;
      
      const activeEntity = session?.activeEntity || session?.account;
      return activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
    } catch {
      return null;
    }
  };

  // Load trashed posts từ API
  const loadTrashedPosts = async () => {
    try {
      setLoadingTrashed(true);
      const currentEntityAccountId = getCurrentEntityAccountId();
      if (!currentEntityAccountId) {
        setTrashedPosts([]);
        return;
      }

      const response = await getTrashedPosts({
        entityAccountId: currentEntityAccountId,
        page: 1,
        limit: 100 // Lấy tất cả trashed posts
      });

      // axiosClient interceptor đã unwrap response.data, nên response chính là response.data
      if (response?.success) {
        setTrashedPosts(response.data || []);
      } else {
        setTrashedPosts([]);
      }
    } catch (error) {
      console.error('[TrashManager] Error loading trashed posts:', error);
      setTrashedPosts([]);
    } finally {
      setLoadingTrashed(false);
    }
  };

  useEffect(() => {
    loadTrashedPosts();
  }, []);

  const handleOpenTrash = () => {
    loadTrashedPosts(); // Refresh trashed posts khi mở modal
    setShowTrash(true);
  };

  const handleRestore = async (id) => {
    try {
      const currentEntityAccountId = getCurrentEntityAccountId();
      if (!currentEntityAccountId) {
        alert(t('feed.errorRestore') || 'Cannot restore post: No entityAccountId');
        return;
      }

      // Gọi API restore post
      const response = await restorePost(id, {
        entityAccountId: currentEntityAccountId
      });

      // axiosClient interceptor đã unwrap response.data, nên response chính là response.data
      if (response?.success) {
        // Refresh trashed posts
        loadTrashedPosts();
        alert(t('settings.postRestored') || 'Bài viết đã được khôi phục');
      } else {
        alert(response?.message || t('feed.errorRestore') || 'Failed to restore post');
      }
    } catch (error) {
      console.error('[TrashManager] Error restoring post:', error);
      alert(t('feed.errorRestore') || 'Failed to restore post');
    }
  };

  const handleClear = () => {
    if (!window.confirm(t('feed.confirmTrash'))) return;
    // Clear chỉ xóa local state, không xóa trên server (posts sẽ tự xóa sau 30 ngày)
    setTrashedPosts([]);
  };

  return (
    <>
      <section className="settings-card">
        <h2>{t('settings.trash') || 'Thùng rác'}</h2>
        <div className="settings-item">
          <div className="settings-item-info">
            <div className="settings-item-title">{t('settings.trashedPosts') || 'Bài viết đã xóa'}</div>
            <div className="settings-item-desc">
              {t('settings.trashedPostsDesc', { count: trashedPosts.length }) || `Bạn có ${trashedPosts.length} bài viết đã xóa. Các bài viết sẽ tự động xóa vĩnh viễn sau 30 ngày.`}
            </div>
          </div>
          <button className="btn-primary" onClick={handleOpenTrash}>
            {t('settings.viewTrash') || 'Xem thùng rác'} ({trashedPosts.length})
          </button>
        </div>
      </section>

      <TrashModal
        open={showTrash}
        posts={trashedPosts}
        loading={loadingTrashed}
        onClose={() => setShowTrash(false)}
        onRestore={handleRestore}
        onClear={handleClear}
      />
    </>
  );
}

