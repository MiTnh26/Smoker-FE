
import { useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next";
import { isViewed } from "./utils/storyUtils";
import { cn } from "../../../../utils/cn";
import CreateStory from "./CreateStory";

export default function StoryBar({ stories, onStoryClick, onOpenEditor, entityAccountId }) {
  const { t } = useTranslation();
  const barRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(0)

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
          {groupedByUser.map((userGroup, idx) => {
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
    </div>
  )
}

