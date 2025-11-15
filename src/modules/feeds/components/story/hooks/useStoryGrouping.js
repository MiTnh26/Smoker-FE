import { useMemo } from "react";
import { getUserIdentifier, isOlderThan24Hours, isViewed, getActiveId } from "../utils/storyUtils";

/**
 * Hook to group stories by user, filter 24h, and sort by viewed status
 */
export const useStoryGrouping = (stories, activeStory) => {
  return useMemo(() => {
    if (!stories || stories.length === 0) return [];
    
    let userStories = [];
    
    // Nếu activeStory có _allUserStories, dùng luôn (từ StoryBar)
    if (activeStory?._allUserStories && Array.isArray(activeStory._allUserStories)) {
      userStories = activeStory._allUserStories;
    } else {
      // Nếu không, tìm user của activeStory và lấy tất cả stories của user đó
      const activeId = getActiveId(activeStory);
      const activeStoryObj = stories.find((s) => (s._id || s.id) === activeId);
      if (!activeStoryObj) return [];
      
      const activeUserId = getUserIdentifier(activeStoryObj);
      if (!activeUserId) return [];
      
      // Filter stories from same user
      userStories = stories.filter((story) => {
        const userId = getUserIdentifier(story);
        return userId === activeUserId;
      });
    }
    
    // Filter stories cũ hơn 24h
    const validStories = userStories.filter((story) => !isOlderThan24Hours(story));
    
    // Sort: chưa xem -> cũ -> mới
    return validStories.sort((a, b) => {
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
  }, [stories, activeStory]);
};

