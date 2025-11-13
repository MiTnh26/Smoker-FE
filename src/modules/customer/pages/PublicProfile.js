/* global globalThis */
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FollowButton from "../../../components/common/FollowButton";
import publicProfileApi from "../../../api/publicProfileApi";
import { useFollowers, useFollowing } from "../../../hooks/useFollow";
import { getPostsByAuthor } from "../../../api/postApi";
import messageApi from "../../../api/messageApi";
import { cn } from "../../../utils/cn";
import PostCard from "../../feeds/components/post/PostCard";
import RequestBookingModal from "../../../components/booking/RequestBookingModal";
import ReportEntityModal from "../../feeds/components/modals/ReportEntityModal";
import PerformerReviews from "../../business/components/PerformerReviews";

const normalizeMediaArray = (medias) => {
  const images = [];
  const videos = [];

  if (Array.isArray(medias)) {
    for (const mediaItem of medias) {
      if (!mediaItem) continue;
      const url = mediaItem.url || mediaItem.src || mediaItem.path;
      const type = (mediaItem.type || "").toLowerCase();
      if (!url) continue;
      if (type === "video" || url.includes(".mp4") || url.includes(".webm")) {
        videos.push({ url, id: mediaItem._id || mediaItem.id || url });
      } else {
        images.push({ url, id: mediaItem._id || mediaItem.id || url });
      }
    }
  } else if (medias && typeof medias === "object") {
    for (const key of Object.keys(medias)) {
      const mediaItem = medias[key];
      if (!mediaItem) continue;
      const url = mediaItem.url || mediaItem.src || mediaItem.path;
      const type = (mediaItem.type || "").toLowerCase();
      if (!url) continue;
      if (type === "video" || url.includes(".mp4") || url.includes(".webm")) {
        videos.push({ url, id: mediaItem._id || mediaItem.id || url });
      } else {
        images.push({ url, id: mediaItem._id || mediaItem.id || url });
      }
    }
  }
  return { images, videos };
};

const countCollection = (value) => {
  if (!value) return 0;
  if (Array.isArray(value)) return value.length;
  if (value instanceof Map) return value.size;
  if (typeof value === "object") return Object.keys(value).length;
  if (typeof value === "number") return value;
  return 0;
};

const formatPostTime = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch {
    return "";
  }
};

const getWindow = () => (typeof globalThis !== "undefined" ? globalThis : undefined);

// eslint-disable-next-line complexity
const mapPostForCard = (post, t) => {
  const id = post._id || post.id || post.postId;
  const author = post.author || post.account || {};
  const mediaFromPost = normalizeMediaArray(post.medias);
  const mediaFromMediaIds = normalizeMediaArray(post.mediaIds);
  const images = [...mediaFromPost.images, ...mediaFromMediaIds.images];
  const videos = [...mediaFromPost.videos, ...mediaFromMediaIds.videos];

  const resolveUserName = () =>
    post.authorName ||
    post.authorEntityName ||
    author.userName ||
    author.name ||
    t("common.user");

  const resolveAvatar = () =>
    post.authorAvatar ||
    post.authorEntityAvatar ||
    author.avatar ||
    "https://via.placeholder.com/40";

  return {
    id,
    user: resolveUserName(),
    avatar: resolveAvatar(),
    time: formatPostTime(post.createdAt),
    content: post.content || post.caption || "",
    medias: { images, videos },
    image: images[0]?.url || null,
    videoSrc: videos[0]?.url || null,
    audioSrc: null,
    likes: countCollection(post.likes),
    likedByCurrentUser: false,
    comments: countCollection(post.comments),
    shares: post.shares || 0,
    hashtags: post.hashtags || [],
    verified: !!post.verified,
   location: post.location || null,
    title: post.title || null,
    canManage: false,
    ownerEntityAccountId: post.entityAccountId || null,
    ownerAccountId: post.accountId || null,
    targetType: post.type || "post",
  };
};

// eslint-disable-next-line complexity
export default function PublicProfile() {
  const { entityId } = useParams();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [currentUserEntityId, setCurrentUserEntityId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const { followers, fetchFollowers } = useFollowers(entityId);
  const { following, fetchFollowing } = useFollowing(entityId);
  const [posts, setPosts] = useState([]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const body = await publicProfileApi.getByEntityId(entityId);
        if (alive) setProfile(body?.data || null);
      } catch (e) {
        if (alive) setError(e?.response?.data?.message || e.message);
      } finally {
        if (alive) setLoading(false);
      }
    };
    if (entityId) run();
    return () => { alive = false; };
  }, [entityId]);

  useEffect(() => {
    try {
      const sessionRaw = localStorage.getItem("session");
      if (!sessionRaw) return;
      const session = JSON.parse(sessionRaw);
      const active = session?.activeEntity || {};
      const entities = session?.entities || [];
      const resolvedId =
        active.EntityAccountId ||
        active.entityAccountId ||
        active.id ||
        entities[0]?.EntityAccountId ||
        entities[0]?.entityAccountId ||
        null;
      setCurrentUserEntityId(resolvedId || null);
    } catch {}
  }, []);

  useEffect(() => {
    if (entityId) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [entityId, refreshTick, fetchFollowers, fetchFollowing]);

  useEffect(() => {
    let alive = true;
    const loadPosts = async () => {
      try {
        const resp = await getPostsByAuthor(entityId, {});
        if (!alive) return;

        let rawPosts = [];
        if (Array.isArray(resp?.data)) {
          rawPosts = resp.data;
        } else if (Array.isArray(resp?.data?.data)) {
          rawPosts = resp.data.data;
        }

        const transformed = rawPosts.map((post) => mapPostForCard(post, t));
        setPosts(transformed);
      } catch {}
    };
    if (entityId) loadPosts();
    return () => { alive = false; };
  }, [entityId, t]);

  useEffect(() => {
    if (!actionMenuOpen) return;
    const handleOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [actionMenuOpen]);

  if (loading) {
    return (
      <div className={cn("min-h-screen bg-background flex items-center justify-center")}>
        <div className={cn("text-muted-foreground")}>{t("publicProfile.loading")}</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={cn("min-h-screen bg-background flex items-center justify-center")}>
        <div className={cn("text-danger")}>{t("publicProfile.error")}</div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className={cn("min-h-screen bg-background flex items-center justify-center")}>
        <div className={cn("text-muted-foreground")}>{t("publicProfile.notFound")}</div>
      </div>
    );
  }

  const isOwnProfile = currentUserEntityId && String(currentUserEntityId).toLowerCase() === String(entityId).toLowerCase();

  const resolveTargetType = () => {
    const type = (profile?.type || profile?.role || "").toString().toUpperCase();
    if (type === "BAR" || type.includes("BARPAGE")) return "BarPage";
    if (type.includes("BUSINESS") || type.includes("DJ") || type.includes("DANCER")) {
      return "BusinessAccount";
    }
    return "Account";
  };

  const handleBlock = () => {
    setActionMenuOpen(false);
    const win = getWindow();
    const confirmed = win?.confirm
      ? win.confirm(t("publicProfile.blockConfirm", { name: profile.name || t("publicProfile.thisUser") }))
      : false;
    if (!confirmed) return;
    try {
      const blockedRaw = localStorage.getItem("blockedEntities");
      const blocked = blockedRaw ? JSON.parse(blockedRaw) : [];
      if (!blocked.includes(entityId)) {
        blocked.push(entityId);
        localStorage.setItem("blockedEntities", JSON.stringify(blocked));
      }
      alert(t("publicProfile.blockSuccess"));
    } catch (err) {
      console.error("Failed to persist block list:", err);
      alert(t("publicProfile.blockError"));
    }
  };

  const targetType = resolveTargetType();
  const isPerformerProfile =
    targetType === "BusinessAccount" &&
    ["DJ", "DANCER"].includes((profile?.role || "").toString().toUpperCase());
  const performerTargetId = isPerformerProfile
    ? profile?.targetId || profile?.targetID || null
    : null;

  return (
    <div className={cn("min-h-screen bg-background")}>
      {/* Cover Photo Section - Instagram Style */}
      <section className={cn("relative w-full h-[200px] md:h-[250px] overflow-hidden rounded-b-lg")}>
        <div
          className={cn("absolute inset-0 bg-cover bg-center")}
          style={{
            backgroundImage: `url(${profile.background || "https://i.imgur.com/6IUbEMn.jpg"})`,
          }}
        />
        {/* Gradient Overlay */}
        <div className={cn("absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60")} />

        {/* Action Buttons */}
        {!isOwnProfile && (
          <div className={cn("absolute top-4 right-4 z-10 flex items-center gap-2")}>
            <button
              onClick={() => setBookingOpen(true)}
              className={cn(
                "px-4 py-2 rounded-lg font-semibold text-sm",
                "bg-primary text-primary-foreground border-none",
                "hover:bg-primary/90 transition-all duration-200",
                "active:scale-95",
                "flex items-center gap-2"
              )}
            >
              <i className="bx bxs-calendar-check text-base" />
              <span>Request booking</span>
            </button>
            <button
              onClick={async () => {
                try {
                  const sessionRaw = localStorage.getItem("session");
                  if (!sessionRaw) return;
                  const session = JSON.parse(sessionRaw);
                  const active = session?.activeEntity || {};
                  const entities = session?.entities || [];
                  const currentUserId =
                    active.EntityAccountId ||
                    active.entityAccountId ||
                    active.id ||
                    entities[0]?.EntityAccountId ||
                    entities[0]?.entityAccountId ||
                    null;

                  if (!currentUserId) return;

                  const res = await messageApi.createOrGetConversation(currentUserId, entityId);
                  const conversation = res?.data?.data || res?.data;
                  const conversationId = conversation?._id || conversation?.conversationId || conversation?.id;
                  const win = getWindow();
                  if (conversationId && win?.__openChat) {
                    win.__openChat({
                      id: conversationId,
                      name: profile.name || "User",
                      avatar: profile.avatar || null,
                      entityId: entityId
                    });
                  }
                } catch (error) {
                  console.error("Error opening chat:", error);
                }
              }}
              className={cn(
                "px-4 py-2 rounded-lg font-semibold text-sm",
                "bg-card/80 backdrop-blur-sm text-foreground border-none",
                "hover:bg-card/90 transition-all duration-200",
                "active:scale-95",
                "flex items-center gap-2"
              )}
            >
              <i className="bx bx-message-rounded text-base" />
              <span>Chat</span>
            </button>
            <FollowButton
              followingId={entityId}
              followingType={profile.type === 'BAR' ? 'BAR' : 'USER'}
              onChange={() => setRefreshTick(v => v + 1)}
            />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setActionMenuOpen((prev) => !prev)}
                className={cn(
                  "w-10 h-10 rounded-full border border-border/40 text-foreground/80",
                  "bg-card/70 backdrop-blur-sm flex items-center justify-center",
                  "hover:bg-card/90 transition-all duration-200 active:scale-95"
                )}
                aria-haspopup="true"
                aria-expanded={actionMenuOpen}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              {actionMenuOpen && (
                <div
                  className={cn(
                    "absolute right-0 mt-2 w-48 rounded-lg border border-border/30",
                    "bg-card/95 backdrop-blur-sm text-foreground shadow-[0_10px_30px_rgba(0,0,0,0.25)]",
                    "overflow-hidden z-20"
                  )}
                  role="menu"
                >
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm",
                      "hover:bg-danger/10 hover:text-danger transition-all duration-150"
                    )}
                    onClick={() => {
                      setActionMenuOpen(false);
                      setReportModalOpen(true);
                    }}
                  >
                    {t("publicProfile.reportProfile")}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm",
                      "hover:bg-muted/40 transition-all duration-150"
                    )}
                    onClick={handleBlock}
                  >
                    {t("publicProfile.blockProfile")}
                  </button>
                </div>
              )}
            </div>
        
          </div>
        )}

        {/* Profile Info Overlay */}
        <div className={cn("absolute bottom-0 left-0 right-0 p-4 md:p-6")}>
          <div className={cn("flex items-end gap-3 md:gap-4")}>
            {/* Avatar */}
            <div className={cn("relative")}>
              <img
                src={profile.avatar || "https://via.placeholder.com/150"}
                alt="avatar"
                className={cn(
                  "w-20 h-20 md:w-24 md:h-24 rounded-full object-cover",
                  "border-4 border-card shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
                  "bg-card"
                )}
              />
            </div>
            <div className={cn("flex-1 pb-1")}>
              <h1 className={cn(
                "text-xl md:text-2xl font-bold text-primary-foreground mb-0.5",
                "drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              )}>
                {profile.name || "Hồ sơ"}
              </h1>
              <div className={cn(
                "text-xs md:text-sm text-primary-foreground/90",
                "drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
              )}>
                {(profile.type || profile.role || "USER").toString()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className={cn("max-w-6xl mx-auto px-4 md:px-6 py-6")}>
        {/* Stats Bar - Refined & Balanced Design */}
        <section className={cn(
          "flex items-center justify-center gap-8 md:gap-12 lg:gap-16",
          "py-6 px-4",
          "border-b border-border/30"
        )}>
          <button className={cn(
            "flex flex-col items-center gap-1.5 cursor-pointer",
            "group transition-all duration-200",
            "hover:opacity-90 active:scale-95"
          )}>
            <span className={cn(
              "text-2xl md:text-3xl font-bold text-foreground",
              "tracking-tight leading-none",
              "group-hover:text-primary transition-colors duration-200"
            )}>
              {followers.length}
            </span>
            <span className={cn(
              "text-[11px] md:text-xs text-muted-foreground",
              "font-medium uppercase tracking-wider",
              "group-hover:text-foreground/80 transition-colors duration-200"
            )}>
              {t("publicProfile.followers")}
            </span>
          </button>
          
          <div className={cn(
            "h-10 w-px bg-border/20",
            "hidden md:block"
          )} />
          
          <button className={cn(
            "flex flex-col items-center gap-1.5 cursor-pointer",
            "group transition-all duration-200",
            "hover:opacity-90 active:scale-95"
          )}>
            <span className={cn(
              "text-2xl md:text-3xl font-bold text-foreground",
              "tracking-tight leading-none",
              "group-hover:text-primary transition-colors duration-200"
            )}>
              {following.length}
            </span>
            <span className={cn(
              "text-[11px] md:text-xs text-muted-foreground",
              "font-medium uppercase tracking-wider",
              "group-hover:text-foreground/80 transition-colors duration-200"
            )}>
              {t("publicProfile.following")}
            </span>
          </button>
        </section>

        {/* Bio & Info Section */}
        {(profile.bio || (profile.contact && (profile.contact.email || profile.contact.phone || profile.contact.address))) && (
          <section className={cn(
            "py-6 border-b border-border/30",
            "bg-card rounded-lg p-6 mb-6",
            "border-[0.5px] border-border/20",
            "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          )}>
            {profile.bio && (
              <div className={cn("mb-4")}>
                <h3 className={cn("text-lg font-semibold text-foreground mb-2")}>
                  {t("publicProfile.about")}
                </h3>
                <p className={cn("text-foreground whitespace-pre-wrap leading-relaxed")}>
                  {profile.bio}
                </p>
              </div>
            )}
            {profile.contact && (profile.contact.email || profile.contact.phone || profile.contact.address) && (
              <div className={cn("mt-4 pt-4 border-t border-border/30")}>
                <h4 className={cn("text-base font-semibold text-foreground mb-3")}>
                  {t("publicProfile.contact")}
                </h4>
                <div className={cn("space-y-2 text-sm text-muted-foreground")}>
                  {profile.contact.email && (
                    <div className={cn("flex items-center gap-2")}>
                      <i className="bx bx-envelope text-base"></i>
                      <span>{t("common.email")}: {profile.contact.email}</span>
                    </div>
                  )}
                  {profile.contact.phone && (
                    <div className={cn("flex items-center gap-2")}>
                      <i className="bx bx-phone text-base"></i>
                      <span>{t("common.phone") || "Phone"}: {profile.contact.phone}</span>
                    </div>
                  )}
                  {profile.contact.address && (
                    <div className={cn("flex items-center gap-2")}>
                      <i className="bx bx-map text-base"></i>
                      <span>{t("common.address") || "Address"}: {profile.contact.address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {isPerformerProfile && performerTargetId && (
          <section className={cn("py-6")}>
            <PerformerReviews
              businessAccountId={performerTargetId}
              performerName={profile.name}
              performerRole={profile.role || undefined}
              isOwnProfile={isOwnProfile}
            />
          </section>
        )}

        {/* Posts Section */}
        <section className={cn("py-6")}>
          <h3 className={cn("text-lg font-semibold text-foreground mb-4")}>
            {t("publicProfile.posts")}
          </h3>
          {posts && posts.length > 0 ? (
            <div className={cn("space-y-4")}>
              {posts.map(post => (
                <PostCard
                  key={post._id || post.id}
                  post={post}
                />
              ))}
            </div>
          ) : (
            <div className={cn(
              "text-center py-12 text-muted-foreground",
              "bg-card rounded-lg border-[0.5px] border-border/20 p-8"
            )}>
              {t("publicProfile.noPosts")}
            </div>
          )}
        </section>
      </div>

      {bookingOpen && (
        <RequestBookingModal
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          performerEntityAccountId={entityId}
          performerRole={(profile.role || profile.type || "").toString().toUpperCase().includes("DANCER") ? "DANCER" : "DJ"}
        />
      )}
      {reportModalOpen && (
        <ReportEntityModal
          open={reportModalOpen}
          entityId={entityId}
          entityType={resolveTargetType()}
          entityName={profile.name}
          onClose={() => setReportModalOpen(false)}
          onSubmitted={() => {
            setReportModalOpen(false);
            alert(t("publicProfile.reportSubmitted"));
          }}
        />
      )}
    </div>
  );
}
 
 
