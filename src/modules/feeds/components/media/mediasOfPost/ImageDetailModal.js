import { useState, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { 
  getMediaById, 
  getMediaByUrl,
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
  trackMediaShare
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
  getMediaIdForApi as getMediaIdForApiUtil
} from "./utils";
import MediaStatsBar from "./MediaStatsBar";
import MediaImageViewer from "./MediaImageViewer";
import MediaCommentSection from "./MediaCommentSection";

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
  
  const hasLoadedRef = useRef(false);
  const replyInputRef = useRef(null);
  const navigate = useNavigate();
  const handleNavigateToProfile = createNavigateToProfile(navigate);

  // Track previous imageUrl/mediaId to detect changes
  const prevImageRef = useRef({ imageUrl: null, mediaId: null });
  
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
      const tryByUrl = async () => {
        if (!imageUrl) return null;
        try {
          return await getMediaByUrl(isValidObjectId(postId) ? postId : undefined, imageUrl);
        } catch (err) {
          return null;
        }
      };

      // Prefer fetch by URL first, then try by ID
      if (imageUrl) {
        response = await tryByUrl();
        if (!response && mediaId && isValidObjectId(mediaId)) {
          try {
            response = await getMediaById(mediaId);
          } catch {
            // ignore
          }
        }
      } else if (mediaId && isValidObjectId(mediaId)) {
        try {
          response = await getMediaById(mediaId);
        } catch {
          // ignore
        }
      } else {
        throw new Error("Missing mediaId or postId+url");
      }

      const mediaData = response?.data?.data || response?.data;
      setMedia(mediaData);
      
      // Check if current user liked the media
      const currentUser = getCurrentUser();
      if (currentUser && mediaData?.likes) {
        setMediaLiked(isLiked(mediaData.likes, currentUser));
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

  // Get media ID for API calls
  const getMediaIdForApi = () => {
    return getMediaIdForApiUtil(media, mediaId);
  };

  // Like/Unlike Media
  const handleToggleMediaLike = async () => {
    const mediaIdForApi = getMediaIdForApi();
    if (!mediaIdForApi) return;
    
    const sessionData = getSessionData();
    if (!sessionData) return;

    const { currentUser, activeEntity, typeRole } = sessionData;
    
    const wasLiked = mediaLiked;
    // Optimistic update
    setMediaLiked(!wasLiked);
    
    // Optimistic update likes count in media object
    if (media) {
      const currentLikes = media.likes || {};
      const currentUser = getCurrentUser();
      if (currentUser) {
        const userId = String(currentUser.id || currentUser._id || "").toLowerCase().trim();
        if (wasLiked) {
          // Unlike: remove from likes
          const newLikes = { ...currentLikes };
          delete newLikes[userId];
          setMedia({ ...media, likes: newLikes });
        } else {
          // Like: add to likes
          setMedia({ ...media, likes: { ...currentLikes, [userId]: true } });
        }
      }
    }
    
    try {
      if (wasLiked) {
        await unlikeMedia(mediaIdForApi);
      } else {
        await likeMedia(mediaIdForApi, { 
          accountId: currentUser?.id || activeEntity?.id,
          typeRole: typeRole
        });
      }
      // Reload media to sync with server (without showing loading)
      await loadMediaDetails(false);
    } catch (err) {
      console.error("[IMAGE_MODAL] Error toggling media like:", err);
      // Rollback
      setMediaLiked(wasLiked);
      if (media) {
        const currentLikes = media.likes || {};
        const currentUser = getCurrentUser();
        if (currentUser) {
          const userId = String(currentUser.id || currentUser._id || "").toLowerCase().trim();
          if (wasLiked) {
            // Restore like
            setMedia({ ...media, likes: { ...currentLikes, [userId]: true } });
          } else {
            // Remove like
            const newLikes = { ...currentLikes };
            delete newLikes[userId];
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

    const { typeRole, entityAccountId } = sessionData;
    const currentUser = getCurrentUser();
    const wasLiked = isLiked(comment.likes, currentUser);
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

    const { typeRole, entityAccountId } = sessionData;
    const currentUser = getCurrentUser();
    const wasLiked = isLiked(reply.likes, currentUser);
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

  // Delete Comment/Reply
  const handleDelete = async (type, id, commentId) => {
    if (typeof window !== "undefined" && !window.confirm("Bạn có chắc chắn muốn xóa?")) return;
    
    const mediaIdForApi = getMediaIdForApi();
    if (!mediaIdForApi) return;
    
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
    }
  };

  // Handle Share
  const handleShare = async () => {
    try {
      const mediaIdForApi = getMediaIdForApi();
      if (!mediaIdForApi) return;

      const url = typeof window !== "undefined" ? `${window.location.origin}/medias/${mediaIdForApi}` : `https://smoker.app/medias/${mediaIdForApi}`;
      
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: media?.caption || "Xem ảnh",
          text: media?.caption || "",
          url: url
        });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      
      // Track share sau khi share thành công
      if (mediaIdForApi) {
        try {
          await trackMediaShare(mediaIdForApi);
          // Reload media để cập nhật số lượt share (without showing loading)
          await loadMediaDetails(false);
        } catch (err) {
          console.warn('[IMAGE_MODAL] Failed to track share:', err);
        }
      }
    } catch (e) {
      // User cancelled share dialog - không cần log error
      if (e.name !== 'AbortError') {
        console.error("[IMAGE_MODAL] Share failed", e);
      }
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
  const commentsCount = parsedComments.length;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center p-0 md:p-4 lg:p-8 overflow-auto"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      tabIndex={-1}
    >
      <div
        className="bg-card rounded-none md:rounded-2xl max-w-full md:max-w-[90vw] max-h-full md:max-h-[90vh] w-full h-full md:h-auto flex flex-col relative overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white border-none w-10 h-10 rounded-full text-2xl cursor-pointer z-10 flex items-center justify-center transition-all duration-200 hover:scale-110"
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="flex flex-col md:flex-row h-full max-h-full md:max-h-[90vh] overflow-hidden">
          {/* Left: Image Section (60%) */}
          <div className="flex-1 flex items-center justify-center bg-black min-w-0 max-w-full md:max-w-[60%] max-h-[50vh] md:max-h-none relative z-[1]">
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

          {/* Right: Info Section (40%) */}
          <div className="w-full md:w-[420px] max-w-full md:max-w-[40%] flex flex-col overflow-y-auto overflow-x-hidden bg-card min-w-0 max-h-[50vh] md:max-h-none relative">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Đang tải thông tin...</div>
            ) : error && !media ? (
              <div className="p-8 text-center text-destructive">{error}</div>
            ) : (
              <>
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
                  onShareClick={handleShare}
                  disabled={!getMediaIdForApi()}
                />

                {/* Comments Section */}
                <MediaCommentSection
                  comments={parsedComments}
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
