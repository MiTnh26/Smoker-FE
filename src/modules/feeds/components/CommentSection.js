import { useState, useEffect } from "react";
import { getPostById, addComment, addReply, addReplyToReply, likeComment, unlikeComment, likeReply, unlikeReply } from "../../../api/postApi";
import "../../../styles/modules/feeds/CommentSection.css";

export default function CommentSection({ postId, onClose, inline = false }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState({});
  const [likedComments, setLikedComments] = useState(new Set());
  const [likedReplies, setLikedReplies] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" or "oldest"

  // Helper function to sort comments array
  const sortComments = (commentsArray, order) => {
    const sorted = [...commentsArray].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0);
      const dateB = new Date(b.createdAt || b.updatedAt || 0);
      if (order === "newest") {
        return dateB - dateA; // Newest first
      } else {
        return dateA - dateB; // Oldest first
      }
    });

    // Sort replies within each comment
    for (const comment of sorted) {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = [...comment.replies].sort((a, b) => {
          const dateA = new Date(a.createdAt || a.updatedAt || 0);
          const dateB = new Date(b.createdAt || b.updatedAt || 0);
          if (order === "newest") {
            return dateB - dateA;
          } else {
            return dateA - dateB;
          }
        });
      }
    }

    return sorted;
  };

  useEffect(() => {
    loadComments();
  }, [postId]);

  // Sort comments when sortOrder changes (only if comments already loaded)
  useEffect(() => {
    if (comments.length > 0) {
      const sortedComments = sortComments(comments, sortOrder);
      setComments(sortedComments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder]);

  // Helper to extract ID from MongoDB ObjectId format
  const extractId = (id) => {
    if (!id) return null;
    if (typeof id === 'string') return id;
    if (id.$oid) return id.$oid;
    if (id.toString) return id.toString();
    return String(id);
  };

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await getPostById(postId);
      
      console.log("Raw response from API:", response);
      
      // Axios interceptor already unwraps response.data, so response IS the API response
      // Response structure should be: { success: true, data: { ...post... } }
      let post = null;
      
      if (response?.success && response.data) {
        // Standard structure: { success: true, data: { ...post... } }
        post = response.data;
      } else if (response && response.comments) {
        // Post data directly (no success wrapper)
        post = response;
      } else if (response?.data && response.data.comments) {
        // Nested data
        post = response.data;
      }
      
      console.log("Extracted post object:", post);
      console.log("Post.comments:", post?.comments);
      console.log("Post.comments type:", typeof post?.comments);
      console.log("Post.comments keys:", post?.comments ? Object.keys(post.comments) : null);
      
      if (post && post.comments) {
        // Transform comments from Map/Object to array
        const commentsArray = [];
        
        console.log("Processing comments...");
        console.log("post.comments value:", post.comments);
        console.log("post.comments type:", typeof post.comments);
        console.log("post.comments constructor:", post.comments?.constructor?.name);
        console.log("Is Map?", post.comments instanceof Map);
        console.log("Is Array?", Array.isArray(post.comments));
        console.log("Object.keys(post.comments):", Object.keys(post.comments || {}));
        
        if (post.comments && typeof post.comments === 'object') {
          let commentsData = [];
          
          // Try Map first
          if (post.comments instanceof Map) {
            commentsData = Array.from(post.comments.entries());
            console.log("Using Map conversion, entries:", commentsData.length);
          } 
          // Try Array
          else if (Array.isArray(post.comments)) {
            commentsData = post.comments.map((comment, index) => [
              extractId(comment._id) || extractId(comment.id) || `comment-${index}`,
              comment
            ]);
            console.log("Using Array conversion, entries:", commentsData.length);
          } 
          // Try plain object with Object.keys first
          else {
            // Try multiple methods to extract keys
            let commentKeys = Object.keys(post.comments);
            console.log("Object.keys result:", commentKeys);
            
            // If Object.keys returns empty, try getOwnPropertyNames
            if (commentKeys.length === 0) {
              commentKeys = Object.getOwnPropertyNames(post.comments);
              console.log("Object.getOwnPropertyNames result:", commentKeys);
            }
            
            // Try JSON.stringify/parse to force conversion
            if (commentKeys.length === 0) {
              try {
                const stringified = JSON.stringify(post.comments);
                const parsed = JSON.parse(stringified);
                commentKeys = Object.keys(parsed);
                console.log("After JSON stringify/parse, keys:", commentKeys);
                
                if (commentKeys.length > 0) {
                  commentsData = commentKeys.map(key => [key, parsed[key]]);
                  console.log("Using JSON conversion, entries:", commentsData.length);
                }
              } catch (e) {
                console.error("JSON conversion failed:", e);
              }
            }
            
            // If still empty, try Object.entries
            if (commentKeys.length > 0 && commentsData.length === 0) {
              commentsData = commentKeys.map(key => {
                const value = post.comments[key];
                console.log(`Comment key "${key}":`, value);
                return [key, value];
              });
              console.log("Using Object.keys conversion, entries:", commentsData.length);
            } else if (commentsData.length === 0) {
              // Last resort: Object.entries
              commentsData = Object.entries(post.comments);
              console.log("Using Object.entries fallback, entries:", commentsData.length);
            }
          }
          
          console.log("Comments data after conversion:", commentsData);
          console.log("Number of comments:", commentsData.length);
          
          for (const [commentId, comment] of commentsData) {
            if (!comment || typeof comment !== 'object') {
              console.warn("Invalid comment:", comment);
              continue;
            }
            
            // Transform replies from Map/Object to array
            const repliesArray = [];
            if (comment.replies && typeof comment.replies === 'object' && !Array.isArray(comment.replies)) {
              let repliesData;
              if (comment.replies instanceof Map) {
                repliesData = Array.from(comment.replies.entries());
              } else {
                repliesData = Object.entries(comment.replies);
              }
              
              for (const [replyId, reply] of repliesData) {
                if (!reply || typeof reply !== 'object') continue;
                repliesArray.push({
                  id: extractId(replyId) || extractId(reply._id) || String(replyId),
                  accountId: reply.accountId,
                  content: reply.content || "",
                  images: reply.images || "",
                  likes: reply.likes ? (typeof reply.likes === 'object' ? Object.keys(reply.likes).length : reply.likes) : 0,
                  replyToId: reply.replyToId ? extractId(reply.replyToId) : null,
                  typeRole: reply.typeRole,
                  createdAt: reply.createdAt,
                  updatedAt: reply.updatedAt
                });
              }
            }
            
            const extractedCommentId = extractId(commentId) || extractId(comment._id) || String(commentId);
            commentsArray.push({
              id: extractedCommentId,
              accountId: comment.accountId,
              content: comment.content || "",
              images: comment.images || "",
              likes: comment.likes ? (typeof comment.likes === 'object' ? Object.keys(comment.likes).length : comment.likes) : 0,
              typeRole: comment.typeRole,
              replies: repliesArray,
              createdAt: comment.createdAt,
              updatedAt: comment.updatedAt
            });
          }
        }
        
        // Sort comments with current sortOrder
        const sortedComments = sortComments(commentsArray, sortOrder);

        console.log("Transformed comments array:", sortedComments);
        console.log("Number of transformed comments:", sortedComments.length);
        setComments(sortedComments);
      } else {
        console.log("Post or comments not found");
        console.log("Post exists:", !!post);
        console.log("Post.comments exists:", !!(post && post.comments));
        if (post && post.comments) {
          console.log("Post.comments type:", typeof post.comments);
          console.log("Post.comments value:", post.comments);
        }
        setComments([]);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập nội dung bình luận" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      let session;
      try {
        const raw = localStorage.getItem("session");
        session = raw ? JSON.parse(raw) : null;
      } catch (e) {
        session = null;
      }

      const currentUser = session?.account;
      const activeEntity = session?.activeEntity || currentUser;
      const normalizeTypeRole = (ae) => {
        const raw = (ae?.role || "").toString().toLowerCase();
        if (raw === "bar") return "BarPage";
        if (raw === "dj" || raw === "dancer") return "BusinessAccount";
        return "Account";
      };
      const typeRole = normalizeTypeRole(activeEntity);

      console.log("Submitting comment:", { postId, content: newComment, typeRole });
      
      // Axios interceptor unwraps response.data, so response IS the API response
      const response = await addComment(postId, {
        content: newComment,
        typeRole: typeRole
      });

      console.log("Add comment response:", response);

      // Handle different response structures
      if (response?.success || response?.data?.success) {
        setNewComment("");
        setMessage({ type: "success", text: "Đã thêm bình luận thành công!" });
        setTimeout(() => setMessage(null), 3000);
        
        // Reload comments after a short delay to ensure backend has processed
        setTimeout(async () => {
          await loadComments();
        }, 500);
      } else {
        setMessage({ type: "error", text: response?.message || "Không thể thêm bình luận" });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      setMessage({ 
        type: "error", 
        text: error?.response?.data?.message || "Không thể thêm bình luận. Vui lòng thử lại." 
      });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async (commentId, replyToId = null) => {
      const replyKey = replyToId ? `${commentId}-${replyToId}` : commentId;
      const text = replyContent[replyKey]?.replyText || "";
      if (!text.trim()) {
        setMessage({ type: "error", text: "Vui lòng nhập nội dung phản hồi" });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      setSubmitting(true);
      setMessage(null);

      try {
        let session;
        try {
          const raw = localStorage.getItem("session");
          session = raw ? JSON.parse(raw) : null;
        } catch (e) {
          session = null;
        }

        const currentUser = session?.account;
        const activeEntity = session?.activeEntity || currentUser;
        const normalizeTypeRole = (ae) => {
          const raw = (ae?.role || "").toString().toLowerCase();
          if (raw === "bar") return "BarPage";
          if (raw === "dj" || raw === "dancer") return "BusinessAccount";
          return "Account";
        };
        const typeRole = normalizeTypeRole(activeEntity);

        let response;
        if (replyToId) {
          // Reply to a reply - use addReplyToReply API
          response = await addReplyToReply(postId, commentId, replyToId, {
            content: text,
            typeRole: typeRole
          });
        } else {
          // Reply to a comment
          response = await addReply(postId, commentId, {
            content: text,
            typeRole: typeRole
          });
        }

        // Handle different response structures
        if (response?.success || response?.data?.success) {
          setReplyContent(prev => {
            const newState = { ...prev };
            delete newState[replyKey];
            return newState;
          });
          setReplyingTo(null);
          setMessage({ type: "success", text: "Đã thêm phản hồi thành công!" });
          setTimeout(() => setMessage(null), 3000);
          
          // Reload comments after a short delay
          setTimeout(async () => {
            await loadComments();
          }, 500);
        } else {
          setMessage({ type: "error", text: response?.message || "Không thể thêm phản hồi" });
          setTimeout(() => setMessage(null), 3000);
        }
      } catch (error) {
        console.error("Error adding reply:", error);
        setMessage({ 
          type: "error", 
          text: error?.response?.data?.message || "Không thể thêm phản hồi. Vui lòng thử lại." 
        });
        setTimeout(() => setMessage(null), 3000);
      } finally {
        setSubmitting(false);
      }
    };

  const handleLikeComment = async (commentId) => {
    try {
      let session;
      try {
        const raw = localStorage.getItem("session");
        session = raw ? JSON.parse(raw) : null;
      } catch (e) {
        session = null;
      }

      const activeEntity = session?.activeEntity || session?.account;
      const normalizeTypeRole = (ae) => {
        const raw = (ae?.role || "").toString().toLowerCase();
        if (raw === "bar") return "BarPage";
        if (raw === "dj" || raw === "dancer") return "BusinessAccount";
        return "Account";
      };
      const typeRole = normalizeTypeRole(activeEntity);

      const alreadyLiked = likedComments.has(commentId);

      // Optimistic update: toggle liked set and adjust like count in state
      setLikedComments(prev => {
        const newSet = new Set(prev);
        if (alreadyLiked) newSet.delete(commentId); else newSet.add(commentId);
        return newSet;
      });
      setComments(prev => prev.map(c => {
        if (c.id !== commentId) return c;
        const nextLikes = Math.max(0, (Number(c.likes) || 0) + (alreadyLiked ? -1 : 1));
        return { ...c, likes: nextLikes };
      }));

      const response = alreadyLiked
        ? await unlikeComment(postId, commentId)
        : await likeComment(postId, commentId, { typeRole });
      
      if (!(response?.success || response?.data?.success)) {
        // Rollback optimistic update on failure
        setLikedComments(prev => {
          const newSet = new Set(prev);
          if (alreadyLiked) newSet.add(commentId); else newSet.delete(commentId);
          return newSet;
        });
        setComments(prev => prev.map(c => {
          if (c.id !== commentId) return c;
          const nextLikes = Math.max(0, (Number(c.likes) || 0) + (alreadyLiked ? 1 : -1));
          return { ...c, likes: nextLikes };
        }));
      }
    } catch (error) {
      console.error("Error liking comment:", error);
      // Rollback on exception
      setLikedComments(prev => {
        const newSet = new Set(prev);
        if (newSet.has(commentId)) newSet.delete(commentId); else newSet.add(commentId);
        return newSet;
      });
      setComments(prev => prev.map(c => {
        if (c.id !== commentId) return c;
        const nextLikes = Math.max(0, (Number(c.likes) || 0) - 1);
        return { ...c, likes: nextLikes };
      }));
    }
  };

  const handleLikeReply = async (commentId, replyId) => {
    try {
      let session;
      try {
        const raw = localStorage.getItem("session");
        session = raw ? JSON.parse(raw) : null;
      } catch (e) {
        session = null;
      }

      const activeEntity = session?.activeEntity || session?.account;
      const normalizeTypeRole = (ae) => {
        const raw = (ae?.role || "").toString().toLowerCase();
        if (raw === "bar") return "BarPage";
        if (raw === "dj" || raw === "dancer") return "BusinessAccount";
        return "Account";
      };
      const typeRole = normalizeTypeRole(activeEntity);

      const replyKey = `${commentId}-${replyId}`;
      const alreadyLiked = likedReplies.has(replyKey);

      // Optimistic update for reply like count and liked set
      setLikedReplies(prev => {
        const newSet = new Set(prev);
        if (alreadyLiked) newSet.delete(replyKey); else newSet.add(replyKey);
        return newSet;
      });
      setComments(prev => prev.map(c => {
        if (c.id !== commentId) return c;
        const replies = (c.replies || []).map(r => {
          if (r.id !== replyId) return r;
          const nextLikes = Math.max(0, (Number(r.likes) || 0) + (alreadyLiked ? -1 : 1));
          return { ...r, likes: nextLikes };
        });
        return { ...c, replies };
      }));

      const response = alreadyLiked
        ? await unlikeReply(postId, commentId, replyId)
        : await likeReply(postId, commentId, replyId, { typeRole });
      
      if (!(response?.success || response?.data?.success)) {
        // Rollback on failure
        setLikedReplies(prev => {
          const newSet = new Set(prev);
          if (alreadyLiked) newSet.add(replyKey); else newSet.delete(replyKey);
          return newSet;
        });
        setComments(prev => prev.map(c => {
          if (c.id !== commentId) return c;
          const replies = (c.replies || []).map(r => {
            if (r.id !== replyId) return r;
            const nextLikes = Math.max(0, (Number(r.likes) || 0) + (alreadyLiked ? 1 : -1));
            return { ...r, likes: nextLikes };
          });
          return { ...c, replies };
        }));
      }
    } catch (error) {
      console.error("Error liking reply:", error);
      // Rollback on exception
      const replyKey = `${commentId}-${replyId}`;
      setLikedReplies(prev => {
        const newSet = new Set(prev);
        if (newSet.has(replyKey)) newSet.delete(replyKey); else newSet.add(replyKey);
        return newSet;
      });
      setComments(prev => prev.map(c => {
        if (c.id !== commentId) return c;
        const replies = (c.replies || []).map(r => {
          if (r.id !== replyId) return r;
          const nextLikes = Math.max(0, (Number(r.likes) || 0) - 1);
          return { ...r, likes: nextLikes };
        });
        return { ...c, replies };
      }));
    }
  };


  if (loading) {
    return (
      <div className={`comment-section ${inline ? 'comment-section-inline' : ''}`}>
        {!inline && (
          <div className="comment-section-header">
            <h3>Bình luận</h3>
            <button onClick={onClose} className="close-btn">×</button>
          </div>
        )}
        <div className="comment-section-body">
          <p>Đang tải bình luận...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`comment-section ${inline ? 'comment-section-inline' : ''}`}>
      {!inline && (
        <div className="comment-section-header">
          <h3>Bình luận</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
      )}

      <div className="comment-section-body">
        {/* Message notification */}
        {message && (
          <div className={`comment-message comment-message-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Sort Options */}
        {comments.length > 0 && (
          <div className="comment-sort-options">
            <span className="sort-label">Sắp xếp:</span>
            <button
              className={`sort-btn ${sortOrder === "newest" ? "active" : ""}`}
              onClick={() => setSortOrder("newest")}
            >
              Mới nhất
            </button>
            <button
              className={`sort-btn ${sortOrder === "oldest" ? "active" : ""}`}
              onClick={() => setSortOrder("oldest")}
            >
              Cũ nhất
            </button>
          </div>
        )}

        {/* Add Comment Form */}
        <form onSubmit={handleAddComment} className="add-comment-form">
          <input
            type="text"
            placeholder="Viết bình luận..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="comment-input"
            disabled={submitting}
          />
          <button 
            type="submit" 
            className="submit-comment-btn"
            disabled={submitting || !newComment.trim()}
          >
            {submitting ? "Đang đăng..." : "Đăng"}
          </button>
        </form>

        {/* Comments List */}
        <div className="comments-list">
          {comments.length === 0 ? (
            <p className="no-comments">Chưa có bình luận nào.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="comment-item">
                <div className="comment-content">
                  <div className="comment-text">{comment.content}</div>
                  {comment.images && (
                    <img src={comment.images} alt="comment" className="comment-image" />
                  )}
                </div>
                
                <div className="comment-actions">
                  <button
                    onClick={() => handleLikeComment(comment.id)}
                    className={`like-btn ${likedComments.has(comment.id) ? "liked" : ""}`}
                    aria-label="Like comment"
                  >
                    <svg className="action-icon" width="20" height="20" viewBox="0 0 24 24" fill={likedComments.has(comment.id) ? "currentColor" : "none"} stroke="currentColor">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span className="action-count">{comment.likes}</span>
                  </button>
                  <button
                    onClick={() => setReplyingTo({ commentId: comment.id, type: "comment" })}
                    className="reply-btn"
                  >
                    Phản hồi
                  </button>
                </div>

                {/* Reply Input */}
                {replyingTo?.commentId === comment.id && replyingTo.type === "comment" && (
                  <div className="reply-input-container">
                            <input
                              type="text"
                              placeholder="Viết phản hồi..."
                              value={replyContent[comment.id]?.replyText || ""}
                              onChange={(e) =>
                                setReplyContent((prev) => ({
                                  ...prev,
                                  [comment.id]: { replyText: e.target.value }
                                }))
                              }
                              className="reply-input"
                              disabled={submitting}
                            />
                            <div className="reply-actions">
                              <button
                                onClick={() => handleAddReply(comment.id)}
                                className="submit-reply-btn"
                                disabled={submitting || !(replyContent[comment.id]?.replyText || "").trim()}
                              >
                                {submitting ? "Đang đăng..." : "Đăng"}
                              </button>
                      <button
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent((prev) => {
                            const newState = { ...prev };
                            delete newState[comment.id];
                            return newState;
                          });
                        }}
                        className="cancel-reply-btn"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="replies-list">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="reply-item">
                        <div className="reply-content">
                          <div className="reply-text">{reply.content}</div>
                          {reply.images && (
                            <img src={reply.images} alt="reply" className="reply-image" />
                          )}
                        </div>
                        <div className="reply-actions">
                          <button
                            onClick={() => handleLikeReply(comment.id, reply.id)}
                            className={`like-btn ${likedReplies.has(`${comment.id}-${reply.id}`) ? "liked" : ""}`}
                            aria-label="Like reply"
                          >
                            <svg className="action-icon" width="20" height="20" viewBox="0 0 24 24" fill={likedReplies.has(`${comment.id}-${reply.id}`) ? "currentColor" : "none"} stroke="currentColor">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            <span className="action-count">{reply.likes}</span>
                          </button>
                          <button
                            onClick={() => setReplyingTo({ commentId: comment.id, replyId: reply.id, type: "reply" })}
                            className="reply-btn"
                          >
                            Phản hồi
                          </button>
                        </div>

                        {/* Reply to Reply Input */}
                        {replyingTo?.replyId === reply.id && replyingTo.type === "reply" && (
                          <div className="reply-input-container">
                              <input
                                type="text"
                                placeholder="Viết phản hồi..."
                                value={replyContent[`${comment.id}-${reply.id}`]?.replyText || ""}
                                onChange={(e) =>
                                  setReplyContent((prev) => ({
                                    ...prev,
                                    [`${comment.id}-${reply.id}`]: { replyText: e.target.value, replyToId: reply.id }
                                  }))
                                }
                                className="reply-input"
                                disabled={submitting}
                              />
                              <div className="reply-actions">
                                <button
                                  onClick={() => handleAddReply(comment.id, reply.id)}
                                  className="submit-reply-btn"
                                  disabled={submitting || !(replyContent[`${comment.id}-${reply.id}`]?.replyText || "").trim()}
                                >
                                  {submitting ? "Đang đăng..." : "Đăng"}
                                </button>
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyContent((prev) => {
                                    const newState = { ...prev };
                                    delete newState[`${comment.id}-${reply.id}`];
                                    return newState;
                                  });
                                }}
                                className="cancel-reply-btn"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

