import React, { useEffect, useState } from "react";
import { userApi } from "../../../api/userApi";
import { Button } from "../../../components/common/Button";
import "../../../styles/modules/profile.css";

export default function Profile() {
  const [profile, setProfile] = useState({
    userName: "",
    email: "",
    avatar: "",
    background: "",
    bio: "",
    address: "", 
    phone: "",
    gender: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await userApi.me();
        if (res.status === "success" && res.data) {
          setProfile(res.data);
        } else setError(res.message || "Không tải được hồ sơ");
      } catch (e) {
        setError(e?.response?.data?.message || "Không tải được hồ sơ");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="profile-loading">Đang tải hồ sơ...</div>;

  return (
    <div className="profile-container">
      {/* --- COVER & AVATAR --- */}
      <section
        className="profile-cover"
        style={{
          backgroundImage: `url(${
            profile.background || "https://i.imgur.com/6IUbEMn.jpg"
          })`,
        }}
      >
        <div className="profile-info-header">
          <div className="avatar-container">
            <img
              src={profile.avatar || "https://via.placeholder.com/120"}
              alt="avatar"
              className="profile-avatar"
            />
            {/* Thay nút bằng icon nhỏ góc avatar */}
            <i className="bx bx-camera text-[#a78bfa] text-xl cursor-pointer hover:text-white transition"></i>
          </div>

          <div className="profile-details">
            <h2>{profile.userName || "Người dùng mới"}</h2>
            <p>{profile.address || "Chưa có địa chỉ"}</p>
            <p>{profile.gender || "Chưa có địa chỉ"}</p>
            <p>
              Giá thuê: <span className="highlight">300k/giờ</span>
            </p>
            <p>⭐ 4.1 (5 đánh giá)</p>
          </div>

          {/* Gộp nút chia sẻ + chỉnh sửa vào icon gọn */}
          <div className="profile-actions flex gap-3">
            <i className="bx bx-share-alt text-[#a78bfa] text-2xl cursor-pointer hover:text-white transition"></i>
            <i className="bx bx-edit text-[#a78bfa] text-2xl cursor-pointer hover:text-white transition"></i>
          </div>
        </div>
      </section>

      {/* --- TABS --- */}
      <div className="profile-tabs">
        <button className="active">Thông tin</button>
        <button>Bài viết</button>
        <button>Video</button>
        <button>Đánh giá</button>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="profile-body">
        {/* LEFT */}
        <div className="profile-left">
          <div className="profile-card">
            <h3 className="section-title">Sự kiện</h3>
            <div className="event-list">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="event-circle" />
              ))}
            </div>
          </div>

          <div className="profile-card mt-4">
            <h3 className="section-title">Menu</h3>
            <div className="menu-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="menu-item" />
              ))}
            </div>
            {/* Chuyển nút thành biểu tượng cây bút nhỏ ở góc */}
            <div className="flex justify-end mt-2">
              <i className="bx bx-edit-alt text-[#a78bfa] cursor-pointer hover:text-white transition"></i>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <aside className="profile-sidebar">
          <div className="profile-card">
            <p>Follower: 2</p>
            <p>Following: 2</p>
            <p>Bạn bè: 2</p>
          </div>
          <div className="profile-card mt-4">
            <p>Liên hệ: Tele</p>
            <p>Liên hệ: Zalo</p>
          </div>
        </aside>
      </div>

      {/* --- POST AREA --- */}
      <section className="post-section">
        <div className="post-create">
          <img
            src={profile.avatar || "https://via.placeholder.com/40"}
            alt="avatar"
            className="avatar-small"
          />
          <input type="text" placeholder="Bạn muốn đăng gì..." />
          <i className="bx bx-image text-[#a78bfa] text-xl"></i>
        </div>
      </section>

      {/* --- POST LIST --- */}
      <section className="post-list">
        <div className="post-card">
          <div className="post-header">
            <div className="flex items-center gap-3">
              <img
                src={profile.avatar || "https://via.placeholder.com/40"}
                alt="avatar"
                className="avatar-small"
              />
              <div>
                <h4>{profile.userName || "Người dùng"}</h4>
                <p className="text-sm text-gray-400">2 giờ trước</p>
              </div>
            </div>
            <i className="bx bx-dots-horizontal-rounded text-[#a78bfa]"></i>
          </div>
          <p className="post-content mt-3">
            Đây là bài viết mẫu của người dùng, hiển thị nội dung đăng tải.
          </p>
          <div className="post-image" />
          <div className="post-actions mt-3">
            <button>❤️ Thích</button>
            <button>💬 Bình luận</button>
          </div>
        </div>
      </section>
    </div>
  );
}
