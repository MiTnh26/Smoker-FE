import { useRef } from "react";
import PropTypes from "prop-types";
import { getAvatarForAccount, getCurrentUser } from "./utils";
import { cn } from "../../../../../utils/cn";

export default function MediaCommentInput({
  commentText,
  setCommentText,
  onSubmit,
  submitting,
  disabled
}) {
  const commentInputRef = useRef(null);
  const currentUser = getCurrentUser();

  return (
    <div className={cn(
      "p-4 px-6 border-t border-border/30",
      "flex gap-3 items-start",
      "flex-shrink-0 min-w-0 max-w-full overflow-hidden",
      "bg-card/80 backdrop-blur-sm relative z-10"
    )}>
      {currentUser && (
        <img
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          style={{ width: 32, height: 32, objectFit: 'cover', display: 'block' }}
          src={getAvatarForAccount(
            currentUser.id,
            currentUser?.EntityAccountId || currentUser?.entityAccountId || currentUser?.id,
            currentUser?.avatar || currentUser?.profilePicture || currentUser?.EntityAvatar
          )}
          alt="avatar"
        />
      )}
      <div className="flex-1 flex gap-2 items-center min-w-0 max-w-full overflow-hidden">
        <input
          ref={commentInputRef}
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Viết bình luận..."
          className={cn(
            "flex-1 px-3 py-3",
            "border-[0.5px] border-border/20 rounded-lg",
            "bg-background text-foreground",
            "text-sm outline-none",
            "transition-all duration-200",
            "min-w-0 max-w-full",
            "focus:border-primary focus:ring-2 focus:ring-primary/10",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && commentText.trim() && !submitting) {
              onSubmit();
            }
          }}
          disabled={submitting || disabled}
        />
        <button
          className={cn(
            "px-6 py-3 bg-primary text-primary-foreground",
            "border-none rounded-lg font-semibold",
            "cursor-pointer transition-all duration-200",
            "hover:opacity-90",
            "active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          )}
          onClick={onSubmit}
          disabled={!commentText.trim() || submitting || disabled}
        >
          {submitting ? "..." : "Đăng"}
        </button>
      </div>
    </div>
  );
}

MediaCommentInput.propTypes = {
  commentText: PropTypes.string.isRequired,
  setCommentText: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  disabled: PropTypes.bool
};

