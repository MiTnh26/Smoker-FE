import React, { useEffect, useMemo, useState } from "react";
import { useFollow, useUnfollow, useCheckFollowing } from "../../hooks/useFollow";
import { useAuth } from "../../hooks/useAuth";

/**
 * FollowButton component
 * @param {string} followingId - id của entity/bar cần follow
 * @param {string} followingType - loại entity (nếu cần)
 * @param {function} [onChange] - callback khi follow/unfollow thành công
 */
export default function FollowButton({ followingId, followingType, onChange }) {
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
  const { isFollowing, checkFollowing, loading: loadingCheck } = useCheckFollowing();
  const { follow, loading: loadingFollow } = useFollow();
  const { unfollow, loading: loadingUnfollow } = useUnfollow();
  const [internalFollowing, setInternalFollowing] = useState(false);
  console.log("Current User ID:", followerId);
  // Kiểm tra trạng thái follow khi mount hoặc khi id thay đổi
  useEffect(() => {
    if (followerId && followingId) {
      checkFollowing(followerId, followingId).then(res => {
        setInternalFollowing(res?.isFollowing || false);
      });
    }
  }, [followerId, followingId, checkFollowing]);

  // Xử lý follow
  const handleFollow = async () => {
    try {
      await follow({ followerId, followingId, followingType });
      setInternalFollowing(true);
      onChange && onChange(true);
    } catch {}
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

  return internalFollowing ? (
    <button
      className="btn btn-outline btn-error"
      onClick={handleUnfollow}
      disabled={loadingUnfollow}
    >
      {loadingUnfollow ? "Đang hủy..." : "Đã theo dõi"}
    </button>
  ) : (
    <button
      className="btn btn-primary"
      onClick={handleFollow}
      disabled={loadingFollow}
    >
      {loadingFollow ? "Đang theo dõi..." : "Theo dõi"}
    </button>
  );
}
