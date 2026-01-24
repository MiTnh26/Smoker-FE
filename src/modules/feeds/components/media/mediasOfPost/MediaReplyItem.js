import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { MoreVertical } from "lucide-react";
import { getAvatarForAccount, getNameForAccount, formatTimeDisplay, getLikesCount, isLiked, getCurrentUser, parseReplies, canManageReply, getSessionData } from "./utils";
import { cn } from "../../../../../utils/cn";
import ExpandableText from "../../../../../components/common/ExpandableText";

export default function MediaReplyItem({
  reply,
  commentId,
  isEditing,
  isReplying,
  editingComment,
  replyingTo,
  replyText,
  setReplyText,
  pendingLikes,
  submitting,
  onLikeClick,
  onReplyClick,
  onEditClick,
  onDeleteClick,
  onSaveEdit,
  onCancelEdit,
  onNavigateToProfile,
  onViewImage,
  replyInputRef,
  onAddReply
}) {
  const currentUser = getCurrentUser();
  // Use sessionData with activeEntity for role-based likes check
  const sessionData = getSessionData();
  const replyLiked = isLiked(reply.likes, sessionData?.activeEntity || sessionData || currentUser);
  const replyLikesCount = getLikesCount(reply.likes);
  const isReplyOwner = canManageReply(reply);
  const isEditingReply = editingComment?.type === 'reply' && editingComment.id === reply.id;
  const isReplyingToReply = replyingTo?.type === 'reply' && replyingTo.replyId === reply.id;
  const replyPendingKey = `reply-${commentId}-${reply.id}`;
  
  // Menu state
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          menuButtonRef.current && !menuButtonRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    const menuKey = `reply-${commentId}-${reply.id}`;
    if (openMenuId === menuKey) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId, commentId, reply.id]);

  return (
    <div className="py-2">
      <div className="flex gap-2 items-start">
        <img 
          className="w-7 h-7 rounded-full object-cover flex-shrink-0 cursor-pointer" 
          src={reply.authorAvatar || getAvatarForAccount(reply.accountId, reply.authorEntityAccountId, reply.authorAvatar)} 
          alt="avatar"
          onClick={() => onNavigateToProfile(reply.authorEntityId, reply.authorEntityType, reply.authorEntityAccountId)}
        />
        <div className="flex-1 flex flex-col gap-1 min-w-0 max-w-full overflow-hidden relative">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className={cn(
                "text-foreground font-semibold text-[0.85rem] cursor-pointer",
                "hover:underline"
              )}
              onClick={() => onNavigateToProfile(reply.authorEntityId, reply.authorEntityType, reply.authorEntityAccountId)}
            >
              {reply.authorName || getNameForAccount(reply.accountId, reply.authorEntityAccountId, reply.authorName)}
            </span>
            {reply.createdAt && (
              <span className="text-muted-foreground text-[0.7rem]">
                {formatTimeDisplay(reply.createdAt)}
              </span>
            )}
            {/* Menu button for reply owner */}
            {isReplyOwner && !isEditingReply && (
              <div className="ml-auto">
                <button
                  ref={menuButtonRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    const menuKey = `reply-${commentId}-${reply.id}`;
                    if (menuButtonRef.current && openMenuId !== menuKey) {
                      const rect = menuButtonRef.current.getBoundingClientRect();
                      setMenuPosition({
                        top: rect.bottom + 4,
                        right: window.innerWidth - rect.right
                      });
                    }
                    setOpenMenuId(openMenuId === menuKey ? null : menuKey);
                  }}
                  className={cn(
                    "p-1 rounded-full transition-all duration-200",
                    "hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {openMenuId === `reply-${commentId}-${reply.id}` && (
                  <div
                    ref={menuRef}
                    className={cn(
                      "fixed z-[100000]",
                      "bg-card border border-border rounded-lg shadow-lg",
                      "p-1 overflow-hidden"
                    )}
                    style={{
                      top: `${menuPosition.top}px`,
                      right: `${menuPosition.right}px`
                    }}
                  >
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditClick('reply', reply.id, commentId, reply.id);
                          setOpenMenuId(null);
                        }}
                        className={cn(
                          "px-3 py-1.5 text-sm whitespace-nowrap",
                          "text-foreground hover:bg-muted/30 rounded",
                          "transition-colors duration-200"
                        )}
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClick('reply', reply.id, commentId, reply.id);
                          setOpenMenuId(null);
                        }}
                        className={cn(
                          "px-3 py-1.5 text-sm whitespace-nowrap",
                          "text-danger hover:bg-danger/10 rounded",
                          "transition-colors duration-200"
                        )}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {isEditingReply ? (
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className={cn(
                "w-full px-2 py-2 mt-1",
                "border-[0.5px] border-border/20 rounded-lg",
                "bg-background text-foreground text-[0.85rem]",
                "outline-none",
                "focus:border-primary focus:ring-2 focus:ring-primary/10"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") {
                  onCancelEdit();
                  setReplyText("");
                }
              }}
              autoFocus
            />
          ) : (
            <ExpandableText
              text={reply.content || ""}
              maxLength={150}
              textClassName={cn(
                "text-foreground text-[0.85rem] leading-6"
              )}
              buttonClassName="text-[0.85rem]"
            />
          )}
          {reply.images && !isEditingReply && (
            <img
              src={reply.images}
              alt="Reply attachment"
              className={cn(
                "max-w-full w-auto h-auto max-h-[150px]",
                "rounded-lg my-2 object-contain cursor-pointer block",
                "transition-transform duration-200",
                "hover:scale-105"
              )}
              onClick={() => onViewImage(reply.images)}
            />
          )}
        </div>
      </div>
      
      <div className="flex gap-3 mt-1">
        <button 
          className={cn(
            "inline-flex items-center gap-1.5",
            "bg-transparent border-none text-muted-foreground text-sm",
            "px-1 py-1 rounded transition-all duration-200",
            "cursor-pointer",
            "hover:bg-muted/30 hover:text-foreground",
            replyLiked && "text-danger",
            pendingLikes[replyPendingKey] && "opacity-60 cursor-not-allowed"
          )}
          aria-pressed={replyLiked}
          disabled={!!pendingLikes[replyPendingKey]}
          onClick={() => onLikeClick(commentId, reply.id, reply)}
          title={replyLiked ? 'Bỏ thích' : 'Thích'}
        >
          <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill={replyLiked ? "currentColor" : "none"} stroke="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="font-semibold min-w-[1.25rem] text-left">{replyLikesCount}</span>
        </button>
        
        {!isEditingReply && (
            <button 
              className={cn(
                "bg-transparent border-none text-muted-foreground text-sm",
                "px-1 py-1 rounded transition-all duration-200 cursor-pointer",
                "hover:bg-muted/30 hover:text-foreground"
              )}
              onClick={() => onReplyClick(commentId, reply.id)}
            >
              Phản hồi
            </button>
        )}
        
        {isEditingReply && (
          <>
            <button 
              className={cn(
                "bg-transparent border-none text-primary font-semibold text-sm",
                "px-1 py-1 rounded transition-all duration-200 cursor-pointer",
                "hover:bg-primary/10",
                submitting && "opacity-50 cursor-not-allowed"
              )}
              onClick={onSaveEdit}
              disabled={submitting}
            >
              Lưu
            </button>
            <button 
              className={cn(
                "bg-transparent border-none text-muted-foreground text-sm",
                "px-1 py-1 rounded transition-all duration-200 cursor-pointer",
                "hover:bg-muted/30 hover:text-foreground"
              )}
              onClick={() => {
                onCancelEdit();
                setReplyText("");
              }}
            >
              Hủy
            </button>
          </>
        )}
      </div>

      {/* Nested Reply Input */}
      {isReplyingToReply && (
        <div className="flex gap-2 mt-2 p-2 bg-muted/10 rounded-lg">
          <input
            ref={replyInputRef}
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Viết phản hồi..."
            className={cn(
              "flex-1 px-2 py-2",
              "border-[0.5px] border-border/20 rounded-lg",
              "bg-background text-foreground text-[0.85rem]",
              "outline-none transition-all duration-200",
              "focus:border-primary focus:ring-2 focus:ring-primary/10"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && replyText.trim()) {
                onAddReply();
              }
              if (e.key === "Escape") {
                onCancelEdit();
                setReplyText("");
              }
            }}
          />
          <button
            className={cn(
              "px-4 py-2 bg-primary text-primary-foreground",
              "border-none rounded font-semibold text-[0.85rem]",
              "cursor-pointer transition-all duration-200",
              "hover:opacity-90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            onClick={onAddReply}
            disabled={!replyText.trim() || submitting}
          >
            Đăng
          </button>
        </div>
      )}
    </div>
  );
}

MediaReplyItem.propTypes = {
  reply: PropTypes.object.isRequired,
  commentId: PropTypes.string.isRequired,
  isEditing: PropTypes.bool,
  isReplying: PropTypes.bool,
  editingComment: PropTypes.object,
  replyingTo: PropTypes.object,
  replyText: PropTypes.string.isRequired,
  setReplyText: PropTypes.func.isRequired,
  pendingLikes: PropTypes.object.isRequired,
  submitting: PropTypes.bool.isRequired,
  onLikeClick: PropTypes.func.isRequired,
  onReplyClick: PropTypes.func.isRequired,
  onEditClick: PropTypes.func.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
  onSaveEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onNavigateToProfile: PropTypes.func.isRequired,
  onViewImage: PropTypes.func.isRequired,
  replyInputRef: PropTypes.object,
  onAddReply: PropTypes.func.isRequired
};

