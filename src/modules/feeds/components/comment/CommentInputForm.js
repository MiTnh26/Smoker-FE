import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { addComment } from "../../../../api/postApi";
import { cn } from "../../../../utils/cn";

export default function CommentInputForm({ postId, onCommentAdded, onSubmitOverride, placeholder, disabled }) {
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

  // Load viewer identity & temporarily disable anonymous
  useEffect(() => {
    const identity = resolveViewerIdentity();
    setViewerName(identity.name || "User");
    setViewerAvatar(identity.avatar);
    setCanUseAnonymous(false);
    setIsAnonymous(false);
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
    if (!newComment.trim() || disabled) {
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
      const useAnonymous = false; // anonymous temporarily disabled

      let ok = false;
      if (typeof onSubmitOverride === "function") {
        ok = await onSubmitOverride(newComment.trim());
      } else {
        const response = await addComment(postId, {
          content: newComment.trim(),
          typeRole: typeRole,
          entityAccountId: entityAccountId,
          entityId: entityId,
          entityType: entityType,
          isAnonymous: useAnonymous,
        });
        ok = response?.success || response?.data?.success;
      }

      if (ok) {
        setNewComment("");
        if (onCommentAdded) {
          onCommentAdded();
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
        {/* Anonymous selection temporarily disabled */}
        <img 
          src={viewerAvatar || getAvatarForAccount()} 
          alt={viewerName}
          className="w-8 h-8 rounded-full object-cover mt-1"
          onError={(e) => {
            e.target.src = getAvatarForAccount();
          }}
        />
      </div>
      <div className="flex-1 relative">
        <textarea
          placeholder={
            placeholder || `${t('comment.commentAs', { defaultValue: 'Comment as' })} ${viewerName}`
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
            "w-full h-13 px-4 py-3 pr-10 border-[0.5px] border-border/20 rounded-2xl",
            "bg-muted/50 text-foreground text-sm outline-none resize-none",
            "transition-all duration-200",
            "focus:border-primary focus:ring-1 focus:ring-primary/10",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          rows={1}
          disabled={submitting || disabled}
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
          disabled={submitting || !newComment.trim() || disabled}
          aria-label="Send comment"
        >
          <svg className="w-5 h-5 pb-[2px]" viewBox="0 0 24 24" fill="currentColor">
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
  onSubmitOverride: PropTypes.func,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
};

