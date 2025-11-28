// src/components/post/PostCreate.js
import React from "react";
import { getAvatarUrl } from "../../../utils/defaultAvatar";
import "../../../styles/modules/profile.css";

export default function PostCreate({ avatar }) {
  return (
    <div className="post-create">
      <img
        src={getAvatarUrl(avatar, 40)}
        alt="avatar"
        className="avatar-small"
        onError={(e) => {
          e.target.src = getAvatarUrl(null, 40);
        }}
      />
      <input type="text" placeholder="Bạn muốn đăng gì..." />
      <i className="bx bx-image text-[#a78bfa] text-xl"></i>
    </div>
  );
}
