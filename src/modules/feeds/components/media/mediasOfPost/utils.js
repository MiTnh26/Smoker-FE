// Helper functions for ImageDetailModal

export const isValidObjectId = (id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);

// Format time display helper (giống CommentSection)
export const formatTimeDisplay = (value) => {
  try {
    const d = value ? new Date(value) : new Date();
    if (isNaN(d.getTime())) return new Date().toLocaleString('vi-VN');
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

// Get current user from session
export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem("session");
    const session = raw ? JSON.parse(raw) : null;
    return session?.activeEntity || session?.account || null;
  } catch {
    return null;
  }
};

// Get avatar for account (giống CommentSection)
export const getAvatarForAccount = (accountId, entityAccountId, authorAvatar) => {
  // Ưu tiên authorAvatar từ backend
  if (authorAvatar) return authorAvatar;
  
  // Fallback: thử lấy từ session nếu có
  try {
    const raw = localStorage.getItem("session");
    const session = raw ? JSON.parse(raw) : null;
    if (session) {
      // Tìm trong activeEntity hoặc account
      const entity = session.activeEntity || session.account;
      if (entity) {
        // Nếu accountId khớp với current user
        if (String(entity.id || entity.Id) === String(accountId)) {
          return entity.avatar || entity.profilePicture || entity.EntityAvatar || null;
        }
      }
    }
  } catch (e) {
    // Ignore
  }
  
  // Default avatar
  return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlNWU3ZWIiLz48cGF0aCBkPSJNMTIgMTRDMTUuMzEzNyAxNCAxOCAxNi42ODYzIDE4IDIwSDEwQzEwIDE2LjY4NjMgMTIuNjg2MyAxNCAxMiAxNFoiIGZpbGw9IiM5Y2EzYWYiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjgiIHI9IjQiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=";
};

// Get name for account (giống CommentSection)
export const getNameForAccount = (accountId, entityAccountId, authorName) => {
  // Ưu tiên authorName từ backend
  if (authorName) return authorName;
  
  // Fallback: thử lấy từ session nếu có
  try {
    const raw = localStorage.getItem("session");
    const session = raw ? JSON.parse(raw) : null;
    if (session) {
      // Tìm trong activeEntity hoặc account
      const entity = session.activeEntity || session.account;
      if (entity) {
        // Nếu accountId khớp với current user
        if (String(entity.id || entity.Id) === String(accountId)) {
          return entity.name || entity.userName || entity.EntityName || "Người dùng";
        }
      }
    }
  } catch (e) {
    // Ignore
  }
  
  return "Người dùng";
};

// Navigate to profile helper
export const createNavigateToProfile = (navigate) => {
  return (entityId, entityType, entityAccountId) => {
    if (!entityId && !entityAccountId) return;
    
    if (entityType === 'BarPage') {
      navigate(`/bar/${entityId || entityAccountId}`);
    } else if (entityType === 'BusinessAccount') {
      navigate(`/profile/${entityAccountId || entityId}`);
    } else {
      navigate(`/profile/${entityAccountId || entityId}`);
    }
  };
};

// Calculate likes count
export const getLikesCount = (likesObj) => {
  if (!likesObj) return 0;
  if (likesObj instanceof Map) return likesObj.size;
  if (Array.isArray(likesObj)) return likesObj.length;
  if (typeof likesObj === 'object') return Object.keys(likesObj).length;
  return 0;
};

// Check if current user liked
export const isLiked = (likesObj, currentUser) => {
  if (!currentUser || !likesObj) return false;
  const userId = String(currentUser.id);
  
  if (likesObj instanceof Map) {
    for (const [, likeObj] of likesObj.entries()) {
      if (likeObj && String(likeObj.accountId) === userId) return true;
    }
    return false;
  }
  if (Array.isArray(likesObj)) {
    return likesObj.some(l => l && String(l.accountId) === userId);
  }
  if (typeof likesObj === 'object') {
    return Object.values(likesObj).some(l => l && String(l.accountId) === userId);
  }
  return false;
};

// Parse comments from media.comments
export const parseComments = (media, sortOrder = "newest") => {
  if (!media?.comments) return [];
  const c = media.comments;
  let comments = [];
  
  if (c instanceof Map) {
    comments = Array.from(c.entries()).map(([k, v]) => {
      const comment = { 
        id: String(k), 
        ...v,
        _id: v._id || k
      };
      // Đảm bảo giữ lại tất cả các field từ v
      if (v && typeof v === 'object') {
        Object.assign(comment, v);
      }
      return comment;
    });
  } else if (Array.isArray(c)) {
    comments = c.map((v, idx) => {
      const comment = { 
        id: String(v?._id || idx), 
        ...v,
        _id: v._id || idx
      };
      if (v && typeof v === 'object') {
        Object.assign(comment, v);
      }
      return comment;
    });
  } else if (typeof c === 'object') {
    comments = Object.entries(c).map(([k, v]) => {
      const comment = { 
        id: String(k), 
        ...v,
        _id: v._id || k
      };
      // Đảm bảo giữ lại tất cả các field từ v
      if (v && typeof v === 'object') {
        Object.assign(comment, v);
      }
      return comment;
    });
  }
  
  // Sort comments
  const sorted = [...comments].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
    const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
    return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
  });
  
  return sorted;
};

// Parse replies from comment.replies
export const parseReplies = (comment) => {
  if (!comment?.replies) return [];
  const r = comment.replies;
  let replies = [];
  
  if (r instanceof Map) {
    replies = Array.from(r.entries()).map(([k, v]) => ({ 
      id: String(k), 
      ...v,
      _id: v._id || k
    }));
  } else if (Array.isArray(r)) {
    replies = r.map((v, idx) => ({ 
      id: String(v?._id || idx), 
      ...v,
      _id: v._id || idx
    }));
  } else if (typeof r === 'object') {
    replies = Object.entries(r).map(([k, v]) => ({ 
      id: String(k), 
      ...v,
      _id: v._id || k
    }));
  }
  
  // Sort replies by time
  return replies.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
    const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
    return timeA - timeB; // Oldest first for replies
  });
};

// Normalize type role
export const normalizeTypeRole = (activeEntity) => {
  const raw = (activeEntity?.role || "").toString().toLowerCase();
  if (raw === "bar") return "BarPage";
  if (raw === "dj" || raw === "dancer") return "BusinessAccount";
  return "Account";
};

// Get session data with all necessary fields for API calls
export const getSessionData = () => {
  try {
    const raw = localStorage.getItem("session");
    const session = raw ? JSON.parse(raw) : null;
    if (!session) return null;
    
    const currentUser = session?.account;
    const activeEntity = session?.activeEntity || currentUser;
    if (!activeEntity) return null;
    
    const typeRole = normalizeTypeRole(activeEntity);
    const entityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
    const entityId = activeEntity?.entityId || session?.account?.id;
    const entityType = typeRole;
    
    return {
      session,
      currentUser,
      activeEntity,
      typeRole,
      entityAccountId,
      entityId,
      entityType
    };
  } catch (e) {
    return null;
  }
};

// Get media ID for API calls
export const getMediaIdForApi = (media, mediaId) => {
  if (media?._id) return media._id;
  if (mediaId && isValidObjectId(mediaId)) return mediaId;
  return null;
};

