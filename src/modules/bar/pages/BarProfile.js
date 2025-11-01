import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import barPageApi from "../../../api/barPageApi";
import { locationApi } from "../../../api/locationApi";
import AddressSelector from "../../../components/common/AddressSelector";
import PostCreate from "../../../components/layout/common/PostCreate";
import PostList from "../../../components/layout/common/PostList";
import BarEvent from "../components/BarEvent";
import BarMenu from "../components/BarMenuCombo";
import BarFollowInfo from "../components/BarFollowInfo";
import BarVideo from "../components/BarVideo";
import BarReview from "../components/BarReview";
import BarTables from "../components/BarTables";
import TableClassificationManager from "./TableClassificationManager";

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
  const [showEditModal, setShowEditModal] = useState(false);
  const handleEditClick = () => setShowEditModal(true);
  const handleCloseEdit = () => setShowEditModal(false);
  const [editingField, setEditingField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tableTypes, setTableTypes] = useState([]); // 🟢 Track table types for disable logic
  
  // Location states
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [addressDetail, setAddressDetail] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      console.log("👉 useParams barPageId:", barPageId);
      try {
        const res = await barPageApi.getBarPageById(barPageId);
        console.log("✅ API Response getBarPageById:", res);
        if (res.status === "success" && res.data) {
          setProfile(res.data);
          
          // Load structured address data if available
          if (res.data.addressData) {
            if (res.data.addressData.provinceId) {
              setSelectedProvinceId(res.data.addressData.provinceId);
              const districtsData = await locationApi.getDistricts(res.data.addressData.provinceId);
              
              if (res.data.addressData.districtId) {
                setSelectedDistrictId(res.data.addressData.districtId);
                const wardsData = await locationApi.getWards(res.data.addressData.districtId);
                
                if (res.data.addressData.wardId) {
                  setSelectedWardId(res.data.addressData.wardId);
                }
              }
            }
            // Extract address detail
            if (res.data.Address && res.data.addressData) {
              const fullAddr = res.data.Address;
              const parts = fullAddr.split(', ');
              if (parts.length > 3) {
                setAddressDetail(parts.slice(0, -3).join(', '));
              }
            }
          }
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
    
    const fetchTableTypes = async () => {
      try {
        const res = await barPageApi.getTableTypes(barPageId);
        setTableTypes(res.data || []);
      } catch (err) {
        console.error("❌ Lỗi tải loại bàn:", err);
        setTableTypes([]);
      }
    };
    
    fetchProfile();
    fetchTableTypes();
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
      case "table-types":
        return <TableClassificationManager onTableTypesChange={() => {
          // Refresh table types when they are updated
          barPageApi.getTableTypes(barPageId)
            .then(res => setTableTypes(res.data || []))
            .catch(err => console.error("❌ Lỗi refresh loại bàn:", err));
        }} />;
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
        <button
          className={activeTab === "info" ? "active" : ""}
          onClick={() => setActiveTab("info")}
        >
          Thông tin
        </button>
        <button
          className={activeTab === "posts" ? "active" : ""}
          onClick={() => setActiveTab("posts")}
          disabled={tableTypes.length === 0}
          style={{ opacity: tableTypes.length === 0 ? 0.5 : 1, cursor: tableTypes.length === 0 ? "not-allowed" : "pointer" }}
          title={tableTypes.length === 0 ? "Vui lòng thêm loại bàn trước" : ""}
        >
          Bài viết
        </button>
        <button
          className={activeTab === "videos" ? "active" : ""}
          onClick={() => setActiveTab("videos")}
          disabled={tableTypes.length === 0}
          style={{ opacity: tableTypes.length === 0 ? 0.5 : 1, cursor: tableTypes.length === 0 ? "not-allowed" : "pointer" }}
          title={tableTypes.length === 0 ? "Vui lòng thêm loại bàn trước" : ""}
        >
          Video
        </button>
        <button
          className={activeTab === "reviews" ? "active" : ""}
          onClick={() => setActiveTab("reviews")}
          disabled={tableTypes.length === 0}
          style={{ opacity: tableTypes.length === 0 ? 0.5 : 1, cursor: tableTypes.length === 0 ? "not-allowed" : "pointer" }}
          title={tableTypes.length === 0 ? "Vui lòng thêm loại bàn trước" : ""}
        >
          Đánh giá
        </button>
        <button 
          className={activeTab === "table-types" ? "active" : ""} 
          onClick={() => setActiveTab("table-types")}
        >
          Loại bàn
        </button>
        <button 
          className={activeTab === "tables" ? "active" : ""} 
          onClick={() => setActiveTab("tables")}
          disabled={tableTypes.length === 0}
          style={{ opacity: tableTypes.length === 0 ? 0.5 : 1, cursor: tableTypes.length === 0 ? "not-allowed" : "pointer" }}
          title={tableTypes.length === 0 ? "Vui lòng thêm loại bàn trước" : ""}
        >
          Chỉnh sửa bàn
        </button>
      </div>


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

                  <div>
                    <span className="text-sm font-medium block mb-2">Địa chỉ:</span>
                    <AddressSelector
                      selectedProvinceId={selectedProvinceId}
                      selectedDistrictId={selectedDistrictId}
                      selectedWardId={selectedWardId}
                      addressDetail={addressDetail}
                      onProvinceChange={(id) => {
                        setSelectedProvinceId(id);
                        setSelectedDistrictId('');
                        setSelectedWardId('');
                      }}
                      onDistrictChange={(id) => {
                        setSelectedDistrictId(id);
                        setSelectedWardId('');
                      }}
                      onWardChange={setSelectedWardId}
                      onAddressDetailChange={setAddressDetail}
                      onAddressChange={(fullAddr) => {
                        setProfile(prev => ({ ...prev, Address: fullAddr }));
                      }}
                    />
                  </div>

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
                  onClick={async () => {
                    try {
                      setSaving(true);
                      
                      // Build FormData
                      const formData = new FormData();
                      formData.append('barPageId', barPageId);
                      formData.append('barName', profile.BarName || '');
                      formData.append('phoneNumber', profile.PhoneNumber || '');
                      formData.append('email', profile.Email || '');
                      
                      // Build address
                      let fullAddress = profile.Address || '';
                      
                      // Send structured address data
                      if (selectedProvinceId || selectedDistrictId || selectedWardId) {
                        formData.append('addressData', JSON.stringify({
                          provinceId: selectedProvinceId,
                          districtId: selectedDistrictId,
                          wardId: selectedWardId,
                          fullAddress: fullAddress,
                          detail: addressDetail
                        }));
                        formData.append('address', fullAddress);
                      } else {
                        formData.append('address', profile.Address || '');
                      }
                      
                      // Send avatar and background URLs
                      if (profile.Avatar) formData.append('avatar', profile.Avatar);
                      if (profile.Background) formData.append('background', profile.Background);
                      
                      const res = await barPageApi.upload(formData);
                      
                      if (res.status === "success") {
                        setProfile(res.data);
                        alert("Đã lưu thay đổi!");
                        handleCloseEdit();
                      } else {
                        alert("Lưu thất bại: " + (res.message || "Lỗi không xác định"));
                      }
                    } catch (error) {
                      console.error("Error saving bar profile:", error);
                      alert("Lưu thất bại: " + (error.response?.data?.message || error.message));
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="px-4 py-2 bg-[#a78bfa] text-white rounded-lg hover:bg-[#8b5cf6] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* --- MAIN CONTENT --- */}
      {renderTabContent()}
    </div>
  );
}
