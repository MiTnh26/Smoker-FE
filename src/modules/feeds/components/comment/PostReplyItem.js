import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getAvatarForAccount, getNameForAccount, formatTimeDisplay, getLikesCount, isLiked, canManageReply, getSessionData } from "./utils";
import { cn } from "../../../../utils/cn";
import ExpandableText from "../../../../components/common/ExpandableText";

export default function PostReplyItem({
  reply,
  commentId,
  allReplies = [], // Tất cả replies để tìm tên người được reply
  activeEntity: activeEntityProp,
  isEditing,
  isReplying,
  editingReplyTarget,
  replyingTo,
  editReplyText,
  setEditReplyText,
  replyContent,
  setReplyContent,
  submitting,
  onLikeClick,
  onReplyClick,
  onAddReply,
  onEditClick,
  onDeleteClick,
  onSaveEdit,
  onCancelEdit,
  onNavigateToProfile,
  replyActionLoadingKey
}) {
  const { t } = useTranslation();
  
  // Use activeEntity from props (passed from CommentSection) to avoid calling getSessionData() in every render
  // Fallback to getSessionData() only if prop is not provided (backward compatibility)
  const activeEntity = activeEntityProp || (() => {
    const sessionData = getSessionData();
    return sessionData?.activeEntity || sessionData;
  })();
  
  // Check like state from likesObject
  // Ưu tiên isLikedByMe/likedByViewer (trạng thái local sau khi user nhấn Like) trước khi check likesObject
  const likesObj = reply.likesObject || (typeof reply.likes === 'object' ? reply.likes : null);
  const replyLiked = typeof reply.isLikedByMe === 'boolean' 
    ? reply.isLikedByMe 
    : (typeof reply.likedByViewer === 'boolean' 
      ? reply.likedByViewer 
      : (likesObj ? isLiked(likesObj, activeEntity) : false));
  const replyLikesCount = reply.likes || getLikesCount(likesObj);
  const isReplyOwner = canManageReply(reply, activeEntity);
  const isEditingReply = editingReplyTarget?.commentId === commentId && editingReplyTarget?.replyId === reply.id;
  const isReplyingToReply = replyingTo?.replyId === reply.id && replyingTo?.type === "reply";
  const replyKey = `${commentId}-${reply.id}`;
  
  // Tìm tên người được reply (replyTo) - ưu tiên từ backend, fallback về tìm trong allReplies
  const getReplyToName = () => {
    // Ưu tiên: Sử dụng replyToAuthorName từ backend (đã được enrich)
    if (reply.replyToAuthorName && reply.replyToAuthorName !== 'Người dùng') {
      return reply.replyToAuthorName;
    }
    
    // Fallback: Tìm trong allReplies nếu backend chưa enrich
    if (reply.replyToId && allReplies && Array.isArray(allReplies)) {
      const replyTo = allReplies.find(r => String(r.id) === String(reply.replyToId));
      if (replyTo) {
        return replyTo.authorName && replyTo.authorName !== 'Người dùng'
          ? replyTo.authorName
          : getNameForAccount(replyTo.accountId, replyTo.authorEntityAccountId, replyTo.author?.name);
      }
    }
    
    return null;
  };
  
  const replyToName = getReplyToName();
  const authorName = reply.authorName && reply.authorName !== 'Người dùng'
    ? reply.authorName
    : getNameForAccount(reply.accountId, reply.authorEntityAccountId, reply.author?.name);
  
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
    <div className="py-2 sm:py-1.5">
      <div className="flex gap-2 items-start sm:gap-1.5">
        <img 
          className="w-7 h-7 rounded-full object-cover flex-shrink-0 cursor-pointer sm:w-6 sm:h-6 md:w-7 md:h-7" 
          src={reply.authorAvatar || getAvatarForAccount(reply.accountId, reply.authorEntityAccountId)} 
          alt="avatar"
          onClick={() => onNavigateToProfile(reply.authorEntityId, reply.authorEntityType, reply.authorEntityAccountId)}
        />
        <div className="flex-1 flex flex-col gap-1 min-w-0 max-w-full overflow-hidden relative">
          <div className="flex items-center gap-2 mb-1 sm:gap-1.5 flex-wrap">
            <div className="flex items-center gap-1">
              <span 
                className={cn(
                  "text-foreground font-semibold text-[0.85rem] cursor-pointer",
                  "hover:underline",
                  "sm:text-[0.75rem] md:text-[0.85rem]"
                )}
                onClick={() => onNavigateToProfile(reply.authorEntityId, reply.authorEntityType, reply.authorEntityAccountId)}
              >
                {authorName}
              </span>
              {/* Hiển thị "Người 1 > Người 2" nếu replyToId khác commentId (không phải reply comment gốc) */}
              {reply.replyToId && String(reply.replyToId) !== String(commentId) && replyToName && (
                <>
                  <span className="text-muted-foreground text-[0.85rem] sm:text-[0.75rem] md:text-[0.85rem]">
                    &gt;
                  </span>
                  <span 
                    className={cn(
                      "text-foreground font-semibold text-[0.85rem] cursor-pointer",
                      "hover:underline",
                      "sm:text-[0.75rem] md:text-[0.85rem]"
                    )}
                    onClick={() => {
                      const replyTo = allReplies.find(r => String(r.id) === String(reply.replyToId));
                      if (replyTo) {
                        onNavigateToProfile(replyTo.authorEntityId, replyTo.authorEntityType, replyTo.authorEntityAccountId);
                      }
                    }}
                  >
                    {replyToName}
                  </span>
                </>
              )}
            </div>
            {reply.createdAt && (
              <span className="text-muted-foreground text-[0.7rem] sm:text-[0.65rem] md:text-[0.7rem]">
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
                          onEditClick(commentId, reply);
                          setOpenMenuId(null);
                        }}
                        className={cn(
                          "px-3 py-1.5 text-sm whitespace-nowrap",
                          "text-foreground hover:bg-muted/30 rounded",
                          "transition-colors duration-200"
                        )}
                      >
                        {t('action.edit', { defaultValue: "Chỉnh sửa" })}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClick(commentId, reply.id);
                          setOpenMenuId(null);
                        }}
                        disabled={replyActionLoadingKey === replyKey}
                        className={cn(
                          "px-3 py-1.5 text-sm whitespace-nowrap",
                          "text-danger hover:bg-danger/10 rounded",
                          "transition-colors duration-200",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {replyActionLoadingKey === replyKey
                          ? t('action.deleting', { defaultValue: "Đang xóa..." })
                          : t('action.delete', { defaultValue: "Xóa" })}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {isEditingReply ? (
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
                disabled={replyActionLoadingKey === replyKey}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={onSaveEdit}
                  className={cn(
                    "px-4 py-2 bg-primary text-primary-foreground border-none rounded-lg",
                    "font-semibold text-sm cursor-pointer transition-all duration-200",
                    "hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
                    "sm:px-3 sm:py-1.5 sm:text-xs md:px-4 md:py-2 md:text-sm"
                  )}
                  disabled={replyActionLoadingKey === replyKey || !editReplyText.trim()}
                >
                  {replyActionLoadingKey === replyKey
                    ? t('action.saving', { defaultValue: "Đang lưu..." })
                    : t('action.save', { defaultValue: "Lưu" })}
                </button>
                <button
                  onClick={onCancelEdit}
                  className={cn(
                    "px-4 py-2 bg-muted/30 text-foreground border-none rounded-lg",
                    "font-semibold text-sm cursor-pointer transition-all duration-200",
                    "hover:bg-muted/50",
                    "sm:px-3 sm:py-1.5 sm:text-xs md:px-4 md:py-2 md:text-sm"
                  )}
                  disabled={replyActionLoadingKey === replyKey}
                >
                  {t('action.cancel')}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <ExpandableText
                text={reply.content || ""}
                maxLength={150}
                textClassName={cn(
                  "text-foreground text-[0.85rem] leading-6",
                  "sm:text-[0.75rem] sm:leading-5 md:text-[0.85rem] md:leading-6"
                )}
                buttonClassName="sm:text-[0.7rem] md:text-[0.85rem]"
              />
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
          onClick={() => onLikeClick(commentId, reply.id)}
          className={cn(
            "inline-flex items-center gap-1.5 bg-transparent border-none",
            "text-muted-foreground text-sm px-1 py-1 rounded",
            "cursor-pointer transition-all duration-200",
            "hover:bg-muted/30 hover:text-foreground",
            replyLiked && "text-danger",
            "sm:gap-1 sm:text-xs md:text-sm"
          )}
          aria-label="Like reply"
        >
          <svg className="w-5 h-5 flex-shrink-0 sm:w-4 sm:h-4 md:w-5 md:h-5" width="20" height="20" viewBox="0 0 24 24" fill={replyLiked ? "currentColor" : "none"} stroke="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="font-semibold min-w-[1.25rem] text-left sm:min-w-[1rem]">{replyLikesCount}</span>
        </button>
        <button
          onClick={() => {
            // Truyền userName khi click reply
            const targetUserName = authorName;
            onReplyClick(commentId, reply.id, targetUserName);
          }}
          className={cn(
            "bg-transparent border-none text-muted-foreground text-sm",
            "px-1 py-1 rounded cursor-pointer transition-all duration-200",
            "hover:bg-muted/30 hover:text-foreground",
            "sm:text-xs md:text-sm"
          )}
        >
          {t('comment.reply')}
        </button>
      </div>

      {/* Reply to Reply Input */}
      {isReplyingToReply && (
        <div className={cn(
          "flex flex-wrap items-stretch gap-2 mt-2 p-2 bg-muted/10 rounded-lg",
          "sm:flex-nowrap sm:gap-1.5 sm:mt-1.5 sm:p-1.5"
        )}>
          <input
            type="text"
            placeholder={t('input.writeReply')}
            value={replyContent[replyKey]?.replyText || ""}
            onChange={(e) =>
              setReplyContent((prev) => ({
                ...prev,
                [replyKey]: { replyText: e.target.value, replyToId: reply.id }
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
              onClick={() => {
                if (onAddReply) {
                  onAddReply(commentId, reply.id);
                } else {
                  onReplyClick(commentId, reply.id);
                }
              }}
              className={cn(
                "flex-1 sm:flex-none px-4 py-2 bg-primary text-primary-foreground border-none rounded-lg",
                "font-semibold text-sm cursor-pointer transition-all duration-200",
                "hover:opacity-90",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "sm:px-3 sm:py-1.5 sm:text-xs md:px-4 md:py-2 md:text-sm"
              )}
              disabled={submitting || !(replyContent[replyKey]?.replyText || "").trim()}
            >
              {submitting ? t('action.posting') : t('action.post')}
            </button>
            <button
              onClick={() => {
                // Hủy reply - ẩn input và reset state
                onCancelEdit();
                setReplyContent((prev) => {
                  const newState = { ...prev };
                  delete newState[replyKey];
                  return newState;
                });
                // Reset replyingTo để ẩn input
                onReplyClick(commentId, null, null);
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
  );
}

PostReplyItem.propTypes = {
  reply: PropTypes.object.isRequired,
  commentId: PropTypes.string.isRequired,
  allReplies: PropTypes.array, // Tất cả replies để tìm tên người được reply
  activeEntity: PropTypes.object,
  isEditing: PropTypes.bool,
  isReplying: PropTypes.bool,
  editingReplyTarget: PropTypes.object,
  replyingTo: PropTypes.object,
  editReplyText: PropTypes.string.isRequired,
  setEditReplyText: PropTypes.func.isRequired,
  replyContent: PropTypes.object.isRequired,
  setReplyContent: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  onLikeClick: PropTypes.func.isRequired,
  onReplyClick: PropTypes.func.isRequired,
  onAddReply: PropTypes.func,
  onEditClick: PropTypes.func.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
  onSaveEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onNavigateToProfile: PropTypes.func.isRequired,
  replyActionLoadingKey: PropTypes.string
};

