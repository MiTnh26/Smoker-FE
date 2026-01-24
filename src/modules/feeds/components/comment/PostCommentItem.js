import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getAvatarForAccount, getNameForAccount, formatTimeDisplay, getLikesCount, isLiked, canManageComment, getSessionData } from "./utils";
import PostReplyItem from "./PostReplyItem";
import { cn } from "../../../../utils/cn";
import ExpandableText from "../../../../components/common/ExpandableText";

export default function PostCommentItem({
  comment,
  activeEntity: activeEntityProp,
  isEditing,
  isReplying,
  editingCommentId,
  editingReplyTarget,
  replyingTo,
  editCommentText,
  setEditCommentText,
  editReplyText,
  setEditReplyText,
  replyContent,
  setReplyContent,
  submitting,
  onLikeClick,
  onReplyLikeClick,
  onReplyClick,
  onEditClick,
  onDeleteClick,
  onSaveEdit,
  onCancelEdit,
  onNavigateToProfile,
  commentActionLoadingId,
  replyActionLoadingKey,
  onAddReply,
  menuButtonRefs,
  menuRefs,
  openMenuId,
  setOpenMenuId,
  menuPositions,
  setMenuPositions
}) {
  const { t } = useTranslation();
  
  // Use activeEntity from props (passed from CommentSection) to avoid calling getSessionData() in every render
  // Fallback to getSessionData() only if prop is not provided (backward compatibility)
  const activeEntity = activeEntityProp || (() => {
    const sessionData = getSessionData();
    return sessionData?.activeEntity || sessionData;
  })();
  
  // Check like state from likesObject
  // Ưu tiên likedByViewer (trạng thái local sau khi user nhấn Like) trước khi check likesObject
  const likesObj = comment.likesObject || (typeof comment.likes === 'object' ? comment.likes : null);
  const commentLiked = typeof comment.likedByViewer === 'boolean' 
    ? comment.likedByViewer 
    : (likesObj ? isLiked(likesObj, activeEntity) : false);
  const commentLikesCount = comment.likes || getLikesCount(likesObj);
  const isCommentOwner = canManageComment(comment, activeEntity);
  const isEditingComment = editingCommentId === comment.id;
  
  // Menu state
  const menuKey = `comment-${comment.id}`;
  
  // State để toggle hiển thị replies - mặc định ẩn
  const [showReplies, setShowReplies] = useState(false);
  
  // Ref cho input để focus
  const replyInputRef = useRef(null);
  
  // Hàm đếm tổng số reply (bao gồm cả reply của reply) - flatten count
  const countTotalReplies = (replies) => {
    if (!replies || !Array.isArray(replies) || replies.length === 0) return 0;
    let total = 0;
    replies.forEach(reply => {
      total += 1; // Chính reply này
      // Nếu reply có replies (reply của reply), đệ quy đếm
      if (reply.replies && Array.isArray(reply.replies) && reply.replies.length > 0) {
        total += countTotalReplies(reply.replies);
      }
    });
    return total;
  };
  
  const totalReplies = comment.replies ? countTotalReplies(comment.replies) : 0;
  
  // Check xem đang reply comment hay reply một reply cụ thể
  const isReplyingToThisComment = replyingTo?.commentId === comment.id;
  const replyingToReplyId = isReplyingToThisComment ? replyingTo?.replyId : null;
  const replyingToUserName = isReplyingToThisComment ? replyingTo?.userName : null;
  
  // Focus vào input khi bắt đầu reply
  useEffect(() => {
    if (isReplyingToThisComment && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [isReplyingToThisComment]);
  
  return (
    <div 
      className={cn(
        "py-3 px-4 border-b border-border/25",
        "sm:py-2 sm:px-3 md:py-3 md:px-4"
      )}
    >
      <div className="flex gap-3 items-start sm:gap-2 md:gap-3">
        <img 
          className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer sm:w-7 sm:h-7 md:w-8 md:h-8" 
          src={comment.authorAvatar || getAvatarForAccount(comment.accountId, comment.authorEntityAccountId)} 
          alt="avatar"
          onClick={() => onNavigateToProfile(comment.authorEntityId, comment.authorEntityType, comment.authorEntityAccountId)}
        />
        <div className="flex-1 flex flex-col gap-1 min-w-0 max-w-full overflow-hidden relative">
          <div className="flex items-center gap-2 mb-1 sm:gap-1.5">
            <span 
              className={cn(
                "text-foreground font-semibold text-sm cursor-pointer",
                "hover:underline",
                "sm:text-xs md:text-sm"
              )}
              onClick={() => onNavigateToProfile(comment.authorEntityId, comment.authorEntityType, comment.authorEntityAccountId)}
            >
              {comment.authorName && comment.authorName !== 'Người dùng' 
                ? comment.authorName 
                : getNameForAccount(comment.accountId, comment.authorEntityAccountId, comment.author?.name)}
            </span>
            {comment.createdAt && (
              <span className="text-muted-foreground text-xs sm:text-[0.7rem] md:text-xs">
                {formatTimeDisplay(comment.createdAt)}
              </span>
            )}
            {/* Menu button for comment owner */}
            {isCommentOwner && !isEditingComment && (
              <div className="ml-auto">
                <button
                  ref={(el) => {
                    if (el) menuButtonRefs.current[menuKey] = el;
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const button = menuButtonRefs.current[menuKey];
                    if (button && openMenuId !== menuKey) {
                      const rect = button.getBoundingClientRect();
                      setMenuPositions(prev => ({
                        ...prev,
                        [menuKey]: {
                          top: rect.bottom + 4,
                          right: window.innerWidth - rect.right
                        }
                      }));
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
                {openMenuId === menuKey && (
                  <div
                    ref={(el) => {
                      if (el) menuRefs.current[menuKey] = el;
                    }}
                    className={cn(
                      "fixed z-[100000]",
                      "bg-card border border-border rounded-lg shadow-lg",
                      "p-1 overflow-hidden"
                    )}
                    style={{
                      top: `${menuPositions[menuKey]?.top || 0}px`,
                      right: `${menuPositions[menuKey]?.right || 0}px`
                    }}
                  >
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditClick(comment);
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
                          onDeleteClick(comment.id);
                          setOpenMenuId(null);
                        }}
                        disabled={commentActionLoadingId === comment.id}
                        className={cn(
                          "px-3 py-1.5 text-sm whitespace-nowrap",
                          "text-danger hover:bg-danger/10 rounded",
                          "transition-colors duration-200",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {commentActionLoadingId === comment.id
                          ? t('action.deleting', { defaultValue: "Đang xóa..." })
                          : t('action.delete', { defaultValue: "Xóa" })}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {isEditingComment ? (
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
                  onClick={onSaveEdit}
                  className={cn(
                    "px-4 py-2 bg-primary text-primary-foreground border-none rounded-lg",
                    "font-semibold text-sm cursor-pointer transition-all duration-200",
                    "hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
                    "sm:px-3 sm:py-1.5 sm:text-xs md:px-4 md:py-2 md:text-sm"
                  )}
                  disabled={commentActionLoadingId === comment.id || !editCommentText.trim()}
                >
                  {commentActionLoadingId === comment.id
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
                  disabled={commentActionLoadingId === comment.id}
                >
                  {t('action.cancel')}
                </button>
              </div>
            </>
          ) : (
            <ExpandableText
              text={comment.content || ""}
              maxLength={150}
              textClassName={cn(
                "text-foreground text-sm leading-6",
                "sm:text-xs sm:leading-5 md:text-sm md:leading-6"
              )}
              buttonClassName="sm:text-xs md:text-sm"
            />
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
          onClick={() => onLikeClick(comment.id)}
          className={cn(
            "inline-flex items-center gap-1.5 bg-transparent border-none",
            "text-muted-foreground text-sm px-1 py-1 rounded",
            "cursor-pointer transition-all duration-200",
            "hover:bg-muted/30 hover:text-foreground",
            commentLiked && "text-danger",
            "sm:gap-1 sm:text-xs md:text-sm"
          )}
          aria-label="Like comment"
        >
          <svg className="w-5 h-5 flex-shrink-0 sm:w-4 sm:h-4 md:w-5 md:h-5" width="20" height="20" viewBox="0 0 24 24" fill={commentLiked ? "currentColor" : "none"} stroke="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="font-semibold min-w-[1.25rem] text-left sm:min-w-[1rem]">{commentLikesCount}</span>
        </button>
        <button
          onClick={() => {
            // Truyền userName khi click reply comment
            const commentAuthorName = comment.authorName && comment.authorName !== 'Người dùng'
              ? comment.authorName
              : getNameForAccount(comment.accountId, comment.authorEntityAccountId, comment.author?.name);
            onReplyClick(comment.id, null, commentAuthorName);
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

      {/* Reply Input - Chỉ hiển thị khi đang reply comment gốc (không phải reply một reply cụ thể) */}
      {isReplyingToThisComment && !replyingToReplyId && (
        <div className={cn(
          "flex flex-wrap items-stretch gap-2 mt-2 p-2 bg-muted/10 rounded-lg",
          "sm:flex-nowrap sm:gap-1.5 sm:mt-1.5 sm:p-1.5"
        )}>
            <input
              ref={replyInputRef}
              type="text"
              placeholder={t('input.writeReply')}
              value={replyContent[comment.id]?.replyText || ""}
              onChange={(e) =>
                setReplyContent((prev) => ({
                  ...prev,
                  [comment.id]: { replyText: e.target.value, replyToId: replyingToReplyId || null }
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
              onClick={() => onAddReply(comment.id)}
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
                // Hủy reply - ẩn input và reset state
                onCancelEdit();
                setReplyContent((prev) => {
                  const newState = { ...prev };
                  delete newState[comment.id];
                  return newState;
                });
                // Reset replyingTo để ẩn input
                onReplyClick(comment.id, null, null);
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
        <div className={cn("ml-6 mt-3", "sm:ml-4 sm:mt-2")}>
          {/* Nút toggle hiển thị replies */}
          <button
            onClick={() => setShowReplies(!showReplies)}
            className={cn(
              "text-muted-foreground text-sm mb-2 hover:text-foreground transition-colors",
              "flex items-center gap-1",
              "sm:text-xs md:text-sm"
            )}
          >
            {showReplies ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                <span>Ẩn {totalReplies} phản hồi</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span>Xem {totalReplies} phản hồi</span>
              </>
            )}
          </button>
          
          {/* Danh sách replies */}
          {showReplies && (
            <div className={cn("pl-4 border-l-2 border-border/30", "sm:pl-3")}>
              {comment.replies.map((reply) => (
                <PostReplyItem
                  key={reply.id}
                  reply={reply}
                  commentId={comment.id}
                  allReplies={comment.replies} // Truyền allReplies để tìm tên người được reply
                  activeEntity={activeEntity}
                  isEditing={isEditing}
                  isReplying={isReplying}
                  editingReplyTarget={editingReplyTarget}
                  replyingTo={replyingTo}
                  editReplyText={editReplyText}
                  setEditReplyText={setEditReplyText}
                  replyContent={replyContent}
                  setReplyContent={setReplyContent}
                  submitting={submitting}
                  onLikeClick={onReplyLikeClick || onLikeClick}
                  onReplyClick={onReplyClick}
                  onAddReply={onAddReply}
                  onEditClick={onEditClick}
                  onDeleteClick={onDeleteClick}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                  onNavigateToProfile={onNavigateToProfile}
                  replyActionLoadingKey={replyActionLoadingKey}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

PostCommentItem.propTypes = {
  comment: PropTypes.object.isRequired,
  activeEntity: PropTypes.object,
  isEditing: PropTypes.bool,
  isReplying: PropTypes.bool,
  editingCommentId: PropTypes.string,
  editingReplyTarget: PropTypes.object,
  replyingTo: PropTypes.object,
  editCommentText: PropTypes.string.isRequired,
  setEditCommentText: PropTypes.func.isRequired,
  editReplyText: PropTypes.string.isRequired,
  setEditReplyText: PropTypes.func.isRequired,
  replyContent: PropTypes.object.isRequired,
  setReplyContent: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  onLikeClick: PropTypes.func.isRequired,
  onReplyLikeClick: PropTypes.func,
  onReplyClick: PropTypes.func.isRequired,
  onEditClick: PropTypes.func.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
  onSaveEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onNavigateToProfile: PropTypes.func.isRequired,
  commentActionLoadingId: PropTypes.string,
  replyActionLoadingKey: PropTypes.string,
  onAddReply: PropTypes.func.isRequired,
  menuButtonRefs: PropTypes.object.isRequired,
  menuRefs: PropTypes.object.isRequired,
  openMenuId: PropTypes.string,
  setOpenMenuId: PropTypes.func.isRequired,
  menuPositions: PropTypes.object.isRequired,
  setMenuPositions: PropTypes.func.isRequired
};

