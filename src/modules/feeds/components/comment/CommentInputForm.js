import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { addComment } from "../../../../api/postApi";
import { cn } from "../../../../utils/cn";

export default function CommentInputForm({ postId, onCommentAdded }) {
  const { t } = useTranslation();
  const ANONYMOUS_AVATAR_URL = "/images/an-danh.png";
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewerName, setViewerName] = useState("");
  const [viewerAvatar, setViewerAvatar] = useState(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, bottom: 0 });
  const roleMenuRef = useRef(null);
  const menuRef = useRef(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [canUseAnonymous, setCanUseAnonymous] = useState(false);

  const normalizeId = (value) => (value ? String(value).trim().toLowerCase() : null);

  const getAvatarForAccount = (accountId, entityAccountId) => {
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlNWU3ZWIiLz4KPC9zdmc+";
  };

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

  // Load viewer identity & determine anonymous permission
  useEffect(() => {
    const identity = resolveViewerIdentity();
    setViewerName(identity.name || "User");
    setViewerAvatar(identity.avatar);

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
      console.error("Error loading viewer identity:", error);
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

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      return;
    }

    setSubmitting(true);

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
      const entityId = activeEntity?.entityId || session?.account?.id;
      const entityType = typeRole;
      const useAnonymous = canUseAnonymous && isAnonymous;

      const response = await addComment(postId, {
        content: newComment.trim(),
        typeRole: typeRole,
        entityAccountId: entityAccountId,
        entityId: entityId,
        entityType: entityType,
        isAnonymous: useAnonymous,
      });

      if (response?.success || response?.data?.success) {
        setNewComment("");
        // Callback to reload comments - call immediately and after delay
        if (onCommentAdded) {
          onCommentAdded();
          // Also call after delay to ensure backend has processed
          setTimeout(() => {
            onCommentAdded();
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
                : (viewerAvatar || getAvatarForAccount())
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
                src={viewerAvatar || getAvatarForAccount()} 
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
                  src={ANONYMOUS_AVATAR_URL} 
                  alt="Người ẩn danh"
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
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
            "w-full px-4 py-2 pr-10 border-[0.5px] border-border/20 rounded-2xl",
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
            "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center",
            "bg-transparent border-none rounded-full cursor-pointer transition-colors duration-200",
            newComment.trim() 
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground/50 cursor-not-allowed"
          )}
          disabled={submitting || !newComment.trim()}
          aria-label="Send comment"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </form>
  );
}

CommentInputForm.propTypes = {
  postId: PropTypes.string.isRequired,
  onCommentAdded: PropTypes.func,
};

