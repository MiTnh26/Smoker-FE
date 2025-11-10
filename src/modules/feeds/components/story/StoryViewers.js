import { useState, useEffect } from "react";
import { getStoryViewers } from "../../../../api/storyApi";
import "../../../../styles/modules/feeds/story/StoryViewers.css";

/**
 * Component to display story viewers (who viewed the story)
 * Only shown for own stories
 */
export default function StoryViewers({ storyId, isOwnStory }) {
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalViews, setTotalViews] = useState(0);

  useEffect(() => {
    if (!storyId || !isOwnStory) {
      return;
    }

    const fetchViewers = async () => {
      setLoading(true);
      try {
        const response = await getStoryViewers(storyId);

        if (response?.success && Array.isArray(response.data)) {
          setViewers(response.data);
          setTotalLikes(response.totalLikes || 0);
          setTotalViews(response.totalViews || response.data.length);
        } else if (Array.isArray(response)) {
          setViewers(response);
          setTotalLikes(0);
          setTotalViews(response.length);
        } else if (response?.data && Array.isArray(response.data)) {
          setViewers(response.data);
          setTotalLikes(response.totalLikes || 0);
          setTotalViews(response.totalViews || response.data.length);
        }
      } catch (error) {
        const status = error?.response?.status;
        if (status === 404) {
          setHasError(true);
        } else {
          setHasError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchViewers();
  }, [storyId, isOwnStory]);

  if (!isOwnStory || !storyId) {
    return null;
  }

  const totalViewers = viewers.length;

  return (
    <div className="story-viewers-container">
      <button 
        className="story-viewers-button"
        onClick={() => {
          setShowList(!showList);
        }}
        title={`${totalViewers} người đã xem`}
      >
        <span className="story-viewers-icon">lượt xem </span>
        <span className="story-viewers-count">{totalViewers}</span>
      </button>

      {showList && (
        <div className="story-viewers-list">
          <div className="story-viewers-header">
            <div className="story-viewers-header-info">
              <h3>Người đã xem ({totalViews})</h3>
              {totalLikes > 0 && (
                <div className="story-viewers-likes-info">
                  <span className="story-viewers-likes-icon">❤️</span>
                  <span className="story-viewers-likes-count">{totalLikes}</span>
                </div>
              )}
            </div>
            <button 
              className="story-viewers-close"
              onClick={() => setShowList(false)}
            >
              ×
            </button>
          </div>
          <div className="story-viewers-content">
            {loading ? (
              <div className="story-viewers-loading">Đang tải...</div>
            ) : viewers.length === 0 ? (
              <div className="story-viewers-empty">Chưa có ai xem</div>
            ) : (
              viewers.map((viewer, index) => {
                const avatar = viewer.avatar || viewer.authorAvatar || viewer.authorEntityAvatar || "/default-avatar.png";
                const name = viewer.userName || viewer.name || viewer.authorName || viewer.authorEntityName || "Người dùng";
                const viewedAt = viewer.viewedAt || viewer.createdAt;
                const liked = viewer.liked || false;

                return (
                  <div key={viewer.entityAccountId || viewer.id || index} className="story-viewer-item">
                    <img src={avatar} alt={name} className="story-viewer-avatar" />
                    <div className="story-viewer-info">
                      <div className="story-viewer-name-row">
                        <span className="story-viewer-name">{name}</span>
                        {liked && (
                          <span className="story-viewer-liked-icon" title="Đã thích story">
                            ❤️
                          </span>
                        )}
                      </div>
                      {viewedAt && (
                        <span className="story-viewer-time">
                          {new Date(viewedAt).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

