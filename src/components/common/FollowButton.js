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
  console.log("🔑 FollowButton - senderEntityAccountId:", senderEntityAccountId, "followerId:", followerId);
  
  const { isFollowing, checkFollowing, loading: loadingCheck } = useCheckFollowing();
  const { follow, loading: loadingFollow } = useFollow();
  const { unfollow, loading: loadingUnfollow } = useUnfollow();
  const [internalFollowing, setInternalFollowing] = useState(false);
  console.log("Current User ID:", followerId);
  // Kiểm tra trạng thái follow khi mount hoặc khi id thay đổi
  useEffect(() => {
    if (senderEntityAccountId && followingId) {
      console.log("🔍 FollowButton - Checking follow status:", { followerId: senderEntityAccountId, followingId });
      checkFollowing(senderEntityAccountId, followingId)
        .then(res => {
          console.log("✅ FollowButton - Check result:", res?.isFollowing);
          setInternalFollowing(res?.isFollowing || false);
        })
        .catch(err => {
          console.error("❌ FollowButton - Check error:", err);
          setInternalFollowing(false);
        });
    } else {
      console.warn("⚠️ FollowButton - Missing IDs:", { followerId: senderEntityAccountId, followingId });
      setInternalFollowing(false);
    }
  }, [senderEntityAccountId, followingId, checkFollowing]);

  // Xử lý follow
  const handleFollow = async () => {
    try {
      // Ensure we use the correct EntityAccountId
      const currentFollowerId = senderEntityAccountId || followerId;
      if (!currentFollowerId) {
        console.error("❌ FollowButton - Cannot follow: No followerId available");
        return;
      }
      console.log("📤 FollowButton - Follow request:", { followerId: currentFollowerId, followingId, followingType, senderEntityAccountId });
      await follow({ followerId: currentFollowerId, followingId, followingType });
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
          // receiverEntityAccountId: followingId (EntityAccountId của người được follow)
          // senderEntityAccountId: senderEntityAccountId (EntityAccountId của người follow)
          await notificationApi.createNotification({
            type: "Follow",
            receiverEntityAccountId: followingId, // EntityAccountId của người nhận notification
            senderEntityAccountId: senderEntityAccountId, // EntityAccountId của người gửi
            content: `${followerName} đã theo dõi bạn`, // Nội dung notification
            link: `/profile/${senderEntityAccountId}`, // Link đến profile của người follow
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
      // Ensure we use the correct EntityAccountId
      const currentFollowerId = senderEntityAccountId || followerId;
      if (!currentFollowerId) {
        console.error("❌ FollowButton - Cannot unfollow: No followerId available");
        return;
      }
      console.log("📤 FollowButton - Unfollow request:", { followerId: currentFollowerId, followingId, senderEntityAccountId });
      await unfollow({ followerId: currentFollowerId, followingId });
      console.log("✅ FollowButton - Unfollow success");
      setInternalFollowing(false);
      onChange && onChange(false);
    } catch (err) {
      console.error("❌ FollowButton - Unfollow error:", err);
      throw err;
    }
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

  const baseCompact = "inline-flex items-center justify-center rounded-xl font-bold transition-all duration-200 ease-out active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md";
  
  const followCompactClass = compact 
    ? `${baseCompact} px-3 py-1.5 text-xs bg-primary text-primary-foreground border-none hover:bg-[rgb(var(--primary-hover))]`
    : `${baseCompact} px-5 py-2.5 text-sm bg-primary text-primary-foreground border-none hover:bg-[rgb(var(--primary-hover))]`;
  
  const followingCompactClass = compact
    ? `${baseCompact} px-3 py-1.5 text-xs bg-card text-primary border-none hover:bg-[rgb(var(--primary-light))]`
    : `${baseCompact} px-5 py-2.5 text-sm bg-card text-primary border-none hover:bg-[rgb(var(--primary-light))]`;

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
