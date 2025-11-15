import PropTypes from "prop-types";
import { getAvatarForAccount, getNameForAccount, formatTimeDisplay, getLikesCount, isLiked, getCurrentUser, parseReplies } from "./utils";
import { cn } from "../../../../../utils/cn";

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
  const replyLiked = isLiked(reply.likes, currentUser);
  const replyLikesCount = getLikesCount(reply.likes);
  const isReplyOwner = currentUser && String(reply.accountId) === String(currentUser.id);
  const isEditingReply = editingComment?.type === 'reply' && editingComment.id === reply.id;
  const isReplyingToReply = replyingTo?.type === 'reply' && replyingTo.replyId === reply.id;
  const replyPendingKey = `reply-${commentId}-${reply.id}`;

  return (
    <div className="py-2">
      <div className="flex gap-2 items-start">
        <img 
          className="w-7 h-7 rounded-full object-cover flex-shrink-0 cursor-pointer" 
          src={reply.authorAvatar || getAvatarForAccount(reply.accountId, reply.authorEntityAccountId, reply.authorAvatar)} 
          alt="avatar"
          onClick={() => onNavigateToProfile(reply.authorEntityId, reply.authorEntityType, reply.authorEntityAccountId)}
        />
        <div className="flex-1 flex flex-col gap-1 min-w-0 max-w-full overflow-hidden">
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
            <div className={cn(
              "text-foreground text-[0.85rem] leading-6",
              "break-words overflow-wrap-break-word",
              "max-w-full overflow-hidden"
            )}>{reply.content}</div>
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
          <>
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
            {isReplyOwner && (
              <>
                <button 
                  className={cn(
                    "bg-transparent border-none text-muted-foreground text-sm",
                    "px-1 py-1 rounded transition-all duration-200 cursor-pointer",
                    "hover:bg-muted/30 hover:text-foreground"
                  )}
                  onClick={() => onEditClick('reply', reply.id, commentId, reply.id)}
                >
                  Chỉnh sửa
                </button>
                <button 
                  className={cn(
                    "bg-transparent border-none text-danger text-sm",
                    "px-1 py-1 rounded transition-all duration-200 cursor-pointer",
                    "hover:bg-danger/10"
                  )}
                  onClick={() => onDeleteClick('reply', reply.id, commentId, reply.id)}
                >
                  Xóa
                </button>
              </>
            )}
          </>
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

