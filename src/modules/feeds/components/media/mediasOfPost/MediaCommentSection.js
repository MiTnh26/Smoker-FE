import PropTypes from "prop-types";
import MediaCommentItem from "./MediaCommentItem";
import MediaCommentInput from "./MediaCommentInput";
import { cn } from "../../../../../utils/cn";

export default function MediaCommentSection({
  comments,
  commentsCount,
  commentText,
  setCommentText,
  replyText,
  setReplyText,
  editingComment,
  replyingTo,
  pendingLikes,
  submitting,
  onAddComment,
  onToggleCommentLike,
  onToggleReplyLike,
  onShowReplyInput,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onNavigateToProfile,
  onViewImage,
  replyInputRef,
  onAddReply,
  getMediaIdForApi,
  customInput
}) {
  return (
    <div className={cn(
      "flex-1 flex flex-col overflow-hidden bg-card",
      "min-w-0 max-w-full min-h-0 rounded-none"
    )}>
      <div className={cn(
        "px-6 py-4 border-b border-border/50",
        "flex items-center justify-between"
      )}>
        <span className="font-semibold text-foreground">Bình luận</span>
        <span className="text-sm text-muted-foreground">{commentsCount}</span>
      </div>
      
      {comments.length === 0 ? (
        <p className={cn(
          "p-8 px-6 text-center",
          "text-muted-foreground m-0"
        )}>
          Chưa có bình luận nào
        </p>
      ) : (
        <div className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden",
          "py-2 min-w-0 max-w-full px-4 md:px-6 space-y-2"
        )}>
          {comments.map((comment) => {
            const isEditing = editingComment?.type === 'comment' && editingComment.id === comment.id;
            const isReplying = replyingTo?.type === 'comment' && replyingTo.id === comment.id;

            return (
              <MediaCommentItem
                key={comment.id}
                comment={comment}
                isEditing={isEditing}
                isReplying={isReplying}
                editingComment={editingComment}
                replyingTo={replyingTo}
                commentText={commentText}
                setCommentText={setCommentText}
                replyText={replyText}
                setReplyText={setReplyText}
                pendingLikes={pendingLikes}
                submitting={submitting}
                onLikeClick={onToggleCommentLike}
                onReplyClick={onShowReplyInput}
                onEditClick={onStartEdit}
                onDeleteClick={onDelete}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onNavigateToProfile={onNavigateToProfile}
                onViewImage={onViewImage}
                replyInputRef={replyInputRef}
                onAddReply={onAddReply}
              />
            );
          })}
        </div>
      )}

      {/* Add Comment Input - Fixed at bottom */}
      {customInput ? (
        customInput
      ) : (
        <MediaCommentInput
          className="px-4 md:px-6 pb-4"
          commentText={commentText}
          setCommentText={setCommentText}
          onSubmit={onAddComment}
          submitting={submitting}
          disabled={!getMediaIdForApi()}
        />
      )}
    </div>
  );
}

MediaCommentSection.propTypes = {
  comments: PropTypes.array.isRequired,
  commentsCount: PropTypes.number,
  commentText: PropTypes.string.isRequired,
  setCommentText: PropTypes.func.isRequired,
  replyText: PropTypes.string.isRequired,
  setReplyText: PropTypes.func.isRequired,
  editingComment: PropTypes.object,
  replyingTo: PropTypes.object,
  pendingLikes: PropTypes.object.isRequired,
  submitting: PropTypes.bool.isRequired,
  onAddComment: PropTypes.func.isRequired,
  onToggleCommentLike: PropTypes.func.isRequired,
  onToggleReplyLike: PropTypes.func.isRequired,
  onShowReplyInput: PropTypes.func.isRequired,
  onStartEdit: PropTypes.func.isRequired,
  onSaveEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onNavigateToProfile: PropTypes.func.isRequired,
  onViewImage: PropTypes.func.isRequired,
  replyInputRef: PropTypes.object,
  onAddReply: PropTypes.func.isRequired,
  getMediaIdForApi: PropTypes.func.isRequired,
  customInput: PropTypes.node
};

