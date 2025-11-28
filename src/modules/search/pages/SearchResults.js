import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import searchApi from "../../../api/searchApi";
import FollowButton from "../../../components/common/FollowButton";
import PostCard from "../../feeds/components/post/PostCard";
import { mapPostForCard } from "../../../utils/postTransformers";
import { getAvatarUrl } from "../../../utils/defaultAvatar";
import "../../../styles/components/globalSearch.css";

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "users", label: "Người dùng" },
  { key: "bars", label: "Bar" },
  { key: "posts", label: "Bài viết" },
];

export default function SearchResults() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const query = useQuery();
  const q = query.get("q") || "";
  const [active, setActive] = useState("all");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ users: [], bars: [], posts: [] });

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

  // Tạo list cho users và bars (không include posts)
  const all = useMemo(() => {
    return [
      ...(data.users || []).map(x => ({ ...x, _group: "users" })),
      ...(data.bars || []).map(x => ({ ...x, _group: "bars" })),
    ];
  }, [data.users, data.bars]);

  // Lấy list items dựa trên active tab
  const list = useMemo(() => {
    if (active === "all") return all;
    if (active === "posts") return []; // Posts sẽ render riêng
    return data[active] || [];
  }, [active, all, data]);

  return (
    <div className="container" style={{ padding: 16 }}>
      <h2>Kết quả tìm kiếm cho: "{q}"</h2>

      <div className="gs-tabs" style={{ marginTop: 8, marginBottom: 12 }}>
        {TABS.map(t => (
          <button key={t.key} className={"gs-tab" + (active === t.key ? " active" : "")} onClick={() => setActive(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 12 }}>Đang tìm...</div>
      ) : (
        <>
          {/* Render posts với PostCard nếu active là "all" hoặc "posts" */}
          {(active === "all" || active === "posts") && transformedPosts.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              {transformedPosts.map(post => (
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
          )}

          {/* Render users và bars với list item đơn giản */}
          {list.length > 0 && (
            <ul className="gs-list">
              {list.map(item => (
                <li key={`${item.type}-${item.id}`} className="gs-item">
                  <div className="gs-left" onClick={() => onOpenItem(navigate, item)}>
                    <img 
                      className="gs-avatar" 
                      src={getAvatarUrl(item.avatar, 36)} 
                      alt={item.name}
                      onError={(e) => {
                        // Fallback to default avatar if image fails to load
                        e.target.src = getAvatarUrl(null, 36);
                      }}
                    />
                    <div>
                      <div className="gs-name">{item.name}</div>
                      <div className="gs-type">{item.type}</div>
                    </div>
                  </div>
                  {(() => {
                    const itemEntityAccountId = item.raw?.EntityAccountId || item.raw?.entityAccountId || item.id || "";
                    return itemEntityAccountId && (
                      <FollowButton followingId={itemEntityAccountId} followingType={mapType(item.type)} />
                    );
                  })()}
                </li>
              ))}
            </ul>
          )}

          {/* Hiển thị "Không có kết quả" nếu không có gì cả */}
          {!loading && (() => {
            if (active === "all") {
              return transformedPosts.length === 0 && list.length === 0;
            }
            if (active === "posts") {
              return transformedPosts.length === 0;
            }
            return list.length === 0;
          })() && (
            <div style={{ padding: 12 }}>Không có kết quả</div>
          )}
        </>
      )}
    </div>
  );
}

function mapType(t) {
  const x = String(t || "").toUpperCase();
  if (x === "BAR") return "BAR";
  return "USER";
}

function onOpenItem(navigate, item) {
<<<<<<< HEAD
  // Validate item.id before navigating
  if (!item.id) {
    console.error("[SearchResults] Item missing id:", item);
    return;
  }
  
  // All items (BAR, DJ, DANCER, USER) should navigate to /profile/:id
  navigate(`/profile/${item.id}`);
=======
      const itemType = String(item.type || "").toUpperCase();

  // Navigate to post detail page for posts
  if (itemType === 'POST') {
    navigate(`/post/${item.id}`);
          return;
        }

  // For other types, navigate to profile page
  const itemEntityAccountId = item.raw?.EntityAccountId || item.raw?.entityAccountId || item.id || "";
  if (itemEntityAccountId) {
  navigate(`/profile/${itemEntityAccountId}`);
  }
>>>>>>> origin/main
}


