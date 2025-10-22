// src/components/post/PostCreate.js
import React from "react";
import "../../../styles/modules/profile.css";

export default function PostCreate({ avatar }) {
  return (
    <div className="post-create">
      <img
        src={avatar || "https://via.placeholder.com/40"}
        alt="avatar"
        className="avatar-small"
      />
      <input type="text" placeholder="Bạn muốn đăng gì..." />
      <i className="bx bx-image text-[#a78bfa] text-xl"></i>
    </div>
  );
}
