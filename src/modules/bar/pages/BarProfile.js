import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import barPageApi from "../../../api/barPageApi";
import PostCreate from "../../../components/layout/Social/PostCreate";
import PostList from "../../../components/layout/Social/PostList";
import BarEvent from "../components/BarEvent";
import BarMenu from "../components/BarMenuCombo";
import BarFollowInfo from "../components/BarFollowInfo";
import BarVideo from "../components/BarVideo";
import BarReview from "../components/BarReview";
import BarTables from "../components/BarTables";

export default function BarProfile() {
  const { barPageId } = useParams();
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
  const [activeTab, setActiveTab] = useState("info"); // 🟢 tab state

  useEffect(() => {
    const fetchProfile = async () => {
      console.log("👉 useParams barPageId:", barPageId);
      try {
        const res = await barPageApi.getBarPageById(barPageId);
          console.log("✅ API Response getBarPageById:", res);
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

  // 🟢 Hàm render nội dung theo tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "info":
        return (
          <div className="profile-body">
            <div className="profile-left">
              <BarEvent barPageId={barPageId} />
              <BarMenu barPageId={barPageId} />

            </div>
            <BarFollowInfo />
          </div>
        );
      case "posts":
        return (
          <>
            <section className="post-section">
              <PostCreate avatar={profile.Avatar} />
            </section>
            <section className="post-list">
              <PostList
                posts={[]} // TODO: lấy từ API sau
                avatar={profile.Avatar}
                userName={profile.BarName}
              />
            </section>
          </>
        );
      case "videos":
        return <BarVideo barPageId={barPageId} />;

      case "reviews":
        return <BarReview barPageId={barPageId} />;
        case "tables":
      return <BarTables barPageId={barPageId} />;
      default:
        return null;
    }
  };

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
        <button
          className={activeTab === "info" ? "active" : ""}
          onClick={() => setActiveTab("info")}
        >
          Thông tin
        </button>
        <button
          className={activeTab === "posts" ? "active" : ""}
          onClick={() => setActiveTab("posts")}
        >
          Bài viết
        </button>
        <button
          className={activeTab === "videos" ? "active" : ""}
          onClick={() => setActiveTab("videos")}
        >
          Video
        </button>
        <button
          className={activeTab === "reviews" ? "active" : ""}
          onClick={() => setActiveTab("reviews")}
        >
          Đánh giá
        </button>
        <button className={activeTab === "tables" ? "active" : ""} onClick={() => setActiveTab("tables")}>Chỉnh sửa bàn</button>
      </div>

      {/* --- MAIN CONTENT --- */}
      {renderTabContent()}
    </div>
  );
}
