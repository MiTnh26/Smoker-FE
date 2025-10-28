import React, { useEffect, useState } from "react";
import { userApi } from "../../../api/userApi";
import { Button } from "../../../components/common/Button";
import "../../../styles/modules/profile.css";
import ProfileFollowInfo from "../components/ProfileFollowInfo";

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
  const [showEditModal, setShowEditModal] = useState(false);
  const handleEditClick = () => setShowEditModal(true);
  const handleCloseEdit = () => setShowEditModal(false);
  const [editingField, setEditingField] = useState(null);

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
          backgroundImage: `url(${profile.background || "https://i.imgur.com/6IUbEMn.jpg"
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

           <div className="profile-actions flex gap-3 items-center">
            <i className="bx bx-share-alt text-[#a78bfa] text-2xl cursor-pointer hover:text-white transition"></i>

            {/* 🟢 Nút chỉnh sửa hồ sơ */}
            <button
              onClick={handleEditClick}
              className="flex items-center gap-1 px-3 py-1 bg-[#a78bfa] text-white rounded-xl hover:bg-[#8b5cf6] transition"
            >
              <i className="bx bx-edit text-lg"></i>
              Chỉnh sửa hồ sơ
            </button>
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
        <ProfileFollowInfo
          followers={profile.followers || 2}
          following={profile.following || 2}
          friends={profile.friends || 2}
          bio={profile.bio}

        />
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
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-semibold mb-5 text-center">
              Chỉnh sửa hồ sơ quán bar
            </h3>

            <div className="space-y-6">
              {/* --- Ảnh đại diện --- */}
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-4">
                  <img
                    src={profile.Avatar || "https://via.placeholder.com/100"}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover border"
                  />
                  <div>
                    <p className="font-medium text-lg">Ảnh đại diện</p>
                    <p className="text-sm text-gray-500">Hiển thị cho người dùng</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingField(editingField === "avatar" ? null : "avatar")}
                  className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium"
                >
                  {editingField === "avatar" ? "Đóng" : "Chỉnh sửa"}
                </button>
              </div>
              {editingField === "avatar" && (
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Nhập link ảnh đại diện..."
                    value={profile.Avatar}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, Avatar: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              )}

              {/* --- Ảnh nền --- */}
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-4">
                  <img
                    src={profile.Background || "https://i.imgur.com/6IUbEMn.jpg"}
                    alt="Background"
                    className="w-24 h-16 rounded-lg object-cover border"
                  />
                  <div>
                    <p className="font-medium text-lg">Ảnh bìa</p>
                    <p className="text-sm text-gray-500">Hiển thị ở đầu trang</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingField(editingField === "background" ? null : "background")}
                  className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium"
                >
                  {editingField === "background" ? "Đóng" : "Chỉnh sửa"}
                </button>
              </div>
              {editingField === "background" && (
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Nhập link ảnh bìa..."
                    value={profile.Background}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, Background: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              )}

              {/* --- Tiểu sử / Bio --- */}
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <p className="font-medium text-lg">Tiểu sử</p>
                  <p className="text-sm text-gray-500">
                    {profile.Bio || "Chưa có tiểu sử"}
                  </p>
                </div>
                <button
                  onClick={() => setEditingField(editingField === "bio" ? null : "bio")}
                  className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium"
                >
                  {editingField === "bio" ? "Đóng" : "Chỉnh sửa"}
                </button>
              </div>
              {editingField === "bio" && (
                <div className="mt-3">
                  <textarea
                    rows={3}
                    placeholder="Viết vài dòng giới thiệu về quán..."
                    value={profile.Bio || ""}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, Bio: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              )}

              {/* --- Thông tin chi tiết --- */}
              {/* --- Thông tin chi tiết --- */}
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <p className="font-medium text-lg mb-1">Thông tin chi tiết</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Tên quán:</strong> {profile.BarName || "Chưa có tên quán"}</p>
                    <p><strong>Địa chỉ:</strong> {profile.Address || "Chưa có địa chỉ"}</p>
                    <p><strong>Điện thoại:</strong> {profile.PhoneNumber || "Chưa có"}</p>
                    <p><strong>Email:</strong> {profile.Email || "Chưa có"}</p>
                    <p><strong>Vai trò:</strong> {profile.Role || "Bar"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingField(editingField === "info" ? null : "info")}
                  className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium self-start"
                >
                  {editingField === "info" ? "Đóng" : "Chỉnh sửa"}
                </button>
              </div>

              {editingField === "info" && (
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium">Tên quán:</span>
                    <input
                      type="text"
                      value={profile.BarName}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, BarName: e.target.value }))
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium">Địa chỉ:</span>
                    <input
                      type="text"
                      value={profile.Address}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, Address: e.target.value }))
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium">Điện thoại:</span>
                    <input
                      type="text"
                      value={profile.PhoneNumber}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, PhoneNumber: e.target.value }))
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium">Email:</span>
                    <input
                      type="email"
                      value={profile.Email}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, Email: e.target.value }))
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    />
                  </label>
                </div>
              )}

              {/* --- Nút Lưu / Hủy --- */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={handleCloseEdit}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    // TODO: gọi API update
                    alert("Đã lưu thay đổi!");
                    handleCloseEdit();
                  }}
                  className="px-4 py-2 bg-[#a78bfa] text-white rounded-lg hover:bg-[#8b5cf6]"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
