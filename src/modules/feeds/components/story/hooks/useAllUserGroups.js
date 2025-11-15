import { useMemo } from "react";
import { getUserIdentifier, isOlderThan24Hours, isViewed } from "../utils/storyUtils";

/**
 * Hook to get all user groups from stories (similar to StoryBar logic)
 * Returns array of { userId, displayStory, allStories }
 * @param {Array} stories - Array of story objects
 * @param {string} entityAccountId - Current user's entityAccountId (optional, for prioritizing own stories)
 */
export const useAllUserGroups = (stories, entityAccountId = null) => {
  return useMemo(() => {
    if (!stories || stories.length === 0) return [];
    
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
          return true; // LUÔN hiển thị story của bản thân (nếu chưa hết 24h)
        } else {
          return false; // Story của bản thân quá 24h → Ẩn (giống story của người khác)
        }
      }
      
      // Story của người khác: Chỉ ẩn khi TẤT CẢ stories đã xem VÀ đã được lưu trong DB (viewed: true từ API)
      // Backend cần trả về field viewed: true khi fetch stories
      // Nếu chỉ có trong localStorage (vừa xem xong) → Vẫn hiển thị, chỉ đổi màu
      const allStoriesViewed = userGroup.allStories.every(s => {
        // Chỉ coi là "đã xem trong DB" nếu có field viewed: true từ API
        // Backend cần trả về field này khi GET /stories
        // Không check localStorage vì đó chỉ là cache tạm thời
        return s.viewed === true || s.isViewed === true || s.hasViewed === true;
      });
      
      // Nếu tất cả đã xem trong DB → Ẩn (chỉ khi load lại trang)
      if (allStoriesViewed) {
        return false;
      }
      
      // Còn story chưa xem trong DB → Hiển thị
      return true;
    });
    
    // Sort user groups: ưu tiên story của bản thân trước, sau đó là story chưa xem, cuối cùng là mới nhất
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
  }, [stories, entityAccountId]);
};

