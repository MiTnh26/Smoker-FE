/**
 * Utility functions for story components
 */

/**
 * Get user identifier from story
 */
export const getUserIdentifier = (story) => {
  return story.authorEntityAccountId || story.authorAccountId || story.entityAccountId || story.accountId || null;
};

/**
 * Check if story is older than 24 hours
 */
export const isOlderThan24Hours = (story) => {
  if (!story.createdAt) return true;
  const storyDate = new Date(story.createdAt);
  const now = new Date();
  const diffInHours = (now - storyDate) / (1000 * 60 * 60);
  return diffInHours > 24;
};

/**
 * Check if story is viewed
 * Checks multiple fields and localStorage for viewed story IDs
 * 
 * Priority:
 * 1. Check story.viewed from backend (persisted in DB) - Backend cần trả về field này khi GET /stories
 * 2. Check localStorage (temporary cache for immediate UI feedback)
 * 
 * Note: Function này dùng cho UI feedback (đổi màu border). 
 * Logic filter (ẩn story) chỉ check field từ backend, không check localStorage.
 */
export const isViewed = (story) => {
  // Check story fields first (from backend API response)
  // Backend cần trả về field viewed: true/false khi GET /stories
  if (story.viewed === true || story.isViewed === true || story.hasViewed === true) {
    return true;
  }
  
  // Check localStorage for viewed story IDs (temporary cache for immediate UI feedback)
  // Chỉ dùng để đổi màu border ngay lập tức, không dùng để filter
  try {
    const storyId = story._id || story.id;
    if (storyId) {
      const viewedStories = localStorage.getItem('viewedStories');
      if (viewedStories) {
        const viewedIds = JSON.parse(viewedStories);
        if (Array.isArray(viewedIds) && viewedIds.includes(storyId)) {
          return true;
        }
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  
  return false;
};

/**
 * Get active story ID (supports both id and _id)
 */
export const getActiveId = (activeStory) => {
  if (!activeStory) return null;
  if (typeof activeStory === "string") return activeStory;
  return activeStory._id || activeStory.id || null;
};

/**
 * Format short time (3h, 5m, 2d) - Facebook style
 */
export const formatShortTime = (dateString, t) => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return "";
    
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return t?.('time.justNow') || 'Vừa xong';
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    
    // Nếu quá 7 ngày, hiển thị ngày tháng ngắn
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  } catch {
    return "";
  }
};

