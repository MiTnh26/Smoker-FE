/**
 * Universal function to check if a post is liked by the current viewer
 * Supports both object (activeEntity) and string (entityAccountId) for backward compatibility
 * 
 * @param {Object} post - Post object with likes/likesObject
 * @param {Object|string} viewerEntity - activeEntity object or entityAccountId string
 * @returns {boolean} - true if post is liked by viewer
 */

// ⚠️ Copy normalizeId vào đây để tránh circular dependency với utils.js
// (utils.js re-export checkPostIsLiked, nên không thể import normalizeId từ utils.js)
const normalizeId = (id) => {
  if (!id) return null;
  return String(id).trim().toLowerCase();
};

export const checkPostIsLiked = (post, viewerEntity) => {
  if (!post) {
    return false;
  }

  // 1. Ưu tiên stats từ server (backend đã tính sẵn) - O(1)
  if (post.stats?.isLikedByMe === true || post.likedByCurrentUser === true) {
    return true;
  }

  // 2. Extract và normalize viewerEntityAccountId
  // Hỗ trợ cả string (từ postTransformers) và object (từ PostDetailModal)
  let viewerId = null;
  if (typeof viewerEntity === 'string') {
    viewerId = viewerEntity;
  } else if (viewerEntity && typeof viewerEntity === 'object') {
    viewerId = viewerEntity.EntityAccountId || viewerEntity.entityAccountId || viewerEntity.id;
  }
  
  if (!viewerId) {
    return false;
  }
  
  // Normalize toLowerCase để match với keys trong DB (có thể là uppercase hoặc mixed case)
  const normalizedViewerId = normalizeId(viewerId);

  // 3. Helper: Check object với direct lookup O(1)
  // Luôn normalize keys để match (vì keys trong DB có thể là uppercase hoặc mixed case)
  const checkLikesObject = (likesObj) => {
    if (!likesObj || typeof likesObj !== 'object' || Array.isArray(likesObj) || likesObj instanceof Map) {
      return false;
    }
    
    for (const key of Object.keys(likesObj)) {
      const normalizedKey = normalizeId(key);
      if (normalizedKey === normalizedViewerId) {
        return true;
      }
    }
    return false;
  };

  // 4. Check likes (format mới với entityAccountId keys) - O(1)
  if (checkLikesObject(post.likes)) {
    return true;
  }

  // 5. Check likesObject (format mới) - O(1)
  if (checkLikesObject(post.likesObject)) {
    return true;
  }

  return false;
};

