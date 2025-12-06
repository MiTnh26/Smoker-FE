import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Folder, User, Building2, FileText } from "lucide-react";
import searchApi from "../../../api/searchApi";
import FollowButton from "../../../components/common/FollowButton";
import PostCard from "../../feeds/components/post/PostCard";
import { mapPostForCard } from "../../../utils/postTransformers";
import { getAvatarUrl } from "../../../utils/defaultAvatar";
import { getSession } from "../../../utils/sessionManager";

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "users", label: "Người dùng" },
  { key: "bars", label: "Bar" },
  { key: "djs", label: "DJ" },
  { key: "dancers", label: "Dancer" },
  { key: "posts", label: "Bài viết" },
];

const MAX_PREVIEW = 5;

export default function SearchResults() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const query = useQuery();
  const q = query.get("q") || "";
  const [active, setActive] = useState("all");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ users: [], bars: [], djs: [], dancers: [], posts: [] });

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await searchApi.searchAll(q);
        if (alive) setData(res);
      } finally {
        if (alive) setLoading(false);
      }
    };
    if (q) run();
    return () => { alive = false; };
  }, [q]);

  // Transform posts để dùng với PostCard
  const transformedPosts = useMemo(() => {
    return (data.posts || []).map(post => mapPostForCard(post, t));
  }, [data.posts, t]);

  const renderFollowButton = (item) => {
    const itemEntityAccountId =
      item.raw?.EntityAccountId || item.raw?.entityAccountId || item.id || "";
    if (!itemEntityAccountId) return null;

    return (
      <FollowButton
        followingId={itemEntityAccountId}
        followingType={mapType(item.type)}
      />
    );
  };

  // Lấy list items dựa trên active tab
  const list = useMemo(() => {
    if (active === "users") return data.users || [];
    if (active === "bars") return data.bars || [];
    if (active === "djs") return data.djs || [];
    if (active === "dancers") return data.dancers || [];
    if (active === "posts") return transformedPosts;
    // "all" xử lý riêng
    return [];
  }, [active, data, transformedPosts]);

  return (
    <div className="w-full py-4 px-4">
      {/* Nội dung: filter bên trái, kết quả bên phải */}
      <div className="flex items-start gap-4">
        {/* Sidebar filter gốc của search page (giữ lại) */}
        <aside className="w-64 shrink-0 rounded-2xl bg-card border border-border/60 p-3">
          <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t("search.filterTitle") || "Bộ lọc"}
          </div>
          <div className="space-y-1">
            {TABS.map((tab) => {
              const Icon =
                tab.key === "all"
                  ? Folder
                  : tab.key === "users"
                  ? User
                  : tab.key === "bars"
                  ? Building2
                  : FileText;
              const isActive = active === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActive(tab.key)}
                  className={[
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/60"
                      : "text-foreground/80 hover:bg-muted border border-transparent",
                  ].join(" ")}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon size={16} />
                  </span>
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Kết quả bên phải */}
        <main className="flex-1 rounded-2xl bg-card/60 p-3 sm:p-4 border border-border/40">
          {q && (
            <p className="mb-3 text-xs text-muted-foreground">
              {t("search.resultsFor", { q }) || `Kết quả cho "${q}"`}
            </p>
          )}
          {loading ? (
            <div className="py-4 text-sm text-muted-foreground">
              {t("search.searching") || "Đang tìm..."}
            </div>
          ) : (
            <>
              {active === "all" ? (
                <>
                  {/* Mọi người (users) */}
                  {(data.users || []).length > 0 && (
                    <section className="mb-5 rounded-xl bg-background/40 border border-border/40 px-3 py-2.5">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("search.sectionUsers") || "Mọi người"}
                        </h3>
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => setActive("users")}
                        >
                          {t("search.viewAll") || "Xem tất cả"}
                        </button>
                      </div>
                      <ul className="divide-y divide-border/40">
                        {(data.users || []).slice(0, MAX_PREVIEW).map((item) => (
                          <li
                            key={`${item.type}-${item.id}`}
                            className="flex items-center justify-between gap-4 py-2.5"
                          >
                            <button
                              type="button"
                              className="flex flex-1 items-center gap-3 text-left"
                              onClick={() => onOpenItem(navigate, item)}
                            >
                              <img
                                className="h-9 w-9 rounded-full object-cover"
                                src={getAvatarUrl(item.avatar, 36)}
                                alt={item.name}
                                onError={(e) => {
                                  e.target.src = getAvatarUrl(null, 36);
                                }}
                              />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-foreground">
                                  {item.name}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {item.type}
                                </div>
                              </div>
                            </button>
                            {renderFollowButton(item)}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Bar */}
                  {(data.bars || []).length > 0 && (
                    <section className="mb-5 rounded-xl bg-background/40 border border-border/40 px-3 py-2.5">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("search.sectionBars") || "Bar"}
                        </h3>
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => setActive("bars")}
                        >
                          {t("search.viewAll") || "Xem tất cả"}
                        </button>
                      </div>
                      <ul className="divide-y divide-border/40">
                        {(data.bars || []).slice(0, MAX_PREVIEW).map((item) => (
                          <li
                            key={`${item.type}-${item.id}`}
                            className="flex items-center justify-between gap-4 py-2.5"
                          >
                            <button
                              type="button"
                              className="flex flex-1 items-center gap-3 text-left"
                              onClick={() => onOpenItem(navigate, item)}
                            >
                              <img
                                className="h-9 w-9 rounded-full object-cover"
                                src={getAvatarUrl(item.avatar, 36)}
                                alt={item.name}
                                onError={(e) => {
                                  e.target.src = getAvatarUrl(null, 36);
                                }}
                              />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-foreground">
                                  {item.name}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {item.type}
                                </div>
                              </div>
                            </button>
                            {renderFollowButton(item)}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* DJ */}
                  {(data.djs || []).length > 0 && (
                    <section className="mb-5 rounded-xl bg-background/40 border border-border/40 px-3 py-2.5">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("search.sectionDjs") || "DJ"}
                        </h3>
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => setActive("djs")}
                        >
                          {t("search.viewAll") || "Xem tất cả"}
                        </button>
                      </div>
                      <ul className="divide-y divide-border/40">
                        {(data.djs || []).slice(0, MAX_PREVIEW).map((item) => (
                          <li
                            key={`${item.type}-${item.id}`}
                            className="flex items-center justify-between gap-4 py-2.5"
                          >
                            <button
                              type="button"
                              className="flex flex-1 items-center gap-3 text-left"
                              onClick={() => onOpenItem(navigate, item)}
                            >
                              <img
                                className="h-9 w-9 rounded-full object-cover"
                                src={getAvatarUrl(item.avatar, 36)}
                                alt={item.name}
                                onError={(e) => {
                                  e.target.src = getAvatarUrl(null, 36);
                                }}
                              />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-foreground">
                                  {item.name}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {item.type}
                                </div>
                              </div>
                            </button>
                            {renderFollowButton(item)}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Dancer */}
                  {(data.dancers || []).length > 0 && (
                    <section className="mb-5 rounded-xl bg-background/40 border border-border/40 px-3 py-2.5">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("search.sectionDancers") || "Dancer"}
                        </h3>
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => setActive("dancers")}
                        >
                          {t("search.viewAll") || "Xem tất cả"}
                        </button>
                      </div>
                      <ul className="divide-y divide-border/40">
                        {(data.dancers || []).slice(0, MAX_PREVIEW).map((item) => (
                          <li
                            key={`${item.type}-${item.id}`}
                            className="flex items-center justify-between gap-4 py-2.5"
                          >
                            <button
                              type="button"
                              className="flex flex-1 items-center gap-3 text-left"
                              onClick={() => onOpenItem(navigate, item)}
                            >
                              <img
                                className="h-9 w-9 rounded-full object-cover"
                                src={getAvatarUrl(item.avatar, 36)}
                                alt={item.name}
                                onError={(e) => {
                                  e.target.src = getAvatarUrl(null, 36);
                                }}
                              />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-foreground">
                                  {item.name}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {item.type}
                                </div>
                              </div>
                            </button>
                            {renderFollowButton(item)}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Bài viết */}
                  {transformedPosts.length > 0 && (
                    <section className="mb-2 rounded-xl bg-background/40 border border-border/40 px-3 py-2.5">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("search.sectionPosts") || "Bài viết"}
                        </h3>
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => setActive("posts")}
                        >
                          {t("search.viewAll") || "Xem tất cả"}
                        </button>
                      </div>
                      <div className="space-y-3">
                        {transformedPosts.slice(0, MAX_PREVIEW).map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            playingPost={null}
                            setPlayingPost={() => {}}
                            sharedAudioRef={null}
                            sharedCurrentTime={0}
                            sharedDuration={0}
                            sharedIsPlaying={false}
                            onSeek={() => {}}
                            onEdit={null}
                            onDelete={null}
                            onReport={null}
                            onImageClick={null}
                            onShared={null}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {(!data.users?.length &&
                    !data.bars?.length &&
                    !data.djs?.length &&
                    !data.dancers?.length &&
                    !transformedPosts.length) && (
                    <div className="py-4 text-sm text-muted-foreground">
                      {t("search.noResults") || "Không có kết quả"}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Chế độ xem từng tab riêng biệt */}
                  {active === "posts" ? (
                    transformedPosts.length > 0 ? (
                      <div className="space-y-3">
                        {transformedPosts.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            playingPost={null}
                            setPlayingPost={() => {}}
                            sharedAudioRef={null}
                            sharedCurrentTime={0}
                            sharedDuration={0}
                            sharedIsPlaying={false}
                            onSeek={() => {}}
                            onEdit={null}
                            onDelete={null}
                            onReport={null}
                            onImageClick={null}
                            onShared={null}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-sm text-muted-foreground">
                        {t("search.noResults") || "Không có kết quả"}
                      </div>
                    )
                  ) : list.length > 0 ? (
                    <ul className="divide-y divide-border/40">
                      {list.map((item) => (
                        <li
                          key={`${item.type}-${item.id}`}
                          className="flex items-center justify-between gap-4 py-2.5"
                        >
                          <button
                            type="button"
                            className="flex flex-1 items-center gap-3 text-left"
                            onClick={() => onOpenItem(navigate, item)}
                          >
                            <img
                              className="h-9 w-9 rounded-full object-cover"
                              src={getAvatarUrl(item.avatar, 36)}
                              alt={item.name}
                              onError={(e) => {
                                e.target.src = getAvatarUrl(null, 36);
                              }}
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-foreground">
                                {item.name}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {item.type}
                              </div>
                            </div>
                          </button>
                          {renderFollowButton(item)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="py-4 text-sm text-muted-foreground">
                      {t("search.noResults") || "Không có kết quả"}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function mapType(t) {
  const x = String(t || "").toUpperCase();
  if (x === "BAR") return "BAR";
  return "USER";
}

function onOpenItem(navigate, item) {
  if (!item) {
    console.error("[SearchResults] Missing item payload");
    return;
  }

  const itemType = String(item.type || "").toUpperCase();

  // Posts have a dedicated detail page
  if (itemType === "POST") {
    if (!item.id) {
      console.error("[SearchResults] Post item missing id:", item);
      return;
    }
    navigate(`/post/${item.id}`);
    return;
  }

  // For other types, prefer the entity account id when available
  const itemEntityAccountId =
    item.raw?.EntityAccountId || item.raw?.entityAccountId || item.id || "";

  if (!itemEntityAccountId) {
    console.error("[SearchResults] Item missing entityAccountId/id:", item);
    return;
  }

  // Check if this is the current user's own profile (same role)
  try {
    const session = getSession();
    if (session?.activeEntity) {
      const activeEntityAccountId = 
        session.activeEntity.EntityAccountId ||
        session.activeEntity.entityAccountId ||
        null;
      
      // If EntityAccountId matches, redirect to own profile page
      if (activeEntityAccountId && 
          String(activeEntityAccountId).toLowerCase() === String(itemEntityAccountId).toLowerCase()) {
        navigate("/own/profile");
        return;
      }
    }
  } catch (error) {
    console.error("[SearchResults] Error checking own profile:", error);
  }

  // Navigate to public profile page
  navigate(`/profile/${itemEntityAccountId}`);
}


