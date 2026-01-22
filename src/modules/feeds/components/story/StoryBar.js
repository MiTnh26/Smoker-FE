
import { useMemo, useRef, useState, useEffect } from "react"
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { isViewed } from "./utils/storyUtils";
import { cn } from "../../../../utils/cn";
import CreateStory from "./CreateStory";
import searchApi from "../../../../api/searchApi";

export default function StoryBar({ stories, onStoryClick, onOpenEditor, entityAccountId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const barRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [trendingSearches, setTrendingSearches] = useState([])
  const [loadingTrending, setLoadingTrending] = useState(false)

  // Số lượng item hiển thị cùng lúc (bao gồm cả card \"Tạo story\")
 
  const VISIBLE_COUNT = 6
  const ITEM_WIDTH = 112
  const GAP = 8

  // Group stories by user - filter stories cũ hơn 24h và sort theo thứ tự: chưa xem -> cũ -> mới
  const groupedByUser = useMemo(() => {
    if (!stories || stories.length === 0) return [];
    
    // Helper to get user identifier
    const getUserIdentifier = (story) => {
      return story.authorEntityAccountId || story.authorAccountId || story.entityAccountId || story.accountId || null;
    };
    
    // Helper to check if story is older than 24 hours
    const isOlderThan24Hours = (story) => {
      if (!story.createdAt) return true;
      const storyDate = new Date(story.createdAt);
      const now = new Date();
      const diffInHours = (now - storyDate) / (1000 * 60 * 60);
      return diffInHours > 24;
    };
    
    // Filter stories cũ hơn 24h
    const validStories = stories.filter((story) => !isOlderThan24Hours(story));
    
    // Group stories by user
    const userGroups = new Map();
    validStories.forEach((story) => {
      const userId = getUserIdentifier(story);
      if (!userId) return;
      
      if (!userGroups.has(userId)) {
        userGroups.set(userId, []);
      }
      userGroups.get(userId).push(story);
    });
    
    // Sort stories của mỗi user: chưa xem -> cũ -> mới
    const userGroupsArray = Array.from(userGroups.entries()).map(([userId, userStories]) => {
      const sorted = [...userStories].sort((a, b) => {
        const aViewed = isViewed(a);
        const bViewed = isViewed(b);
        
        // Ưu tiên chưa xem trước
        if (aViewed !== bViewed) {
          return aViewed ? 1 : -1; // chưa xem (false) trước
        }
        
        // Nếu cùng trạng thái viewed, sort theo thời gian: cũ -> mới
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateA - dateB; // oldest first
      });
      
      // Lấy story để hiển thị: ưu tiên chưa xem đầu tiên, nếu không có thì lấy cũ nhất
      const displayStory = sorted.find(s => !isViewed(s)) || sorted[0];
      
      return {
        userId,
        displayStory, // Story để hiển thị trong StoryBar
        allStories: sorted // Lưu tất cả stories của user để truyền vào StoryViewer
      };
    });
    
    // KHÔNG ẩn nhóm story dựa trên trạng thái viewed nữa.
    // Chỉ filter theo thời gian (24h ở trên), còn lại giữ nguyên các nhóm
    // và chỉ thay đổi thứ tự + màu border giống Facebook.
    const filteredUserGroups = userGroupsArray;
    
    return filteredUserGroups.sort((a, b) => {
      // Ưu tiên story của bản thân (entityAccountId match) lên đầu tiên
      if (entityAccountId) {
        const currentId = String(entityAccountId).trim().toLowerCase();
        const aEntityId = a.displayStory?.entityAccountId || a.displayStory?.authorEntityAccountId || a.displayStory?.EntityAccountId;
        const bEntityId = b.displayStory?.entityAccountId || b.displayStory?.authorEntityAccountId || b.displayStory?.EntityAccountId;
        
        const aMatch = aEntityId && String(aEntityId).trim().toLowerCase() === currentId;
        const bMatch = bEntityId && String(bEntityId).trim().toLowerCase() === currentId;
        
        if (aMatch && !bMatch) return -1; // a là của bản thân, đưa lên đầu
        if (!aMatch && bMatch) return 1;  // b là của bản thân, đưa b lên đầu
      }
      
      // Nếu không phải story của bản thân, ưu tiên user có story chưa xem
      const aHasUnviewed = a.allStories.some(s => !isViewed(s));
      const bHasUnviewed = b.allStories.some(s => !isViewed(s));
      
      if (aHasUnviewed !== bHasUnviewed) {
        return aHasUnviewed ? -1 : 1; // có story chưa xem trước
      }
      
      // Nếu cùng trạng thái, sort theo story mới nhất
      const aLatest = new Date(a.displayStory.createdAt || 0);
      const bLatest = new Date(b.displayStory.createdAt || 0);
      return bLatest - aLatest; // newest first
    });
  }, [stories, isViewed, entityAccountId]);

  const hasStories = groupedByUser.length > 0;
  const totalItems = groupedByUser.length + 1 // include CreateStory
  const maxIndex = Math.max(0, totalItems - VISIBLE_COUNT)

  const offset = useMemo(() => {
    return currentIndex * (ITEM_WIDTH + GAP)
  }, [currentIndex])

  const go = (direction) => {
    setCurrentIndex((prev) => {
      if (direction === "left") return Math.max(0, prev - 1)
      return Math.min(maxIndex, prev + 1)
    })
  }

  // Handle story click - truyền tất cả stories của user đó
  const handleStoryClick = (userGroup) => {
    // Truyền story đầu tiên (chưa xem hoặc cũ nhất) và tất cả stories của user đó
    const firstStory = userGroup.allStories.find(s => !isViewed(s)) || userGroup.allStories[0];
    onStoryClick({
      ...firstStory,
      _allUserStories: userGroup.allStories // Flag để StoryViewer biết đây là grouped stories
    });
  }

  // Handle discover button click - mở modal search
  const handleDiscoverClick = () => {
    setShowSearchModal(true);
  }

  // Handle search submit - điều hướng đến search với query
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchModal(false);
      setSearchQuery('');
    }
  }

  // Handle close modal
  const handleCloseModal = () => {
    setShowSearchModal(false);
    setSearchQuery('');
  }

  // Load trending searches khi modal mở
  useEffect(() => {
    if (showSearchModal && trendingSearches.length === 0) {
      const loadTrendingSearches = async () => {
        setLoadingTrending(true);
        try {
          const trends = await searchApi.getTrendingSearches(6);
          setTrendingSearches(trends || []);
        } catch (error) {
          console.error('[StoryBar] Error loading trending searches:', error);
          // Fallback to empty array
          setTrendingSearches([]);
        } finally {
          setLoadingTrending(false);
        }
      };
      loadTrendingSearches();
    }
  }, [showSearchModal]);

  return (
    <div className="relative flex w-full items-center">
      {/* Nút previous – chỉ hiển thị khi có thể lùi */}
      {totalItems > VISIBLE_COUNT && currentIndex > 0 && (
        <button
          className={cn(
            "absolute left-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full",
            "bg-[rgba(0,0,0,0.45)] text-white shadow-md transition-colors duration-200 hover:bg-[rgba(0,0,0,0.7)]",
            "top-1/2"
          )}
          onClick={() => go("left")}
          aria-label="Previous stories"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Thanh story full-bleed */}
      <div className="w-full overflow-hidden">
        <div
          ref={barRef}
          className="flex items-start gap-2 px-0 py-0 transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${offset}px)` }}
        >
          <CreateStory onOpenEditor={onOpenEditor} />
          
          {/* Empty State khi chưa có stories từ bạn bè */}
          {!hasStories && (
            <div 
              className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-4" 
              style={{ 
                borderColor: "rgb(var(--border))",
                background: "rgba(var(--card), 0.5)",
                minHeight: "200px"
              }}
            >
              <div className="flex flex-1 items-center gap-3">
                {/* Icon */}
                <div 
                  className="flex-shrink-0 rounded-full p-3" 
                  style={{ background: "rgba(var(--primary), 0.1)" }}
                >
                  <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    style={{ color: "rgb(var(--primary))" }}
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <path d="M8 2v4M16 2v4M3 10h18" />
                  </svg>
                </div>
                
                {/* Message */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm mb-1" style={{ color: "rgb(var(--foreground))" }}>
                    {t('story.emptyTitle')}
                  </p>
                  <p className="text-xs opacity-70" style={{ color: "rgb(var(--foreground))" }}>
                    {t('story.emptyDescription')}
                  </p>
                </div>
                
                {/* CTA Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={handleDiscoverClick}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ 
                      background: "rgb(var(--primary))",
                      color: "rgb(var(--primary-foreground))"
                    }}
                  >
                    {t('story.discover')}
                  </button>
                  <button
                    onClick={onOpenEditor}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                    style={{ 
                      borderColor: "rgb(var(--border))",
                      color: "rgb(var(--foreground))"
                    }}
                  >
                    {t('story.createFirst')}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {hasStories && groupedByUser.map((userGroup, idx) => {
            const story = userGroup.displayStory;
            const key = story._id || `story-${idx}`;
            const avatarSrc = story.authorAvatar || story.avatar || '/default-avatar.png';
            const previewImage = story.images || story.thumbnail || null;
            const username = story.authorName || story.userName || story.accountId || story.user || story.title || 'User';
            
            // Kiểm tra xem tất cả stories của user đã được xem chưa
            // Nếu tất cả stories đã xem, hoặc displayStory đã xem, thì đánh dấu là viewed
            const allStoriesViewed = userGroup.allStories.every(s => isViewed(s));
            const displayStoryViewed = isViewed(story);
            const isViewedStory = allStoriesViewed || displayStoryViewed;
            
            const storyItemClasses = cn(
              "group flex w-[112px] shrink-0 cursor-pointer flex-col items-center text-center",
              "transition-colors duration-200"
            );

            return (
              <div
                key={key}
                className={storyItemClasses}
                onClick={() => handleStoryClick(userGroup)}
              >
                <div
                  className={cn(
                    "relative h-[200px] w-full overflow-hidden rounded-xl bg-muted shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-shadow duration-200",
                    "group-hover:shadow-[0_3px_12px_rgba(0,0,0,0.45)]",
                    isViewedStory && "opacity-90"
                  )}
                >
                  <div className="h-full w-full overflow-hidden">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt={username}
                        className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted-foreground/10" />
                    )}
                  </div>
                  {/* Avatar vòng dày kiểu Facebook */}
                  <div
                    className={cn(
                      "absolute left-2 top-2 h-10 w-10 rounded-full p-[3px] shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-colors duration-200",
                      !isViewedStory &&
                        "bg-[conic-gradient(from_0deg,_rgb(var(--primary)),_rgb(var(--success)),_rgb(var(--highlight)),_rgb(var(--primary)),_rgb(var(--success)),_rgb(var(--highlight)),_rgb(var(--primary)))]",
                      isViewedStory &&
                        "bg-[rgb(var(--background))] border-2 border-white/60 opacity-80"
                    )}
                  >
                    <div className="h-full w-full rounded-full bg-card">
                      <img
                        src={avatarSrc}
                        alt={username}
                        className="h-full w-full rounded-full object-cover"
                      />
                    </div>
                  </div>
                  <p className="absolute bottom-2 left-2 right-2 truncate text-left text-xs font-semibold text-white drop-shadow">
                    {username}
                  </p>
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* Nút next – chỉ hiển thị khi còn có thể tiến */}
      {totalItems > VISIBLE_COUNT && currentIndex < maxIndex && (
        <button
          className={cn(
            "absolute right-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full",
            "bg-[rgba(0,0,0,0.45)] text-white shadow-md transition-colors duration-200 hover:bg-[rgba(0,0,0,0.7)]",
            "top-1/2"
          )}
          onClick={() => go("right")}
          aria-label="Next stories"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 18L15 12L9 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

{showSearchModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleCloseModal}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCloseModal();
          }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          <div 
            className="relative w-full max-w-lg mx-4 rounded-xl shadow-2xl overflow-hidden"
            style={{ 
              background: "rgb(var(--card))",
              border: "1px solid rgb(var(--border))",
              color: "rgb(var(--foreground))"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Title & Close */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgb(var(--border))" }}>
              <h3 className="text-lg font-bold">
                {t('story.searchTitle') || "Tìm kiếm Story"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-full hover:bg-black/5 transition-colors opacity-70 hover:opacity-100"
                aria-label="Close"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <form onSubmit={handleSearchSubmit} className="space-y-6">
                
                {/* Input Area */}
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('story.searchPlaceholder') || "Nhập tên người dùng, sự kiện..."}
                    className="w-full pl-12 pr-10 py-3.5 rounded-lg border text-base focus:outline-none focus:ring-2 transition-all"
                    style={{ 
                      background: "rgb(var(--background))",
                      borderColor: "rgb(var(--border))",
                      color: "rgb(var(--foreground))",
                      boxShadow: "none"
                    }}
                    autoFocus
                  />
                  {searchQuery && (
                    <button 
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-50 hover:opacity-100"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>

                {/* Phần Gợi ý (UX: Lấp đầy khoảng trống khi chưa nhập) */}
                {!searchQuery && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase opacity-50 tracking-wider">
                      {t('story.trendingSearches') || 'Xu hướng tìm kiếm'}
                    </p>
                    {loadingTrending ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="text-sm opacity-50" style={{ color: "rgb(var(--foreground))" }}>
                          {t('common.loading') || 'Đang tải...'}
                        </div>
                      </div>
                    ) : trendingSearches.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {trendingSearches.map((tag, index) => (
                          <button 
                            key={`${tag}-${index}`}
                            type="button"
                            onClick={() => setSearchQuery(tag)}
                            className="px-3 py-1.5 text-sm rounded-md border hover:brightness-95 transition-all"
                            style={{ 
                              background: "rgb(var(--background))", 
                              borderColor: "rgb(var(--border))",
                              color: "rgb(var(--foreground))"
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs opacity-50 py-2" style={{ color: "rgb(var(--foreground))" }}>
                        {t('story.noTrendingSearches') || 'Chưa có xu hướng tìm kiếm'}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium border hover:bg-black/5 transition-colors"
                    style={{ 
                      borderColor: "rgb(var(--border))",
                      color: "rgb(var(--foreground))"
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={!searchQuery.trim()}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      background: "rgb(var(--primary))",
                      color: "rgb(var(--primary-foreground))"
                    }}
                  >
                    {t('story.search')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

