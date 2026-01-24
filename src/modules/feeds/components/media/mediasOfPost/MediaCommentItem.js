import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { MoreVertical } from "lucide-react";
import { getAvatarForAccount, getNameForAccount, formatTimeDisplay, getLikesCount, isLiked, getCurrentUser, parseReplies, canManageComment, canManageReply, getSessionData } from "./utils";
import MediaReplyItem from "./MediaReplyItem";
import { cn } from "../../../../../utils/cn";
import ExpandableText from "../../../../../components/common/ExpandableText";

export default function MediaCommentItem({
  comment,
  isEditing,
  isReplying,
  editingComment,
  replyingTo,
  commentText,
  setCommentText,
  replyText,
  setReplyText,
  pendingLikes,
  submitting,
  onLikeClick,
  onReplyLikeClick,
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
  const ANONYMOUS_AVATAR_URL = "/images/an-danh.png";
  // Use sessionData with activeEntity for role-based likes check
  const sessionData = getSessionData();
  const commentLiked = isLiked(comment.likes, sessionData?.activeEntity || sessionData || currentUser);
  const commentLikesCount = getLikesCount(comment.likes);
  const replies = parseReplies(comment);
  const isCommentOwner = canManageComment(comment);
  // Anonymous temporarily disabled
  const isAnonymousComment = false;
  const anonymousIndex = comment.anonymousIndex;

  const displayName = comment.authorName || getNameForAccount(comment.accountId, comment.authorEntityAccountId, comment.authorName);

  const displayAvatar = comment.authorAvatar || getAvatarForAccount(comment.accountId, comment.authorEntityAccountId, comment.authorAvatar);
  const pendingKey = `comment-${comment.id}`;
  
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
    if (openMenuId === `comment-${comment.id}`) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId, comment.id]);

  return (
    <div className={cn(
      "py-3 px-4 pl-6 border-b border-border/25",
      "min-w-0 max-w-full overflow-hidden"
    )}>
      <div className="flex gap-3 items-start">
        <img 
          className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer"
          style={{ width: 32, height: 32, objectFit: 'cover', display: 'block' }}
          src={displayAvatar} 
          alt="avatar"
          onClick={() => onNavigateToProfile(comment.authorEntityId, comment.authorEntityType, comment.authorEntityAccountId)}
        />
        <div className="flex-1 flex flex-col gap-1 min-w-0 max-w-full overflow-hidden relative">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className={cn(
                "text-foreground font-semibold text-sm cursor-pointer",
                "hover:underline"
              )}
              onClick={() => onNavigateToProfile(comment.authorEntityId, comment.authorEntityType, comment.authorEntityAccountId)}
            >
              {displayName}
            </span>
            {comment.createdAt && (
              <span className="text-muted-foreground text-xs">
                {formatTimeDisplay(comment.createdAt)}
              </span>
            )}
            {/* Menu button for comment owner */}
            {isCommentOwner && !isEditing && (
              <div className="ml-auto">
                <button
                  ref={menuButtonRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    const menuKey = `comment-${comment.id}`;
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
                {openMenuId === `comment-${comment.id}` && (
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
                          onEditClick('comment', comment.id, comment.id);
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
                          onDeleteClick('comment', comment.id, comment.id);
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
          {isEditing ? (
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className={cn(
                "w-full px-2 py-2 mt-1",
                "border-[0.5px] border-border/20 rounded-lg",
                "bg-background text-foreground text-sm",
                "outline-none",
                "focus:border-primary focus:ring-2 focus:ring-primary/10"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") {
                  onCancelEdit();
                  setCommentText("");
                }
              }}
              autoFocus
            />
          ) : (
            <ExpandableText
              text={comment.content || ""}
              maxLength={150}
              textClassName={cn(
                "text-foreground text-sm leading-6"
              )}
              buttonClassName="text-sm"
            />
          )}
          {comment.images && !isEditing && (
            <img
              src={comment.images}
              alt="Comment attachment"
              className={cn(
                "max-w-full w-auto h-auto max-h-[200px]",
                "rounded-lg my-2 object-contain cursor-pointer block",
                "transition-transform duration-200",
                "hover:scale-105"
              )}
              onClick={() => onViewImage(comment.images)}
            />
          )}
        </div>
      </div>
      
      <div className="flex gap-3 mt-2">
        <button 
          className={cn(
            "inline-flex items-center gap-1.5",
            "bg-transparent border-none text-muted-foreground text-sm",
            "px-1 py-1 rounded transition-all duration-200",
            "cursor-pointer",
            "hover:bg-muted/30 hover:text-foreground",
            commentLiked && "text-danger",
            pendingLikes[pendingKey] && "opacity-60 cursor-not-allowed"
          )}
          aria-pressed={commentLiked}
          disabled={!!pendingLikes[pendingKey]}
          onClick={() => onLikeClick(comment.id, comment)}
          title={commentLiked ? 'Bỏ thích' : 'Thích'}
        >
          <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill={commentLiked ? "currentColor" : "none"} stroke="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="font-semibold min-w-[1.25rem] text-left">{commentLikesCount}</span>
        </button>
        
        {!isEditing && (
            <button 
              className={cn(
                "bg-transparent border-none text-muted-foreground text-sm",
                "px-1 py-1 rounded transition-all duration-200 cursor-pointer",
                "hover:bg-muted/30 hover:text-foreground"
              )}
              onClick={() => onReplyClick(comment.id)}
            >
              Phản hồi
            </button>
        )}
        
        {isEditing && (
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
                setCommentText("");
              }}
            >
              Hủy
            </button>
          </>
        )}
      </div>

      {/* Replies */}
      {(replies.length > 0 || isReplying) && (
        <div className="ml-6 mt-3 pl-4 border-l-2 border-border/30">
          {replies.map((reply) => (
            <MediaReplyItem
              key={reply.id}
              reply={reply}
              commentId={comment.id}
              isEditing={isEditing}
              isReplying={isReplying}
              editingComment={editingComment}
              replyingTo={replyingTo}
              replyText={replyText}
              setReplyText={setReplyText}
              pendingLikes={pendingLikes}
              submitting={submitting}
              onLikeClick={onReplyLikeClick || onLikeClick}
              onReplyClick={onReplyClick}
              onEditClick={onEditClick}
              onDeleteClick={onDeleteClick}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onNavigateToProfile={onNavigateToProfile}
              onViewImage={onViewImage}
              replyInputRef={replyInputRef}
              onAddReply={onAddReply}
            />
          ))}

          {/* Reply Input for Comment */}
          {isReplying && (
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
                  "bg-background text-foreground text-sm",
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
                  "border-none rounded font-semibold text-sm",
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
      )}
    </div>
  );
}

MediaCommentItem.propTypes = {
  comment: PropTypes.object.isRequired,
  isEditing: PropTypes.bool.isRequired,
  isReplying: PropTypes.bool.isRequired,
  editingComment: PropTypes.object,
  replyingTo: PropTypes.object,
  commentText: PropTypes.string.isRequired,
  setCommentText: PropTypes.func.isRequired,
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

