import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import barPageApi from "../../../api/barPageApi"; // ✅ Đổi sang barPageApi
// import "../../../styles/modules/profile.css";
import PostCreate from "../../../components/layout/Social/PostCreate";
import PostList from "../../../components/layout/Social/PostList";

export default function BarProfile() {
  const { barPageId } = useParams(); // ✅ đổi param cho đúng route
  const [profile, setProfile] = useState({
    BarName: "",
    Role: "",
    Avatar: "",
    Background: "",
    Address: "",
    PhoneNumber: "",
    Email: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await barPageApi.getBarPageById(barPageId); // ✅ gọi đúng API
        if (res.status === "success" && res.data) {
          setProfile(res.data);
        } else {
          setError(res.message || "Không tải được hồ sơ quán bar");
        }
      } catch (e) {
        console.error("❌ Lỗi tải bar page:", e);
        setError(e?.response?.data?.message || "Không tải được hồ sơ quán bar");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [barPageId]);

  if (loading) return <div className="profile-loading">Đang tải hồ sơ...</div>;
  if (error) return <div className="profile-error">{error}</div>;

  return (
    <div className="profile-container">
      {/* --- COVER & AVATAR --- */}
      <section
        className="profile-cover"
        style={{
          backgroundImage: `url(${profile.Background || "https://i.imgur.com/6IUbEMn.jpg"})`,
        }}
      >
        <div className="profile-info-header">
          <div className="avatar-container">
            <img
              src={profile.Avatar || "https://via.placeholder.com/120"}
              alt={profile.BarName}
              className="profile-avatar"
            />
            <i className="bx bx-camera text-[#a78bfa] text-xl cursor-pointer hover:text-white transition"></i>
          </div>

          <div className="profile-details">
            <h2>{profile.BarName || "Quán Bar mới"}</h2>
            <p>Địa chỉ: {profile.Address || "Chưa có địa chỉ"}</p>
            <p>Điện thoại: {profile.PhoneNumber || "Chưa có"}</p>
            <p>Email: {profile.Email || "Chưa có"}</p>
            <p>Role: {profile.Role || "Bar"}</p>
          </div>

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

      <section className="post-section">
        <PostCreate avatar={profile.Avatar} />
      </section>

      <section className="post-list">
        <PostList
          posts={[]} // array bài đăng thực tế từ backend
          avatar={profile.Avatar}
          userName={profile.BarName}
        />
      </section>
    </div>
  );
}
