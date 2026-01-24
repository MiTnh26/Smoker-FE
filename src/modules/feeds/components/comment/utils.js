// Utility functions for comment components

// Get session data with activeEntity
export const getSessionData = () => {
  try {
    const raw = localStorage.getItem("session");
    const session = raw ? JSON.parse(raw) : null;
    if (!session) return null;
    
    const activeEntity = session.activeEntity || session.account;
    const account = session.account;
    
    const typeRole = (() => {
      const raw = (activeEntity?.role || "").toString().toLowerCase();
      if (raw === "bar") return "BarPage";
      if (raw === "dj" || raw === "dancer") return "BusinessAccount";
      return "Account";
    })();
    
    const entityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || null;
    const entityId = activeEntity?.id || activeEntity?.entityId || account?.id || null;
    const entityType = typeRole;
    
    return {
      session,
      account,
      activeEntity,
      typeRole,
      entityAccountId,
      entityId,
      entityType
    };
  } catch (error) {
    console.error("[utils] Error getting session data:", error);
    return null;
  }
};

// Check if item is liked using entityAccountId
// ⚠️ TỐI ƯU: Backend đã chuẩn hóa likesObject với key = entityAccountId → O(1) lookup trực tiếp
export const isLiked = (likesObj, activeEntity) => {
  const myId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId;
  return !!(likesObj && myId && likesObj[normalizeId(myId)]);
};

/**
 * Check if post is liked - Universal function cho cả PostFeed và PostDetailModal
 * Ưu tiên: stats.isLikedByMe → direct lookup likes[normalizeId(viewerId)] → fallback format cũ
 * @param {object} post - Post object
 * @param {object|string} viewerEntity - Active entity object hoặc entityAccountId string
 * @returns {boolean}
 */
// ⚠️ checkPostIsLiked đã được di chuyển sang ../post/checkPostIsLiked.js
// Re-export để backward compatible (nếu có code cũ vẫn import từ đây)
export { checkPostIsLiked } from '../post/checkPostIsLiked';

// Get likes count
export const getLikesCount = (likesObj) => {
  if (!likesObj) return 0;
  if (likesObj instanceof Map) return likesObj.size;
  if (Array.isArray(likesObj)) return likesObj.length;
  if (typeof likesObj === 'object') return Object.keys(likesObj).length;
  if (typeof likesObj === 'number') return likesObj;
  return 0;
};

// Format time display
export const formatTimeDisplay = (value) => {
  try {
    const d = value ? new Date(value) : new Date();
    if (Number.isNaN(d.getTime())) return new Date().toLocaleString('vi-VN');
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return d.toLocaleString('vi-VN');
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Hôm qua';
    if (days < 7) return `${days} ngày trước`;
    return d.toLocaleDateString('vi-VN');
  } catch {
    return new Date().toLocaleString('vi-VN');
  }
};

// Get avatar for account
// ⚠️ TỐI ƯU: Lấy avatar từ session nếu là user hiện tại, nếu không thì fallback
export const getAvatarForAccount = (accountId, entityAccountId, fallbackAvatar = null) => {
  // Nếu có fallbackAvatar từ backend, ưu tiên dùng
  if (fallbackAvatar) {
    return fallbackAvatar;
  }
  
  // Thử lấy avatar từ session nếu là user hiện tại
  const sessionData = getSessionData();
  if (sessionData?.entityAccountId && entityAccountId) {
    const normalizedSessionId = String(sessionData.entityAccountId).trim().toLowerCase();
    const normalizedEntityId = String(entityAccountId).trim().toLowerCase();
    
    if (normalizedSessionId === normalizedEntityId) {
      // Đây là user hiện tại → lấy avatar từ session
      const avatar = sessionData.activeEntity?.avatar || 
                     sessionData.activeEntity?.Avatar ||
                     sessionData.account?.avatar ||
                     sessionData.account?.Avatar;
      if (avatar) {
        return avatar;
      }
    }
  }
  
  // Fallback về generic placeholder
  return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlNWU3ZWIiLz48cGF0aCBkPSJNMTIgMTRDMTUuMzEzNyAxNCAxOCAxNi42ODYzIDE4IDIwSDEwQzEwIDE2LjY4NjMgMTIuNjg2MyAxNCAxMiAxNFoiIGZpbGw9IiM5Y2EzYWYiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjgiIHI9IjQiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=";
};

// Get name for account
// ⚠️ TỐI ƯU: Lấy tên từ session nếu là user hiện tại, nếu không thì fallback
export const getNameForAccount = (accountId, entityAccountId, fallbackName = null) => {
  if (fallbackName && fallbackName !== 'Người dùng') {
    return fallbackName;
  }
  
  // Thử lấy từ session nếu entityAccountId khớp với user hiện tại
  try {
    const sessionData = getSessionData();
    if (sessionData?.entityAccountId && entityAccountId) {
      const normalizedSessionId = String(sessionData.entityAccountId).trim().toLowerCase();
      const normalizedEntityId = String(entityAccountId).trim().toLowerCase();
      
      if (normalizedSessionId === normalizedEntityId) {
        // Là user hiện tại → lấy tên từ session
        const name = sessionData.activeEntity?.name || 
                     sessionData.activeEntity?.userName || 
                     sessionData.account?.userName || 
                     sessionData.account?.name;
        if (name && name !== 'Người dùng') {
          return name;
        }
      }
    }
  } catch (error) {
    // Ignore error, fallback to default
  }
  
  return "Người dùng";
};

// Normalize ID for comparison: String(id).trim().toLowerCase()
export const normalizeId = (id) => {
  if (!id) return null;
  return String(id).trim().toLowerCase();
};

// Check if two entityAccountIds are equal (with null check)
const compareEntityAccountIds = (id1, id2) => {
  if (!id1 || !id2) return false;
  const normalized1 = normalizeId(id1);
  const normalized2 = normalizeId(id2);
  return normalized1 === normalized2;
};

// Check if user can manage comment
// Chỉ sử dụng entityAccountId để so sánh quyền sở hữu
// ⚠️ QUAN TRỌNG: Nhận activeEntity từ props để tránh lệch pha format GUID
export const canManageComment = (comment, activeEntity = null) => {
  // 1. Nếu Backend đã tính sẵn quyền (canManage: true) thì dùng luôn
  if (typeof comment?.canManage === "boolean") {
    return comment.canManage;
  }
  
  // 2. Lấy ID của người xem (ưu tiên từ activeEntity truyền vào)
  let viewerId = null;
  if (activeEntity) {
    viewerId = normalizeId(activeEntity?.entityAccountId || activeEntity?.EntityAccountId);
  }
  
  // Fallback: Lấy từ session nếu không có activeEntity
  if (!viewerId) {
    const sessionData = getSessionData();
    viewerId = normalizeId(sessionData?.entityAccountId);
  }
  
  if (!viewerId) {
    return false;
  }
  
  // 3. Quét tất cả các khả năng ID của chủ comment (do sự khác biệt format)
  const authorId = normalizeId(
    comment?.entityAccountId || 
    comment?.EntityAccountId || // Thêm check chữ Hoa
    comment?.authorEntityAccountId ||
    comment?.author?.entityAccountId ||
    comment?.author?.EntityAccountId ||
    comment?.authorId
  );
  
  if (!authorId) {
    return false;
  }
  
  return authorId === viewerId;
};

// Check if user can manage reply
// Chỉ sử dụng entityAccountId để so sánh quyền sở hữu
// ⚠️ QUAN TRỌNG: Nhận activeEntity từ props để tránh lệch pha format GUID
// ⚠️ QUAN TRỌNG: Quét tất cả các khả năng ID của chủ Reply (do sự khác biệt format)
export const canManageReply = (reply, activeEntity = null) => {
  // 1. Nếu Backend đã tính sẵn quyền (canManage: true) thì dùng luôn
  if (typeof reply?.canManage === "boolean") {
    return reply.canManage;
  }
  
  // 2. Lấy ID của người xem (ưu tiên từ activeEntity truyền vào)
  let viewerId = null;
  if (activeEntity) {
    viewerId = normalizeId(activeEntity?.entityAccountId || activeEntity?.EntityAccountId);
  }
  
  // Fallback: Lấy từ session nếu không có activeEntity
  if (!viewerId) {
    const sessionData = getSessionData();
    viewerId = normalizeId(sessionData?.entityAccountId);
  }
  
  if (!viewerId) {
    return false;
  }
  
  // 3. Quét tất cả các khả năng ID của chủ Reply (do sự khác biệt format)
  const authorId = normalizeId(
    reply?.entityAccountId || 
    reply?.EntityAccountId || // Thêm check chữ Hoa
    reply?.author?.entityAccountId || 
    reply?.authorEntityAccountId ||
    reply?.author?.EntityAccountId ||
    reply?.authorId
  );
  
  if (!authorId) {
    return false;
  }
  
  return authorId === viewerId;
};

