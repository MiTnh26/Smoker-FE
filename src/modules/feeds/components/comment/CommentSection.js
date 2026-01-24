import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { X } from "lucide-react";
import {
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
import { getSession } from "../../../../utils/sessionManager";
import { getAvatarForAccount, normalizeId } from "./utils";
import PostCommentSection from "./PostCommentSection";

const CommentSection = forwardRef(function CommentSection({ postId, onClose, inline = false, alwaysOpen = false, scrollToCommentId = null, onPostUpdated = null }, ref) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [sortOrder, setSortOrder] = useState("mostLiked"); // "mostLiked", "newest", or "oldest"
  const commentRefs = useRef({}); // Refs for scrolling to specific comments
  const [viewerEntityAccountId, setViewerEntityAccountId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [editingReplyTarget, setEditingReplyTarget] = useState(null); // { commentId, replyId }
  const [editReplyText, setEditReplyText] = useState("");
  const [commentActionLoadingId, setCommentActionLoadingId] = useState(null);
  const [replyActionLoadingKey, setReplyActionLoadingKey] = useState(null);
  const [viewerName, setViewerName] = useState("");
  const [viewerAvatar, setViewerAvatar] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null); // Track which comment/reply menu is open: "comment-{id}" or "reply-{commentId}-{replyId}"
  const menuRefs = useRef({}); // Refs for menu dropdowns
  const menuButtonRefs = useRef({}); // Refs for menu buttons to calculate position
  const [menuPositions, setMenuPositions] = useState({}); // Store calculated positions for each menu
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null); // { type: 'comment' | 'reply', commentId, replyId }
  const reloadTimeoutRef = useRef(null); // Ref để track timeout reload, tránh gọi nhiều lần
  const isReloadingRef = useRef(false); // Ref để track xem đang reload hay không, tránh gọi nhiều lần
 
  // Normalize for using as likesObject key: String(id).trim() (không toLowerCase vì key từ backend có thể có chữ hoa)
  const normalizeKeyId = (value) => {
    if (!value) return null;
    return String(value).trim();
  };

  // Compare two entityAccountIds (with null check) - dùng normalizeId từ utils
  const compareEntityAccountIds = (id1, id2) => {
    if (!id1 || !id2) return false;
    return normalizeId(id1) === normalizeId(id2);
  };

  const resolveViewerIdentity = () => {
    try {
      const raw = localStorage.getItem("session");
      const session = raw ? JSON.parse(raw) : null;
      const currentUser = session?.account;
      const activeEntity = session?.activeEntity || currentUser;

      // Chỉ sử dụng entityAccountId làm chìa khóa duy nhất
      const entityAccountId =
        activeEntity?.EntityAccountId ||
        activeEntity?.entityAccountId ||
        activeEntity?.entity_account_id ||
        null;

      const name = activeEntity?.name || activeEntity?.userName || currentUser?.userName || "User";
      const avatar = activeEntity?.avatar || currentUser?.avatar || null;

      return {
        // giữ bản raw (trim-only) để dùng làm key cho likesObject
        entityAccountId: normalizeKeyId(entityAccountId),
        name,
        avatar
      };
    } catch (error) {
      return { entityAccountId: null, name: "User", avatar: null };
    }
  };


  // Navigate to profile based on entityType
  const handleNavigateToProfile = (entityId, entityType, entityAccountId) => {
    // ⚠️ QUAN TRỌNG: Luôn dùng entityAccountId để navigate tới profile công khai
    // Không phân biệt entityType (BarPage, BusinessAccount, Account) - tất cả đều dùng /profile/{entityAccountId}
    if (!entityAccountId && !entityId) return;
    
    // Check if this is own profile before navigating
    try {
      const session = getSession();
      if (session) {
        const activeEntityAccountId = 
          session.activeEntity?.EntityAccountId ||
          session.activeEntity?.entityAccountId ||
          null;
        
        // Normalize IDs for comparison: String(id).trim().toLowerCase()
        const postEntityAccountIdNormalized = normalizeId(entityAccountId);
        const activeEntityAccountIdNormalized = normalizeId(activeEntityAccountId);

        // If it's own profile, navigate to /own/profile
        // Check if both IDs exist before comparing
        if (postEntityAccountIdNormalized && activeEntityAccountIdNormalized && 
            postEntityAccountIdNormalized === activeEntityAccountIdNormalized) {
          navigate("/own/profile");
          return;
    }
      }
    } catch (error) {
    }
    
    // Ưu tiên entityAccountId vì đây là universal identifier
    const targetId = entityAccountId || entityId;
    navigate(`/profile/${targetId}`);
  };

  // canManageComment and canManageReply are now handled by PostCommentItem and PostReplyItem components
  // using canManageComment and canManageReply from utils.js

  // Helper function to count likes for a comment/reply
  const countLikes = (item) => {
    if (!item?.likes) return 0;
    if (item.likes instanceof Map) return item.likes.size;
    if (Array.isArray(item.likes)) return item.likes.length;
    if (typeof item.likes === 'object') return Object.keys(item.likes).length;
    if (typeof item.likes === 'number') return item.likes;
    return 0;
  };

  /**
   * Normalize likes data từ backend (Backend đã chuẩn hóa key = entityAccountId)
   * Chỉ cần normalize key về lowercase để đảm bảo consistency
   * 
   * @param {Object|Map|Array} rawLikes - Raw likes data từ backend (đã được chuẩn hóa key = entityAccountId)
   * @returns {Object} Normalized likesObject với key là entityAccountId (lowercase)
   */
  const normalizeLikesObject = (rawLikes) => {
    if (!rawLikes || typeof rawLikes !== 'object' || Array.isArray(rawLikes)) return {};
    // Backend đã chuẩn hóa key = entityAccountId → chỉ normalize về lowercase
    return Object.entries(rawLikes).reduce((acc, [k, v]) => {
      const normalizedKey = normalizeId(k);
      return normalizedKey && v ? { ...acc, [normalizedKey]: v } : acc;
    }, {});
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
    // ⚠️ QUAN TRỌNG: Chỉ load khi postId thay đổi và không đang reload
    if (postId && !isReloadingRef.current) {
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Get activeEntity once and pass down via props to avoid calling getSessionData() in every render
  const [activeEntity, setActiveEntity] = useState(null);

  useEffect(() => {
    const identity = resolveViewerIdentity();
    setViewerEntityAccountId(identity.entityAccountId);
    setViewerName(identity.name || "User");
    setViewerAvatar(identity.avatar);

    // Get activeEntity for passing to child components
    try {
      const raw = localStorage.getItem("session");
      const session = raw ? JSON.parse(raw) : null;
      const currentUser = session?.account;
      const entity = session?.activeEntity || currentUser;
      setActiveEntity(entity);
    } catch (error) {
      setActiveEntity(null);
    }
  }, []);


  // Reload comments when activeEntity changes (role switch)
  useEffect(() => {
    const handleStorageChange = () => {
      // Reload comments when session/activeEntity changes
      // ⚠️ QUAN TRỌNG: Chỉ reload nếu không đang reload và không có timeout đang chờ
      if (postId && !isReloadingRef.current && !reloadTimeoutRef.current) {
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
      // Clear timeout khi unmount
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = null;
      }
    };
  }, [postId]);

  useEffect(() => {
    setEditingCommentId(null);
    setEditCommentText("");
    setEditingReplyTarget(null);
    setEditReplyText("");
  }, [postId]);

  // Sort comments when sortOrder changes (only if comments already loaded)
  // ⚠️ QUAN TRỌNG: Chỉ sort khi sortOrder thay đổi, không sort lại khi comments thay đổi (tránh làm mất comment mới)
  useEffect(() => {
    if (comments.length > 0 && sortOrder) {
      const sortedComments = sortComments(comments, sortOrder);
      // Chỉ update nếu thứ tự thực sự thay đổi (tránh infinite loop)
      const orderChanged = sortedComments.some((comment, index) => comment.id !== comments[index]?.id);
      if (orderChanged) {
      setComments(sortedComments);
      }
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

  // getAvatarForAccount is imported from utils.js

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
      setMessage({
        type: "error",
        text: t('comment.updateError', { defaultValue: "Không thể cập nhật bình luận. Vui lòng thử lại." })
      });
    } finally {
      setCommentActionLoadingId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteCommentClick = (commentId) => {
    if (!viewerEntityAccountId) {
      setMessage({
        type: "error",
        text: t('comment.entityRequired', { defaultValue: "Vui lòng chọn thực thể hoạt động trước khi xóa bình luận." })
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    // Mở modal xác nhận thay vì dùng window.confirm
    setDeleteConfirmModal({ type: 'comment', commentId });
  };

  const confirmDeleteComment = async (commentId) => {

    setCommentActionLoadingId(commentId);
    try {
      await deleteComment(postId, commentId, { entityAccountId: viewerEntityAccountId });
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
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
      if (typeof onPostUpdated === "function") onPostUpdated();
    } catch (error) {
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
      setMessage({
        type: "error",
        text: t('comment.updateError', { defaultValue: "Không thể cập nhật bình luận. Vui lòng thử lại." })
      });
    } finally {
      setReplyActionLoadingKey(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteReplyClick = (commentId, replyId) => {
    if (!viewerEntityAccountId) {
      setMessage({
        type: "error",
        text: t('comment.entityRequired', { defaultValue: "Vui lòng chọn thực thể hoạt động trước khi xóa bình luận." })
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    // Mở modal xác nhận thay vì dùng window.confirm
    setDeleteConfirmModal({ type: 'reply', commentId, replyId });
  };

  const confirmDeleteReply = async (commentId, replyId) => {
    const actionKey = `${commentId}-${replyId}`;
    setReplyActionLoadingKey(actionKey);
    try {
      await deleteReply(postId, commentId, replyId, { entityAccountId: viewerEntityAccountId });
      setComments((prev) => prev.map((comment) => {
        if (comment.id !== commentId) return comment;
        const replies = (comment.replies || []).filter((reply) => reply.id !== replyId);
        return { ...comment, replies };
      }));
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
      if (typeof onPostUpdated === "function") onPostUpdated();
    } catch (error) {
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
    // ⚠️ QUAN TRỌNG: Tránh gọi nhiều lần đồng thời
    if (isReloadingRef.current) {
      return;
    }
    
    try {
      isReloadingRef.current = true;
      // ⚠️ QUAN TRỌNG: Chỉ set loading nếu chưa có comments (tránh nháy khi reload)
      if (comments.length === 0) {
        setLoading(true);
      }
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
            // ⚠️ QUAN TRỌNG: Khi backend trả về array, preserve toàn bộ dữ liệu comment (bao gồm likes)
            commentsData = post.comments.map((comment, index) => {
              const commentId = extractId(comment._id) || extractId(comment.id) || `comment-${index}`;
              // Preserve toàn bộ comment object để không mất dữ liệu likes
              return [commentId, comment];
            });
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
              continue;
            }
            
            // Check author info from backend
            if (comment.entityAccountId && (!comment.authorName || comment.authorName === 'Người dùng' || !comment.authorAvatar)) {
              // Author info missing, will use fallback in PostCommentItem
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
                  
                  // Get viewerEntityAccountId for isLikedByMe check
                  const identityForReply = resolveViewerIdentity();
                  const currentViewerEntityAccountIdForReply = normalizeId(viewerEntityAccountId || identityForReply.entityAccountId);
                  
                  // ⚠️ TỐI ƯU: Backend đã chuẩn hóa và trả về Array - chỉ cần normalize key và check trực tiếp
                  const normalizedLikes = normalizeLikesObject(reply.likesObject || {});
                  // ⚠️ ĐÃ XÓA: Không còn check likedByViewer hay stats.isLikedByMe - chỉ check likesObject trực tiếp
                  const isLikedByMe = !!(normalizedLikes[currentViewerEntityAccountIdForReply]);
                  
                  repliesArray.push({
                    ...reply, // Spread toàn bộ dữ liệu từ backend
                    id: extractId(reply.id) || extractId(reply._id) || String(reply.id || reply._id),
                    authorId: reply.entityAccountId || reply.authorEntityAccountId,
                    // ⚠️ QUAN TRỌNG: Preserve authorAvatar từ backend (có thể là null nếu không tìm thấy trong SQL)
                    authorAvatar: reply.authorAvatar || reply.author?.avatar || null,
                    likes: likeCount,
                    likesObject: normalizedLikes, // Map chuẩn với key = entityAccountId
                    isLikedByMe,
                    likedByViewer: isLikedByMe,
                    replyToId: reply.replyToId ? extractId(reply.replyToId) : null,
                    // ⚠️ QUAN TRỌNG: Preserve replyToAuthorName và replyToAuthorAvatar từ backend
                    replyToAuthorName: reply.replyToAuthorName || null,
                    replyToAuthorAvatar: reply.replyToAuthorAvatar || null,
                    replyToAuthorEntityAccountId: reply.replyToAuthorEntityAccountId || null
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
                  
                  // Check author info from backend
                  if (reply.entityAccountId && (!reply.authorName || reply.authorName === 'Người dùng')) {
                    // Author info missing, will use fallback in PostReplyItem
                  }
                  
                  // Get likeCount from stats if available, otherwise calculate from likes
                  const likesCount = reply.stats?.likeCount ?? 
                                  (reply.likes ? (typeof reply.likes === 'object' ? Object.keys(reply.likes).length : reply.likes) : 0);
                  
                  // Get viewerEntityAccountId for isLikedByMe check
                  const identity = resolveViewerIdentity();
                  const currentViewerEntityAccountId = normalizeId(viewerEntityAccountId || identity.entityAccountId);
                  
                  // ⚠️ QUAN TRỌNG: Quét tất cả các trường hợp có thể có entityAccountId (giống canManageReply)
                  const replyEntityAccountId = normalizeId(
                    reply.entityAccountId || 
                    reply.author?.entityAccountId || 
                    reply.authorEntityAccountId ||
                    reply.author?.id ||
                    reply.author?.EntityAccountId
                  );
                  
                  // ⚠️ TỐI ƯU: Backend đã chuẩn hóa và trả về Array - chỉ cần normalize key và check trực tiếp
                  const normalizedLikes = normalizeLikesObject(reply.likesObject || {});
                  // ⚠️ ĐÃ XÓA: Không còn check likedByViewer hay stats.isLikedByMe - chỉ check likesObject trực tiếp
                  const isLikedByMe = !!(normalizedLikes[currentViewerEntityAccountId]);
                  
                  repliesArray.push({
                    ...reply, // Spread toàn bộ dữ liệu từ backend
                    id: extractId(replyId) || extractId(reply._id) || String(replyId),
                    // ⚠️ QUAN TRỌNG: Set authorEntityAccountId để canManageReply có thể tìm thấy
                    authorEntityAccountId: replyEntityAccountId ? String(replyEntityAccountId).trim() : (reply.entityAccountId || reply.authorEntityAccountId || reply.author?.entityAccountId || null),
                    entityAccountId: replyEntityAccountId ? String(replyEntityAccountId).trim() : (reply.entityAccountId || null),
                    authorId: replyEntityAccountId ? String(replyEntityAccountId).trim() : (reply.entityAccountId || reply.authorEntityAccountId),
                    // ⚠️ QUAN TRỌNG: Normalize authorName - nếu là null hoặc 'Người dùng' thì để null để fallback
                    authorName: (reply.authorName && reply.authorName !== 'Người dùng') 
                      ? reply.authorName 
                      : (reply.author?.name && reply.author.name !== 'Người dùng' ? reply.author.name : null),
                    // ⚠️ QUAN TRỌNG: Preserve authorAvatar từ backend (có thể là null nếu không tìm thấy trong SQL)
                    authorAvatar: reply.authorAvatar || reply.author?.avatar || null,
                    likes: likesCount,
                    likesObject: normalizedLikes, // Map chuẩn với key = entityAccountId
                    isLikedByMe,
                    likedByViewer: isLikedByMe,
                    replyToId: reply.replyToId ? extractId(reply.replyToId) : null,
                    // ⚠️ QUAN TRỌNG: Preserve replyToAuthorName và replyToAuthorAvatar từ backend
                    replyToAuthorName: reply.replyToAuthorName || null,
                    replyToAuthorAvatar: reply.replyToAuthorAvatar || null,
                    replyToAuthorEntityAccountId: reply.replyToAuthorEntityAccountId || null
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
            // ⚠️ QUAN TRỌNG: Luôn lấy identity mới nhất để tránh race condition
            const identity = resolveViewerIdentity();
            const currentViewerEntityAccountId = normalizeId(viewerEntityAccountId || identity.entityAccountId);
            
            // ⚠️ QUAN TRỌNG: Quét tất cả các trường hợp có thể có entityAccountId (giống canManageComment)
            const commentEntityAccountId = normalizeId(
              comment.entityAccountId || 
              comment.author?.entityAccountId || 
              comment.authorEntityAccountId ||
              comment.author?.id ||
              comment.author?.EntityAccountId
            );
            
            // Check if current user owns this comment - chỉ dùng entityAccountId
            const isCurrentUser = compareEntityAccountIds(currentViewerEntityAccountId, commentEntityAccountId);
            
            // Get viewerEntityAccountId for isLikedByMe check (normalize để đảm bảo match với likesObject keys)
            const viewerEntityAccountIdForLike = normalizeId(currentViewerEntityAccountId || identity.entityAccountId);
            
            // ⚠️ TỐI ƯU: Backend đã chuẩn hóa và trả về Array - chỉ cần normalize key và check trực tiếp
            const normalizedLikes = normalizeLikesObject(comment.likesObject || {});
            // ⚠️ ĐÃ XÓA: Không còn check likedByViewer hay stats.isLikedByMe - chỉ check likesObject trực tiếp
            const isLikedByMe = !!(normalizedLikes[viewerEntityAccountIdForLike]);
            
            commentsArray.push({
              ...comment, // Spread toàn bộ dữ liệu từ backend
              id: extractedCommentId,
              // ⚠️ QUAN TRỌNG: Set authorEntityAccountId để canManageComment có thể tìm thấy
              authorEntityAccountId: commentEntityAccountId ? String(commentEntityAccountId).trim() : (comment.entityAccountId || comment.authorEntityAccountId || comment.author?.entityAccountId || null),
              entityAccountId: commentEntityAccountId ? String(commentEntityAccountId).trim() : (comment.entityAccountId || null),
              authorId: commentEntityAccountId ? String(commentEntityAccountId).trim() : (comment.entityAccountId || comment.authorEntityAccountId),
              // ⚠️ QUAN TRỌNG: Normalize authorName - nếu là null hoặc 'Người dùng' thì để null để fallback
              authorName: (comment.authorName && comment.authorName !== 'Người dùng') 
                ? comment.authorName 
                : (comment.author?.name && comment.author.name !== 'Người dùng' ? comment.author.name : null),
              // ⚠️ QUAN TRỌNG: Preserve authorAvatar từ backend (có thể là null nếu không tìm thấy trong SQL)
              authorAvatar: comment.authorAvatar || comment.author?.avatar || null,
              likes: likesCount,
              likesObject: normalizedLikes, // Map chuẩn với key = entityAccountId
              isLikedByMe,
              likedByViewer: isLikedByMe,
              canManage: typeof comment.canManage === "boolean" ? comment.canManage : isCurrentUser,
              replies: repliesArray
            });
          }
        }

        // Sort comments with current sortOrder
        const sortedComments = sortComments(commentsArray, sortOrder);
        
        setComments(sortedComments);

        // ⚠️ QUAN TRỌNG: Đảm bảo viewerEntityAccountId được set đúng
        // Lấy identity mới nhất và update state nếu cần (để handle role switch và race condition)
        const resolvedIdentity = resolveViewerIdentity();
        
        // Update state nếu chưa có hoặc khác với identity hiện tại
        if (resolvedIdentity.entityAccountId) {
          const normalizedResolved = normalizeKeyId(resolvedIdentity.entityAccountId);
          const normalizedCurrent = normalizeKeyId(viewerEntityAccountId);
          if (normalizedResolved !== normalizedCurrent) {
            setViewerEntityAccountId(resolvedIdentity.entityAccountId);
          }
        }

        // Không sync likedComments/likedReplies Set nữa.
        // UI sẽ dựa trên comment.likedByViewer + likesObject (được map từ API / optimistic update).
      } else {
        setComments([]);
      }
    } catch (error) {
      setComments([]);
    } finally {
      setLoading(false);
      isReloadingRef.current = false;
    }
  };

  // Handle comment added from external form (PostDetailModal)
  const handleCommentAdded = async (apiResponse) => {
    if (!activeEntity || submitting) return;
    
    // Lấy comment object thật từ response.data (có ID thật từ DB)
    const commentData = apiResponse?.comment || apiResponse;
    
    if (!commentData || !commentData.id) {
      // Nếu API không trả về comment object, reload comments để lấy dữ liệu mới nhất
      await loadComments();
      if (sortOrder !== "newest") {
        setSortOrder("newest");
      }
      return;
    }

    // Transform comment từ API response để đảm bảo format đúng
    const newCommentObj = {
      ...commentData,
      id: String(commentData.id),
      entityAccountId: commentData.entityAccountId ? String(commentData.entityAccountId).trim() : null,
      authorEntityAccountId: commentData.entityAccountId ? String(commentData.entityAccountId).trim() : null,
      replies: commentData.replies || [],
      likesObject: commentData.likesObject || commentData.likes || {}
    };

    // Thêm vào đầu mảng (TikTok style)
    setComments(prev => [newCommentObj, ...prev]);

    // Set sortOrder thành "newest"
    if (sortOrder !== "newest") {
      setSortOrder("newest");
    }
  };

  // Expose handleNewComment để parent có thể gọi trực tiếp
  useImperativeHandle(ref, () => ({
    handleNewComment: handleCommentAdded
  }), [activeEntity, sortOrder, submitting]);

  // Học theo ImageDetailModal: đơn giản, trực tiếp, không validate phức tạp
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) {
    if (!newComment.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập nội dung bình luận" });
        setTimeout(() => setMessage(null), 3000);
      }
      return;
    }

    if (!activeEntity) {
      setMessage({ type: "error", text: "Không tìm thấy thông tin người dùng" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const normalizeTypeRole = (ae) => {
        const raw = (ae?.role || "").toString().toLowerCase();
        if (raw === "bar") return "BarPage";
        if (raw === "dj" || raw === "dancer") return "BusinessAccount";
        return "Account";
      };
      const typeRole = normalizeTypeRole(activeEntity);
      const entityAccountId = normalizeId(activeEntity?.EntityAccountId || activeEntity?.entityAccountId);
      const entityId = activeEntity?.id;
      const entityType = typeRole;
      const commentText = newComment.trim();

      const response = await addComment(postId, {
        content: commentText,
        typeRole: typeRole,
        entityAccountId: entityAccountId,
        entityId: entityId,
        entityType: entityType
      });

      if (response?.success || response?.data?.success) {
        setNewComment("");
        
        // Lấy comment object thật từ response.data (có ID thật từ DB)
        const commentData = response?.data?.comment || response?.data;
        
        if (!commentData || !commentData.id) {
          // Nếu API không trả về comment object, reload comments để lấy dữ liệu mới nhất
          await loadComments();
        if (sortOrder !== "newest") {
          setSortOrder("newest");
        }
        } else {
          // Transform comment từ API response để đảm bảo format đúng
        const newCommentObj = {
            ...commentData,
            id: String(commentData.id),
            entityAccountId: commentData.entityAccountId ? String(commentData.entityAccountId).trim() : null,
            authorEntityAccountId: commentData.entityAccountId ? String(commentData.entityAccountId).trim() : null,
            replies: commentData.replies || [],
            likesObject: commentData.likesObject || commentData.likes || {}
          };
          
          // Thêm vào đầu mảng (TikTok style)
          setComments(prev => [newCommentObj, ...prev]);
        
          // Set sortOrder thành "newest"
          if (sortOrder !== "newest") {
            setSortOrder("newest");
          }
        }
      } else {
        setMessage({ type: "error", text: response?.message || "Không thể thêm bình luận" });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
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
    if (submitting) return;
    
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

      // Axios interceptor unwraps response.data, so response is already the backend response
      const isSuccess = response?.success === true || response?.data?.success === true;
      
      if (isSuccess) {
        // Lấy reply object thật từ response.data (có ID thật từ DB)
        const replyData = response?.data?.reply || response?.data;
        
        if (!replyData || !replyData.id) {
          // Nếu API không trả về reply object, reload comments để lấy dữ liệu mới nhất
          await loadComments();
        } else {
          // Transform reply từ API response để đảm bảo format đúng
          const newReplyObj = {
            ...replyData,
            id: String(replyData.id),
            entityAccountId: replyData.entityAccountId ? String(replyData.entityAccountId).trim() : null,
            authorEntityAccountId: replyData.entityAccountId ? String(replyData.entityAccountId).trim() : null,
            replyToId: replyToId ? String(replyToId) : null,
            likesObject: replyData.likesObject || replyData.likes || {}
          };

          // Cập nhật state UI với reply thật từ DB
          setComments(prevComments => prevComments.map(comment => {
            if (normalizeId(comment.id) === normalizeId(commentId)) {
              return {
                ...comment,
                replies: [newReplyObj, ...(comment.replies || [])] // Thêm vào đầu danh sách replies
              };
            }
            return comment;
          }));
        }

        setReplyContent(prev => {
          const newState = { ...prev };
          delete newState[replyKey];
          return newState;
        });
        setReplyingTo(null);
      } else {
        setMessage({ type: "error", text: response?.message || "Không thể thêm phản hồi" });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.response?.data?.message || "Không thể thêm phản hồi. Vui lòng thử lại."
      });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  // checkIsLiked is imported from utils.js as checkIsLikedFromUtils

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

      // Find comment to check actual like state
      const comment = comments.find(c => String(c.id) === String(commentId));

      // O(1) check: Tìm comment và check like state trực tiếp
      const identity = resolveViewerIdentity();
      const viewerEntityAccountId = identity.entityAccountId;
      const myId = normalizeId(viewerEntityAccountId);
      const alreadyLiked = !!(myId && comment?.likesObject?.[myId]);
      
      setComments(prev => prev.map(c => {
        if (c.id !== commentId) return c;
        const currentLikes = Number(c.likes) || 0;
        const newLikedState = !alreadyLiked;
        
        // ⚠️ TỐI ƯU: Optimistic UI - chỉ cần newLikes[myId] = {...} hoặc delete newLikes[myId]
        const newLikes = { ...(c.likesObject || {}) };
        if (newLikedState) {
          newLikes[myId] = { accountId: activeEntity?.id, entityAccountId: viewerEntityAccountId, entityId: activeEntity?.entityId, entityType: activeEntity?.entityType };
        } else {
          delete newLikes[myId];
        }
        return { ...c, likes: newLikedState ? currentLikes + 1 : Math.max(0, currentLikes - 1), isLikedByMe: newLikedState, likedByViewer: newLikedState, likesObject: newLikes };
      }));

      // Lấy entityAccountId từ activeEntity (trim để đảm bảo format đúng)
      const rawEntityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
      const entityAccountId = rawEntityAccountId ? String(rawEntityAccountId).trim() : null;

      const response = alreadyLiked
        ? await unlikeComment(postId, commentId, { entityAccountId })
        : await likeComment(postId, commentId, { typeRole, entityAccountId });

      // Axios interceptor unwraps response.data, so response is already the backend response
      const isSuccess = response?.success === true || response?.data?.success === true;
      
      if (isSuccess) {
        // Optimistic update đã được thực hiện ở trên, không cần sync lại từ response
        } else {
        const errorMessage = response?.message || response?.data?.message || "";
        
        // If error is "Already liked", reload comments to sync state
        if (errorMessage === "Already liked" || errorMessage?.includes("Already liked")) {
          await loadComments();
          return;
        }
        
        // Rollback optimistic update on error
        const commentBeforeLike = comments.find(c => normalizeId(c.id) === normalizeId(commentId));
              setComments(prev => prev.map(c => {
          if (normalizeId(c.id) !== normalizeId(commentId)) return c;
          return commentBeforeLike ? { ...commentBeforeLike } : c;
        }));
        setMessage({ type: "error", text: errorMessage || "Không thể thích bình luận" });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || "";
      
      // If error is "Already liked", reload comments to sync state
      if (errorMessage === "Already liked" || errorMessage?.includes("Already liked")) {
        await loadComments();
        return;
      }
      
      // Rollback on exception - revert to previous state
      const commentBeforeLike = comments.find(c => String(c.id) === String(commentId));
      setComments(prev => prev.map(c => {
        if (c.id !== commentId) return c;
        // Restore original state
        return commentBeforeLike ? { ...commentBeforeLike } : c;
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

      // O(1) check: Tìm reply và check like state trực tiếp
      const comment = comments.find(c => String(c.id) === String(commentId));
      const reply = comment?.replies?.find(r => String(r.id) === String(replyId));
      const identity = resolveViewerIdentity();
      const viewerEntityAccountId = identity.entityAccountId;
      const myId = normalizeId(viewerEntityAccountId);
      const alreadyLiked = !!(myId && reply?.likesObject?.[myId]);
      
      // ⚠️ TỐI ƯU: Optimistic UI - chỉ cần newLikes[myId] = {...} hoặc delete newLikes[myId]
      const newLikedState = !alreadyLiked;
      setComments(prev => prev.map(c => {
        if (c.id !== commentId) return c;
        const replies = (c.replies || []).map(r => {
          if (r.id !== replyId) return r;
          const newLikes = { ...(r.likesObject || {}) };
          if (newLikedState) {
            newLikes[myId] = { accountId: activeEntity?.id, entityAccountId: viewerEntityAccountId, entityId: activeEntity?.entityId, entityType: activeEntity?.entityType };
          } else {
            delete newLikes[myId];
          }
          return { ...r, likes: newLikedState ? (Number(r.likes) || 0) + 1 : Math.max(0, (Number(r.likes) || 0) - 1), isLikedByMe: newLikedState, likedByViewer: newLikedState, likesObject: newLikes };
        });
        return { ...c, replies };
      }));

      // Lấy entityAccountId từ activeEntity (trim để đảm bảo format đúng)
      const rawEntityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
      const entityAccountId = rawEntityAccountId ? String(rawEntityAccountId).trim() : null;

      const response = alreadyLiked
        ? await unlikeReply(postId, commentId, replyId, { entityAccountId })
        : await likeReply(postId, commentId, replyId, { typeRole, entityAccountId });

      // Axios interceptor unwraps response.data, so response is already the backend response
      const isSuccess = response?.success === true || response?.data?.success === true;
      
      if (isSuccess) {
        // Optimistic update đã được thực hiện ở trên, không cần sync lại từ response
        } else {
        const errorMessage = response?.message || response?.data?.message || "";
        
        // If error is "Already liked", reload comments to sync state
        if (errorMessage === "Already liked" || errorMessage?.includes("Already liked")) {
          await loadComments();
          return;
        }
        
        // Rollback optimistic update on error
        const commentBeforeLike = comments.find(c => normalizeId(c.id) === normalizeId(commentId));
        const replyBeforeLike = commentBeforeLike?.replies?.find(r => normalizeId(r.id) === normalizeId(replyId));
                setComments(prev => prev.map(c => {
          if (normalizeId(c.id) !== normalizeId(commentId)) return c;
                  const replies = (c.replies || []).map(r => {
            if (normalizeId(r.id) !== normalizeId(replyId)) return r;
            return replyBeforeLike ? { ...replyBeforeLike } : r;
                  });
                  return { ...c, replies };
                }));
        setMessage({ type: "error", text: errorMessage || "Không thể thích phản hồi" });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || "";
      
      // If error is "Already liked", reload comments to sync state
      if (errorMessage === "Already liked" || errorMessage?.includes("Already liked")) {
        await loadComments();
        return;
      }
      
      // Rollback on exception - revert to previous state
      const commentBeforeLike = comments.find(c => String(c.id) === String(commentId));
      const replyBeforeLike = commentBeforeLike?.replies?.find(r => String(r.id) === String(replyId));
      setComments(prev => prev.map(c => {
        if (c.id !== commentId) return c;
        const replies = (c.replies || []).map(r => {
          if (r.id !== replyId) return r;
          // Restore original state
          return replyBeforeLike ? { ...replyBeforeLike } : r;
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
      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div
          className={cn(
            "fixed inset-0 z-[100001] flex items-center justify-center p-4",
            "bg-black/50 backdrop-blur-sm"
          )}
          onClick={() => setDeleteConfirmModal(null)}
        >
          <div
            className={cn(
              "bg-card border border-border rounded-lg shadow-lg",
              "w-full max-w-md p-6",
              "flex flex-col gap-4"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {t('comment.deleteConfirmTitle', { defaultValue: "Xác nhận xóa" })}
              </h3>
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className={cn(
                  "p-1 rounded-full transition-colors duration-200",
                  "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-foreground">
              {t('comment.deleteConfirm', { defaultValue: "Bạn có chắc chắn muốn xóa bình luận này?" })}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium",
                  "bg-muted/30 text-foreground border border-border",
                  "hover:bg-muted/50 transition-colors duration-200"
                )}
              >
                {t('action.cancel', { defaultValue: "Hủy" })}
              </button>
              <button
                onClick={() => {
                  // ⚠️ QUAN TRỌNG: Đóng modal ngay khi bấm Xóa
                  const modalData = { ...deleteConfirmModal };
                  setDeleteConfirmModal(null);
                  
                  if (modalData.type === 'comment') {
                    confirmDeleteComment(modalData.commentId);
                  } else if (modalData.type === 'reply') {
                    confirmDeleteReply(modalData.commentId, modalData.replyId);
                  }
                }}
                disabled={
                  (deleteConfirmModal.type === 'comment' && commentActionLoadingId === deleteConfirmModal.commentId) ||
                  (deleteConfirmModal.type === 'reply' && replyActionLoadingKey === `${deleteConfirmModal.commentId}-${deleteConfirmModal.replyId}`)
                }
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium",
                  "bg-danger text-white",
                  "hover:bg-danger/90 transition-colors duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {(deleteConfirmModal.type === 'comment' && commentActionLoadingId === deleteConfirmModal.commentId) ||
                 (deleteConfirmModal.type === 'reply' && replyActionLoadingKey === `${deleteConfirmModal.commentId}-${deleteConfirmModal.replyId}`)
                  ? t('action.deleting', { defaultValue: "Đang xóa..." })
                  : t('action.delete', { defaultValue: "Xóa" })}
              </button>
            </div>
          </div>
        </div>
      )}

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

        {/* Comments List - Using PostCommentSection component */}
        <PostCommentSection
          comments={comments}
          activeEntity={activeEntity}
          isEditing={false}
          isReplying={false}
          editingCommentId={editingCommentId}
          editingReplyTarget={editingReplyTarget}
          replyingTo={replyingTo}
          editCommentText={editCommentText}
          setEditCommentText={setEditCommentText}
          editReplyText={editReplyText}
          setEditReplyText={setEditReplyText}
          replyContent={replyContent}
          setReplyContent={setReplyContent}
          submitting={submitting}
          onLikeClick={handleLikeComment}
          onReplyLikeClick={handleLikeReply}
          onReplyClick={(commentId, replyId, userName) => {
            if (replyId) {
              // Reply to a reply - có userName
              setReplyingTo({ commentId, replyId, type: "reply", userName });
            } else {
              // Reply to comment - không có userName hoặc userName là null
              setReplyingTo({ commentId, type: "comment", userName: null });
            }
          }}
          onEditClick={(commentOrCommentId, reply) => {
            if (reply) {
              // Editing reply
              startEditingReply(commentOrCommentId, reply);
            } else if (typeof commentOrCommentId === 'object') {
              // Editing comment
              startEditingComment(commentOrCommentId);
            }
          }}
          onDeleteClick={(commentId, replyId) => {
            if (replyId) {
              handleDeleteReplyClick(commentId, replyId);
            } else {
              handleDeleteCommentClick(commentId);
            }
          }}
          onSaveEdit={() => {
            if (editingCommentId) {
              handleUpdateExistingComment();
            } else if (editingReplyTarget) {
              handleUpdateExistingReply();
            }
          }}
          onCancelEdit={() => {
            if (editingCommentId) {
              cancelEditingComment();
            } else if (editingReplyTarget) {
              cancelEditingReply();
                                        }
          }}
          onNavigateToProfile={handleNavigateToProfile}
          commentActionLoadingId={commentActionLoadingId}
          replyActionLoadingKey={replyActionLoadingKey}
          onAddReply={handleAddReply}
          menuButtonRefs={menuButtonRefs}
          menuRefs={menuRefs}
          openMenuId={openMenuId}
          setOpenMenuId={setOpenMenuId}
          menuPositions={menuPositions}
          setMenuPositions={setMenuPositions}
          commentRefs={commentRefs}
                            />

        {/* Add Comment Form - Only show when not inline (inline mode uses external form from PostDetailModal) */}
        {!inline && (
        <form onSubmit={handleAddComment} className={cn(
          "flex items-start gap-2 p-3 border-t border-border/20 bg-card",
          "flex-shrink-0 relative z-[10002]"
        )}>
                  <img 
                    src={viewerAvatar || getAvatarForAccount(null, viewerEntityAccountId)} 
            alt="Your avatar" 
            className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1 cursor-pointer"
                onError={(e) => {
                  e.target.src = getAvatarForAccount();
                }}
              />
          <div className="flex-1 relative">
            <textarea
              placeholder={`${t('comment.commentAs', { defaultValue: 'Comment as' })} ${viewerName}`}
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
        )}
        </div>
      </div>
    </>
  );
});

CommentSection.propTypes = {
  postId: PropTypes.string.isRequired,
  onClose: PropTypes.func,
  inline: PropTypes.bool,
  alwaysOpen: PropTypes.bool,
  scrollToCommentId: PropTypes.string,
  onPostUpdated: PropTypes.func
};

export default CommentSection;

