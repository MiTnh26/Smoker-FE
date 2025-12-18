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

const ANONYMOUS_AVATAR_URL = "/images/an-danh.png";

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
  const [sortOrder, setSortOrder] = useState("mostLiked"); // "mostLiked", "newest", or "oldest"
  const commentRefs = useRef({}); // Refs for scrolling to specific comments
  const [viewerAccountId, setViewerAccountId] = useState(null);
  const [viewerEntityAccountId, setViewerEntityAccountId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [editingReplyTarget, setEditingReplyTarget] = useState(null); // { commentId, replyId }
  const [editReplyText, setEditReplyText] = useState("");
  const [commentActionLoadingId, setCommentActionLoadingId] = useState(null);
  const [replyActionLoadingKey, setReplyActionLoadingKey] = useState(null);
  const [viewerName, setViewerName] = useState("");
  const [viewerAvatar, setViewerAvatar] = useState(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, bottom: 0 });
  const roleMenuRef = useRef(null);
  const menuRef = useRef(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [canUseAnonymous, setCanUseAnonymous] = useState(false);

  const normalizeId = (value) => (value ? String(value).trim() : null);

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

      const name = activeEntity?.name || activeEntity?.userName || currentUser?.userName || "User";
      const avatar = activeEntity?.avatar || currentUser?.avatar || null;

      return {
        accountId: normalizeId(accountId),
        entityAccountId: normalizeId(entityAccountId),
        name,
        avatar
      };
    } catch (error) {
      return { accountId: null, entityAccountId: null, name: "User", avatar: null };
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

  // Helper function to count likes for a comment/reply
  const countLikes = (item) => {
    if (!item?.likes) return 0;
    if (item.likes instanceof Map) return item.likes.size;
    if (Array.isArray(item.likes)) return item.likes.length;
    if (typeof item.likes === 'object') return Object.keys(item.likes).length;
    if (typeof item.likes === 'number') return item.likes;
    return 0;
  };

  // Helper function to sort comments array
  const sortComments = (commentsArray, order) => {
    const sorted = [...commentsArray].sort((a, b) => {
      if (order === "mostLiked") {
        // Sort by likes (descending), then by date (newest first) as tiebreaker
        const likesA = countLikes(a);
        const likesB = countLikes(b);
        if (likesB !== likesA) {
          return likesB - likesA; // Most liked first
        }
        // If same likes, sort by newest
        const dateA = new Date(a.createdAt || a.updatedAt || 0);
        const dateB = new Date(b.createdAt || b.updatedAt || 0);
        return dateB - dateA;
      } else if (order === "newest") {
        const dateA = new Date(a.createdAt || a.updatedAt || 0);
        const dateB = new Date(b.createdAt || b.updatedAt || 0);
        return dateB - dateA; // Newest first
      } else {
        // "oldest"
        const dateA = new Date(a.createdAt || a.updatedAt || 0);
        const dateB = new Date(b.createdAt || b.updatedAt || 0);
        return dateA - dateB; // Oldest first
      }
    });

    // Sort replies within each comment (replies always sorted by newest for now)
    for (const comment of sorted) {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = [...comment.replies].sort((a, b) => {
          const dateA = new Date(a.createdAt || a.updatedAt || 0);
          const dateB = new Date(b.createdAt || b.updatedAt || 0);
          return dateB - dateA; // Replies always newest first
        });
      }
    }

    return sorted;
  };

  useEffect(() => {
    // Skip loading comments if only showing input form
    loadComments();
  }, [postId]);

  useEffect(() => {
    const identity = resolveViewerIdentity();
    setViewerAccountId(identity.accountId);
    setViewerEntityAccountId(identity.entityAccountId);
    setViewerName(identity.name || "User");
    setViewerAvatar(identity.avatar);

    // Chỉ user thường (Account/Customer) mới được phép ẩn danh
    try {
      const raw = localStorage.getItem("session");
      const session = raw ? JSON.parse(raw) : null;
      const currentUser = session?.account;
      const activeEntity = session?.activeEntity || currentUser;

      const role = (activeEntity?.role || currentUser?.role || "").toString().toLowerCase();
      const isCustomer =
        !role || role === "customer" || role === "account";

      setCanUseAnonymous(Boolean(isCustomer));
    } catch (error) {
      console.error("Error resolving viewer role:", error);
      setCanUseAnonymous(false);
    }
  }, []);

  // Calculate menu position when it opens
  useEffect(() => {
    if (roleMenuOpen && roleMenuRef.current) {
      const rect = roleMenuRef.current.getBoundingClientRect();
      setMenuPosition({
        left: rect.left,
        bottom: window.innerHeight - rect.top + 8
      });
    }
  }, [roleMenuOpen]);

  // Close role menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target) &&
          menuRef.current && !menuRef.current.contains(e.target)) {
        setRoleMenuOpen(false);
      }
    };
    if (roleMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [roleMenuOpen]);

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

  // Prevent body scroll when comment section is open (modal mode)
  useEffect(() => {
    if (!inline && !alwaysOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [inline, alwaysOpen]);

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

            // Transform replies from Map/Object/Array to array
            const repliesArray = [];
            if (comment.replies) {
              // Backend đã trả về replies là array, xử lý trực tiếp
              if (Array.isArray(comment.replies)) {
                for (const reply of comment.replies) {
                  if (!reply || typeof reply !== 'object') continue;
                  
                  // Get likeCount from stats if available, otherwise calculate from likes
                  const likeCount = reply.stats?.likeCount ?? 
                                  (reply.likes ? (typeof reply.likes === 'object' ? Object.keys(reply.likes).length : reply.likes) : 0);
                  
                  // Get isLikedByMe from stats if available (backend should provide this)
                  const isLikedByMe = reply.stats?.isLikedByMe ?? 
                                    (typeof reply.likedByViewer === "boolean" ? reply.likedByViewer : false);
                  
                  repliesArray.push({
                    id: extractId(reply.id) || extractId(reply._id) || String(reply.id || reply._id),
                    accountId: reply.accountId,
                    content: reply.content || "",
                    images: reply.images || "",
                    likes: likeCount,
                    likesObject: reply.likes, // Preserve original likes object
                    replyToId: reply.replyToId ? extractId(reply.replyToId) : null,
                    typeRole: reply.typeRole,
                    createdAt: reply.createdAt,
                    updatedAt: reply.updatedAt,
                    // Author info from backend (ưu tiên flat fields, fallback nested author object)
                    authorName: reply.authorName || reply.author?.name || 'Người dùng',
                    authorAvatar: reply.authorAvatar || reply.author?.avatar || null,
                    authorEntityAccountId: reply.authorEntityAccountId || reply.author?.entityAccountId || null,
                    authorEntityType: reply.authorEntityType || reply.author?.entityType || null,
                    authorEntityId: reply.authorEntityId || reply.author?.entityId || null,
                    // Stats from backend - set both isLikedByMe and likedByViewer for compatibility
                    isLikedByMe: isLikedByMe,
                    likedByViewer: isLikedByMe
                  });
                }
              }
              // Legacy: Handle Map/Object format (backward compatibility)
              else if (typeof comment.replies === 'object' && !Array.isArray(comment.replies)) {
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
                  
                  // Get likeCount from stats if available, otherwise calculate from likes
                  const likesCount = reply.stats?.likeCount ?? 
                                  (reply.likes ? (typeof reply.likes === 'object' ? Object.keys(reply.likes).length : reply.likes) : 0);
                  
                  // Get isLikedByMe from stats if available (backend should provide this)
                  const isLikedByMe = reply.stats?.isLikedByMe ?? 
                                    (typeof reply.likedByViewer === "boolean" ? reply.likedByViewer : false);
                  
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
                    // Author info from backend (ưu tiên flat fields, fallback nested author object)
                    authorName: reply.authorName || reply.author?.name || 'Người dùng',
                    authorAvatar: reply.authorAvatar || reply.author?.avatar || null,
                    authorEntityAccountId: reply.authorEntityAccountId || reply.author?.entityAccountId || null,
                    authorEntityType: reply.authorEntityType || reply.author?.entityType || null,
                    authorEntityId: reply.authorEntityId || reply.author?.entityId || null,
                    // Stats from backend - set both isLikedByMe and likedByViewer for compatibility
                    isLikedByMe: isLikedByMe,
                    likedByViewer: isLikedByMe
                  });
                }
              }
            }

            const extractedCommentId = extractId(commentId) || extractId(comment._id) || extractId(comment.id) || String(commentId);
            // Get likeCount from stats if available, otherwise calculate from likes
            const likesCount = comment.stats?.likeCount ?? 
                              (typeof comment.likesCount === "number"
                                ? Number(comment.likesCount)
                                : countCollectionItems(comment.likes));
            // Get author info - use fallback if not provided by backend
            const identity = resolveViewerIdentity();
            const commentEntityAccountId = normalizeId(comment.entityAccountId || comment.authorEntityAccountId);
            const isCurrentUser = commentEntityAccountId === normalizeId(viewerEntityAccountId || identity.entityAccountId);
            // Anonymous temporarily disabled
            const isAnonymousComment = false;
            const anonymousIndex = comment.anonymousIndex;

            // Get isLikedByMe from stats if available
            const isLikedByMe = comment.stats?.isLikedByMe ?? 
                               (typeof comment.likedByViewer === "boolean" ? comment.likedByViewer : undefined);
            
            commentsArray.push({
              id: extractedCommentId,
              accountId: comment.accountId,
              content: comment.content || "",
              images: comment.images || "",
              likes: likesCount,
              likesObject: comment.likes,
              likedByViewer: isLikedByMe, // Use stats.isLikedByMe from backend
              canManage: typeof comment.canManage === "boolean" ? comment.canManage : isCurrentUser,
              typeRole: comment.typeRole,
              replies: repliesArray,
              createdAt: comment.createdAt,
              updatedAt: comment.updatedAt,
              isAnonymous: isAnonymousComment,
              anonymousIndex: anonymousIndex,
              // Author info: always show real identity while anonymous is disabled
              authorName: comment.authorName || comment.author?.name || (isCurrentUser ? (viewerName || identity.name || "User") : "Người dùng"),
              authorAvatar: comment.authorAvatar || comment.author?.avatar || (isCurrentUser ? (viewerAvatar || identity.avatar) : null),
              authorEntityAccountId: comment.authorEntityAccountId || comment.author?.entityAccountId || comment.entityAccountId,
              authorEntityType: comment.authorEntityType || comment.author?.entityType || comment.entityType,
              authorEntityId: comment.authorEntityId || comment.author?.entityId || comment.entityId
            });
          }
        }

        // Sort comments with current sortOrder
        const sortedComments = sortComments(commentsArray, sortOrder);
        
        // Log to debug
        console.log('[CommentSection] Transformed comments:', {
          total: sortedComments.length,
          comments: sortedComments.map(c => ({
            id: c.id,
            content: c.content?.substring(0, 20),
            authorName: c.authorName,
            createdAt: c.createdAt
          }))
        });
        
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
                // Check isLikedByMe from stats first, then likedByViewer for backward compatibility
                if (reply.isLikedByMe || reply.likedByViewer) {
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
      setComments([]);
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

      // Lấy entityAccountId, entityId, entityType từ activeEntity (trim để đảm bảo format đúng)
      const rawEntityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
      const entityAccountId = rawEntityAccountId ? String(rawEntityAccountId).trim() : null;
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
        const commentText = newComment.trim();
        setNewComment("");
        
        // Switch to "newest" sort first to ensure new comment appears at top
        if (sortOrder !== "newest") {
          setSortOrder("newest");
        }
        
        // Create new comment object with current user info
        const identity = resolveViewerIdentity();
        const now = new Date().toISOString();
        const newCommentObj = {
          id: `temp-${Date.now()}`,
          accountId: identity.accountId,
          content: commentText,
          images: "",
          likes: 0,
          likesObject: {},
          likedByViewer: false,
          canManage: true,
          typeRole: entityType,
          replies: [],
          createdAt: now,
          updatedAt: now,
          authorName: viewerName || identity.name || "User",
          authorAvatar: viewerAvatar || identity.avatar || null,
          authorEntityAccountId: normalizeId(entityAccountId),
          authorEntityType: entityType,
          authorEntityId: entityId
        };
        
        // Add comment to state immediately (optimistic update) - always at top for newest sort
        setComments(prev => {
          const updated = [newCommentObj, ...prev];
          console.log('[CommentSection] Added optimistic comment:', {
            newCommentId: newCommentObj.id,
            totalComments: updated.length,
            content: newCommentObj.content
          });
          return updated;
        });
        
        // Reload in background to get full comment data from server
        // Merge new comments instead of replacing all to preserve optimistic update
        setTimeout(async () => {
          try {
            setLoading(true);
            const response = await getPostDetail(postId, {
              includeMedias: true,
              includeMusic: true
            });

            let post = null;
            if (response?.success && response.data) {
              post = response.data;
            } else if (response && response.comments) {
              post = response;
            } else if (response?.data && response.data.comments) {
              post = response.data;
            }

            if (post && post.comments) {
              // Transform comments (same logic as loadComments)
              const commentsArray = [];
              if (post.comments && typeof post.comments === 'object') {
                let commentsData = [];
                if (post.comments instanceof Map) {
                  commentsData = Array.from(post.comments.entries());
                } else if (Array.isArray(post.comments)) {
                  commentsData = post.comments.map((comment, index) => [
                    extractId(comment._id) || extractId(comment.id) || `comment-${index}`,
                    comment
                  ]);
                } else {
                  commentsData = Object.entries(post.comments);
                }

                for (const [commentId, comment] of commentsData) {
                  if (!comment || typeof comment !== 'object') continue;
                  
                  const identity = resolveViewerIdentity();
                  const commentEntityAccountId = normalizeId(comment.entityAccountId || comment.authorEntityAccountId);
                  const isCurrentUser = commentEntityAccountId === normalizeId(viewerEntityAccountId || identity.entityAccountId);
                  
                  const extractedCommentId = extractId(commentId) || extractId(comment._id) || String(commentId);
                  const likesCount = typeof comment.likesCount === "number"
                    ? Number(comment.likesCount)
                    : countCollectionItems(comment.likes);
                  
                  commentsArray.push({
                    id: extractedCommentId,
                    accountId: comment.accountId,
                    content: comment.content || "",
                    images: comment.images || "",
                    likes: likesCount,
                    likesObject: comment.likes,
                    likedByViewer: typeof comment.likedByViewer === "boolean" ? comment.likedByViewer : undefined,
                    canManage: typeof comment.canManage === "boolean" ? comment.canManage : isCurrentUser,
                    typeRole: comment.typeRole,
                    replies: comment.replies ? (Array.isArray(comment.replies) ? comment.replies : Object.values(comment.replies)) : [],
                    createdAt: comment.createdAt,
                    updatedAt: comment.updatedAt,
                    authorName: comment.authorName || (isCurrentUser ? (viewerName || identity.name || "User") : "Người dùng"),
                    authorAvatar: comment.authorAvatar || (isCurrentUser ? (viewerAvatar || identity.avatar) : null),
                    authorEntityAccountId: comment.authorEntityAccountId || comment.entityAccountId,
                    authorEntityType: comment.authorEntityType || comment.entityType,
                    authorEntityId: comment.authorEntityId || comment.entityId
                  });
                }
              }

              // Merge with existing comments - keep optimistic comment if server hasn't returned it yet
              setComments(prev => {
                const serverCommentIds = new Set(commentsArray.map(c => c.id));
                // Remove temp comments that are now in server response
                const keptOptimistic = prev.filter(c => !c.id.startsWith('temp-') || !serverCommentIds.has(c.id));
                // Merge: server comments + kept optimistic comments
                const merged = [...commentsArray, ...keptOptimistic.filter(c => !serverCommentIds.has(c.id))];
                return sortComments(merged, sortOrder);
              });
            }
          } catch (error) {
            console.error("Error reloading comments:", error);
          } finally {
            setLoading(false);
          }
        }, 1000);
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

      // Lấy entityAccountId, entityId, entityType từ activeEntity (trim để đảm bảo format đúng)
      const rawEntityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
      const entityAccountId = rawEntityAccountId ? String(rawEntityAccountId).trim() : null;
      const entityId = activeEntity?.entityId || currentUser?.id;
      const entityType = typeRole;
      // Nếu đang bật chế độ ẩn danh và user được phép ẩn danh thì reply cũng phải ẩn danh
      const useAnonymous = canUseAnonymous && isAnonymous;

      console.log('[CommentSection] Add reply request:', {
        postId,
        commentId,
        replyToId,
        entityAccountId,
        typeRole,
        text: text.substring(0, 50)
      });

      let response;
      if (replyToId) {
        // Reply to a reply - use addReplyToReply API
        response = await addReplyToReply(postId, commentId, replyToId, {
          content: text,
          typeRole: typeRole,
          entityAccountId: entityAccountId,
          entityId: entityId,
          entityType: entityType,
          isAnonymous: useAnonymous
        });
      } else {
        // Reply to a comment
        response = await addReply(postId, commentId, {
          content: text,
          typeRole: typeRole,
          entityAccountId: entityAccountId,
          entityId: entityId,
          entityType: entityType,
          isAnonymous: useAnonymous
        });
      }

      console.log('[CommentSection] Add reply response:', response);

      // Axios interceptor unwraps response.data, so response is already the backend response
      // Handle different response structures
      const isSuccess = response?.success === true || response?.data?.success === true;
      
      if (isSuccess) {
        setReplyContent(prev => {
          const newState = { ...prev };
          delete newState[replyKey];
          return newState;
        });
        setReplyingTo(null);
        // setMessage({ type: "success", text: "Đã thêm phản hồi thành công!" });
        // setTimeout(() => setMessage(null), 3000);

        // Reload comments immediately to show the new reply
        await loadComments();
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

      // Lấy entityAccountId từ activeEntity (trim để đảm bảo format đúng)
      const rawEntityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
      const entityAccountId = rawEntityAccountId ? String(rawEntityAccountId).trim() : null;

      console.log('[CommentSection] Like comment request:', {
        postId,
        commentId,
        entityAccountId,
        typeRole,
        alreadyLiked
      });

      const response = alreadyLiked
        ? await unlikeComment(postId, commentId, { entityAccountId })
        : await likeComment(postId, commentId, { typeRole, entityAccountId });

      console.log('[CommentSection] Like comment response:', response);

      // Axios interceptor unwraps response.data, so response is already the backend response
      // Backend returns: { success: true, data: post, message: "..." }
      const isSuccess = response?.success === true || response?.data?.success === true;
      
      if (isSuccess) {
        // Không reload comments để tránh nháy UI, chỉ update state local
        // State đã được update optimistic rồi, chỉ cần sync likedComments set
        // Đảm bảo likedComments set được sync với state
        if (!alreadyLiked) {
          // Đã like thành công, thêm vào set
          setLikedComments(prev => {
            const newSet = new Set(prev);
            newSet.add(commentId);
            return newSet;
          });
        } else {
          // Đã unlike thành công, xóa khỏi set
          setLikedComments(prev => {
            const newSet = new Set(prev);
            newSet.delete(commentId);
            return newSet;
          });
        }
        
        // Sync likedByViewer và likes count từ response nếu có
        if (response?.data?.comments) {
          const updatedPost = response.data;
          if (updatedPost.comments && Array.isArray(updatedPost.comments)) {
            const updatedComment = updatedPost.comments.find(c => 
              String(c.id) === String(commentId) || 
              String(c._id) === String(commentId)
            );
            if (updatedComment) {
              // Update likedByViewer và likes count từ backend
              setComments(prev => prev.map(c => {
                if (c.id !== commentId) return c;
                return {
                  ...c,
                  likedByViewer: updatedComment.stats?.isLikedByMe ?? !alreadyLiked,
                  likes: updatedComment.stats?.likeCount ?? c.likes
                };
              }));
            }
          }
        }
      } else {
        console.warn('[CommentSection] Like comment failed:', response);
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
        setMessage({ type: "error", text: response?.message || "Không thể thích bình luận" });
        setTimeout(() => setMessage(null), 3000);
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

      // Lấy entityAccountId từ activeEntity (trim để đảm bảo format đúng)
      const rawEntityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
      const entityAccountId = rawEntityAccountId ? String(rawEntityAccountId).trim() : null;

      console.log('[CommentSection] Like reply request:', {
        postId,
        commentId,
        replyId,
        entityAccountId,
        typeRole,
        alreadyLiked
      });

      const response = alreadyLiked
        ? await unlikeReply(postId, commentId, replyId, { entityAccountId })
        : await likeReply(postId, commentId, replyId, { typeRole, entityAccountId });

      console.log('[CommentSection] Like reply response:', response);

      // Axios interceptor unwraps response.data, so response is already the backend response
      const isSuccess = response?.success === true || response?.data?.success === true;
      
      if (isSuccess) {
        // Không reload comments để tránh nháy UI, chỉ update state local
        // State đã được update optimistic rồi, chỉ cần sync likedReplies set
        // Đảm bảo likedReplies set được sync với state
        if (!alreadyLiked) {
          // Đã like thành công, thêm vào set
          setLikedReplies(prev => {
            const newSet = new Set(prev);
            newSet.add(replyKey);
            return newSet;
          });
        } else {
          // Đã unlike thành công, xóa khỏi set
          setLikedReplies(prev => {
            const newSet = new Set(prev);
            newSet.delete(replyKey);
            return newSet;
          });
        }
        
        // Sync isLikedByMe và likes count từ response nếu có
        if (response?.data?.comments) {
          const updatedPost = response.data;
          if (updatedPost.comments && Array.isArray(updatedPost.comments)) {
            const updatedComment = updatedPost.comments.find(c => 
              String(c.id) === String(commentId) || 
              String(c._id) === String(commentId)
            );
            if (updatedComment && updatedComment.replies && Array.isArray(updatedComment.replies)) {
              const updatedReply = updatedComment.replies.find(r => 
                String(r.id) === String(replyId) || 
                String(r._id) === String(replyId)
              );
              if (updatedReply) {
                // Update isLikedByMe và likes count từ backend
                setComments(prev => prev.map(c => {
                  if (c.id !== commentId) return c;
                  const replies = (c.replies || []).map(r => {
                    if (r.id !== replyId) return r;
                      return {
                        ...r,
                        isLikedByMe: updatedReply.stats?.isLikedByMe ?? !alreadyLiked,
                        likedByViewer: updatedReply.stats?.isLikedByMe ?? !alreadyLiked,
                        likes: updatedReply.stats?.likeCount ?? r.likes
                      };
                  });
                  return { ...c, replies };
                }));
              }
            }
          }
        }
      } else {
        console.warn('[CommentSection] Like reply failed:', response);
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
        setMessage({ type: "error", text: response?.message || "Không thể thích phản hồi" });
        setTimeout(() => setMessage(null), 3000);
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


  // Show loading
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
        <div className={cn(
          "flex-1 overflow-y-auto p-4",
          "scrollbar-hide"
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
              {t('comment.sort') || 'Sắp xếp:'}
            </span>
            <button
              className={cn(
                "px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200",
                "bg-transparent border-none cursor-pointer",
                sortOrder === "mostLiked" 
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                "sm:px-2 sm:py-1 sm:text-xs md:px-3 md:py-1.5 md:text-sm"
              )}
              onClick={() => setSortOrder("mostLiked")}
            >
              {t('comment.mostLiked') || 'Yêu thích'}
            </button>
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
              {t('comment.newest') || 'Mới nhất'}
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
              {t('comment.oldest') || 'Cũ nhất'}
            </button>
          </div>
        )}

        {/* Comments List */}
        <div className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0 scrollbar-hide",
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
                              (reply.isLikedByMe || likedReplies.has(`${comment.id}-${reply.id}`)) && "text-danger",
                              "sm:gap-1 sm:text-xs md:text-sm"
                            )}
                            aria-label="Like reply"
                          >
                            <svg className="w-5 h-5 flex-shrink-0 sm:w-4 sm:h-4 md:w-5 md:h-5" width="20" height="20" viewBox="0 0 24 24" fill={(reply.isLikedByMe || likedReplies.has(`${comment.id}-${reply.id}`)) ? "currentColor" : "none"} stroke="currentColor">
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

        {/* Add Comment Form - Always shown */}
        <form onSubmit={handleAddComment} className={cn(
          "flex items-start gap-2 p-3 border-t border-border/20 bg-card",
          "flex-shrink-0 relative z-[10002]"
        )}>
          <div className="relative flex-shrink-0 z-[10003]" ref={roleMenuRef}>
            <button
              type="button"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="relative group"
            >
          <img 
            src={
              isAnonymous
                ? ANONYMOUS_AVATAR_URL
                : (viewerAvatar || getAvatarForAccount(viewerAccountId, viewerEntityAccountId))
            } 
                alt={isAnonymous ? "Anonymous" : "Your avatar"} 
                className="w-8 h-8 rounded-full object-cover mt-1 cursor-pointer ring-2 ring-transparent hover:ring-primary/30 transition-all"
                onError={(e) => {
                  e.target.src = getAvatarForAccount();
                }}
              />
              <div className={cn(
                "absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-muted border-2 border-card",
                "flex items-center justify-center cursor-pointer",
                "hover:bg-muted/80 transition-colors"
              )}>
                <svg className="w-2.5 h-2.5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </button>
            {roleMenuOpen && (
              <div 
                ref={menuRef}
                className={cn(
                  "fixed w-64 rounded-lg border border-border/30",
                  "bg-card/95 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.25)]",
                  "overflow-hidden z-[10004] max-h-80 overflow-y-auto scrollbar-hide"
                )}
                style={{
                  left: `${menuPosition.left}px`,
                  bottom: `${menuPosition.bottom}px`
                }}
              >
                {/* Option 1: dùng tài khoản hiện tại */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAnonymous(false);
                    setRoleMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                    !isAnonymous && "bg-primary/10"
                  )}
                >
                  <img 
                    src={viewerAvatar || getAvatarForAccount(viewerAccountId, viewerEntityAccountId)} 
                    alt={viewerName}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    onError={(e) => {
                      e.target.src = getAvatarForAccount();
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">
                      {viewerName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Account
                    </div>
                  </div>
                  {!isAnonymous && (
                    <svg className="w-5 h-5 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </button>

                {/* Option 2: Ẩn danh - chỉ cho phép nếu là user thường */}
                {canUseAnonymous && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAnonymous(true);
                      setRoleMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                      isAnonymous && "bg-primary/10"
                    )}
                  >
                    <img 
                      src={getAvatarForAccount()} 
                      alt="Người ẩn danh"
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.src = getAvatarForAccount();
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">
                        Người ẩn danh
                      </div>
                      <div className="text-xs text-muted-foreground">
                        anonymous
                      </div>
                    </div>
                    {isAnonymous && (
                      <svg className="w-5 h-5 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex-1 relative">
            <textarea
              placeholder={
                isAnonymous
                  ? "Bình luận ẩn danh..."
                  : `${t('comment.commentAs', { defaultValue: 'Comment as' })} ${viewerName}`
              }
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment(e);
                }
              }}
              className={cn(
                "w-full h-10 px-4 py-2 pr-10 border-[0.5px] border-border/20 rounded-2xl",
                "bg-muted/50 text-foreground text-sm outline-none resize-none",
                "transition-all duration-200",
                "focus:border-primary focus:ring-1 focus:ring-primary/10",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              rows={1}
              disabled={submitting}
            />
            <button
              type="submit"
              className={cn(
                "absolute inset-y-0 right-2 my-auto w-8 h-8 flex items-center justify-center",
                "bg-transparent border-none rounded-full cursor-pointer transition-colors duration-200",
                newComment.trim() 
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground/50 cursor-not-allowed"
              )}
              disabled={submitting || !newComment.trim()}
              aria-label="Send comment"
            >
              <svg className="w-5 h-5 pb-[2px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </form>
        </div>
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

