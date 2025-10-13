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
    <div className="profile-layout">
      {/* --- HEADER --- */}
     

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
            <Button className="btn-small">Update</Button>
          </div>

          <div className="profile-details">
            <h2>{profile.userName || "Người dùng mới"}</h2>
            <p>{profile.address || "Chưa có địa chỉ"}</p>
            <p>
              Giá thuê: <span className="highlight">300k/giờ</span>
            </p>
            <p>⭐ 4.1 (5 đánh giá)</p>
          </div>

          <div className="profile-actions">
            <Button className="btn-outline">Share</Button>
            <Button className="btn-outline">Edit</Button>
          </div>
        </div>
      </section>

      {/* --- NAV TABS --- */}
      <div className="profile-tabs">
        <button className="active">Info</button>
        <button>Bài viết</button>
        <button>Video</button>
        <button>Đánh giá</button>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="profile-body">
        {/* --- LEFT COLUMN --- */}
        <div className="profile-left">
          <div className="event-section">
            <h3>EVENT</h3>
            <div className="event-list">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="event-circle"></div>
              ))}
            </div>
          </div>

          <div className="menu-section">
            <h3>MENU</h3>
            <div className="menu-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="menu-item"></div>
              ))}
            </div>
            <Button className="btn-small">Chỉnh sửa menu</Button>
          </div>
        </div>

        {/* --- RIGHT COLUMN --- */}
        <aside className="profile-sidebar">
          <div className="stats-box">
            <p>Follower: 2</p>
            <p>Following: 2</p>
            <p>Bạn bè: 2</p>
          </div>
          <div className="contact-box">
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
          <i className="bx bx-image"></i>
        </div>
        <Button className="btn-small">Quản lý bài viết</Button>
      </section>

      {/* --- POST LIST --- */}
      <section className="post-list">
        <div className="post-card">
          <div className="post-header">
            <img
              src={profile.avatar || "https://via.placeholder.com/40"}
              alt="avatar"
              className="avatar-small"
            />
            <div>
              <h4>{profile.userName || "Người dùng"}</h4>
              <p>2 giờ trước</p>
            </div>
            <i className="bx bx-dots-horizontal-rounded"></i>
          </div>
          <p className="post-content">
            Đây là bài viết mẫu của người dùng, hiển thị nội dung đăng tải.
          </p>
          <div className="post-image"></div>
          <div className="post-actions">
            <button>❤️ Thích</button>
            <button>💬 Bình luận</button>
          </div>
        </div>
      </section>
    </div>
  );
}
