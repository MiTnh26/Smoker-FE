import { useState, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { 
  getMediaById, 
  getMediaByUrl,
  getMediaDetail,
  getMediaDetailByUrl,
  likeMedia,
  unlikeMedia,
  addMediaComment,
  updateMediaComment,
  deleteMediaComment,
  likeMediaComment,
  unlikeMediaComment,
  addMediaCommentReply,
  addMediaReplyToReply,
  updateMediaReply,
  deleteMediaReply,
  likeMediaReply,
  unlikeMediaReply,
} from "../../../../../api/postApi";
import ReadMoreText from "../../comment/ReadMoreText";
import { 
  isValidObjectId,
  getCurrentUser,
  createNavigateToProfile,
  getLikesCount,
  isLiked,
  parseComments,
  parseReplies,
  getSessionData,
  getMediaIdForApi as getMediaIdForApiUtil,
  getAvatarForAccount,
  getNameForAccount,
  formatTimeDisplay
} from "./utils";
import { normalizeId } from "../../comment/utils";
import MediaStatsBar from "./MediaStatsBar";
import MediaImageViewer from "./MediaImageViewer";
import MediaCommentSection from "./MediaCommentSection";
import CommentInputForm from "../../comment/CommentInputForm";

export default function ImageDetailModal({ 
  open, 
  onClose, 
  imageUrl, 
  postId, 
  mediaId,
  allImages = [],
  currentIndex = -1,
  onNavigateImage
}) {
  // Media state
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Comments state
  const [replyingTo, setReplyingTo] = useState(null); // { type: 'comment'|'reply', id: string, commentId: string, replyId?: string }
  const [editingComment, setEditingComment] = useState(null); // { type: 'comment'|'reply', id: string, commentId: string, replyId?: string }
  
  // Likes state
  const [mediaLiked, setMediaLiked] = useState(false);
  const [pendingLikes, setPendingLikes] = useState({}); // { [key]: boolean }
  
  // Input state
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState(""); // For reply input
  const [submitting, setSubmitting] = useState(false);
  
  // UI state
  const [viewingImage, setViewingImage] = useState(null); // Image URL for lightbox
  const [imageError, setImageError] = useState(false); // Image load error state
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null); // { type: 'comment'|'reply', id: string, commentId: string, replyId?: string }
  const [deleting, setDeleting] = useState(false);
  const hasLoadedRef = useRef(false);
  const replyInputRef = useRef(null);
  const navigate = useNavigate();
  const handleNavigateToProfile = createNavigateToProfile(navigate);
  const sessionData = useMemo(() => getSessionData(), []);

  // Track previous imageUrl/mediaId to detect changes
  const prevImageRef = useRef({ imageUrl: null, mediaId: null });
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  
  // Load media details when modal opens or image changes
  useEffect(() => {
    if (!open) {
      hasLoadedRef.current = false;
      prevImageRef.current = { imageUrl: null, mediaId: null };
      resetState();
      return;
    }
    
    // Check if image changed (navigation between images)
    const imageChanged = 
      prevImageRef.current.imageUrl !== imageUrl || 
      prevImageRef.current.mediaId !== mediaId;
    
    if (imageChanged) {
      hasLoadedRef.current = false; // Allow reload for new image
      prevImageRef.current = { imageUrl, mediaId };
    }
    
    // Load if not loaded yet or image changed
    if (!hasLoadedRef.current && (mediaId || imageUrl)) {
      hasLoadedRef.current = true;
      loadMediaDetails();
    }
  }, [open, mediaId, postId, imageUrl]);

  // Reset all state when modal closes
  const resetState = () => {
    setMedia(null);
    setCommentText("");
    setReplyText("");
    setError(null);
    setReplyingTo(null);
    setEditingComment(null);
    setViewingImage(null);
    setPendingLikes({});
    setImageError(false);
  };

  // Load media details
  const loadMediaDetails = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    setImageError(false);
    try {
      let response;
      // Sử dụng detail API để enrich comments với author info
      if (imageUrl) {
        try {
          // Ưu tiên dùng getMediaDetailByUrl để lấy đầy đủ thông tin comments với author info
          response = await getMediaDetailByUrl(isValidObjectId(postId) ? postId : undefined, imageUrl);
        } catch (err) {
          // Fallback to old API nếu detail API fail
          try {
            response = await getMediaByUrl(isValidObjectId(postId) ? postId : undefined, imageUrl);
          } catch {
            response = null;
          }
        }
        // Nếu không tìm được bằng URL, thử bằng mediaId
        if (!response && mediaId && isValidObjectId(mediaId)) {
          try {
            response = await getMediaDetail(mediaId);
          } catch {
            // Fallback to old API
            try {
              response = await getMediaById(mediaId);
            } catch {
              // ignore
            }
          }
        }
      } else if (mediaId && isValidObjectId(mediaId)) {
        try {
          // Ưu tiên dùng getMediaDetail để lấy đầy đủ thông tin comments với author info
          response = await getMediaDetail(mediaId);
        } catch {
          // Fallback to old API
          try {
            response = await getMediaById(mediaId);
          } catch {
            // ignore
          }
        }
      } else {
        throw new Error("Missing mediaId or postId+url");
      }

      const mediaData = response?.data?.data || response?.data;
      setMedia(mediaData);
      
      // Check if current user liked the media using sessionData to get entityAccountId
      const sessionData = getSessionData();
      if (sessionData && mediaData?.likes) {
        const { activeEntity } = sessionData;
        // Use activeEntity to check like state (includes entityAccountId for role-based likes)
        setMediaLiked(isLiked(mediaData.likes, activeEntity));
      } else {
        // Fallback to getCurrentUser if sessionData not available
      const currentUser = getCurrentUser();
      if (currentUser && mediaData?.likes) {
        setMediaLiked(isLiked(mediaData.likes, currentUser));
        }
      }
    } catch (err) {
      console.error("[IMAGE_MODAL] Error loading media:", err);
      setError("Không thể tải chi tiết media");
      // Still show the image even if details fail
      setMedia({ url: imageUrl, caption: "", likes: {}, comments: {} });
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Parse comments from media.comments
  const parsedComments = useMemo(() => {
    return parseComments(media, "newest");
  }, [media]);

  // ⚠️ TỐI ƯU: Ưu tiên dùng stats.commentCount từ backend (đã bao gồm replies)
  // Fallback về tính toán thủ công nếu không có
  const commentsCount = useMemo(() => {
    if (media?.stats?.commentCount !== undefined) {
      return media.stats.commentCount;
    }
    // Fallback: tính tổng comments + replies
    let total = parsedComments.length;
    parsedComments.forEach(comment => {
      if (comment.replies && Array.isArray(comment.replies)) {
        total += comment.replies.length;
      }
    });
    return total;
  }, [media?.stats?.commentCount, parsedComments]);

  // Author info for media (fallback to session if missing)
  const {
    authorAvatar,
    authorName,
    authorEntityAccountId,
    authorEntityId,
    authorEntityType,
  } = useMemo(() => {
    const mediaAuthor = media?.author || {};
    const entityAccountId =
      media?.authorEntityAccountId ||
      media?.entityAccountId ||
      mediaAuthor?.entityAccountId ||
      mediaAuthor?.EntityAccountId ||
      media?.authorEntityAccountId ||
      null;
    const entityId =
      media?.authorEntityId ||
      media?.entityId ||
      mediaAuthor?.entityId ||
      mediaAuthor?.id ||
      null;
    const entityType =
      media?.authorEntityType ||
      media?.entityType ||
      mediaAuthor?.entityType ||
      null;
    const accountId = media?.accountId || mediaAuthor?.id || null;

    return {
      authorAvatar: getAvatarForAccount(accountId, entityAccountId, media?.authorAvatar || mediaAuthor?.avatar),
      authorName: getNameForAccount(accountId, entityAccountId, media?.authorName || mediaAuthor?.name || mediaAuthor?.userName),
      authorEntityAccountId: entityAccountId,
      authorEntityId: entityId,
      authorEntityType: entityType,
    };
  }, [media]);

  const handleAuthorClick = () => {
    if (!authorEntityAccountId && !authorEntityId) return;
    const viewer =
      sessionData?.activeEntity ||
      sessionData?.account ||
      sessionData?.currentUser ||
      null;
    const viewerEntityAccountId =
      viewer?.EntityAccountId || viewer?.entityAccountId || viewer?.entity_account_id || null;

    if (
      viewerEntityAccountId &&
      authorEntityAccountId &&
      String(viewerEntityAccountId).toLowerCase() === String(authorEntityAccountId).toLowerCase()
    ) {
      navigate("/own/profile");
      return;
    }

    handleNavigateToProfile(authorEntityId || authorEntityAccountId, authorEntityType, authorEntityAccountId);
  };

  // Get media ID for API calls
  const getMediaIdForApi = () => {
    return getMediaIdForApiUtil(media, mediaId);
  };

  const handleAddCommentViaForm = async (content) => {
    const mediaIdForApi = getMediaIdForApi();
    if (!mediaIdForApi || !content?.trim()) return false;
    const sessionData = getSessionData();
    if (!sessionData) return false;

    const { activeEntity, typeRole, entityAccountId, entityId, entityType } = sessionData;

    setSubmitting(true);
    try {
      const response = await addMediaComment(mediaIdForApi, {
        content: content.trim(),
        typeRole: typeRole,
        entityAccountId: entityAccountId || activeEntity?.EntityAccountId || activeEntity?.entityAccountId,
        entityId: entityId || activeEntity?.id,
        entityType: entityType || typeRole
      });
      
      // ⚠️ TỐI ƯU: Optimistic UI - cập nhật media.comments trực tiếp thay vì reload
      if (response?.success || response?.data?.success) {
        const normalizedEntityAccountId = normalizeId(entityAccountId || activeEntity?.EntityAccountId || activeEntity?.entityAccountId);
        const now = new Date().toISOString();
        
        // Tạo comment object mới với đầy đủ thông tin
        const newCommentObj = {
          id: response?.data?.commentId || response?.data?.id || `temp-${Date.now()}`,
          accountId: entityId || activeEntity?.id,
          content: content.trim(),
          images: "",
          likes: 0,
          likesObject: {},
          likedByViewer: false,
          canManage: true,
          typeRole: entityType || typeRole,
          replies: [],
          createdAt: now,
          updatedAt: now,
          authorName: activeEntity?.name || activeEntity?.userName || "User",
          authorAvatar: activeEntity?.avatar || null,
          // ⚠️ QUAN TRỌNG: Set entityAccountId để canManageComment có thể tìm thấy
          entityAccountId: normalizedEntityAccountId ? String(normalizedEntityAccountId).trim() : null,
          authorEntityAccountId: normalizedEntityAccountId ? String(normalizedEntityAccountId).trim() : null,
          authorEntityType: entityType || typeRole,
          authorEntityId: entityId
        };
        
        // Cập nhật media.comments trực tiếp (optimistic update) - thêm vào đầu
        setMedia(prev => {
          if (!prev) return prev;
          const currentComments = prev.comments || {};
          const commentsMap = currentComments instanceof Map 
            ? new Map(currentComments) 
            : (typeof currentComments === 'object' && !Array.isArray(currentComments)
              ? new Map(Object.entries(currentComments))
              : new Map());
          
          // ⚠️ TỐI ƯU: Thêm comment mới vào đầu (giống TikTok)
          commentsMap.set(newCommentObj.id, newCommentObj);
          
          return {
            ...prev,
            comments: commentsMap,
            stats: {
              ...prev.stats,
              commentCount: (prev.stats?.commentCount || 0) + 1
            }
          };
        });
      }
      
      return response?.success || response?.data?.success || false;
    } catch (err) {
      console.error("[IMAGE_MODAL] Error adding comment:", err);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Like/Unlike Media
  const handleToggleMediaLike = async () => {
    const mediaIdForApi = getMediaIdForApi();
    if (!mediaIdForApi) return;
    
    const sessionData = getSessionData();
    if (!sessionData) return;

    const { typeRole, entityAccountId, entityId, entityType, activeEntity } = sessionData;
    
    // Double-check like state from media object to ensure accuracy
    let wasLiked = mediaLiked;
    if (media?.likes && activeEntity) {
      const actualLiked = isLiked(media.likes, activeEntity);
      if (actualLiked !== mediaLiked) {
        console.warn("[IMAGE_MODAL] Like state mismatch, syncing:", { mediaLiked, actualLiked });
        setMediaLiked(actualLiked);
        wasLiked = actualLiked;
      }
    }
    // Optimistic update
    setMediaLiked(!wasLiked);
    
    // Optimistic update likes count in media object
    // Backend uses entityAccountId as key, so we need to use the same
    if (media) {
      const currentLikes = media.likes || {};
      const likeKey = entityAccountId ? String(entityAccountId) : null;
      
      if (likeKey) {
        if (currentLikes instanceof Map) {
          const newLikes = new Map(currentLikes);
        if (wasLiked) {
            newLikes.delete(likeKey);
          } else {
            newLikes.set(likeKey, {
              accountId: entityId,
              entityAccountId: entityAccountId,
              entityId: entityId,
              entityType: entityType,
              TypeRole: typeRole,
              createdAt: new Date()
            });
          }
          setMedia({ ...media, likes: newLikes });
        } else if (typeof currentLikes === 'object') {
          const newLikes = { ...currentLikes };
          if (wasLiked) {
            delete newLikes[likeKey];
        } else {
            newLikes[likeKey] = {
              accountId: entityId,
              entityAccountId: entityAccountId,
              entityId: entityId,
              entityType: entityType,
              TypeRole: typeRole,
              createdAt: new Date()
            };
          }
          setMedia({ ...media, likes: newLikes });
        }
      }
    }
    
    try {
      if (wasLiked) {
        await unlikeMedia(mediaIdForApi, { entityAccountId });
      } else {
        await likeMedia(mediaIdForApi, { 
          typeRole: typeRole,
          entityAccountId: entityAccountId,
          entityId: entityId,
          entityType: entityType || typeRole
        });
      }
      // Reload media to sync with server (without showing loading)
      await loadMediaDetails(false);
    } catch (err) {
      console.error("[IMAGE_MODAL] Error toggling media like:", err);
      const errorMessage = err?.response?.data?.message || err.message;
      console.warn("[IMAGE_MODAL] Like error details:", {
        wasLiked,
        errorMessage,
        entityAccountId,
        mediaId: mediaIdForApi
      });
      
      // If error is "Already liked", reload media to sync state
      if (errorMessage === "Already liked" || errorMessage?.includes("Already liked")) {
        console.log("[IMAGE_MODAL] Already liked - reloading media to sync state");
        await loadMediaDetails(false);
        return;
      }
      
      // Rollback for other errors
      setMediaLiked(wasLiked);
      if (media) {
        const currentLikes = media.likes || {};
        const likeKey = entityAccountId ? String(entityAccountId) : null;
        
        if (likeKey) {
          if (currentLikes instanceof Map) {
            const newLikes = new Map(currentLikes);
          if (wasLiked) {
            // Restore like
              newLikes.set(likeKey, {
                accountId: entityId,
                entityAccountId: entityAccountId,
                entityId: entityId,
                entityType: entityType,
                TypeRole: typeRole,
                createdAt: new Date()
              });
          } else {
            // Remove like
              newLikes.delete(likeKey);
            }
            setMedia({ ...media, likes: newLikes });
          } else if (typeof currentLikes === 'object') {
            const newLikes = { ...currentLikes };
            if (wasLiked) {
              // Restore like
              newLikes[likeKey] = {
                accountId: entityId,
                entityAccountId: entityAccountId,
                entityId: entityId,
                entityType: entityType,
                TypeRole: typeRole,
                createdAt: new Date()
              };
            } else {
              // Remove like
              delete newLikes[likeKey];
            }
            setMedia({ ...media, likes: newLikes });
          }
        }
      }
    }
  };

  // Add Comment
  const handleAddComment = async () => {
    if (!commentText.trim() || submitting) return;
    
    const mediaIdForApi = getMediaIdForApi();
    if (!mediaIdForApi) return;
    
    const sessionData = getSessionData();
    if (!sessionData) return;

    const { activeEntity, typeRole, entityAccountId, entityId, entityType } = sessionData;
    
    setSubmitting(true);
    const text = commentText.trim();
    setCommentText("");
    
    try {
      await addMediaComment(mediaIdForApi, {
        content: text,
        typeRole: typeRole,
        entityAccountId: entityAccountId,
        entityId: entityId,
        entityType: entityType,
        authorName: activeEntity?.name || activeEntity?.userName || activeEntity?.EntityName || null,
        authorAvatar: activeEntity?.avatar || activeEntity?.profilePicture || activeEntity?.EntityAvatar || null
      });
      
      // Reload media to get updated comments (without showing loading)
      try {
        await loadMediaDetails(false);
      } catch (error_) {
        console.warn("[IMAGE_MODAL] Failed to reload media after comment, but comment was added:", error_);
      }
    } catch (err) {
      console.error("[IMAGE_MODAL] Error adding comment:", err);
      alert(err.response?.data?.message || err.message || "Không thể đăng bình luận. Vui lòng thử lại.");
      setCommentText(text); // Restore text on error
    } finally {
      setSubmitting(false);
    }
  };

  // Like/Unlike Comment
  const handleToggleCommentLike = async (commentId, comment) => {
    const key = `comment-${commentId}`;
    if (pendingLikes[key]) return;
    
    const mediaIdForApi = getMediaIdForApi();
    if (!mediaIdForApi) return;
    
    const sessionData = getSessionData();
    if (!sessionData) return;

    const { typeRole, entityAccountId, activeEntity } = sessionData;
    
    // Double-check like state from comment object to ensure accuracy
    let wasLiked = isLiked(comment.likes, activeEntity || sessionData);
    if (comment?.likes && activeEntity) {
      const actualLiked = isLiked(comment.likes, activeEntity);
      if (actualLiked !== wasLiked) {
        console.warn("[IMAGE_MODAL] Comment like state mismatch, syncing:", { wasLiked, actualLiked });
        wasLiked = actualLiked;
      }
    }
    
    setPendingLikes(prev => ({ ...prev, [key]: true }));
    
    try {
      if (wasLiked) {
        await unlikeMediaComment(mediaIdForApi, commentId, { entityAccountId });
      } else {
        await likeMediaComment(mediaIdForApi, commentId, { typeRole, entityAccountId });
      }
      // Reload media to sync (without showing loading)
      await loadMediaDetails(false);
    } catch (err) {
      console.error("[IMAGE_MODAL] Error toggling comment like:", err);
      const errorMessage = err?.response?.data?.message || err.message;
      
      // If error is "Already liked", reload media to sync state
      if (errorMessage === "Already liked" || errorMessage?.includes("Already liked")) {
        console.log("[IMAGE_MODAL] Already liked - reloading media to sync state");
        await loadMediaDetails(false);
      }
    } finally {
      setPendingLikes(prev => ({ ...prev, [key]: false }));
    }
  };

  // Like/Unlike Reply
  const handleToggleReplyLike = async (commentId, replyId, reply) => {
    const key = `reply-${commentId}-${replyId}`;
    if (pendingLikes[key]) return;
    
    const mediaIdForApi = getMediaIdForApi();
    if (!mediaIdForApi) return;
    
    const sessionData = getSessionData();
    if (!sessionData) return;

    const { typeRole, entityAccountId, activeEntity } = sessionData;
    
    // Double-check like state from reply object to ensure accuracy
    let wasLiked = isLiked(reply.likes, activeEntity || sessionData);
    if (reply?.likes && activeEntity) {
      const actualLiked = isLiked(reply.likes, activeEntity);
      if (actualLiked !== wasLiked) {
        console.warn("[IMAGE_MODAL] Reply like state mismatch, syncing:", { wasLiked, actualLiked });
        wasLiked = actualLiked;
      }
    }
    
    setPendingLikes(prev => ({ ...prev, [key]: true }));
    
    try {
      if (wasLiked) {
        await unlikeMediaReply(mediaIdForApi, commentId, replyId, { entityAccountId });
      } else {
        await likeMediaReply(mediaIdForApi, commentId, replyId, { typeRole, entityAccountId });
      }
      // Reload media to sync (without showing loading)
      await loadMediaDetails(false);
    } catch (err) {
      console.error("[IMAGE_MODAL] Error toggling reply like:", err);
      const errorMessage = err?.response?.data?.message || err.message;
      
      // If error is "Already liked", reload media to sync state
      if (errorMessage === "Already liked" || errorMessage?.includes("Already liked")) {
        console.log("[IMAGE_MODAL] Already liked - reloading media to sync state");
        await loadMediaDetails(false);
      }
    } finally {
      setPendingLikes(prev => ({ ...prev, [key]: false }));
    }
  };

  // Show Reply Input
  const handleShowReplyInput = (commentId, replyId = null) => {
    setReplyingTo({ type: replyId ? 'reply' : 'comment', id: replyId || commentId, commentId, replyId });
    setReplyText("");
    // Focus input after render
    setTimeout(() => {
      replyInputRef.current?.focus();
    }, 100);
  };

  // Add Reply
  const handleAddReply = async () => {
    if (!replyText.trim() || submitting || !replyingTo) return;
    
    const mediaIdForApi = getMediaIdForApi();
    if (!mediaIdForApi) return;
    
    const sessionData = getSessionData();
    if (!sessionData) return;

    const { activeEntity, typeRole, entityAccountId, entityId, entityType } = sessionData;
    
    setSubmitting(true);
    const text = replyText.trim();
    const { commentId, replyId, type } = replyingTo;
    setReplyText("");
    setReplyingTo(null);
    
    try {
      const replyData = {
        content: text,
        typeRole: typeRole,
        entityAccountId: entityAccountId,
        entityId: entityId,
        entityType: entityType,
        authorName: activeEntity?.name || activeEntity?.userName || activeEntity?.EntityName || null,
        authorAvatar: activeEntity?.avatar || activeEntity?.profilePicture || activeEntity?.EntityAvatar || null
      };

      if (type === 'reply' && replyId) {
        // Reply to reply (nested)
        await addMediaReplyToReply(mediaIdForApi, commentId, replyId, replyData);
      } else {
        // Reply to comment
        await addMediaCommentReply(mediaIdForApi, commentId, replyData);
      }
      // Reload media to get updated comments (without showing loading)
      await loadMediaDetails(false);
    } catch (err) {
      console.error("[IMAGE_MODAL] Error adding reply:", err);
      setReplyText(text); // Restore text on error
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Comment/Reply
  const handleStartEdit = (type, id, commentId, replyId = null) => {
    setEditingComment({ type, id, commentId, replyId });
    // Set text based on type
    const comments = parsedComments;
    if (type === 'comment') {
      const comment = comments.find(c => c.id === id);
      if (comment) setCommentText(comment.content || "");
    } else {
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        const replies = parseReplies(comment);
        const reply = replies.find(r => r.id === id);
        if (reply) setReplyText(reply.content || "");
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingComment || submitting) return;
    
    const mediaIdForApi = getMediaIdForApi();
    if (!mediaIdForApi) return;
    
    setSubmitting(true);
    const { type, id, commentId } = editingComment;
    const text = type === 'comment' ? commentText.trim() : replyText.trim();
    
    if (!text) {
      setSubmitting(false);
      setEditingComment(null);
      return;
    }
    
    try {
      if (type === 'comment') {
        await updateMediaComment(mediaIdForApi, id, { content: text });
      } else {
        await updateMediaReply(mediaIdForApi, commentId, id, { content: text });
      }
      setEditingComment(null);
    setCommentText("");
      setReplyText("");
      // Reload media (without showing loading)
      await loadMediaDetails(false);
    } catch (err) {
      console.error("[IMAGE_MODAL] Error updating comment/reply:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Comment/Reply - Show confirmation modal
  const handleDelete = (type, id, commentId, replyId = null) => {
    setDeleteConfirmModal({ type, id, commentId, replyId });
  };
  
  // Confirm delete after modal confirmation
  const confirmDelete = async () => {
    if (!deleteConfirmModal) return;
    
    const { type, id, commentId } = deleteConfirmModal;
    const mediaIdForApi = getMediaIdForApi();
    if (!mediaIdForApi) {
      setDeleteConfirmModal(null);
      return;
    }
    
    setDeleting(true);
    try {
      if (type === 'comment') {
        await deleteMediaComment(mediaIdForApi, id);
      } else {
        await deleteMediaReply(mediaIdForApi, commentId, id);
      }
      // Reload media
      await loadMediaDetails();
    } catch (err) {
      console.error("[IMAGE_MODAL] Error deleting comment/reply:", err);
      alert(err.response?.data?.message || err.message || "Không thể xóa. Vui lòng thử lại.");
    } finally {
      setDeleting(false);
      setDeleteConfirmModal(null);
    }
  };


  // Handle close
  const handleClose = () => {
    resetState();
    onClose?.();
  };
  
  // Navigation helpers
  const hasNext = allImages.length > 0 && currentIndex >= 0 && currentIndex < allImages.length - 1;
  const hasPrevious = allImages.length > 0 && currentIndex > 0;
  
  const handleNext = () => {
    if (hasNext && onNavigateImage) {
      onNavigateImage(currentIndex + 1);
    }
  };
  
  const handlePrevious = () => {
    if (hasPrevious && onNavigateImage) {
      onNavigateImage(currentIndex - 1);
    }
  };
  
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && open) {
        handleClose();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
    return () => {};
  }, [open]);
  
  // Handle keyboard navigation (Arrow keys)
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' && hasNext && onNavigateImage) {
        onNavigateImage(currentIndex + 1);
      } else if (e.key === 'ArrowLeft' && hasPrevious && onNavigateImage) {
        onNavigateImage(currentIndex - 1);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, hasNext, hasPrevious, currentIndex, onNavigateImage]);

  if (!open) return null;
  const mediaLikesCount = getLikesCount(media?.likes);

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/90 flex items-stretch justify-center p-0 overflow-auto"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      tabIndex={-1}
    >
      <div
        className="bg-card rounded-none w-full h-full max-w-[100vw] max-h-[100vh] flex flex-col relative overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white border-none w-10 h-10 rounded-full text-2xl cursor-pointer z-10 flex items-center justify-center transition-all duration-200 hover:scale-110"
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="flex flex-col md:flex-row h-full max-h-full overflow-hidden gap-0">
          {/* Left: Image Section */}
          <div className="w-full h-[60vh] md:h-full md:flex-1 flex items-center justify-center bg-black min-w-0 max-w-full relative z-[1]">
            {/* Previous Button */}
            {hasPrevious && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white border-none w-10 h-10 md:w-12 md:h-12 rounded-full cursor-pointer z-20 flex items-center justify-center transition-all duration-200 hover:scale-110"
                onClick={handlePrevious}
                aria-label="Previous image"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            <MediaImageViewer
              imageUrl={imageUrl}
              media={media}
              loading={loading}
              error={error}
              imageError={imageError}
              onImageError={() => setImageError(true)}
            />
            
            {/* Next Button */}
            {hasNext && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white border-none w-10 h-10 md:w-12 md:h-12 rounded-full cursor-pointer z-20 flex items-center justify-center transition-all duration-200 hover:scale-110"
                onClick={handleNext}
                aria-label="Next image"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            
            {/* Image Counter */}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm z-20">
                {currentIndex + 1} / {allImages.length}
              </div>
            )}
          </div>

          {/* Right: Info Section */}
          <div className="w-full md:w-[360px] max-w-full md:max-w-[360px] min-w-0 md:min-w-[320px] flex flex-col overflow-y-auto overflow-x-hidden bg-card border-l border-border/40 max-h-[40vh] md:max-h-full relative">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Đang tải thông tin...</div>
            ) : error && !media ? (
              <div className="p-8 text-center text-destructive">{error}</div>
            ) : (
              <>
                {/* Author block */}
                <div className="p-6 border-b border-border/50 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAuthorClick}
                    className="bg-transparent border-none p-0 flex items-center gap-3 cursor-pointer text-left"
                    aria-label="Author profile"
                  >
                    <img
                      src={authorAvatar}
                      alt={authorName}
                      className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground leading-tight">{authorName}</span>
                      {media?.createdAt && (
                        <span className="text-xs text-muted-foreground">
                          {formatTimeDisplay(media.createdAt)}
                        </span>
                      )}
                    </div>
                  </button>
                </div>

                {/* Caption Header - Chỉ hiển thị nếu media có caption riêng (không phải từ post.content) */}
                {media?.caption && media.caption.trim() && (
                  <div className="p-6 border-b border-border/50">
                    <ReadMoreText 
                      text={media.caption.trim()} 
                      maxLines={3}
                    />
                  </div>
                )}

                {/* Stats Bar */}
                <MediaStatsBar
                  mediaLiked={mediaLiked}
                  mediaLikesCount={mediaLikesCount}
                  commentsCount={commentsCount}
                  sharesCount={media?.shares || 0}
                  onLikeClick={handleToggleMediaLike}
                  onShareClick={null}
                  disabled={!getMediaIdForApi()}
                  shareButtonRef={null}
                />

                {/* Comments Section */}
                <MediaCommentSection
                  comments={parsedComments}
                  commentsCount={commentsCount}
                  commentText={commentText}
                  setCommentText={setCommentText}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  editingComment={editingComment}
                  replyingTo={replyingTo}
                  pendingLikes={pendingLikes}
                  submitting={submitting}
                  onAddComment={handleAddComment}
                  onToggleCommentLike={handleToggleCommentLike}
                  onToggleReplyLike={handleToggleReplyLike}
                  onShowReplyInput={handleShowReplyInput}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => {
                    setEditingComment(null);
                    setCommentText("");
                    setReplyText("");
                  }}
                  onDelete={handleDelete}
                  onNavigateToProfile={handleNavigateToProfile}
                  onViewImage={setViewingImage}
                  replyInputRef={replyInputRef}
                  onAddReply={handleAddReply}
                  getMediaIdForApi={getMediaIdForApi}
                  customInput={
                    <CommentInputForm
                      postId={postId || ""}
                      onCommentAdded={() => loadMediaDetails(false)}
                      onSubmitOverride={handleAddCommentViaForm}
                      placeholder="Viết bình luận..."
                      disabled={!getMediaIdForApi()}
                    />
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-[2000] bg-black/95 flex items-center justify-center p-4 md:p-8"
          onClick={() => setViewingImage(null)}
        >
          <img 
            src={viewingImage} 
            alt="Full size" 
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white border-none w-10 h-10 rounded-full text-2xl cursor-pointer z-10 flex items-center justify-center transition-all duration-200 hover:scale-110"
            onClick={() => setViewingImage(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div
          className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => !deleting && setDeleteConfirmModal(null)}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Xác nhận xóa
              </h3>
              <button
                onClick={() => !deleting && setDeleteConfirmModal(null)}
                className="p-1 rounded-full transition-colors duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                disabled={deleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-foreground">
              Bạn có chắc chắn muốn xóa {deleteConfirmModal.type === 'comment' ? 'bình luận' : 'phản hồi'} này?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-muted/30 text-foreground border border-border hover:bg-muted/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-danger text-white hover:bg-danger/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ImageDetailModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  imageUrl: PropTypes.string.isRequired,
  postId: PropTypes.string,
  mediaId: PropTypes.string,
  allImages: PropTypes.array,
  currentIndex: PropTypes.number,
  onNavigateImage: PropTypes.func,
};
