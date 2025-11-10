import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FollowButton from "../../../components/common/FollowButton";
import publicProfileApi from "../../../api/publicProfileApi";
import { useFollowers, useFollowing } from "../../../hooks/useFollow";
import { getPostsByAuthor } from "../../../api/postApi";
import messageApi from "../../../api/messageApi";
import { cn } from "../../../utils/cn";
import PostCard from "../../feeds/components/post/PostCard";

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
        if (alive) setPosts(resp?.data || resp?.data?.data || []);
      } catch {}
    };
    if (entityId) loadPosts();
    return () => { alive = false; };
  }, [entityId]);

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
                  if (conversationId && window.__openChat) {
                    window.__openChat({
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
              <i className="bx bx-message-rounded text-base"></i>
              Chat
            </button>
            <FollowButton
              followingId={entityId}
              followingType={profile.type === 'BAR' ? 'BAR' : 'USER'}
              onChange={() => setRefreshTick(v => v + 1)}
            />
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
    </div>
  );
}


