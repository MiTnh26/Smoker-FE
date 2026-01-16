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
 * Chỉ dựa vào trạng thái từ backend, KHÔNG dùng localStorage.
 * Backend cần trả về field viewed/isViewed/hasViewed khi GET /stories.
 */
export const isViewed = (story) => {
  if (!story) return false;
  return (
    story.viewed === true ||
    story.isViewed === true ||
    story.hasViewed === true
  );
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

