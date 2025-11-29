import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import {
  getPostById,
  getPostDetail,
  addComment,
  updateComment,
  deleteComment,
  addReply,
  addReplyToReply,
  updateReply,
  deleteReply,
  likeComment,
  unlikeComment,
  likeReply,
  unlikeReply
} from "../../../../api/postApi";
import { cn } from "../../../../utils/cn";
import "../../../../styles/modules/feeds/components/comment/comment-section.css";

export default function CommentSection({ postId, onClose, inline = false, alwaysOpen = false, scrollToCommentId = null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const commentRefs = useRef({}); // Refs for scrolling to specific comments
  const [viewerAccountId, setViewerAccountId] = useState(null);
  const [viewerEntityAccountId, setViewerEntityAccountId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [editingReplyTarget, setEditingReplyTarget] = useState(null); // { commentId, replyId }
  const [editReplyText, setEditReplyText] = useState("");
  const [commentActionLoadingId, setCommentActionLoadingId] = useState(null);
  const [replyActionLoadingKey, setReplyActionLoadingKey] = useState(null);

  const normalizeId = (value) => (value ? String(value).trim().toLowerCase() : null);

  const resolveViewerIdentity = () => {
    try {
      const raw = localStorage.getItem("session");
      const session = raw ? JSON.parse(raw) : null;
      const currentUser = session?.account;
      const activeEntity = session?.activeEntity || currentUser;

      const accountId =
        currentUser?.id ||
        currentUser?.AccountId ||
        currentUser?.accountId ||
        activeEntity?.id ||
        null;

      const entityAccountId =
        activeEntity?.EntityAccountId ||
        activeEntity?.entityAccountId ||
        activeEntity?.entity_account_id ||
        null;

      return {
        accountId: normalizeId(accountId),
        entityAccountId: normalizeId(entityAccountId)
      };
    } catch (error) {
      return { accountId: null, entityAccountId: null };
    }
  };

  // Format time display helper
  const formatTimeDisplay = (value) => {
    try {
      const d = value ? new Date(value) : new Date();
      if (isNaN(d.getTime())) return new Date().toLocaleString('vi-VN');
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      if (diffMs < 0) return d.toLocaleString('vi-VN');
      const minutes = Math.floor(diffMs / 60000);
      if (minutes < 1) return t('time.justNow') || 'Vừa xong';
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

  // Navigate to profile based on entityType
  const handleNavigateToProfile = (entityId, entityType, entityAccountId) => {
    if (!entityId && !entityAccountId) return;
    
    if (entityType === 'BarPage') {
      navigate(`/bar/${entityId || entityAccountId}`);
    } else if (entityType === 'BusinessAccount') {
      navigate(`/profile/${entityAccountId || entityId}`);
    } else {
      // Account or default
      navigate(`/profile/${entityAccountId || entityId}`);
    }
  };

  const canManageComment = (comment) => {
    if (typeof comment?.canManage === "boolean") {
      return comment.canManage;
    }
    const commentEntityAccountId = normalizeId(
      comment.authorEntityAccountId ||
      comment.entityAccountId
    );
    const commentAccountId = normalizeId(comment.accountId || comment.authorAccountId);

    if (
      viewerEntityAccountId &&
      commentEntityAccountId &&
      viewerEntityAccountId === commentEntityAccountId
    ) {
      return true;
    }

    if (
      viewerAccountId &&
      commentAccountId &&
      viewerAccountId === commentAccountId
    ) {
      return true;
    }

    return false;
  };

  const canManageReply = (reply) => {
    if (typeof reply?.canManage === "boolean") {
      return reply.canManage;
    }
    const replyEntityAccountId = normalizeId(
      reply.authorEntityAccountId ||
      reply.entityAccountId
    );
    const replyAccountId = normalizeId(reply.accountId || reply.authorAccountId);

    if (
      viewerEntityAccountId &&
      replyEntityAccountId &&
      viewerEntityAccountId === replyEntityAccountId
    ) {
      return true;
    }

    if (
      viewerAccountId &&
      replyAccountId &&
      viewerAccountId === replyAccountId
    ) {
      return true;
    }

    return false;
  };

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

  useEffect(() => {
    const identity = resolveViewerIdentity();
    setViewerAccountId(identity.accountId);
    setViewerEntityAccountId(identity.entityAccountId);
  }, []);

  // Reload comments when activeEntity changes (role switch)
  useEffect(() => {
    const handleStorageChange = () => {
      // Reload comments when session/activeEntity changes
      if (postId) {
        console.log('[CommentSection] Session changed, reloading comments...');
        loadComments();
      }
    };

    // Listen for storage changes (role switch)
    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom events
    window.addEventListener('sessionUpdated', handleStorageChange);
    window.addEventListener('profileUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sessionUpdated', handleStorageChange);
      window.removeEventListener('profileUpdated', handleStorageChange);
    };
  }, [postId]);

  useEffect(() => {
    setEditingCommentId(null);
    setEditCommentText("");
    setEditingReplyTarget(null);
    setEditReplyText("");
  }, [postId]);

  // Sort comments when sortOrder changes (only if comments already loaded)
  useEffect(() => {
    if (comments.length > 0) {
      const sortedComments = sortComments(comments, sortOrder);
      setComments(sortedComments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder]);

  // Scroll to specific comment when scrollToCommentId is set
  useEffect(() => {
    if (scrollToCommentId && comments.length > 0 && !loading) {
      // Wait a bit for DOM to render
      const timer = setTimeout(() => {
        const commentElement = commentRefs.current[scrollToCommentId];
        if (commentElement) {
          commentElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
          
          // Highlight the comment temporarily
          commentElement.style.backgroundColor = 'rgba(var(--primary) / 0.1)';
          commentElement.style.transition = 'background-color 0.3s ease';
          setTimeout(() => {
            commentElement.style.backgroundColor = '';
          }, 2000);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [scrollToCommentId, comments, loading]);

  // Helper to extract ID from MongoDB ObjectId format
  const extractId = (id) => {
    if (!id) return null;
    if (typeof id === 'string') return id;
    if (id.$oid) return id.$oid;
    if (id.toString) return id.toString();
    return String(id);
  };

  // Resolve avatar for an account id (fallback to placeholder)
  // Backend should provide authorAvatar via comment.authorAvatar or reply.authorAvatar from database
  const getAvatarForAccount = (accountId, entityAccountId) => {
    // Always return generic placeholder - backend must provide authorAvatar from database
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlNWU3ZWIiLz48cGF0aCBkPSJNMTIgMTRDMTUuMzEzNyAxNCAxOCAxNi42ODYzIDE4IDIwSDEwQzEwIDE2LjY4NjMgMTIuNjg2MyAxNCAxMiAxNFoiIGZpbGw9IiM5Y2EzYWYiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjgiIHI9IjQiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=";
  };

  // Resolve name for an account id (fallback to "Người dùng")
  // Backend should provide authorName via comment.authorName or reply.authorName from database
  const getNameForAccount = (accountId, entityAccountId) => {
    // Always return generic name - backend must provide authorName from database
    return "Người dùng";
  };

  const startEditingComment = (comment) => {
    setEditingReplyTarget(null);
    setReplyingTo(null);
    setEditingCommentId(comment.id);
    setEditCommentText(comment.content || "");
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditCommentText("");
  };

  const handleUpdateExistingComment = async () => {
    if (!editingCommentId) return;
    const trimmed = editCommentText.trim();
    if (!trimmed) {
      setMessage({
        type: "error",
        text: t('comment.editEmptyError', { defaultValue: "Vui lòng nhập nội dung bình luận" })
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setCommentActionLoadingId(editingCommentId);
    try {
      await updateComment(postId, editingCommentId, { content: trimmed });
      setComments((prev) => prev.map((comment) => (
        comment.id === editingCommentId
          ? { ...comment, content: trimmed, updatedAt: new Date().toISOString() }
          : comment
      )));
      setMessage({
        type: "success",
        text: t('comment.updateSuccess', { defaultValue: "Đã cập nhật bình luận" })
      });
      cancelEditingComment();
    } catch (error) {
      console.error("Error updating comment:", error);
      setMessage({
        type: "error",
        text: t('comment.updateError', { defaultValue: "Không thể cập nhật bình luận. Vui lòng thử lại." })
      });
    } finally {
      setCommentActionLoadingId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteCommentClick = async (commentId) => {
    if (!viewerEntityAccountId) {
      setMessage({
        type: "error",
        text: t('comment.entityRequired', { defaultValue: "Vui lòng chọn thực thể hoạt động trước khi xóa bình luận." })
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    const confirmDelete = window.confirm(
      t('comment.deleteConfirm', { defaultValue: "Bạn có chắc chắn muốn xóa bình luận này?" })
    );
    if (!confirmDelete) return;

    setCommentActionLoadingId(commentId);
    try {
      await deleteComment(postId, commentId, { entityAccountId: viewerEntityAccountId });
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      setLikedComments((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
      setLikedReplies((prev) => {
        const next = new Set(
          Array.from(prev).filter((key) => !key.startsWith(`${commentId}-`))
        );
        return next;
      });
      if (replyingTo?.commentId === commentId) {
        setReplyingTo(null);
      }
      if (editingCommentId === commentId) {
        cancelEditingComment();
      }
      setMessage({
        type: "success",
        text: t('comment.deleteSuccess', { defaultValue: "Đã xóa bình luận" })
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      setMessage({
        type: "error",
        text: t('comment.deleteError', { defaultValue: "Không thể xóa bình luận. Vui lòng thử lại." })
      });
    } finally {
      setCommentActionLoadingId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const startEditingReply = (commentId, reply) => {
    setEditingCommentId(null);
    setReplyingTo(null);
    setEditingReplyTarget({ commentId, replyId: reply.id });
    setEditReplyText(reply.content || "");
  };

  const cancelEditingReply = () => {
    setEditingReplyTarget(null);
    setEditReplyText("");
  };

  const handleUpdateExistingReply = async () => {
    if (!editingReplyTarget) return;
    const trimmed = editReplyText.trim();
    if (!trimmed) {
      setMessage({
        type: "error",
        text: t('comment.editEmptyError', { defaultValue: "Vui lòng nhập nội dung bình luận" })
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const actionKey = `${editingReplyTarget.commentId}-${editingReplyTarget.replyId}`;
    setReplyActionLoadingKey(actionKey);
    try {
      await updateReply(
        postId,
        editingReplyTarget.commentId,
        editingReplyTarget.replyId,
        { content: trimmed }
      );
      setComments((prev) => prev.map((comment) => {
        if (comment.id !== editingReplyTarget.commentId) return comment;
        const replies = (comment.replies || []).map((reply) =>
          reply.id === editingReplyTarget.replyId
            ? { ...reply, content: trimmed, updatedAt: new Date().toISOString() }
            : reply
        );
        return { ...comment, replies };
      }));
      setMessage({
        type: "success",
        text: t('comment.updateSuccess', { defaultValue: "Đã cập nhật bình luận" })
      });
      cancelEditingReply();
    } catch (error) {
      console.error("Error updating reply:", error);
      setMessage({
        type: "error",
        text: t('comment.updateError', { defaultValue: "Không thể cập nhật bình luận. Vui lòng thử lại." })
      });
    } finally {
      setReplyActionLoadingKey(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteReplyClick = async (commentId, replyId) => {
    if (!viewerEntityAccountId) {
      setMessage({
        type: "error",
        text: t('comment.entityRequired', { defaultValue: "Vui lòng chọn thực thể hoạt động trước khi xóa bình luận." })
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    const confirmDelete = window.confirm(
      t('comment.deleteConfirm', { defaultValue: "Bạn có chắc chắn muốn xóa bình luận này?" })
    );
    if (!confirmDelete) return;

    const actionKey = `${commentId}-${replyId}`;
    setReplyActionLoadingKey(actionKey);
    try {
      await deleteReply(postId, commentId, replyId, { entityAccountId: viewerEntityAccountId });
      setComments((prev) => prev.map((comment) => {
        if (comment.id !== commentId) return comment;
        const replies = (comment.replies || []).filter((reply) => reply.id !== replyId);
        return { ...comment, replies };
      }));
      setLikedReplies((prev) => {
        const next = new Set(prev);
        next.delete(actionKey);
        return next;
      });
      if (
        editingReplyTarget &&
        editingReplyTarget.commentId === commentId &&
        editingReplyTarget.replyId === replyId
      ) {
        cancelEditingReply();
      }
      if (
        replyingTo?.commentId === commentId &&
        replyingTo?.replyId === replyId
      ) {
        setReplyingTo(null);
      }
      setMessage({
        type: "success",
        text: t('comment.deleteSuccess', { defaultValue: "Đã xóa bình luận" })
      });
    } catch (error) {
      console.error("Error deleting reply:", error);
      setMessage({
        type: "error",
        text: t('comment.deleteError', { defaultValue: "Không thể xóa bình luận. Vui lòng thử lại." })
      });
    } finally {
      setReplyActionLoadingKey(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const countCollectionItems = (value) => {
    if (!value) return 0;
    if (Array.isArray(value)) return value.length;
    if (value instanceof Map) return value.size;
    if (typeof value === "object") return Object.keys(value).length;
    if (typeof value === "number") return value;
    return 0;
  };

  const loadComments = async () => {
    try {
      setLoading(true);
      // Sử dụng getPostDetail để lấy đầy đủ thông tin comments với author info
      const response = await getPostDetail(postId, {
        includeMedias: true,
        includeMusic: true
      });

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

      if (post && post.comments) {
        // Debug: Log raw comments from backend
        console.log('[CommentSection] Raw comments from backend:', {
          commentsType: typeof post.comments,
          isMap: post.comments instanceof Map,
          isArray: Array.isArray(post.comments),
          keysCount: typeof post.comments === 'object' ? Object.keys(post.comments).length : 0,
          sampleComment: typeof post.comments === 'object' && !Array.isArray(post.comments) 
            ? Object.values(post.comments)[0] 
            : null
        });
        
        // Transform comments from Map/Object to array
        const commentsArray = [];

        if (post.comments && typeof post.comments === 'object') {
          let commentsData = [];

          // Try Map first
          if (post.comments instanceof Map) {
            commentsData = Array.from(post.comments.entries());
          }
          // Try Array
          else if (Array.isArray(post.comments)) {
            commentsData = post.comments.map((comment, index) => [
              extractId(comment._id) || extractId(comment.id) || `comment-${index}`,
              comment
            ]);
          }
          // Try plain object with Object.keys first
          else {
            // Try multiple methods to extract keys
            let commentKeys = Object.keys(post.comments);

            // If Object.keys returns empty, try getOwnPropertyNames
            if (commentKeys.length === 0) {
              commentKeys = Object.getOwnPropertyNames(post.comments);
            }

            // Try JSON.stringify/parse to force conversion
            if (commentKeys.length === 0) {
              try {
                const stringified = JSON.stringify(post.comments);
                const parsed = JSON.parse(stringified);
                commentKeys = Object.keys(parsed);

                if (commentKeys.length > 0) {
                  commentsData = commentKeys.map(key => [key, parsed[key]]);
                }
              } catch (e) {
                console.error("JSON conversion failed:", e);
              }
            }

            // If still empty, try Object.entries
            if (commentKeys.length > 0 && commentsData.length === 0) {
              commentsData = commentKeys.map(key => {
                const value = post.comments[key];
                return [key, value];
              });
            } else if (commentsData.length === 0) {
              // Last resort: Object.entries
              commentsData = Object.entries(post.comments);
            }
          }

          for (const [commentId, comment] of commentsData) {
            if (!comment || typeof comment !== 'object') {
              console.warn("Invalid comment:", comment);
              continue;
            }
            
            // Debug: Log author info from backend
            if (comment.entityAccountId && (!comment.authorName || comment.authorName === 'Người dùng')) {
              console.warn(`[CommentSection] Comment ${commentId} missing authorName:`, {
                entityAccountId: comment.entityAccountId,
                authorName: comment.authorName,
                authorAvatar: comment.authorAvatar,
                authorEntityAccountId: comment.authorEntityAccountId,
                entityType: comment.entityType
              });
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
                
                // Debug: Log author info from backend
                if (reply.entityAccountId && (!reply.authorName || reply.authorName === 'Người dùng')) {
                  console.warn(`[CommentSection] Reply ${replyId} missing authorName:`, {
                    entityAccountId: reply.entityAccountId,
                    authorName: reply.authorName,
                    authorAvatar: reply.authorAvatar,
                    authorEntityAccountId: reply.authorEntityAccountId,
                    entityType: reply.entityType
                  });
                }
                
                // Preserve original likes object for checking liked status
                const likesCount = reply.likes ? (typeof reply.likes === 'object' ? Object.keys(reply.likes).length : reply.likes) : 0;
                repliesArray.push({
                  id: extractId(replyId) || extractId(reply._id) || String(replyId),
                  accountId: reply.accountId,
                  content: reply.content || "",
                  images: reply.images || "",
                  likes: likesCount,
                  likesObject: reply.likes, // Preserve original likes object
                  replyToId: reply.replyToId ? extractId(reply.replyToId) : null,
                  typeRole: reply.typeRole,
                  createdAt: reply.createdAt,
                  updatedAt: reply.updatedAt,
                  // Author info from backend
                  authorName: reply.authorName,
                  authorAvatar: reply.authorAvatar,
                  authorEntityAccountId: reply.authorEntityAccountId,
                  authorEntityType: reply.authorEntityType,
                  authorEntityId: reply.authorEntityId
                });
              }
            }

            const extractedCommentId = extractId(commentId) || extractId(comment._id) || String(commentId);
            const likesCount =
              typeof comment.likesCount === "number"
                ? Number(comment.likesCount)
                : countCollectionItems(comment.likes);
            commentsArray.push({
              id: extractedCommentId,
              accountId: comment.accountId,
              content: comment.content || "",
              images: comment.images || "",
              likes: likesCount,
              likesObject: comment.likes, // Preserve original likes object
              likedByViewer: typeof comment.likedByViewer === "boolean" ? comment.likedByViewer : undefined,
              canManage: typeof comment.canManage === "boolean" ? comment.canManage : undefined,
              typeRole: comment.typeRole,
              replies: repliesArray,
              createdAt: comment.createdAt,
              updatedAt: comment.updatedAt,
              // Author info from backend
              authorName: comment.authorName,
              authorAvatar: comment.authorAvatar,
              authorEntityAccountId: comment.authorEntityAccountId,
              authorEntityType: comment.authorEntityType,
              authorEntityId: comment.authorEntityId
            });
          }
        }

        // Sort comments with current sortOrder
        const sortedComments = sortComments(commentsArray, sortOrder);
        setComments(sortedComments);

        // Initialize likedComments and likedReplies from backend data
        const resolvedIdentity = viewerEntityAccountId || viewerAccountId
          ? { entityAccountId: viewerEntityAccountId, accountId: viewerAccountId }
          : resolveViewerIdentity();

        if (!viewerEntityAccountId && resolvedIdentity.entityAccountId) {
          setViewerEntityAccountId(resolvedIdentity.entityAccountId);
        }
        if (!viewerAccountId && resolvedIdentity.accountId) {
          setViewerAccountId(resolvedIdentity.accountId);
        }

        const currentEntityAccountId = resolvedIdentity.entityAccountId;
        const currentUserId = resolvedIdentity.accountId;

        if (currentEntityAccountId || currentUserId) {
          const likedCommentsSet = new Set();
          const likedRepliesSet = new Set();

          // Check each comment's likes
          for (const comment of sortedComments) {
            if (comment.likedByViewer) {
              likedCommentsSet.add(comment.id);
            } else {
              const likesObj = comment.likesObject || (typeof comment.likes === 'object' ? comment.likes : null);
              if (likesObj) {
                if (likesObj instanceof Map) {
                  for (const [accountId, likeData] of likesObj.entries()) {
                    const accountIdToCheck = likeData?.accountId || accountId;
                    if (String(accountIdToCheck) === String(currentEntityAccountId) || 
                        String(accountIdToCheck) === String(currentUserId) ||
                        String(accountId) === String(currentEntityAccountId) || 
                        String(accountId) === String(currentUserId)) {
                      likedCommentsSet.add(comment.id);
                      break;
                    }
                  }
                } else if (typeof likesObj === 'object') {
                  const accountIds = Object.keys(likesObj);
                  const hasLiked = accountIds.some(id => {
                    const likeData = likesObj[id];
                    const accountIdToCheck = likeData?.accountId || id;
                    return String(accountIdToCheck) === String(currentEntityAccountId) || 
                           String(accountIdToCheck) === String(currentUserId) ||
                           String(id) === String(currentEntityAccountId) || 
                           String(id) === String(currentUserId);
                  });
                  if (hasLiked) {
                    likedCommentsSet.add(comment.id);
                  }
                }
              }
            }

            // Check each reply's likes
            if (comment.replies && Array.isArray(comment.replies)) {
              for (const reply of comment.replies) {
                const replyKey = `${comment.id}-${reply.id}`;
                if (reply.likedByViewer) {
                  likedRepliesSet.add(replyKey);
                  continue;
                }
                const replyLikesObj = reply.likesObject || (typeof reply.likes === 'object' ? reply.likes : null);
                if (replyLikesObj) {
                  if (replyLikesObj instanceof Map) {
                    for (const [accountId, likeData] of replyLikesObj.entries()) {
                      const accountIdToCheck = likeData?.accountId || accountId;
                      if (String(accountIdToCheck) === String(currentEntityAccountId) || 
                          String(accountIdToCheck) === String(currentUserId) ||
                          String(accountId) === String(currentEntityAccountId) || 
                          String(accountId) === String(currentUserId)) {
                        likedRepliesSet.add(replyKey);
                        break;
                      }
                    }
                  } else if (typeof replyLikesObj === 'object') {
                    const accountIds = Object.keys(replyLikesObj);
                    const hasLiked = accountIds.some(id => {
                      const likeData = replyLikesObj[id];
                      const accountIdToCheck = likeData?.accountId || id;
                      return String(accountIdToCheck) === String(currentEntityAccountId) || 
                             String(accountIdToCheck) === String(currentUserId) ||
                             String(id) === String(currentEntityAccountId) || 
                             String(id) === String(currentUserId);
                    });
                    if (hasLiked) {
                      likedRepliesSet.add(replyKey);
                    }
                  }
                }
              }
            }
          }

          setLikedComments(likedCommentsSet);
          setLikedReplies(likedRepliesSet);
        }
      } else {
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

      // Lấy entityAccountId, entityId, entityType từ activeEntity
      const entityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
      const entityId = activeEntity?.entityId || session?.account?.id;
      const entityType = typeRole;

      // Axios interceptor unwraps response.data, so response IS the API response
      const response = await addComment(postId, {
        content: newComment,
        typeRole: typeRole,
        entityAccountId: entityAccountId,
        entityId: entityId,
        entityType: entityType
      });

      // Handle different response structures
      if (response?.success || response?.data?.success) {
        setNewComment("");
        // setMessage({ type: "success", text: "Đã thêm bình luận thành công!" });
        // setTimeout(() => setMessage(null), 3000);

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

      // Lấy entityAccountId, entityId, entityType từ activeEntity
      const entityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
      const entityId = activeEntity?.entityId || currentUser?.id;
      const entityType = typeRole;

      let response;
      if (replyToId) {
        // Reply to a reply - use addReplyToReply API
        response = await addReplyToReply(postId, commentId, replyToId, {
          content: text,
          typeRole: typeRole,
          entityAccountId: entityAccountId,
          entityId: entityId,
          entityType: entityType
        });
      } else {
        // Reply to a comment
        response = await addReply(postId, commentId, {
          content: text,
          typeRole: typeRole,
          entityAccountId: entityAccountId,
          entityId: entityId,
          entityType: entityType
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

      // Lấy entityAccountId từ activeEntity
      const entityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;

      const response = alreadyLiked
        ? await unlikeComment(postId, commentId, { entityAccountId })
        : await likeComment(postId, commentId, { typeRole, entityAccountId });

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

      // Lấy entityAccountId từ activeEntity
      const entityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;

      const response = alreadyLiked
        ? await unlikeReply(postId, commentId, replyId, { entityAccountId })
        : await likeReply(postId, commentId, replyId, { typeRole, entityAccountId });

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
      <div className={cn(
        inline ? "comment-section-inline" : "comment-section",
        "relative"
      )}>
        {!inline && !alwaysOpen && (
          <div className={cn(
            "flex justify-between items-center p-5 border-b border-border/30",
            "bg-card/80 backdrop-blur-sm flex-shrink-0"
          )}>
            <h3 className={cn("m-0 text-lg font-semibold text-foreground")}>
              {t('comment.header')}
            </h3>
            <button 
              onClick={onClose} 
              className={cn(
                "bg-transparent border-none text-muted-foreground text-2xl",
                "cursor-pointer p-1 leading-none transition-colors duration-200",
                "hover:text-foreground"
              )}
            >
              ×
            </button>
          </div>
        )}
        {/* No header in inline mode while loading */}
        <div className={cn(
          "flex-1 overflow-y-auto p-4"
        )}>
          <p className={cn("text-foreground")}>{t('comment.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!inline && !alwaysOpen && (
        <div 
          className={cn(
            "fixed inset-0 bg-black/50 backdrop-blur-sm z-[999]",
            "comment-overlay"
          )}
          onClick={onClose}
        />
      )}
      <div className={cn(
        inline ? "comment-section-inline" : "comment-section",
        "relative"
      )}>
        {!inline && !alwaysOpen && (
          <div className={cn(
            "flex justify-between items-center p-5 border-b border-border/30",
            "bg-card/80 backdrop-blur-sm flex-shrink-0"
          )}>
            <h3 className={cn("m-0 text-lg font-semibold text-foreground")}>
              {t('comment.header')}
            </h3>
            <button 
              onClick={onClose} 
              className={cn(
                "bg-transparent border-none text-muted-foreground text-2xl",
                "cursor-pointer p-1 leading-none transition-colors duration-200",
                "hover:text-foreground"
              )}
            >
              ×
            </button>
          </div>
        )}
        {/* Hide header when inline == true. Still show when alwaysOpen without inline */}
        {!inline && alwaysOpen && (
          <div className={cn(
            "flex justify-between items-center p-5 border-b border-border/30",
            "bg-card/80 backdrop-blur-sm flex-shrink-0",
            "sm:p-4 md:p-5"
          )}>
            <h3 className={cn("m-0 text-lg font-semibold text-foreground", "sm:text-base md:text-lg")}>
              {t('comment.header')}
            </h3>
          </div>
        )}

      <div className={cn(
        "flex-1 flex flex-col overflow-hidden min-h-0"
      )}>
        {/* Message notification */}
        {message && (
          <div className={cn(
            "p-3 mb-4 rounded-lg text-sm font-medium flex-shrink-0",
            message.type === "success" 
              ? "bg-success/20 text-success border-[0.5px] border-success/30"
              : "bg-danger/20 text-danger border-[0.5px] border-danger/30"
          )}>
            {message.text}
          </div>
        )}

        {/* Sort Options */}
        {comments.length > 0 && (
          <div className={cn(
            "flex items-center gap-2 pt-3 pb-3 px-4 flex-shrink-0",
            "border-b border-border/30 bg-card/80 backdrop-blur-sm z-10",
            "sm:pt-2 sm:pb-2 sm:px-3 sm:gap-1.5"
          )}>
            <span className={cn("text-sm text-muted-foreground", "sm:text-xs md:text-sm")}>
              {t('comment.sort')}
            </span>
            <button
              className={cn(
                "px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200",
                "bg-transparent border-none cursor-pointer",
                sortOrder === "newest" 
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                "sm:px-2 sm:py-1 sm:text-xs md:px-3 md:py-1.5 md:text-sm"
              )}
              onClick={() => setSortOrder("newest")}
            >
              {t('comment.newest')}
            </button>
            <button
              className={cn(
                "px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200",
                "bg-transparent border-none cursor-pointer",
                sortOrder === "oldest" 
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                "sm:px-2 sm:py-1 sm:text-xs md:px-3 md:py-1.5 md:text-sm"
              )}
              onClick={() => setSortOrder("oldest")}
            >
              {t('comment.oldest')}
            </button>
          </div>
        )}

        {/* Comments List */}
        <div className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0",
          "sm:p-3 md:p-4"
        )}>
          {comments.length === 0 ? (
            <p className={cn("py-8 text-center text-muted-foreground")}>
              {t('comment.none')}
            </p>
          ) : (
            comments.map((comment) => (
              <div 
                key={comment.id} 
                className={cn(
                  "py-3 px-4 border-b border-border/25",
                  "sm:py-2 sm:px-3 md:py-3 md:px-4"
                )}
                ref={(el) => {
                  if (el) {
                    commentRefs.current[comment.id] = el;
                  }
                }}
              >
                <div className="flex gap-3 items-start sm:gap-2 md:gap-3">
                  <img 
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer sm:w-7 sm:h-7 md:w-8 md:h-8" 
                    src={comment.authorAvatar || getAvatarForAccount(comment.accountId, comment.authorEntityAccountId)} 
                    alt="avatar"
                    onClick={() => handleNavigateToProfile(comment.authorEntityId, comment.authorEntityType, comment.authorEntityAccountId)}
                  />
                  <div className="flex-1 flex flex-col gap-1 min-w-0 max-w-full overflow-hidden">
                    <div className="flex items-center gap-2 mb-1 sm:gap-1.5">
                      <span 
                        className={cn(
                          "text-foreground font-semibold text-sm cursor-pointer",
                          "hover:underline",
                          "sm:text-xs md:text-sm"
                        )}
                        onClick={() => handleNavigateToProfile(comment.authorEntityId, comment.authorEntityType, comment.authorEntityAccountId)}
                      >
                        {comment.authorName || getNameForAccount(comment.accountId, comment.authorEntityAccountId)}
                      </span>
                      {comment.createdAt && (
                        <span className="text-muted-foreground text-xs sm:text-[0.7rem] md:text-xs">
                          {formatTimeDisplay(comment.createdAt)}
                        </span>
                      )}
                    </div>
                    {editingCommentId === comment.id ? (
                      <>
                        <textarea
                          value={editCommentText}
                          onChange={(e) => setEditCommentText(e.target.value)}
                          className={cn(
                            "w-full px-3 py-2 border-[0.5px] border-border/30 rounded-lg",
                            "bg-background text-foreground text-sm outline-none",
                            "transition-all duration-200 resize-vertical min-h-[80px]",
                            "focus:border-primary/40 focus:ring-1 focus:ring-primary/10",
                            "sm:text-xs sm:py-1.5 md:text-sm md:py-2"
                          )}
                          disabled={commentActionLoadingId === comment.id}
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                          <button
                            onClick={handleUpdateExistingComment}
                            className={cn(
                              "px-4 py-2 bg-primary text-primary-foreground border-none rounded-lg",
                              "font-semibold text-sm cursor-pointer transition-all duration-200",
                              "hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
                              "sm:px-3 sm:py-1.5 sm:text-xs md:px-4 md:py-2 md:text-sm"
                            )}
                            disabled={
                              commentActionLoadingId === comment.id ||
                              !editCommentText.trim()
                            }
                          >
                            {commentActionLoadingId === comment.id
                              ? t('action.saving', { defaultValue: "Đang lưu..." })
                              : t('action.save', { defaultValue: "Lưu" })}
                          </button>
                          <button
                            onClick={cancelEditingComment}
                            className={cn(
                              "px-4 py-2 bg-muted/30 text-foreground border-none rounded-lg",
                              "font-semibold text-sm cursor-pointer transition-all duration-200",
                              "hover:bg-muted/50",
                              "sm:px-3 sm:py-1.5 sm:text-xs md:px-4 md:py-2 md:text-sm"
                            )}
                            disabled={commentActionLoadingId === comment.id}
                          >
                            {t('action.cancel')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className={cn(
                        "text-foreground text-sm leading-6 break-words",
                        "max-w-full overflow-hidden",
                        "sm:text-xs sm:leading-5 md:text-sm md:leading-6"
                      )}>
                        {comment.content}
                      </div>
                    )}
                    {comment.images && (
                      <img 
                        src={comment.images} 
                        alt="comment" 
                        className={cn(
                          "max-w-full w-auto h-auto max-h-[200px] rounded-lg my-2",
                          "object-contain cursor-pointer block"
                        )}
                      />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-2 sm:gap-2 sm:mt-1.5">
                  <button
                    onClick={() => handleLikeComment(comment.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 bg-transparent border-none",
                      "text-muted-foreground text-sm px-1 py-1 rounded",
                      "cursor-pointer transition-all duration-200",
                      "hover:bg-muted/30 hover:text-foreground",
                      likedComments.has(comment.id) && "text-danger",
                      "sm:gap-1 sm:text-xs md:text-sm"
                    )}
                    aria-label="Like comment"
                  >
                    <svg className="w-5 h-5 flex-shrink-0 sm:w-4 sm:h-4 md:w-5 md:h-5" width="20" height="20" viewBox="0 0 24 24" fill={likedComments.has(comment.id) ? "currentColor" : "none"} stroke="currentColor">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span className="font-semibold min-w-[1.25rem] text-left sm:min-w-[1rem]">{comment.likes}</span>
                  </button>
                  <button
                    onClick={() => setReplyingTo({ commentId: comment.id, type: "comment" })}
                    className={cn(
                      "bg-transparent border-none text-muted-foreground text-sm",
                      "px-1 py-1 rounded cursor-pointer transition-all duration-200",
                      "hover:bg-muted/30 hover:text-foreground",
                      "sm:text-xs md:text-sm"
                    )}
                  >
                    {t('comment.reply')}
                  </button>
                  {canManageComment(comment) && editingCommentId !== comment.id && (
                    <>
                      <button
                        onClick={() => startEditingComment(comment)}
                        className={cn(
                          "bg-transparent border-none text-muted-foreground text-sm",
                          "px-1 py-1 rounded cursor-pointer transition-all duration-200",
                          "hover:bg-muted/30 hover:text-foreground",
                          "sm:text-xs md:text-sm"
                        )}
                      >
                        {t('action.edit', { defaultValue: "Chỉnh sửa" })}
                      </button>
                      <button
                        onClick={() => handleDeleteCommentClick(comment.id)}
                        className={cn(
                          "bg-transparent border-none text-danger/90 text-sm",
                          "px-1 py-1 rounded cursor-pointer transition-all duration-200",
                          "hover:bg-danger/10",
                          "sm:text-xs md:text-sm"
                        )}
                        disabled={commentActionLoadingId === comment.id}
                      >
                        {commentActionLoadingId === comment.id
                          ? t('action.deleting', { defaultValue: "Đang xóa..." })
                          : t('action.delete', { defaultValue: "Xóa" })}
                      </button>
                    </>
                  )}
                </div>

                {/* Reply Input */}
                {replyingTo?.commentId === comment.id && replyingTo.type === "comment" && (
                  <div className={cn(
                    "flex flex-wrap items-stretch gap-2 mt-2 p-2 bg-muted/10 rounded-lg",
                    "sm:flex-nowrap sm:gap-1.5 sm:mt-1.5 sm:p-1.5"
                  )}>
                    <input
                      type="text"
                      placeholder={t('input.writeReply')}
                      value={replyContent[comment.id]?.replyText || ""}
                      onChange={(e) =>
                        setReplyContent((prev) => ({
                          ...prev,
                          [comment.id]: { replyText: e.target.value }
                        }))
                      }
                      className={cn(
                        "flex-1 min-w-0 w-full px-2 py-2 border-[0.5px] border-border/20 rounded-lg",
                        "bg-background text-foreground text-sm outline-none",
                        "transition-all duration-200",
                        "focus:border-primary/40 focus:ring-1 focus:ring-primary/10",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "sm:w-auto sm:px-1.5 sm:py-1.5 sm:text-xs md:px-2 md:py-2 md:text-sm"
                      )}
                      disabled={submitting}
                    />
                    <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto sm:gap-1.5">
                      <button
                        onClick={() => handleAddReply(comment.id)}
                        className={cn(
                          "flex-1 sm:flex-none px-4 py-2 bg-primary text-primary-foreground border-none rounded-lg",
                          "font-semibold text-sm cursor-pointer transition-all duration-200",
                          "hover:opacity-90",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          "sm:px-3 sm:py-1.5 sm:text-xs md:px-4 md:py-2 md:text-sm"
                        )}
                        disabled={submitting || !(replyContent[comment.id]?.replyText || "").trim()}
                      >
                        {submitting ? t('action.posting') : t('action.post')}
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
                        className={cn(
                          "flex-1 sm:flex-none px-4 py-2 bg-muted/30 text-foreground border-none rounded",
                          "font-semibold text-sm cursor-pointer transition-all duration-200",
                          "hover:bg-muted/50",
                          "sm:px-3 sm:py-1.5 sm:text-xs md:px-4 md:py-2 md:text-sm"
                        )}
                      >
                        {t('action.cancel')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className={cn("ml-6 mt-3 pl-4 border-l-2 border-border/30", "sm:ml-4 sm:mt-2 sm:pl-3")}>
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="py-2 sm:py-1.5">
                        <div className="flex gap-2 items-start sm:gap-1.5">
                          <img 
                            className="w-7 h-7 rounded-full object-cover flex-shrink-0 cursor-pointer sm:w-6 sm:h-6 md:w-7 md:h-7" 
                            src={reply.authorAvatar || getAvatarForAccount(reply.accountId, reply.authorEntityAccountId)} 
                            alt="avatar"
                            onClick={() => handleNavigateToProfile(reply.authorEntityId, reply.authorEntityType, reply.authorEntityAccountId)}
                          />
                          <div className="flex-1 flex flex-col gap-1 min-w-0 max-w-full overflow-hidden">
                            <div className="flex items-center gap-2 mb-1 sm:gap-1.5">
                              <span 
                                className={cn(
                                  "text-foreground font-semibold text-[0.85rem] cursor-pointer",
                                  "hover:underline",
                                  "sm:text-[0.75rem] md:text-[0.85rem]"
                                )}
                                onClick={() => handleNavigateToProfile(reply.authorEntityId, reply.authorEntityType, reply.authorEntityAccountId)}
                              >
                                {reply.authorName || getNameForAccount(reply.accountId, reply.authorEntityAccountId)}
                              </span>
                              {reply.createdAt && (
                                <span className="text-muted-foreground text-[0.7rem] sm:text-[0.65rem] md:text-[0.7rem]">
                                  {formatTimeDisplay(reply.createdAt)}
                                </span>
                              )}
                            </div>
                            {editingReplyTarget &&
                             editingReplyTarget.commentId === comment.id &&
                             editingReplyTarget.replyId === reply.id ? (
                              <>
                                <textarea
                                  value={editReplyText}
                                  onChange={(e) => setEditReplyText(e.target.value)}
                                  className={cn(
                                    "w-full px-3 py-2 border-[0.5px] border-border/30 rounded-lg",
                                    "bg-background text-foreground text-sm outline-none",
                                    "transition-all duration-200 resize-vertical min-h-[70px]",
                                    "focus:border-primary/40 focus:ring-1 focus:ring-primary/10",
                                    "sm:text-xs sm:py-1.5 md:text-sm md:py-2"
                                  )}
                                  disabled={replyActionLoadingKey === `${comment.id}-${reply.id}`}
                                />
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <button
                                    onClick={handleUpdateExistingReply}
                                    className={cn(
                                      "px-4 py-2 bg-primary text-primary-foreground border-none rounded-lg",
                                      "font-semibold text-sm cursor-pointer transition-all duration-200",
                                      "hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
                                      "sm:px-3 sm:py-1.5 sm:text-xs md:px-4 md:py-2 md:text-sm"
                                    )}
                                    disabled={
                                      replyActionLoadingKey === `${comment.id}-${reply.id}` ||
                                      !editReplyText.trim()
                                    }
                                  >
                                    {replyActionLoadingKey === `${comment.id}-${reply.id}`
                                      ? t('action.saving', { defaultValue: "Đang lưu..." })
                                      : t('action.save', { defaultValue: "Lưu" })}
                                  </button>
                                  <button
                                    onClick={cancelEditingReply}
                                    className={cn(
                                      "px-4 py-2 bg-muted/30 text-foreground border-none rounded-lg",
                                      "font-semibold text-sm cursor-pointer transition-all duration-200",
                                      "hover:bg-muted/50",
                                      "sm:px-3 sm:py-1.5 sm:text-xs md:px-4 md:py-2 md:text-sm"
                                    )}
                                    disabled={replyActionLoadingKey === `${comment.id}-${reply.id}`}
                                  >
                                    {t('action.cancel')}
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className={cn(
                                "text-foreground text-[0.85rem] leading-6 break-words",
                                "max-w-full overflow-hidden",
                                "sm:text-[0.75rem] sm:leading-5 md:text-[0.85rem] md:leading-6"
                              )}>
                                {reply.content}
                              </div>
                            )}
                            {reply.images && (
                              <img 
                                src={reply.images} 
                                alt="reply" 
                                className={cn(
                                  "max-w-full w-auto h-auto max-h-[150px] rounded-lg my-2",
                                  "object-contain cursor-pointer block"
                                )}
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 sm:gap-2">
                          <button
                            onClick={() => handleLikeReply(comment.id, reply.id)}
                            className={cn(
                              "inline-flex items-center gap-1.5 bg-transparent border-none",
                              "text-muted-foreground text-sm px-1 py-1 rounded",
                              "cursor-pointer transition-all duration-200",
                              "hover:bg-muted/30 hover:text-foreground",
                              likedReplies.has(`${comment.id}-${reply.id}`) && "text-danger",
                              "sm:gap-1 sm:text-xs md:text-sm"
                            )}
                            aria-label="Like reply"
                          >
                            <svg className="w-5 h-5 flex-shrink-0 sm:w-4 sm:h-4 md:w-5 md:h-5" width="20" height="20" viewBox="0 0 24 24" fill={likedReplies.has(`${comment.id}-${reply.id}`) ? "currentColor" : "none"} stroke="currentColor">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            <span className="font-semibold min-w-[1.25rem] text-left sm:min-w-[1rem]">{reply.likes}</span>
                          </button>
                          <button
                            onClick={() => setReplyingTo({ commentId: comment.id, replyId: reply.id, type: "reply" })}
                            className={cn(
                              "bg-transparent border-none text-muted-foreground text-sm",
                              "px-1 py-1 rounded cursor-pointer transition-all duration-200",
                              "hover:bg-muted/30 hover:text-foreground",
                              "sm:text-xs md:text-sm"
                            )}
                          >
                            {t('comment.reply')}
                          </button>
                          {canManageReply(reply) &&
                            (!editingReplyTarget ||
                             editingReplyTarget.replyId !== reply.id ||
                             editingReplyTarget.commentId !== comment.id) && (
                              <>
                                <button
                                  onClick={() => startEditingReply(comment.id, reply)}
                                  className={cn(
                                    "bg-transparent border-none text-muted-foreground text-sm",
                                    "px-1 py-1 rounded cursor-pointer transition-all duration-200",
                                    "hover:bg-muted/30 hover:text-foreground",
                                    "sm:text-xs md:text-sm"
                                  )}
                                >
                                  {t('action.edit', { defaultValue: "Chỉnh sửa" })}
                                </button>
                                <button
                                  onClick={() => handleDeleteReplyClick(comment.id, reply.id)}
                                  className={cn(
                                    "bg-transparent border-none text-danger/90 text-sm",
                                    "px-1 py-1 rounded cursor-pointer transition-all duration-200",
                                    "hover:bg-danger/10",
                                    "sm:text-xs md:text-sm"
                                  )}
                                  disabled={replyActionLoadingKey === `${comment.id}-${reply.id}`}
                                >
                                  {replyActionLoadingKey === `${comment.id}-${reply.id}`
                                    ? t('action.deleting', { defaultValue: "Đang xóa..." })
                                    : t('action.delete', { defaultValue: "Xóa" })}
                                </button>
                              </>
                            )}
                        </div>

                        {/* Reply to Reply Input */}
                        {replyingTo?.replyId === reply.id && replyingTo.type === "reply" && (
                          <div className={cn(
                            "flex flex-wrap items-stretch gap-2 mt-2 p-2 bg-muted/10 rounded-lg",
                            "sm:flex-nowrap sm:gap-1.5 sm:mt-1.5 sm:p-1.5"
                          )}>
                            <input
                              type="text"
                              placeholder={t('input.writeReply')}
                              value={replyContent[`${comment.id}-${reply.id}`]?.replyText || ""}
                              onChange={(e) =>
                                setReplyContent((prev) => ({
                                  ...prev,
                                  [`${comment.id}-${reply.id}`]: { replyText: e.target.value, replyToId: reply.id }
                                }))
                              }
                              className={cn(
                                "flex-1 min-w-0 w-full px-2 py-2 border-[0.5px] border-border/20 rounded-lg",
                                "bg-background text-foreground text-sm outline-none",
                                "transition-all duration-200",
                                "focus:border-primary/40 focus:ring-1 focus:ring-primary/10",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                "sm:w-auto sm:px-1.5 sm:py-1.5 sm:text-xs md:px-2 md:py-2 md:text-sm"
                              )}
                              disabled={submitting}
                            />
                            <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto sm:gap-1.5">
                              <button
                                onClick={() => handleAddReply(comment.id, reply.id)}
                                className={cn(
                                  "flex-1 sm:flex-none px-4 py-2 bg-primary text-primary-foreground border-none rounded-lg",
                                  "font-semibold text-sm cursor-pointer transition-all duration-200",
                                  "hover:opacity-90",
                                  "disabled:opacity-50 disabled:cursor-not-allowed",
                                  "sm:px-3 sm:py-1.5 sm:text-xs md:px-4 md:py-2 md:text-sm"
                                )}
                                disabled={submitting || !(replyContent[`${comment.id}-${reply.id}`]?.replyText || "").trim()}
                              >
                                {submitting ? t('action.posting') : t('action.post')}
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
                                className={cn(
                                  "flex-1 sm:flex-none px-4 py-2 bg-muted/30 text-foreground border-none rounded",
                                  "font-semibold text-sm cursor-pointer transition-all duration-200",
                                  "hover:bg-muted/50",
                                  "sm:px-3 sm:py-1.5 sm:text-xs md:px-4 md:py-2 md:text-sm"
                                )}
                              >
                                {t('action.cancel')}
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
      {/* Add Comment Form - Outside flex-1 container to always be visible */}
      <form onSubmit={handleAddComment} className={cn(
        "flex flex-wrap items-stretch gap-2 p-4 border-t border-border/30 bg-card/80 backdrop-blur-sm",
        "flex-shrink-0 relative z-10",
        "sm:flex-nowrap sm:gap-1.5 sm:p-3 md:p-4"
      )}>
          <input
            type="text"
            placeholder={t('input.writeComment')}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          className={cn(
            "flex-1 min-w-0 w-full px-4 py-3 border-[0.5px] border-border/20 rounded-lg",
            "bg-background text-foreground text-sm outline-none",
            "transition-all duration-200",
            "focus:border-primary focus:ring-2 focus:ring-primary/10",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "sm:w-auto sm:px-3 sm:py-2 sm:text-xs md:px-4 md:py-3 md:text-sm"
          )}
            disabled={submitting}
          />
          <button
            type="submit"
          className={cn(
            "w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground",
            "border-none rounded-lg font-medium text-sm cursor-pointer",
            "transition-all duration-300 shadow-[0_4px_16px_rgba(var(--primary),0.4)]",
            "hover:shadow-[0_6px_24px_rgba(var(--primary),0.5)]",
            "active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
            "sm:px-4 sm:py-2 sm:text-xs md:px-6 md:py-3 md:text-sm"
          )}
            disabled={submitting || !newComment.trim()}
          >
            {submitting ? t('action.posting') : t('action.post')}
          </button>
        </form>
      </div>
    </>
  );
}

CommentSection.propTypes = {
  postId: PropTypes.string.isRequired,
  onClose: PropTypes.func,
  inline: PropTypes.bool,
  alwaysOpen: PropTypes.bool,
  scrollToCommentId: PropTypes.string,
};

