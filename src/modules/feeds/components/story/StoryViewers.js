import { useState, useEffect } from "react";
import { getStoryViewers } from "../../../../api/storyApi";

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
    <div className="absolute bottom-3 right-3 z-20">
      <button
        className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-sm font-semibold text-white backdrop-blur-lg transition-colors duration-200 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        onClick={() => {
          setShowList(!showList);
        }}
        title={`${totalViewers} người đã xem`}
      >
        <span className="text-base">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </span>
        <span>{totalViewers}</span>
      </button>

      {showList && (
        <div className="absolute bottom-14 right-0 w-[360px] max-w-[85vw] overflow-hidden rounded-xl border-[0.5px] border-white/20 bg-black/90 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-3 text-sm font-semibold">
              <span>Người đã xem ({totalViews})</span>
              {totalLikes > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-white/80">
                  <span>❤️</span>
                  <span>{totalLikes}</span>
                </span>
              )}
            </div>
            <button
              className="flex h-6 w-6 items-center justify-center rounded-full text-lg transition-colors duration-150 hover:bg-white/10"
              onClick={() => setShowList(false)}
            >
              ×
            </button>
          </div>
          <div className="max-h-[320px] overflow-y-auto px-2 py-2">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-white/60">
                Đang tải...
              </div>
            ) : viewers.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-white/60">
                Chưa có ai xem
              </div>
            ) : (
              viewers.map((viewer, index) => {
                const avatar =
                  viewer.avatar ||
                  viewer.authorAvatar ||
                  viewer.authorEntityAvatar ||
                  "/default-avatar.png";
                const name =
                  viewer.userName ||
                  viewer.name ||
                  viewer.authorName ||
                  viewer.authorEntityName ||
                  "Người dùng";
                const viewedAt = viewer.viewedAt || viewer.createdAt;
                const liked = viewer.liked || false;

                return (
                  <div
                    key={viewer.entityAccountId || viewer.id || index}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-white/5"
                  >
                    <img
                      src={avatar}
                      alt={name}
                      className="h-10 w-10 rounded-full border border-white/20 object-cover"
                    />
                    <div className="flex flex-1 flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{name}</span>
                        {liked && (
                          <span
                            className="text-sm"
                            title="Đã thích story"
                          >
                            ❤️
                          </span>
                        )}
                      </div>
                      {viewedAt && (
                        <span className="text-xs text-white/60">
                          {new Date(viewedAt).toLocaleString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
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

