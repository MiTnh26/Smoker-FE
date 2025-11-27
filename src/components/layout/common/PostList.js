// src/components/post/PostList.js
import React from "react";
import { getAvatarUrl } from "../../../utils/defaultAvatar";
import "../../../styles/modules/profile.css";
export default function PostList({ posts = [], avatar, userName }) {
  return (
    <div className="post-list">
      {posts.length === 0 && (
        <p className="text-gray-400">Chưa có bài viết nào.</p>
      )}
      {posts.map((post, idx) => (
        <div key={idx} className="post-card">
          <div className="post-header">
            <div className="flex items-center gap-3">
              <img
                src={getAvatarUrl(post.avatar || avatar, 40)}
                alt={post.userName || userName}
                className="avatar-small"
                onError={(e) => {
                  e.target.src = getAvatarUrl(null, 40);
                }}
              />
              <div>
                <h4>{post.userName || userName}</h4>
                <p className="text-sm text-gray-400">{post.time || "2 giờ trước"}</p>
              </div>
            </div>
            <i className="bx bx-dots-horizontal-rounded text-[#a78bfa]"></i>
          </div>
          <p className="post-content mt-3">{post.content}</p>
          {post.image && <div className="post-image" />}
          <div className="post-actions mt-3">
            <button>❤️ Thích</button>
            <button>💬 Bình luận</button>
          </div>
        </div>
      ))}
    </div>
  );
}
