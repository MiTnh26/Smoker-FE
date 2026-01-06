import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { Search, ArrowLeft, Check, Globe, Lock, ChevronDown, X } from "lucide-react";
import messageApi from "../../../../api/messageApi";
import publicProfileApi from "../../../../api/publicProfileApi";
import { createPost, trackPostShare, trackMediaShare, getPostById } from "../../../../api/postApi";
import { cn } from "../../../../utils/cn";
import "../../../../styles/modules/feeds/components/modals/postForms.css";

export default function ShareModal({ open, post, onClose, onShared, triggerRef }) {
  const { t } = useTranslation();
  const [shareType, setShareType] = useState(null); // 'message' or 'wall'
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [repostComment, setRepostComment] = useState(""); // Comment when reposting
  const [status, setStatus] = useState("public"); // "public" hoặc "private"
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [originalPreviewPost, setOriginalPreviewPost] = useState(null);
  const [loadingOriginalPreview, setLoadingOriginalPreview] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const popupRef = useRef(null);

  // Get current user info
  useEffect(() => {
    if (open && shareType === 'wall') {
      try {
        const raw = localStorage.getItem("session");
        const session = raw ? JSON.parse(raw) : null;
        const activeEntity = session?.activeEntity || session?.account;
        if (activeEntity) {
          setCurrentUser({
            name: activeEntity?.name || activeEntity?.userName || activeEntity?.BarName || activeEntity?.BusinessName || "Người dùng",
            avatar: activeEntity?.avatar || activeEntity?.profilePicture || null,
          });
        }
      } catch (e) {
        console.error("[ShareModal] Error getting current user:", e);
      }
    }
  }, [open, shareType]);

  useEffect(() => {
    if (open && shareType === 'message') {
      loadConversations();
    }
  }, [open, shareType]);

  // Tính toán và cập nhật vị trí popup dựa trên trigger element
  useEffect(() => {
    if (!open || !triggerRef?.current) return;
    
    const updatePosition = () => {
      if (!triggerRef?.current) return;
      
      const rect = triggerRef.current.getBoundingClientRect();
      const popupWidth = 280; // Approximate width
      const popupHeight = 200; // Approximate height
      
      let top = rect.bottom + 8;
      let left = rect.left;
      
      // Điều chỉnh nếu popup vượt quá màn hình
      if (left + popupWidth > window.innerWidth) {
        left = window.innerWidth - popupWidth - 16;
      }
      if (left < 16) {
        left = 16;
      }
      
      if (top + popupHeight > window.innerHeight) {
        top = rect.top - popupHeight - 8;
      }
      if (top < 16) {
        top = 16;
      }
      
      setPosition({ top, left });
    };

    // Update position initially
    updatePosition();

    // Update position on scroll
    const handleScroll = () => {
      updatePosition();
    };
    
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [open, triggerRef]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [open]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      let session;
      try {
        const raw = localStorage.getItem("session");
        session = raw ? JSON.parse(raw) : null;
      } catch (e) {
        session = null;
      }

      const activeEntity = session?.activeEntity || session?.account;
      const entityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id;

      if (!entityAccountId) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const response = await messageApi.getConversations(entityAccountId);
      const conversationsData = response?.data?.data || response?.data || [];
      
      if (!Array.isArray(conversationsData) || conversationsData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Resolve profile for each conversation participant
      const resolveProfile = async (entityAccountId) => {
        if (!entityAccountId) return null;
        try {
          const res = await publicProfileApi.getByEntityId(entityAccountId);
          const data = res?.data?.data || res?.data || {};
          return {
            name: data.name || data.BarName || data.BusinessName || data.userName || data.UserName || entityAccountId,
            avatar: data.avatar || data.Avatar || null,
            entityId: entityAccountId,
          };
        } catch (err) {
          if (err?.response?.status === 404) {
            return { name: entityAccountId, avatar: null, entityId: entityAccountId };
          }
          console.warn(`[ShareModal] Failed to fetch profile for ${entityAccountId}:`, err);
          return { name: entityAccountId, avatar: null, entityId: entityAccountId };
        }
      };

      // Map conversations with user profiles
      const currentUserIdNormalized = String(entityAccountId || "").toLowerCase().trim();
      const mappedResults = await Promise.allSettled(
        conversationsData.map(async (conv) => {
          const participants = conv.participants || [];
          
          // Find other participant (not the current user)
          const otherParticipantId = participants.find(p => 
            String(p).toLowerCase().trim() !== currentUserIdNormalized
          ) || null;
          
          if (!otherParticipantId) {
            return {
              ...conv,
              name: "Người dùng",
              avatar: null,
              displayName: "Người dùng",
              displayAvatar: null,
            };
          }

          const profile = await resolveProfile(otherParticipantId);
          if (profile) {
            // Check status from conversation data
            const status = conv.participantStatuses?.[otherParticipantId] || 
                         conv.participant1Status || 
                         conv.participant2Status;
            
            if (status === 'banned') {
              return {
                ...conv,
                name: "người dùng Smoker",
                avatar: null,
                displayName: "người dùng Smoker",
                displayAvatar: null,
              };
            }
            
            return {
              ...conv,
              name: profile.name,
              avatar: profile.avatar,
              displayName: profile.name,
              displayAvatar: profile.avatar,
            };
          }
          
          return {
            ...conv,
            name: otherParticipantId,
            avatar: null,
            displayName: otherParticipantId,
            displayAvatar: null,
          };
        })
      );

      // Filter out rejected promises and extract values
      const mapped = mappedResults
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
      
      setConversations(mapped);
    } catch (error) {
      console.error("[ShareModal] Error loading conversations:", error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShareToMessage = async () => {
    if (!selectedConversation) return;

    try {
      setSubmitting(true);
      let session;
      try {
        const raw = localStorage.getItem("session");
        session = raw ? JSON.parse(raw) : null;
      } catch (e) {
        session = null;
      }

      const activeEntity = session?.activeEntity || session?.account;
      const entityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id;
      const entityType = activeEntity?.role === "bar" ? "BarPage" : 
                        (activeEntity?.role === "dj" || activeEntity?.role === "dancer") ? "BusinessAccount" : "Account";
      const entityId = activeEntity?.entityId || activeEntity?.id;

      // Get post ID - use original post ID if it's a repost
      // Normalize to string (handle ObjectId objects)
      let originalPostId = post.repostedFromId || post.id || post._id;
      if (originalPostId) {
        // Convert to string if it's an object with toString method
        originalPostId = originalPostId.toString ? originalPostId.toString() : String(originalPostId);
      }
      
      if (!originalPostId) {
        console.error("[ShareModal] Missing originalPostId:", post);
        alert("Không thể xác định ID bài viết. Vui lòng thử lại.");
        return;
      }
      
      // Create post URL that can be detected and opened in modal
      const postUrl = typeof window !== "undefined" 
        ? `${window.location.origin}/posts/${originalPostId}` 
        : `http://localhost:3000/posts/${originalPostId}`;
      const messageContent = postUrl;

      // Get conversation ID from new structure (English fields)
      const conversationId = selectedConversation._id || selectedConversation.id || selectedConversation.conversationId;

      await messageApi.sendMessage(
        conversationId,
        messageContent,
        "text",
        entityAccountId,
        entityType,
        entityId,
        { postId: originalPostId } // Pass postId to backend
      );

      // Track share (for both post and media)
      if (post.id) {
        const isMedia = post.isMedia || (post.url && (!post.content || !post.content.trim()) && (!post.title || !post.title.trim()));
        if (isMedia) {
          trackMediaShare(post.id).catch(err => {
            console.warn('[ShareModal] Failed to track media share:', err);
          });
        } else {
          trackPostShare(post.id).catch(err => {
            console.warn('[ShareModal] Failed to track post share:', err);
          });
        }
      }

      onShared?.({ type: 'message', conversationId });
      // Reset state before closing
      setShareType(null);
      setSelectedConversation(null);
      onClose?.();
    } catch (error) {
      console.error("[ShareModal] Error sharing to message:", error);
      alert("Không thể chia sẻ vào tin nhắn. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareToWall = async () => {
    try {
      setSubmitting(true);
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

      const entityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
      const entityId = activeEntity?.entityId || currentUser?.id;
      const entityType = typeRole;

      // Validate required fields
      if (!entityAccountId) {
        console.error("[ShareModal] Missing entityAccountId:", { activeEntity, currentUser });
        alert("Không thể xác định thông tin người dùng. Vui lòng đăng nhập lại.");
        return;
      }

      // Determine source post (nếu đang đăng lại một bài đã được đăng lại thì dùng bài gốc)
      const sourcePost = (post.repostedFromId && originalPreviewPost) ? originalPreviewPost : post;

      // Check if this is a media or a post
      const isMedia = sourcePost.isMedia || (sourcePost.url && (!sourcePost.content || !sourcePost.content.trim()) && (!sourcePost.title || !sourcePost.title.trim()));

      // Get original post ID: nếu post hiện tại đã là repost thì dùng repostedFromId để dẫn về bài gốc
      const originalPostId = post.repostedFromId || post.id || post._id;
      
      if (!originalPostId) {
        console.error("[ShareModal] Missing originalPostId:", post);
        alert("Không tìm thấy bài viết gốc. Vui lòng thử lại.");
        return;
      }
      
      // Get medias from post (chỉ để copy mediaIds, không cần snapshot)
      let mediaIds = [];
      
      // First, try to get from post.mediaIds (array of IDs)
      if (sourcePost.mediaIds && Array.isArray(sourcePost.mediaIds) && sourcePost.mediaIds.length > 0) {
        mediaIds = sourcePost.mediaIds.map(entry => {
          if (!entry) return null;
          const rawId = entry?._id || entry?.id || entry;
          if (!rawId) return null;
          if (typeof rawId === "string") return rawId;
          if (typeof rawId === "object" && rawId.toHexString) return rawId.toHexString();
          if (typeof rawId === "object" && rawId.$oid) return rawId.$oid;
          if (typeof rawId === "object" && rawId.toString) {
            const str = rawId.toString();
            return str === "[object Object]" ? null : str;
          }
          return String(rawId);
        }).filter(Boolean);
      }
      
      // If no mediaIds, try to extract from post.medias (populated array)
      if (!mediaIds.length && sourcePost.medias) {
        // Extract media IDs from medias object/array
        if (Array.isArray(sourcePost.medias)) {
          mediaIds = sourcePost.medias.map(m => {
            const id = m?._id || m?.id || m?.mediaId;
            if (!id) return null;
            if (typeof id === "string") return id;
            if (typeof id === "object" && id.toHexString) return id.toHexString();
            if (typeof id === "object" && id.$oid) return id.$oid;
            if (typeof id === "object" && id.toString) {
              const str = id.toString();
              return str === "[object Object]" ? null : str;
            }
            return String(id);
          }).filter(Boolean);
        } else if (typeof sourcePost.medias === 'object') {
          const allMedias = [
            ...(sourcePost.medias.images || []),
            ...(sourcePost.medias.videos || []),
            ...(sourcePost.medias.audios || [])
          ];
          mediaIds = allMedias.map(m => {
            const id = m?._id || m?.id || m?.mediaId;
            if (!id) return null;
            if (typeof id === "string") return id;
            if (typeof id === "object" && id.toHexString) return id.toHexString();
            if (typeof id === "object" && id.$oid) return id.$oid;
            if (typeof id === "object" && id.toString) {
              const str = id.toString();
              return str === "[object Object]" ? null : str;
            }
            return String(id);
          }).filter(Boolean);
        }
      }
      
      // If it's a single media (image/video), add it to mediaIds
      if (isMedia && originalPostId) {
        const postIdStr = originalPostId?.toString ? originalPostId.toString() : String(originalPostId);
        if (!mediaIds.includes(postIdStr)) {
          mediaIds.push(postIdStr);
        }
      }

      // Nội dung hiển thị cho bài repost chỉ là ghi chú của người đăng lại (nếu có)
      const repostNote = repostComment.trim();
      const finalTitle = repostNote || "";
      const finalContent = repostNote || "";

      // Tạo repost với reference đến post gốc (chỉ lưu ID, query lại khi hiển thị)
      // Backend expect: entityAccountId, authorEntityId, authorEntityType, authorName, authorAvatar
      const postData = {
        title: finalTitle,
        content: finalContent,
        type: "post",
        repostedFromId: originalPostId, // Reference đến post gốc - query lại khi hiển thị
        // Current user info (người đăng lại) - Backend sẽ dùng để tìm entityAccountId nếu chưa có
        entityAccountId: entityAccountId,
        authorEntityId: entityId || null,
        authorEntityType: entityType,
        authorName: activeEntity?.name || activeEntity?.userName || "Người dùng",
        authorAvatar: activeEntity?.avatar || activeEntity?.profilePicture || "",
        // Copy medias từ post/media gốc
        mediaIds: mediaIds.length > 0 ? mediaIds : undefined, // Chỉ gửi nếu có mediaIds
        status: status // Thêm status vào postData
      };

      console.log("[ShareModal] Creating repost with data:", {
        ...postData,
        mediaIds: mediaIds.length,
        repostedFromId: originalPostId
      });

      const response = await createPost(postData);
      
      // Axios interceptor đã unwrap response.data, nên response chính là data rồi
      if (!response?.success) {
        console.error("[ShareModal] Post creation failed:", response);
        throw new Error(response?.message || "Failed to create repost");
      }

      // Track share (for both post and media)
      if (post.id) {
        if (isMedia) {
          trackMediaShare(post.id).catch(err => {
            console.warn('[ShareModal] Failed to track media share:', err);
          });
        } else {
          trackPostShare(post.id).catch(err => {
            console.warn('[ShareModal] Failed to track post share:', err);
          });
        }
      }

      onShared?.({ type: 'wall' });
      // Reset state before closing
      setShareType(null);
      setSelectedConversation(null);
      onClose?.();
    } catch (error) {
      console.error("[ShareModal] Error reposting:", error);
      console.error("[ShareModal] Error details:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      
      const errorMessage = error?.response?.data?.message || error?.message || "Unknown error";
      const isMedia = post.isMedia || (post.url && (!post.content || !post.content.trim()) && (!post.title || !post.title.trim()));
      
      alert(isMedia 
        ? `Không thể đăng lại ảnh: ${errorMessage}` 
        : `Không thể đăng lại bài viết: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setShareType(null);
      setSelectedConversation(null);
      setSearchQuery("");
      setRepostComment("");
      setStatus("public");
      setShowPrivacyDropdown(false);
      setOriginalPreviewPost(null);
      setLoadingOriginalPreview(false);
    }
  }, [open]);

  useEffect(() => {
    let isMounted = true;
    if (!open || !post?.repostedFromId) {
      setOriginalPreviewPost(null);
      setLoadingOriginalPreview(false);
      return () => {};
    }

    const fetchOriginalPreview = async () => {
      try {
        setLoadingOriginalPreview(true);
        const response = await getPostById(post.repostedFromId, { includeMedias: true, includeMusic: true });
        if (!isMounted) return;
        if (response?.success && response.data) {
          setOriginalPreviewPost(response.data);
        } else if (response && response._id) {
          setOriginalPreviewPost(response);
        } else {
          setOriginalPreviewPost(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error("[ShareModal] Failed to fetch original post preview:", err);
          setOriginalPreviewPost(null);
        }
      } finally {
        if (isMounted) {
          setLoadingOriginalPreview(false);
        }
      }
    };

    fetchOriginalPreview();

    return () => {
      isMounted = false;
    };
  }, [open, post?.repostedFromId]);

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase().trim();
    return conversations.filter(conv => {
      const name = (conv.displayName || conv.name || conv.userName || "").toLowerCase();
      const lastMessage = (conv.last_message_content || conv.lastMessage || "").toLowerCase();
      return name.includes(query) || lastMessage.includes(query);
    });
  }, [conversations, searchQuery]);

  // Handle click outside để đóng popup
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target) && 
          triggerRef?.current && !triggerRef.current.contains(e.target)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  // Determine if we should center the modal (when selecting conversation or reposting)
  const shouldCenter = shareType === 'message' || shareType === 'wall';

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 z-[9998]",
          shouldCenter ? "bg-black/50 backdrop-blur-sm" : "bg-transparent"
        )}
        onClick={onClose} 
      />
      <div 
        ref={popupRef}
        className={cn(
          "fixed bg-card/95 backdrop-blur-xl shadow-2xl z-[9999]",
          "flex flex-col overflow-hidden border-[0.5px] border-border/30",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/10 before:via-transparent before:to-secondary/10",
          "before:opacity-60 before:pointer-events-none",
          shouldCenter 
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-[500px] max-w-[520px] max-h-[700px] rounded-[20px]"
            : "min-w-[200px] max-w-[320px] max-h-[400px] rounded-2xl"
        )}
        style={!shouldCenter ? { top: `${position.top}px`, left: `${position.left}px` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {!shareType ? (
          <div className="flex flex-col gap-1">
            <button
              className={cn(
                "flex items-center gap-3 px-4 py-3 relative z-10",
                "bg-transparent border-none cursor-pointer",
                "transition-all duration-300 text-foreground text-[0.95rem] font-semibold",
                "text-left w-full rounded-xl",
                "hover:bg-muted/20",
                "active:scale-95"
              )}
              onClick={() => setShareType('message')}
            >
              <svg className="flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="flex-1">Chia sẻ vào tin nhắn</span>
            </button>
            <button
              className={cn(
                "flex items-center gap-3 px-4 py-3 relative z-10",
                "bg-transparent border-none cursor-pointer",
                "transition-all duration-300 text-foreground text-[0.95rem] font-semibold",
                "text-left w-full rounded-xl",
                "hover:bg-muted/20",
                "active:scale-95"
              )}
              onClick={() => setShareType('wall')}
            >
              <svg className="flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              <span className="flex-1">Đăng lại</span>
            </button>
          </div>
        ) : shareType === 'message' ? (
            <div className="flex flex-col h-full max-h-[500px]">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 flex-shrink-0">
                <button 
                  className={cn(
                    "w-8 h-8 flex items-center justify-center",
                    "bg-transparent border-none rounded-full cursor-pointer",
                    "text-foreground transition-all duration-200",
                    "hover:bg-muted/50 active:scale-95"
                  )}
                  onClick={() => setShareType(null)}
                >
                  <ArrowLeft size={18} />
                </button>
                <h4 className="m-0 flex-1 text-base font-semibold text-foreground">
                  Chọn cuộc trò chuyện
                </h4>
              </div>

              {/* Search Bar */}
              <div className="px-4 pt-3 pb-2 flex-shrink-0">
                <div className="relative">
                  <Search 
                    size={16} 
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder="Tìm kiếm cuộc trò chuyện..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "w-full pl-9 pr-3 py-2.5 rounded-lg",
                      "bg-muted/50 border border-border/30",
                      "text-sm text-foreground placeholder:text-muted-foreground",
                      "outline-none transition-all duration-200",
                      "focus:bg-muted focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    )}
                  />
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto px-2 pb-2">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground">Đang tải...</p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <Search size={24} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      {searchQuery ? "Không tìm thấy cuộc trò chuyện" : "Không có cuộc trò chuyện nào"}
                    </p>
                    {searchQuery && (
                      <p className="text-xs text-muted-foreground text-center">
                        Thử tìm kiếm với từ khóa khác
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {filteredConversations.map((conv) => {
                      const convId = conv._id || conv.id || conv.conversationId;
                      const isSelected = selectedConversation && (
                        String(selectedConversation._id) === String(convId) ||
                        String(selectedConversation.id) === String(convId) ||
                        String(selectedConversation.conversationId) === String(convId)
                      );
                      return (
                        <button
                          key={convId}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3",
                            "bg-transparent border-none rounded-xl cursor-pointer",
                            "transition-all duration-200 text-left w-full",
                            "group",
                            isSelected
                              ? "bg-primary/15 border border-primary/30 shadow-sm"
                              : "hover:bg-muted/30",
                            "active:scale-[0.98]"
                          )}
                          onClick={() => setSelectedConversation(conv)}
                        >
                          <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-offset-2 ring-offset-card transition-all duration-200"
                            style={{
                              ringColor: isSelected ? 'rgb(var(--primary))' : 'transparent'
                            }}
                          >
                            {(conv.displayAvatar || conv.avatar) ? (
                              <img 
                                src={conv.displayAvatar || conv.avatar} 
                                alt={conv.displayName || conv.name} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  const fallback = e.target.nextElementSibling;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={cn(
                                "w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20",
                                "flex items-center justify-center text-foreground font-semibold text-base",
                                (conv.displayAvatar || conv.avatar) ? 'hidden' : ''
                              )}
                            >
                              {(conv.displayName || conv.name || '?')?.[0]?.toUpperCase() || '?'}
                            </div>
                            {isSelected && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <Check size={12} className="text-primary-foreground" />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[0.95rem]">
                              {conv.displayName || conv.name || conv.userName || "Người dùng"}
                            </div>
                            {(conv.last_message_content || conv.lastMessage) && (
                              <div className="text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                                {conv.last_message_content || conv.lastMessage}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-2 justify-end px-4 py-3 border-t border-border/30 flex-shrink-0 bg-card/50">
                <button 
                  className={cn(
                    "px-5 py-2.5 rounded-lg text-sm font-medium",
                    "cursor-pointer transition-all duration-200 border-none",
                    "bg-transparent text-foreground",
                    "hover:bg-muted/50",
                    "active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  )}
                  onClick={onClose} 
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  className={cn(
                    "px-6 py-2.5 rounded-lg text-sm font-semibold",
                    "cursor-pointer transition-all duration-200 border-none",
                    "bg-primary text-primary-foreground",
                    "hover:bg-primary/90 shadow-md",
                    "active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                  )}
                  onClick={handleShareToMessage}
                  disabled={submitting || !selectedConversation}
                >
                  {submitting ? "Đang gửi..." : "Gửi"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full max-h-[700px]">
              {/* Header */}
              <div className="post-form-header flex-shrink-0">
                <button 
                  className={cn(
                    "w-8 h-8 flex items-center justify-center",
                    "bg-transparent border-none rounded-full cursor-pointer",
                    "text-foreground transition-all duration-200",
                    "hover:bg-muted/50 active:scale-95"
                  )}
                  onClick={() => setShareType(null)}
                >
                  <ArrowLeft size={18} strokeWidth={1.5} />
                </button>
                <div className="post-form-header-content" style={{ flex: 1, justifyContent: 'center' }}>
                  <span className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Đăng lại</span>
                </div>
                <button
                  type="button"
                  className="post-form-header-close"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>

              {/* User Info Section */}
              {currentUser && (
                <div className="px-6 pt-4 pb-3 flex items-center gap-3 flex-shrink-0 border-b border-border/20">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.nextElementSibling;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={cn(
                        "w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20",
                        "flex items-center justify-center text-foreground font-semibold text-sm",
                        currentUser.avatar ? 'hidden' : ''
                      )}
                    >
                      {currentUser.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                      {currentUser.name}
                    </div>
                  </div>
                  {/* Privacy Dropdown */}
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                        "text-xs font-medium",
                        "bg-muted/40 border-border hover:bg-muted/60",
                        "text-foreground"
                      )}
                    >
                      {status === "public" ? (
                        <Globe size={14} />
                      ) : (
                        <Lock size={14} />
                      )}
                      <ChevronDown size={12} className={cn("transition-transform", showPrivacyDropdown && "rotate-180")} />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {showPrivacyDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowPrivacyDropdown(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              setStatus("public");
                              setShowPrivacyDropdown(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                              "text-sm font-medium",
                              status === "public"
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted/50"
                            )}
                          >
                            <Globe size={18} />
                            <div className="flex flex-col">
                              <span>{t('modal.postPrivacyPublic')}</span>
                              <span className="text-xs text-muted-foreground">{t('modal.postPrivacyPublicDesc')}</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatus("private");
                              setShowPrivacyDropdown(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                              "text-sm font-medium",
                              status === "private"
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted/50"
                            )}
                          >
                            <Lock size={18} />
                            <div className="flex flex-col">
                              <span>{t('modal.postPrivacyPrivate')}</span>
                              <span className="text-xs text-muted-foreground">{t('modal.postPrivacyPrivateDesc')}</span>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* Comment Input */}
                <div className="mb-4">
                  <textarea
                    placeholder="Bạn đang nghĩ gì?..."
                    value={repostComment}
                    onChange={(e) => setRepostComment(e.target.value)}
                    className={cn(
                      "post-form-textarea post-form-textarea-modern",
                      "w-full min-h-[120px] p-4",
                      "text-foreground placeholder:text-muted-foreground/70",
                      "transition-all duration-200"
                    )}
                    maxLength={500}
                    rows={4}
                  />
                  <div className="text-xs text-muted-foreground text-right mt-2">
                    {repostComment.length}/500
                  </div>
                </div>

                {/* Original Post Preview */}
                <div className="mb-4">
                  <div className="p-4 bg-card rounded-xl border-[0.5px] border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    {loadingOriginalPreview && post.repostedFromId ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        {t('common.loading') || 'Đang tải...'}
                      </div>
                    ) : (
                      <>
                        {/* Original Author Info */}
                        {(() => {
                          const previewSource = post.repostedFromId && originalPreviewPost ? originalPreviewPost : post;
                          const previewAvatar = previewSource.avatar || previewSource.authorAvatar || previewSource.author?.avatar || previewSource.account?.avatar || post.authorAvatar || post.avatar;
                          const previewName = previewSource.user || previewSource.authorName || previewSource.author?.userName || previewSource.account?.userName || "Người dùng";
                          const previewTime = previewSource.time || post.time || null;
                          return (
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                {previewAvatar ? (
                                  <img
                                    src={previewAvatar}
                                    alt={previewName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      const fallback = e.target.nextElementSibling;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className={cn(
                                  "w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20",
                                  "flex items-center justify-center text-foreground font-semibold",
                                  previewAvatar ? 'hidden' : ''
                                )}>
                                  {previewName?.[0]?.toUpperCase() || '?'}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-foreground text-sm">
                                  {previewName}
                                </div>
                                {previewTime && (
                                  <div className="text-xs text-muted-foreground">
                                    {previewTime}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Original Post Content */}
                        {(() => {
                          const source = post.repostedFromId && originalPreviewPost ? originalPreviewPost : post;
                          const isMedia = source.isMedia || (source.url && (!source.content || !source.content?.trim()) && (!source.title || !source.title?.trim()));
                          
                          const collectMedias = (target) => {
                            const result = { images: [], videos: [] };
                            if (!target) return result;
                            const medias = target.medias;
                            if (Array.isArray(medias)) {
                              medias.forEach((m) => {
                                if (!m?.url) return;
                                if (m.type === 'video' || m.url?.match(/\.(mp4|webm|mov)$/i)) {
                                  result.videos.push(m);
                                } else {
                                  result.images.push(m);
                                }
                              });
                            } else if (medias && typeof medias === 'object') {
                              if (Array.isArray(medias.images) || Array.isArray(medias.videos)) {
                                result.images = medias.images || [];
                                result.videos = medias.videos || [];
                              } else {
                                const entries = medias instanceof Map ? Array.from(medias.values()) : Object.values(medias);
                                entries.forEach((m) => {
                                  if (!m?.url) return;
                                  if (m.type === 'video' || m.url?.match(/\.(mp4|webm|mov)$/i)) {
                                    result.videos.push(m);
                                  } else {
                                    result.images.push(m);
                                  }
                                });
                              }
                            }
                            return result;
                          };

                          const { images, videos } = collectMedias(source);
                          const hasMedia = (isMedia && source.url) || images.length > 0 || videos.length > 0;

                          return (
                            <div className="space-y-3">
                              {(source.content || source.title) && (
                                <p className="m-0 text-foreground text-sm break-words leading-relaxed whitespace-pre-wrap">
                                  {source.content || source.title}
                                </p>
                              )}

                              {hasMedia && (
                                <div className="space-y-2">
                                  {isMedia && source.url && (
                                    <img
                                      src={source.url}
                                      alt="Media preview"
                                      className="w-full max-h-[300px] object-contain rounded-lg bg-card"
                                    />
                                  )}
                                  {images.length > 0 && (
                                    <div className={cn(
                                      "grid gap-2 rounded-lg overflow-hidden",
                                      images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                                    )}>
                                      {images.slice(0, 4).map((img, idx) => (
                                        <div key={idx} className="relative">
                                          <img
                                            src={img.url || img}
                                            alt={`Image ${idx + 1}`}
                                            className={cn(
                                              "w-full object-cover bg-card",
                                              images.length === 1 ? "h-auto max-h-[300px]" : "h-32"
                                            )}
                                          />
                                          {idx === 3 && images.length > 4 && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg">
                                              +{images.length - 4}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {videos.length > 0 && videos[0].url && (
                                    <div className="relative w-full rounded-lg overflow-hidden bg-card">
                                      <video
                                        src={videos[0].url}
                                        className="w-full max-h-[300px] object-contain"
                                        controls={false}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}

                              {source.hashtags && source.hashtags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {source.hashtags.map((tag, i) => (
                                    <span key={i} className="text-primary text-xs">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="post-form-footer post-form-footer-modern flex-shrink-0">
                <button 
                  type="button"
                  className="post-form-button post-form-button-cancel post-form-button-cancel-modern"
                  onClick={onClose} 
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="post-form-button post-form-button-submit post-form-button-submit-modern"
                  onClick={handleShareToWall}
                  disabled={submitting}
                >
                  {submitting ? "Đang đăng lại..." : "Đăng lại"}
                </button>
              </div>
            </div>
          )}
      </div>
    </>
  );
}

ShareModal.propTypes = {
  open: PropTypes.bool,
  post: PropTypes.object,
  onClose: PropTypes.func,
  onShared: PropTypes.func,
  triggerRef: PropTypes.object,
};

