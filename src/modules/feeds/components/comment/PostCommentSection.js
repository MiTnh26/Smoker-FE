import PropTypes from "prop-types";
import PostCommentItem from "./PostCommentItem";
import { cn } from "../../../../utils/cn";

export default function PostCommentSection({
  comments,
  activeEntity,
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
  setMenuPositions,
  commentRefs
}) {
  return (
    <div className={cn(
      "flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0 scrollbar-hide",
      "sm:p-3 md:p-4"
    )}>
      {comments.length === 0 ? (
        <p className={cn("py-8 text-center text-muted-foreground")}>
          Chưa có bình luận nào
        </p>
      ) : (
        comments.map((comment) => (
          <div
            key={comment.id}
            ref={(el) => {
              if (el && commentRefs) {
                commentRefs.current[comment.id] = el;
              }
            }}
          >
            <PostCommentItem
              comment={comment}
              activeEntity={activeEntity}
              isEditing={isEditing}
              isReplying={isReplying}
              editingCommentId={editingCommentId}
              editingReplyTarget={editingReplyTarget}
              replyingTo={replyingTo}
              editCommentText={editCommentText}
              setEditCommentText={setEditCommentText}
              editReplyText={editReplyText}
              setEditReplyText={setEditReplyText}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              submitting={submitting}
              onLikeClick={onLikeClick}
              onReplyLikeClick={onReplyLikeClick}
              onReplyClick={onReplyClick}
              onEditClick={onEditClick}
              onDeleteClick={onDeleteClick}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onNavigateToProfile={onNavigateToProfile}
              commentActionLoadingId={commentActionLoadingId}
              replyActionLoadingKey={replyActionLoadingKey}
              onAddReply={onAddReply}
              menuButtonRefs={menuButtonRefs}
              menuRefs={menuRefs}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              menuPositions={menuPositions}
              setMenuPositions={setMenuPositions}
            />
          </div>
        ))
      )}
    </div>
  );
}

PostCommentSection.propTypes = {
  comments: PropTypes.array.isRequired,
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
  setMenuPositions: PropTypes.func.isRequired,
  commentRefs: PropTypes.object
};

