import { useState, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { getMediaById, getMediaByUrl } from "../../../api/postApi";
import "../../../styles/modules/feeds/ImageDetailModal.css";

export default function ImageDetailModal({ 
  open, 
  onClose, 
  imageUrl, 
  postId, 
  mediaId 
}) {
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [pendingLike, setPendingLike] = useState({}); // { [commentKey]: boolean }
  const [localLikes, setLocalLikes] = useState({}); // { [commentKey]: { liked: bool, delta: number } }
  const hasLoadedRef = useRef(false);

  const isValidObjectId = (id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);

  useEffect(() => {
    if (!open) {
      hasLoadedRef.current = false;
      return;
    }
    if (hasLoadedRef.current) return;
    if (mediaId || imageUrl) {
      hasLoadedRef.current = true;
      loadMediaDetails();
    }
  }, [open, mediaId, postId, imageUrl]);

  const loadMediaDetails = async () => {
    setLoading(true);
    setError(null);
    // Debug: log incoming identifiers to verify matching with DB
    try {
      // eslint-disable-next-line no-console
      console.log("[IMAGE_MODAL] loadMediaDetails", { mediaId, postId, imageUrl, validMediaId: isValidObjectId(mediaId), validPostId: isValidObjectId(postId) });
    } catch {}
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

      // Prefer fetch by URL first (exact match with DB), then try by ID if needed
      if (imageUrl) {
        response = await tryByUrl();
        if (!response && mediaId && isValidObjectId(mediaId)) {
          try {
            response = await getMediaById(mediaId);
          } catch {
            // ignore, will fall through
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
      // Initialize local likes from storage
      const key = getMediaStorageKey(mediaData);
      try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : {};
        setLocalLikes(parsed && typeof parsed === 'object' ? parsed : {});
      } catch {
        setLocalLikes({});
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[IMAGE_MODAL] Error loading media:", err);
      setError("Không thể tải chi tiết media");
      // Still show the image even if details fail
      setMedia({ url: imageUrl, caption: "", likes: {}, comments: {} });
    } finally {
      setLoading(false);
    }
  };

  const getMediaStorageKey = (m) => {
    const id = m?._id || m?.id || mediaId || null;
    const keyBase = id ? `mediaCommentLikes:${id}` : `mediaCommentLikes:url:${imageUrl}`;
    return keyBase;
  };

  const persistLocalLikes = (next) => {
    const key = getMediaStorageKey(media || {});
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  };

  // Build stable list of comments with keys
  const commentsEntries = useMemo(() => {
    if (!media?.comments) return [];
    const c = media.comments;
    if (c instanceof Map) {
      return Array.from(c.entries()).map(([k, v]) => ({ key: String(k), value: v }));
    }
    if (Array.isArray(c)) {
      return c.map((v, idx) => ({ key: String(v?._id || idx), value: v }));
    }
    if (typeof c === 'object') {
      return Object.entries(c).map(([k, v]) => ({ key: String(k), value: v }));
    }
    return [];
  }, [media?.comments]);

  // Determine if current viewer liked a given comment (server state)
  const isLikedOnServer = (comment) => {
    let session;
    try {
      const raw = localStorage.getItem("session");
      session = raw ? JSON.parse(raw) : null;
    } catch {
      session = null;
    }
    const viewer = session?.activeEntity || session?.account;
    const viewerId = viewer?.id;
    if (!viewerId || !comment?.likes) return false;
    const likes = comment.likes;
    if (likes instanceof Map) {
      for (const [, likeObj] of likes.entries()) if (likeObj && String(likeObj.accountId) === String(viewerId)) return true;
      return false;
    }
    if (Array.isArray(likes)) return likes.some(l => l && String(l.accountId) === String(viewerId));
    if (typeof likes === 'object') return Object.values(likes).some(l => l && String(l.accountId) === String(viewerId));
    return false;
  };

  const getBaseLikesCount = (comment) => {
    if (!comment?.likes) return 0;
    const likes = comment.likes;
    if (likes instanceof Map) return likes.size;
    if (Array.isArray(likes)) return likes.length;
    if (typeof likes === 'object') return Object.keys(likes).length;
    return 0;
  };

  const getComputedLikeState = (commentKey, comment) => {
    const serverLiked = isLikedOnServer(comment);
    const local = localLikes[commentKey];
    const liked = local?.liked !== undefined ? local.liked : serverLiked;
    const delta = local?.delta || 0;
    const count = Math.max(0, getBaseLikesCount(comment) + delta);
    return { liked, count };
  };

  const handleToggleCommentLike = async (commentKey, comment) => {
    if (pendingLike[commentKey]) return;
    const { liked } = getComputedLikeState(commentKey, comment);
    const nextLiked = !liked;
    const next = { ...localLikes };
    const entry = next[commentKey] || { liked: liked, delta: 0 };
    entry.liked = nextLiked;
    entry.delta = (entry.delta || 0) + (nextLiked ? 1 : -1);
    next[commentKey] = entry;
    setLocalLikes(next);
    persistLocalLikes(next);
    setPendingLike((p) => ({ ...p, [commentKey]: true }));
    // FE-only: simulate latency
    setTimeout(() => {
      setPendingLike((p) => ({ ...p, [commentKey]: false }));
    }, 300);
  };

  const handleClose = () => {
    setMedia(null);
    setCommentText("");
    setError(null);
    onClose?.();
  };

  if (!open) return null;

  // Calculate likes count (media-level)
  const likesCount = media?.likes ? (media.likes instanceof Map ? media.likes.size : Object.keys(media.likes).length) : 0;
  
  // Calculate comments count
  const commentsCount = media?.comments ? Object.keys(media.comments).length : 0;

  // Comments use entries with stable keys

  return (
    <div
      className="image-detail-modal"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") handleClose();
      }}
      tabIndex={-1}
    >
      <div
        className="image-detail-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="image-detail-close-btn"
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="image-detail-container">
          {/* Left: Image */}
          <div className="image-detail-image-section">
            {loading ? (
              <div className="image-detail-loading">Đang tải...</div>
            ) : (
              <img
                src={media?.url || imageUrl}
                alt={media?.caption || "Image"}
                className="image-detail-image"
              />
            )}
          </div>

          {/* Right: Info */}
          <div className="image-detail-info-section">
            {loading ? (
              <div className="image-detail-loading">Đang tải thông tin...</div>
            ) : error && !media ? (
              <div className="image-detail-error">{error}</div>
            ) : (
              <>
                {/* Caption */}
                {media?.caption && (
                  <div className="image-detail-caption">
                    <p>{media.caption}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="image-detail-stats">
                  <div className="image-detail-stat-item">
                    <span className="stat-icon">❤️</span>
                    <span className="stat-count">{likesCount}</span>
                  </div>
                  <div className="image-detail-stat-item">
                    <span className="stat-icon">💬</span>
                    <span className="stat-count">{commentsCount}</span>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="image-detail-comments">
                  <h3 className="image-detail-comments-title">Bình luận</h3>
                  
                  {commentsEntries.length === 0 ? (
                    <p className="image-detail-no-comments">
                      Chưa có bình luận nào
                    </p>
                  ) : (
                    <div className="image-detail-comments-list">
                      {commentsEntries.map(({ key: commentKey, value: comment }, index) => {
                        const { liked: commentLiked, count: commentLikes } = getComputedLikeState(commentKey, comment);
                        const replies = comment.replies 
                          ? (comment.replies instanceof Map ? Array.from(comment.replies.values()) : Object.values(comment.replies)) 
                          : [];

                        return (
                          <div key={commentKey} className="image-detail-comment">
                            <div className="comment-content">
                              <strong className="comment-author">
                                {comment.accountId?.userName || "Người dùng"}
                              </strong>
                              <span className="comment-text">
                                {comment.content}
                              </span>
                            </div>
                            {comment.images && (
                              <img
                                src={comment.images}
                                alt="Comment attachment"
                                className="comment-image"
                              />
                            )}
                            <div className="comment-actions">
                              <button 
                                className={`comment-action-btn comment-like-btn ${commentLiked ? 'liked' : ''}`}
                                aria-pressed={commentLiked}
                                disabled={!!pendingLike[commentKey]}
                                onClick={() => handleToggleCommentLike(commentKey, comment)}
                                title={commentLiked ? 'Bỏ thích' : 'Thích'}
                              >
                                <span className="heart">{commentLiked ? '❤️' : '🤍'}</span>
                                <span className="count">{commentLikes}</span>
                              </button>
                              <button className="comment-action-btn">
                                Phản hồi
                              </button>
                            </div>

                            {/* Replies */}
                            {replies.length > 0 && (
                              <div className="comment-replies">
                                {replies.map((reply, replyIndex) => {
                                  const replyLikes = reply.likes
                                    ? Object.keys(reply.likes).length
                                    : 0;
                                  return (
                                    <div
                                      key={reply.id?._id || replyIndex}
                                      className="comment-reply"
                                    >
                                      <strong className="reply-author">
                                        {reply.accountId?.userName || "Người dùng"}
                                      </strong>
                                      <span className="reply-text">
                                        {reply.content}
                                      </span>
                                      {reply.images && (
                                        <img
                                          src={reply.images}
                                          alt="Reply attachment"
                                          className="reply-image"
                                        />
                                      )}
                                      <div className="reply-actions">
                                        <button className="comment-action-btn">
                                          ❤️ {replyLikes}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Comment */}
                  <div className="image-detail-add-comment">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Viết bình luận..."
                      className="comment-input"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && commentText.trim()) {
                          // TODO: Implement add comment
                          console.log("Add comment:", commentText);
                          setCommentText("");
                        }
                      }}
                    />
                    <button
                      className="comment-submit-btn"
                      onClick={() => {
                        if (commentText.trim()) {
                          // TODO: Implement add comment
                          console.log("Add comment:", commentText);
                          setCommentText("");
                        }
                      }}
                    >
                      Đăng
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
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

