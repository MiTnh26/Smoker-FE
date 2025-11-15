import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import messageApi from "../../../../api/messageApi";
import { createPost, trackPostShare } from "../../../../api/postApi";
import { cn } from "../../../../utils/cn";

export default function ShareModal({ open, post, onClose, onShared, triggerRef }) {
  const [shareType, setShareType] = useState(null); // 'message' or 'wall'
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popupRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (open && shareType === 'message') {
      loadConversations();
    }
  }, [open, shareType]);

  // Tính toán vị trí popup dựa trên trigger element
  useEffect(() => {
    if (open && triggerRef?.current) {
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
    }
  }, [open, triggerRef]);

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

      if (entityAccountId) {
        const response = await messageApi.getConversations(entityAccountId);
        const data = response?.data || response;
        setConversations(data?.conversations || data || []);
      }
    } catch (error) {
      console.error("[ShareModal] Error loading conversations:", error);
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

      const postUrl = typeof window !== "undefined" ? `${window.location.origin}/posts/${post.id}` : `https://smoker.app/posts/${post.id}`;
      const messageContent = `📎 ${post.title || post.content || "Bài viết"}\n${postUrl}`;

      await messageApi.sendMessage(
        selectedConversation.conversationId || selectedConversation.id,
        messageContent,
        "text",
        entityAccountId,
        entityType,
        entityId
      );

      // Track share
      if (post.id) {
        trackPostShare(post.id).catch(err => {
          console.warn('[ShareModal] Failed to track share:', err);
        });
      }

      onShared?.({ type: 'message', conversationId: selectedConversation.conversationId || selectedConversation.id });
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

      // Tạo repost với reference đến post gốc
      const postData = {
        title: post.title || "",
        content: post.content || "",
        type: "post",
        repostedFromId: post.id || post._id, // Reference đến post gốc
        typeRole: typeRole,
        entityAccountId: entityAccountId,
        entityId: entityId,
        entityType: entityType,
        authorEntityId: entityId,
        authorEntityType: entityType,
        authorEntityName: activeEntity?.name || activeEntity?.userName || "Người dùng",
        authorEntityAvatar: activeEntity?.avatar || activeEntity?.profilePicture || "",
        // Copy medias từ post gốc nếu có
        mediaIds: post.mediaIds || []
      };

      await createPost(postData);

      // Track share
      if (post.id) {
        trackPostShare(post.id).catch(err => {
          console.warn('[ShareModal] Failed to track share:', err);
        });
      }

      onShared?.({ type: 'wall' });
      onClose?.();
    } catch (error) {
      console.error("[ShareModal] Error reposting:", error);
      alert("Không thể đăng lại bài viết. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <>
      <div 
        className="fixed inset-0 z-[9998] bg-transparent" 
        onClick={onClose} 
      />
      <div 
        ref={popupRef}
        className={cn(
          "fixed bg-card/90 backdrop-blur-xl rounded-xl min-w-[200px] max-w-[320px] max-h-[400px]",
          "flex flex-col shadow-[0_2px_8px_rgba(0,0,0,0.15)] z-[9999]",
          "overflow-hidden border-[0.5px] border-border/20",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/10 before:via-transparent before:to-secondary/10",
          "before:opacity-60 before:pointer-events-none"
        )}
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
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
            <div className="flex flex-col gap-3 p-2">
              <button 
                className={cn(
                  "bg-transparent border-none text-primary cursor-pointer",
                  "py-1 text-sm self-start transition-colors duration-200",
                  "hover:opacity-80"
                )}
                onClick={() => setShareType(null)}
              >
                ← Quay lại
              </button>
              <h4 className="m-0 mb-2 text-[0.95rem] font-semibold text-foreground">
                Chọn cuộc trò chuyện
              </h4>
              {loading ? (
                <div className="text-center p-4 text-muted-foreground text-sm">
                  Đang tải...
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center p-4 text-muted-foreground text-sm">
                  Không có cuộc trò chuyện nào
                </div>
              ) : (
                <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto">
                  {conversations.map((conv) => (
                    <button
                      key={conv.conversationId || conv.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3.5",
                        "bg-transparent border-none rounded-xl cursor-pointer",
                        "transition-all duration-300 text-left w-full",
                        selectedConversation?.conversationId === conv.conversationId || selectedConversation?.id === conv.id
                          ? "bg-primary/20 shadow-lg scale-[1.02]"
                          : "hover:bg-muted/20",
                        "active:scale-95"
                      )}
                      onClick={() => setSelectedConversation(conv)}
                    >
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                        {conv.avatar ? (
                          <img src={conv.avatar} alt={conv.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-xl">
                            {conv.name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                          {conv.name || conv.userName || "Người dùng"}
                        </div>
                        {conv.lastMessage && (
                          <div className="text-sm text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                            {conv.lastMessage}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2 justify-end p-3 border-t border-border/30 mt-2">
                <button 
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-sm font-semibold",
                    "cursor-pointer transition-all duration-300 border-none",
                    "bg-transparent text-foreground",
                    "hover:bg-muted/20",
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
                    "px-5 py-2.5 rounded-xl text-sm font-semibold",
                    "cursor-pointer transition-all duration-300 border-none",
                    "bg-primary text-primary-foreground",
                    "hover:bg-primary/90",
                    "active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  )}
                  onClick={handleShareToMessage}
                  disabled={submitting || !selectedConversation}
                >
                  {submitting ? "Đang gửi..." : "Gửi"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-2">
              <button 
                className={cn(
                  "bg-transparent border-none text-primary cursor-pointer",
                  "py-1 text-sm self-start transition-colors duration-200",
                  "hover:opacity-80"
                )}
                onClick={() => setShareType(null)}
              >
                ← Quay lại
              </button>
              <div className="p-3 bg-muted/20 rounded-md">
                <p className="m-0 mb-3 text-muted-foreground text-sm">
                  Bài viết sẽ được đăng lại trên tường của bạn:
                </p>
                <div className="p-3 bg-card rounded border-[0.5px] border-border/20">
                  <strong className="text-foreground break-words">
                    {post.title || post.content || "Bài viết"}
                  </strong>
                </div>
              </div>
              <div className="flex gap-2 justify-end p-3 border-t border-border/30 mt-2">
                <button 
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium",
                    "cursor-pointer transition-all duration-200 border-none",
                    "bg-transparent text-foreground",
                    "hover:bg-muted/20",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  onClick={onClose} 
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium",
                    "cursor-pointer transition-all duration-200 border-none",
                    "bg-primary text-primary-foreground",
                    "hover:opacity-90 hover:-translate-y-0.5",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  )}
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

