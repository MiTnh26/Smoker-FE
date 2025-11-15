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
import "../../../../../styles/modules/feeds/components/media/mediasOfPost/ImageDetailModal.css";
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
  mediaId 
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

  // Load media details when modal opens
  useEffect(() => {
    if (!open) {
      hasLoadedRef.current = false;
      resetState();
      return;
    }
    if (hasLoadedRef.current) return;
    if (mediaId || imageUrl) {
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
  const loadMediaDetails = async () => {
    setLoading(true);
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
      setLoading(false);
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
    setMediaLiked(!wasLiked);
    
    try {
      if (wasLiked) {
        await unlikeMedia(mediaIdForApi);
      } else {
        await likeMedia(mediaIdForApi, { 
          accountId: currentUser?.id || activeEntity?.id,
          typeRole: typeRole
        });
      }
      // Reload media to sync with server
      await loadMediaDetails();
    } catch (err) {
      console.error("[IMAGE_MODAL] Error toggling media like:", err);
      // Rollback
      setMediaLiked(wasLiked);
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
      
      // Reload media to get updated comments
      try {
        await loadMediaDetails();
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
      // Reload media to sync
      await loadMediaDetails();
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
      // Reload media to sync
      await loadMediaDetails();
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
      // Reload media to get updated comments
      await loadMediaDetails();
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
      // Reload media
      await loadMediaDetails();
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
          // Reload media để cập nhật số lượt share
          await loadMediaDetails();
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

  if (!open) return null;
  const mediaLikesCount = getLikesCount(media?.likes);
  const commentsCount = parsedComments.length;

  return (
    <div
      className="media-viewer-modal"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      tabIndex={-1}
    >
      <div
        className="media-viewer-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="media-viewer-close-btn"
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="media-viewer-container">
          {/* Left: Image Section (60%) */}
          <div className="media-viewer-image-section">
            <MediaImageViewer
              imageUrl={imageUrl}
              media={media}
              loading={loading}
              error={error}
              imageError={imageError}
              onImageError={() => setImageError(true)}
            />
          </div>

          {/* Right: Info Section (40%) */}
          <div className="media-viewer-info-section">
            {loading ? (
              <div className="media-viewer-loading">Đang tải thông tin...</div>
            ) : error && !media ? (
              <div className="media-viewer-error">{error}</div>
            ) : (
              <>
                {/* Caption Header - Chỉ hiển thị nếu media có caption riêng (không phải từ post.content) */}
                {media?.caption && media.caption.trim() && (
                  <div className="media-viewer-caption">
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
          className="image-lightbox"
          onClick={() => setViewingImage(null)}
        >
          <img 
            src={viewingImage} 
            alt="Full size" 
            className="lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="lightbox-close-btn"
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
};
