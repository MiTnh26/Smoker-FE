import React, { useEffect, useMemo, useState } from "react";
import { useFollow, useUnfollow, useCheckFollowing } from "../../hooks/useFollow";
import { useAuth } from "../../hooks/useAuth";
import { useCurrentUserEntity } from "../../hooks/useCurrentUserEntity";
import notificationApi from "../../api/notificationApi";

/**
 * FollowButton component
 * @param {string} followingId - id của entity/bar cần follow
 * @param {string} followingType - loại entity (nếu cần)
 * @param {function} [onChange] - callback khi follow/unfollow thành công
 */
export default function FollowButton({ followingId, followingType, onChange, compact = false }) {
  // Lấy user hiện tại từ AuthContext
//   const { session } = useAuthContext();
//  const session = JSON.parse(localStorage.getItem("session")) || {};
    const { user } = useAuth();
  console.log("Auth User:", user);
 const followerId = useMemo(() => {
    if (user?.entityAccountId) return user.entityAccountId;
    if (user?.EntityAccountId) return user.EntityAccountId;
    if (user?.entities?.length) {
      const entity = user.entities.find(e => e?.EntityAccountId) || user.entities[0];
      if (entity?.EntityAccountId) return entity.EntityAccountId;
    }
    try {
      const sessionRaw = localStorage.getItem("session");
      if (!sessionRaw) return null;
      const session = JSON.parse(sessionRaw);
      const active = session?.activeEntity || {};
      return (
        active.entityAccountId ||
        active.EntityAccountId ||
        active.id ||
        session?.entities?.[0]?.EntityAccountId ||
        session?.entities?.[0]?.entityAccountId ||
        null
      );
    } catch {
      return null;
    }
  }, [user]);
  console.log("Current User ID:", followerId);
  // Get EntityAccountId of current active role for notification (like Facebook)
  const senderEntityAccountId = useCurrentUserEntity();
  
  const { isFollowing, checkFollowing, loading: loadingCheck } = useCheckFollowing();
  const { follow, loading: loadingFollow } = useFollow();
  const { unfollow, loading: loadingUnfollow } = useUnfollow();
  const [internalFollowing, setInternalFollowing] = useState(false);
  console.log("Current User ID:", followerId);
  // Kiểm tra trạng thái follow khi mount hoặc khi id thay đổi
  useEffect(() => {
    if (followerId && followingId) {
      console.log("🔍 FollowButton - Checking follow status:", { followerId, followingId });
      checkFollowing(followerId, followingId)
        .then(res => {
          console.log("✅ FollowButton - Check result:", res?.isFollowing);
          setInternalFollowing(res?.isFollowing || false);
        })
        .catch(err => {
          console.error("❌ FollowButton - Check error:", err);
          setInternalFollowing(false);
        });
    } else {
      console.warn("⚠️ FollowButton - Missing IDs:", { followerId, followingId });
      setInternalFollowing(false);
    }
  }, [followerId, followingId, checkFollowing]);

  // Xử lý follow
  const handleFollow = async () => {
    try {
      console.log("📤 FollowButton - Follow request:", { followerId, followingId, followingType });
      await follow({ followerId, followingId, followingType });
      console.log("✅ FollowButton - Follow success");
      setInternalFollowing(true);
      onChange && onChange(true);
      
      // Create follow notification for the followed user (like Facebook)
      // Use EntityAccountId of current active role for sender
      if (senderEntityAccountId) {
        try {
          // Get current user info for notification
          const sessionRaw = localStorage.getItem("session");
          const session = sessionRaw ? JSON.parse(sessionRaw) : null;
          const active = session?.activeEntity || {};
          const followerName = active.name || active.BarName || active.BusinessName || active.userName || "Người dùng";
          const followerAvatar = active.avatar || active.Avatar || null;
          
          // Create notification for the followed user
          // recipientEntityAccountId: followingId (should be EntityAccountId from parent)
          // senderEntityAccountId: senderEntityAccountId (EntityAccountId of current active role)
          await notificationApi.createNotification({
            recipientEntityAccountId: followingId,
            senderEntityAccountId: senderEntityAccountId,
            type: "Follow",
            title: "Người dùng mới theo dõi bạn",
            message: `${followerName} đã theo dõi bạn`,
            link: `/profile/${senderEntityAccountId}`,
            senderName: followerName,
            senderAvatar: followerAvatar,
          });
          console.log("✅ FollowButton - Notification created with senderEntityAccountId:", senderEntityAccountId);
        } catch (notifError) {
          console.warn("[FollowButton] Error creating notification (backend may handle it):", notifError);
          // Continue even if notification creation fails - backend might handle it
        }
      } else {
        console.warn("[FollowButton] No senderEntityAccountId available, skipping notification creation");
      }
      
      // Trigger notification refresh event for the followed user
      try {
        // eslint-disable-next-line no-undef
        const win = typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : null);
        if (win) {
          // Dispatch event to refresh notification count
          win.dispatchEvent(new CustomEvent("notificationRefresh"));
        }
      } catch (e) {
        console.warn("[FollowButton] Error dispatching notification refresh event:", e);
      }
    } catch (err) {
      console.error("❌ FollowButton - Follow error:", err);
      // Don't update state on error
    }
  };

  // Xử lý unfollow
  const handleUnfollow = async () => {
    try {
      await unfollow({ followerId, followingId });
      setInternalFollowing(false);
      onChange && onChange(false);
    } catch {}
  };

  if (loadingCheck) return <button className="btn btn-primary" disabled>...</button>;
  if (!followerId) {
    return (
      <button className="btn btn-primary" disabled>
        Đăng nhập
      </button>
    );
  }
  
  // Prevent following yourself
  if (followerId && followingId && String(followerId).toLowerCase().trim() === String(followingId).toLowerCase().trim()) {
    return null; // Don't render follow button if trying to follow yourself
  }

  const baseCompact = "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150 active:scale-95 disabled:opacity-60";
  const followCompactClass = `${baseCompact} ${compact ? "px-3 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90" : "btn btn-primary"}`;
  const followingCompactClass = `${baseCompact} ${compact ? "px-3 py-1.5 text-xs bg-primary/80 text-primary-foreground border border-primary/40 hover:bg-primary/70 hover:border-primary/60" : "btn btn-primary"}`;

  return internalFollowing ? (
    <button
      className={followingCompactClass}
      onClick={handleUnfollow}
      disabled={loadingUnfollow}
    >
      {loadingUnfollow ? "Đang hủy..." : "Đã theo dõi"}
    </button>
  ) : (
    <button
      className={followCompactClass}
      onClick={handleFollow}
      disabled={loadingFollow}
    >
      {loadingFollow ? "Đang theo dõi..." : "Theo dõi"}
    </button>
  );
}
