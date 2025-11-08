import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FollowButton from "../../../components/common/FollowButton";
import publicProfileApi from "../../../api/publicProfileApi";
import { useFollowers, useFollowing } from "../../../hooks/useFollow";
import { getPostsByAuthor } from "../../../api/postApi";
import messageApi from "../../../api/messageApi";
import "../../../styles/modules/publicProfile.css";

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

  if (loading) return <div className="pp-container">{t("publicProfile.loading")}</div>;
  if (error) return <div className="pp-container">{t("publicProfile.error")}</div>;
  if (!profile) return <div className="pp-container">{t("publicProfile.notFound")}</div>;

  return (
    <div className="pp-container">
      <section className="pp-cover" style={{ backgroundImage: `url(${profile.background || "https://i.imgur.com/6IUbEMn.jpg"})` }}>
        <div className="pp-header">
          <img src={profile.avatar || "https://via.placeholder.com/96"} alt="avatar" className="pp-avatar" />
          <div>
            <h2 className="pp-title">{profile.name || "Hồ sơ"}</h2>
            <div className="pp-type">{(profile.type || profile.role || "USER").toString()}</div>
          </div>
        </div>
        {(!currentUserEntityId || String(currentUserEntityId).toLowerCase() !== String(entityId).toLowerCase()) && (
          <div className="pp-follow">
            <button
              className="pp-chat-button"
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
                      avatar: profile.avatar || null, // Pass avatar
                      entityId: entityId // Pass entityId for profile navigation
                    });
                  }
                } catch (error) {
                  console.error("Error opening chat:", error);
                }
              }}
            >
              <i className="bx bx-message-rounded"></i>
              Chat
            </button>
            <FollowButton
              followingId={entityId}
              followingType={profile.type === 'BAR' ? 'BAR' : 'USER'}
              onChange={() => setRefreshTick(v => v + 1)}
            />
          </div>
        )}
      </section>

      <section className="pp-stats">
        <div>
          <div className="pp-stat-label">{t("publicProfile.followers")}</div>
          <div className="pp-stat-value">{followers.length}</div>
        </div>
        <div>
          <div className="pp-stat-label">{t("publicProfile.following")}</div>
          <div className="pp-stat-value">{following.length}</div>
        </div>
      </section>

      <section className="pp-section">
        {profile.bio && (
          <div>
            <h3>{t("publicProfile.about")}</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{profile.bio}</p>
          </div>
        )}
        {profile.contact && (profile.contact.email || profile.contact.phone || profile.contact.address) && (
          <div style={{ marginTop: 12 }}>
            <h4>{t("publicProfile.contact")}</h4>
            {profile.contact.email && <div>{t("common.email")}: {profile.contact.email}</div>}
            {profile.contact.phone && <div>{t("common.phone") || "Phone"}: {profile.contact.phone}</div>}
            {profile.contact.address && <div>{t("common.address") || "Address"}: {profile.contact.address}</div>}
          </div>
        )}
      </section>

      <section>
        <h3>{t("publicProfile.posts")}</h3>
        {posts && posts.length > 0 ? (
          <ul className="pp-posts">
            {posts.map(p => (
              <li key={p._id || p.id} className="pp-post">
                <div className="pp-post-title">{p.title || t("publicProfile.postTitleFallback")}</div>
                {p.content && <div className="pp-post-content">{p.content}</div>}
              </li>
            ))}
          </ul>
        ) : (
          <div>{t("publicProfile.noPosts")}</div>
        )}
      </section>
    </div>
  );
}


