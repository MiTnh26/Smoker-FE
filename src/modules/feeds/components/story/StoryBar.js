
import { useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next";
import { isViewed } from "./utils/storyUtils";
import { cn } from "../../../../utils/cn";
import CreateStory from "./CreateStory";

export default function StoryBar({ stories, onStoryClick, onOpenEditor, entityAccountId }) {
  const { t } = useTranslation();
  const barRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const VISIBLE_COUNT = 5
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
    
    // KHÔNG filter ngay khi xem xong - chỉ đổi màu border
    // Chỉ filter khi load lại trang (stories từ API đã có viewed: true)
    // Filter: Chỉ ẩn user groups khi tất cả stories đã xem VÀ không phải story của bản thân
    // Story của bản thân: LUÔN hiển thị dù đã xem hết (nếu chưa hết 24h)
    const filteredUserGroups = userGroupsArray.filter(userGroup => {
      // Kiểm tra xem có phải story của bản thân không
      let isOwnStory = false;
      if (entityAccountId) {
        const currentId = String(entityAccountId).trim().toLowerCase();
        const storyEntityId = userGroup.displayStory?.entityAccountId || 
                             userGroup.displayStory?.authorEntityAccountId || 
                             userGroup.displayStory?.EntityAccountId;
        isOwnStory = storyEntityId && String(storyEntityId).trim().toLowerCase() === currentId;
      }
      
      // Story của bản thân: LUÔN hiển thị dù đã xem hết (nếu chưa hết 24h)
      // KHÔNG BAO GIỜ filter story của bản thân ra
      if (isOwnStory) {
        const storyDate = new Date(userGroup.displayStory.createdAt || 0);
        const now = new Date();
        const diffInHours = (now - storyDate) / (1000 * 60 * 60);
        const isWithin24Hours = diffInHours <= 24;
        
        if (isWithin24Hours) {
          console.log('[StoryBar] Keeping own story visible (within 24h):', {
            userId: userGroup.userId,
            storyId: userGroup.displayStory._id || userGroup.displayStory.id,
            hoursRemaining: 24 - diffInHours
          });
          return true; // LUÔN hiển thị story của bản thân (nếu chưa hết 24h)
        } else {
          console.log('[StoryBar] Own story expired (>24h):', {
            userId: userGroup.userId,
            storyId: userGroup.displayStory._id || userGroup.displayStory.id,
            hoursOld: diffInHours
          });
          return false; // Story của bản thân quá 24h → Ẩn (giống story của người khác)
        }
      }
      
      // Story của người khác: Chỉ ẩn khi TẤT CẢ stories đã xem VÀ đã được lưu trong DB (viewed: true từ API)
      // Backend cần trả về field viewed: true khi fetch stories
      const allStoriesViewed = userGroup.allStories.every(s => {
        // Chỉ coi là "đã xem trong DB" nếu có field viewed: true từ API
        // Backend cần trả về field này khi GET /stories
        const isViewedInDB = s.viewed === true || s.isViewed === true || s.hasViewed === true;
        
        // Debug log để kiểm tra
        if (userGroup.allStories.indexOf(s) === 0) {
          console.log('[StoryBar] Checking story viewed status:', {
            storyId: s._id || s.id,
            viewed: s.viewed,
            isViewed: s.isViewed,
            hasViewed: s.hasViewed,
            isViewedInDB
          });
        }
        
        return isViewedInDB;
      });
      
      // Nếu tất cả đã xem trong DB → Ẩn (chỉ khi load lại trang)
      if (allStoriesViewed) {
        console.log('[StoryBar] Filtering out user group - all stories viewed in DB:', {
          userId: userGroup.userId,
          username: userGroup.displayStory?.authorName || userGroup.displayStory?.authorEntityName,
          totalStories: userGroup.allStories.length,
          stories: userGroup.allStories.map(s => ({
            id: s._id || s.id,
            viewed: s.viewed,
            isViewed: s.isViewed,
            hasViewed: s.hasViewed
          }))
        });
        return false;
      }
      
      // Còn story chưa xem trong DB → Hiển thị
      return true;
    });
    
    console.log('[StoryBar] Filtered user groups:', {
      before: userGroupsArray.length,
      after: filteredUserGroups.length,
      filtered: userGroupsArray.length - filteredUserGroups.length
    });
    
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
      <button
        className={cn(
          "absolute left-2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-transparent text-2xl text-foreground transition-colors duration-200",
          "top-1/2",
          currentIndex === 0
            ? "cursor-not-allowed opacity-30"
            : "hover:bg-muted/60"
        )}
        onClick={() => go("left")}
        aria-label="Previous stories"
        disabled={currentIndex === 0}
      >
        ‹
      </button>

      <div className="w-full overflow-hidden">
        <div
          ref={barRef}
          className="flex items-start gap-2 px-3 py-3 transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${offset}px)` }}
        >

      <CreateStory onOpenEditor={onOpenEditor} />
          {groupedByUser.map((userGroup, idx) => {
            const story = userGroup.displayStory;
            const key = story._id || `story-${idx}`;
            const avatarSrc = story.authorAvatar || story.authorEntityAvatar || story.avatar || '/default-avatar.png';
            const previewImage = story.images || story.thumbnail || null;
            const username = story.authorName || story.authorEntityName || story.accountId || story.user || story.title || 'User';
            
            // Kiểm tra xem tất cả stories của user đã được xem chưa
            // Nếu tất cả stories đã xem, hoặc displayStory đã xem, thì đánh dấu là viewed
            const allStoriesViewed = userGroup.allStories.every(s => isViewed(s));
            const displayStoryViewed = isViewed(story);
            const isViewedStory = allStoriesViewed || displayStoryViewed;
            
            const storyItemClasses = cn(
              "flex w-[112px] shrink-0 cursor-pointer flex-col items-center text-center",
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
                    "relative h-[200px] w-full overflow-hidden rounded-lg border-[0.5px] border-border/20 bg-muted shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
                    isViewedStory && "opacity-90"
                  )}
                >
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-muted-foreground/10" />
                  )}
                  <div
                    className={cn(
                      "absolute left-2 top-2 h-9 w-9 rounded-full border-[0.5px] border-primary/40 bg-card p-[1px] shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-colors duration-200",
                      isViewedStory && "border-white/40 opacity-80"
                    )}
                  >
                    <img
                      src={avatarSrc}
                      alt={username}
                      className="h-full w-full rounded-full object-cover"
                    />
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

      <button
        className={cn(
          "absolute right-2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-transparent text-2xl text-foreground transition-colors duration-200",
          "top-1/2",
          currentIndex === maxIndex
            ? "cursor-not-allowed opacity-30"
            : "hover:bg-muted/60"
        )}
        onClick={() => go("right")}
        aria-label="Next stories"
        disabled={currentIndex === maxIndex}
      >
        ›
      </button>
    </div>
  )
}

