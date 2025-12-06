import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";
import { useFollowers, useFollowing } from "../../hooks/useFollow";
import { getAvatarUrl } from "../../utils/defaultAvatar";
import { useNavigate } from "react-router-dom";
import FollowButton from "../common/FollowButton";

/**
 * FollowersModal
 * Hiển thị danh sách followers hoặc following của một entity (EntityAccountId)
 */
export default function FollowersModal({ open, onClose, entityId, mode = "followers" }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const {
    followers,
    fetchFollowers,
    loading: loadingFollowers,
  } = useFollowers(entityId);
  const {
    following,
    fetchFollowing,
    loading: loadingFollowing,
  } = useFollowing(entityId);

  useEffect(() => {
    if (!open || !entityId) return;
    if (mode === "followers") {
      fetchFollowers();
    } else {
      fetchFollowing();
    }
  }, [open, entityId, mode, fetchFollowers, fetchFollowing]);

  const list = mode === "followers" ? followers || [] : following || [];
  const loading = mode === "followers" ? loadingFollowers : loadingFollowing;

  const filteredList = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return list;
    return list.filter((item) => {
      const name =
        item.UserName ||
        item.userName ||
        item.Name ||
        item.name ||
        item.BarName ||
        item.barName ||
        item.displayName ||
        "";
      return String(name).toLowerCase().includes(keyword);
    });
  }, [list, search]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[10050] flex items-center justify-center",
        "bg-black/40 backdrop-blur-sm"
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "bg-card rounded-xl shadow-lg border border-border/40",
          "w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <h2 className="text-base font-semibold text-foreground">
            {mode === "followers"
              ? t("publicProfile.followers")
              : t("publicProfile.following")}
          </h2>
            <div className="flex-1 mx-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("common.search") || "Tìm kiếm..."}
                className={cn(
                  "w-full px-3 py-1.5 text-sm rounded-full border border-border/40",
                  "bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                )}
              />
            </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full",
              "border border-border/40 text-muted-foreground",
              "hover:bg-muted/60 hover:text-foreground transition-colors"
            )}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t("common.loading") || "Đang tải..."}
            </div>
          )}

          {!loading && filteredList.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {mode === "followers"
                ? t("publicProfile.noFollowers", { defaultValue: "Chưa có người theo dõi." })
                : t("publicProfile.noFollowing", { defaultValue: "Chưa theo dõi ai." })}
            </div>
          )}

          {!loading &&
            filteredList.map((item, idx) => {
              const entityAccountId =
                item.EntityAccountId ||
                item.entityAccountId ||
                item.FollowerId ||
                item.FollowingId ||
                item.id ||
                item.Id ||
                null;

              const name =
                item.UserName ||
                item.userName ||
                item.Name ||
                item.name ||
                item.BarName ||
                item.barName ||
                item.displayName ||
                t("publicProfile.thisUser");

              const avatar =
                item.Avatar ||
                item.avatar ||
                item.profilePicture ||
                null;

              const handleClickRow = () => {
                if (!entityAccountId && !item.EntityId && !item.EntityID) return;
                const targetId = entityAccountId || item.EntityId || item.EntityID;
                navigate(`/profile/${targetId}`);
              };

              return (
                <div
                  key={entityAccountId || idx}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-muted/60 transition-colors cursor-pointer"
                  onClick={handleClickRow}
                >
                  <img
                    src={getAvatarUrl(avatar, 40)}
                    alt={name}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    onError={(e) => {
                      e.target.src = getAvatarUrl(null, 40);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {name}
                    </p>
                  </div>
                  {entityAccountId && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <FollowButton
                        followingId={entityAccountId}
                        followingType={item.EntityType || item.type || "Account"}
                        compact
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}


