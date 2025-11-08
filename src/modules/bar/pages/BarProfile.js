import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import barPageApi from "../../../api/barPageApi";
import { locationApi } from "../../../api/locationApi";
import AddressSelector from "../../../components/common/AddressSelector";
import PostFeed from "../../feeds/components/PostFeed";
import BarEvent from "../components/BarEvent";
import BarMenu from "../components/BarMenuCombo";
import BarFollowInfo from "../components/BarFollowInfo";
import BarVideo from "../components/BarVideo";
import BarReview from "../components/BarReview";
import BarTables from "../components/BarTables";
import TableClassificationManager from "./TableClassificationManager";
import FollowButton from "../../../components/common/FollowButton";
import { useFollowers, useFollowing } from "../../../hooks/useFollow";
import messageApi from "../../../api/messageApi";
import publicProfileApi from "../../../api/publicProfileApi";
import { userApi } from "../../../api/userApi";
import "../../../styles/modules/publicProfile.css";

export default function BarProfile() {
  const { t } = useTranslation();
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
  const [currentUserEntityId, setCurrentUserEntityId] = useState(null);

  // Location states
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  
  // Get current user entity ID for followers/following and chat
  // When at bar, must use EntityAccountId of the bar, not Account EntityAccountId
  useEffect(() => {
    const resolveCurrentUserEntityId = async () => {
      try {
        const sessionRaw = localStorage.getItem("session");
        if (!sessionRaw) return;
        const session = JSON.parse(sessionRaw);
        const active = session?.activeEntity || {};
        const entities = session?.entities || [];
        
        // Priority: EntityAccountId from activeEntity > EntityAccountId from matching entity in entities list > fetch from API
        let resolvedId =
          active.EntityAccountId ||
          active.entityAccountId ||
          null;
        
        // If not found in activeEntity, try to find in entities list
        if (!resolvedId && active.id && active.type) {
          const foundEntity = entities.find(
            e => String(e.id) === String(active.id) && 
                 (e.type === active.type || 
                  (e.type === "BusinessAccount" && active.type === "Business"))
          );
          resolvedId = foundEntity?.EntityAccountId || foundEntity?.entityAccountId || null;
        }
        
        // If still not found and we have active.id, try to fetch EntityAccountId from API
        if (!resolvedId && active.id && active.type && session?.account?.id) {
          try {
            // For BarPage, try to get EntityAccountId from entities API
            if (active.type === "BarPage" || active.type === "Business") {
              const entitiesRes = await userApi.getEntities(session.account.id);
              const refreshedEntities = entitiesRes?.data?.data || entitiesRes?.data || [];
              const foundEntity = refreshedEntities.find(
                e => String(e.id) === String(active.id) && 
                     (e.type === active.type || 
                      (e.type === "BusinessAccount" && active.type === "Business"))
              );
              resolvedId = foundEntity?.EntityAccountId || foundEntity?.entityAccountId || null;
              
              // Update session with refreshed entities if found
              if (resolvedId && refreshedEntities.length > 0) {
                session.entities = refreshedEntities;
                localStorage.setItem("session", JSON.stringify(session));
              }
            }
          } catch (err) {
            console.warn("[BarProfile] Failed to fetch EntityAccountId:", err);
          }
        }
        
        // Final fallback: use active.id only if it looks like a UUID (EntityAccountId format)
        // Don't use BarPageId as EntityAccountId
        if (!resolvedId && active.id && /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(active.id)) {
          resolvedId = active.id;
        }
        
        console.log("[BarProfile] Resolved currentUserEntityId:", resolvedId, "from activeEntity:", active);
        setCurrentUserEntityId(resolvedId || null);
      } catch (err) {
        console.error("[BarProfile] Error resolving currentUserEntityId:", err);
      }
    };
    
    resolveCurrentUserEntityId();
  }, []);
  
  const { followers, fetchFollowers } = useFollowers(profile?.AccountId);
  const { following, fetchFollowing } = useFollowing(profile?.AccountId);
  
  useEffect(() => {
    if (profile?.AccountId) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [profile?.AccountId, fetchFollowers, fetchFollowing]);

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

  // Check if this is own profile: compare barPageId (from URL) with activeEntity.id (BarPageId of current role)
  // or compare EntityAccountId of current role with profile.EntityAccountId
  const [activeBarPageId, setActiveBarPageId] = useState(null);
  useEffect(() => {
    try {
      const sessionRaw = localStorage.getItem("session");
      if (!sessionRaw) return;
      const session = JSON.parse(sessionRaw);
      const active = session?.activeEntity || {};
      // If active entity is BarPage, use its id (which is BarPageId)
      if (active.type === "BarPage") {
        setActiveBarPageId(active.id);
      }
    } catch {}
  }, []);

  if (loading) return <div className="pp-container">{t('profile.loadingProfile')}</div>;
  if (error) return <div className="pp-container">{error}</div>;
  const renderTabContent = () => {
    switch (activeTab) {
      case "info":
        return (
          <div className="flex flex-col gap-6">
            <div className="profile-section">
              <BarEvent barPageId={barPageId} />
            </div>
            <div className="profile-section">
              <BarMenu barPageId={barPageId} />
            </div>
          </div>
        );
      case "posts":
        return (
          <div className="flex flex-col gap-6">
            <PostFeed />
          </div>
        );
      case "videos":
        return (
          <div className="profile-section">
            <BarVideo barPageId={barPageId} />
          </div>
        );
      case "reviews":
        return (
          <div className="profile-section">
            <BarReview barPageId={barPageId} />
          </div>
        );
      case "tables":
        return (
          <div className="profile-section">
            <BarTables barPageId={barPageId} />
          </div>
        );
      case "table-types":
        return (
          <div className="profile-section">
            <TableClassificationManager onTableTypesChange={() => {
              barPageApi.getTableTypes(barPageId)
                .then(res => setTableTypes(res.data || []))
                .catch(err => console.error("❌ Lỗi refresh loại bàn:", err));
            }} />
          </div>
        );
      default:
        return null;
    }
  };

  const contactList = [
    profile.Address && `${t('profile.address')}: ${profile.Address}`,
    profile.PhoneNumber && `${t('profile.phone')}: ${profile.PhoneNumber}`,
    profile.Email && `${t('profile.email')}: ${profile.Email}`,
  ].filter(Boolean);
  
  const isOwnProfile = activeBarPageId && String(activeBarPageId).toLowerCase() === String(barPageId).toLowerCase();

  return (
    <div className="pp-container">
      <section
        className="pp-cover"
        style={{
          backgroundImage: `url(${profile.Background || "https://i.imgur.com/6IUbEMn.jpg"})`,
        }}
      >
        <div className="pp-header">
          <img
            src={profile.Avatar || "https://via.placeholder.com/120"}
            alt={profile.BarName}
            className="pp-avatar"
          />
          <div>
            <h2 className="pp-title">{profile.BarName || t('profile.barName')}</h2>
            <div className="pp-type">BAR</div>
          </div>
        </div>
        <div className="pp-follow">
          {!isOwnProfile && (
            <>
              <button
                className="pp-chat-button"
                onClick={async () => {
                  try {
                    if (!currentUserEntityId) {
                      console.error("[BarProfile] Cannot open chat: currentUserEntityId is null");
                      return;
                    }
                    
                    // Get EntityAccountId of the bar page (not AccountId)
                    // Priority: profile.EntityAccountId > fetch from API using barPageId
                    let barEntityId = profile.EntityAccountId || null;
                    
                    // If not found, try to fetch from API
                    if (!barEntityId && barPageId) {
                      try {
                        // Try to get EntityAccountId from publicProfileApi
                        const profileRes = await publicProfileApi.getByEntityId(barPageId);
                        barEntityId = profileRes?.data?.data?.entityId || profileRes?.data?.entityId || null;
                      } catch (err) {
                        // If 404, try to find in session entities
                        if (err?.response?.status === 404) {
                          try {
                            const sessionRaw = localStorage.getItem("session");
                            if (sessionRaw) {
                              const session = JSON.parse(sessionRaw);
                              const entities = session?.entities || [];
                              const foundEntity = entities.find(
                                e => String(e.id) === String(barPageId) && e.type === "BarPage"
                              );
                              barEntityId = foundEntity?.EntityAccountId || foundEntity?.entityAccountId || null;
                            }
                          } catch (sessionErr) {
                            console.warn("[BarProfile] Error checking session entities:", sessionErr);
                          }
                        }
                      }
                    }
                    
                    // Final fallback: use barPageId if it looks like EntityAccountId (UUID format)
                    if (!barEntityId && barPageId && /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(barPageId)) {
                      barEntityId = barPageId;
                    }
                    
                    if (!barEntityId) {
                      console.error("[BarProfile] Cannot open chat: barEntityId is null");
                      return;
                    }
                    
                    console.log("[BarProfile] Creating conversation:", { currentUserEntityId, barEntityId });
                    const res = await messageApi.createOrGetConversation(currentUserEntityId, barEntityId);
                    const conversation = res?.data?.data || res?.data;
                    const conversationId = conversation?._id || conversation?.conversationId || conversation?.id;
                    if (conversationId && window.__openChat) {
                      window.__openChat({
                        id: conversationId,
                        name: profile.BarName || "Bar",
                        avatar: profile.Avatar || null, // Pass avatar for BarPage
                        entityId: barEntityId // Pass EntityAccountId for profile navigation
                      });
                    }
                  } catch (error) {
                    console.error("[BarProfile] Error opening chat:", error);
                  }
                }}
              >
                <i className="bx bx-message-rounded"></i>
                Chat
              </button>
              <FollowButton
                followingId={profile?.AccountId}
                followingType="BAR"
              />
            </>
          )}
          {isOwnProfile && (
            <button onClick={handleEditClick} className="pp-chat-button">
              <i className="bx bx-edit"></i>
              {t('profile.editProfile')}
            </button>
          )}
        </div>
      </section>

      <section className="pp-stats">
        <div>
          <div className="pp-stat-label">{t('publicProfile.followers')}</div>
          <div className="pp-stat-value">{followers.length}</div>
        </div>
        <div>
          <div className="pp-stat-label">{t('publicProfile.following')}</div>
          <div className="pp-stat-value">{following.length}</div>
        </div>
      </section>

      <section className="pp-section">
        {profile.Bio && (
          <div>
            <h3>{t("publicProfile.about")}</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{profile.Bio}</p>
          </div>
        )}
        <div style={{ marginTop: profile.Bio ? 12 : 0 }}>
          <h4>{t("publicProfile.contact")}</h4>
          {profile.Email && <div>{t("common.email")}: {profile.Email}</div>}
          {profile.PhoneNumber && <div>{t("common.phone") || "Phone"}: {profile.PhoneNumber}</div>}
          {profile.Address && <div>{t("common.address") || "Address"}: {profile.Address}</div>}
        </div>
      </section>

      {isOwnProfile && (
        <section style={{ padding: '0 24px 24px 24px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab("info")}
              style={{
                padding: '8px 16px',
                background: activeTab === "info" ? '#364150' : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              {t('profile.infoTab')}
            </button>
            <button
              onClick={() => setActiveTab("posts")}
              disabled={tableTypes.length === 0}
              style={{
                padding: '8px 16px',
                background: activeTab === "posts" ? '#364150' : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#ffffff',
                cursor: 'pointer',
                opacity: tableTypes.length === 0 ? 0.5 : 1
              }}
            >
              {t('profile.postsTab')}
            </button>
            <button
              onClick={() => setActiveTab("videos")}
              disabled={tableTypes.length === 0}
              style={{
                padding: '8px 16px',
                background: activeTab === "videos" ? '#364150' : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#ffffff',
                cursor: 'pointer',
                opacity: tableTypes.length === 0 ? 0.5 : 1
              }}
            >
              {t('tabs.video')}
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              disabled={tableTypes.length === 0}
              style={{
                padding: '8px 16px',
                background: activeTab === "reviews" ? '#364150' : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#ffffff',
                cursor: 'pointer',
                opacity: tableTypes.length === 0 ? 0.5 : 1
              }}
            >
              {t('tabs.reviews')}
            </button>
            <button
              onClick={() => setActiveTab("table-types")}
              style={{
                padding: '8px 16px',
                background: activeTab === "table-types" ? '#364150' : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              {t('tabs.tableTypes')}
            </button>
            <button
              onClick={() => setActiveTab("tables")}
              disabled={tableTypes.length === 0}
              style={{
                padding: '8px 16px',
                background: activeTab === "tables" ? '#364150' : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#ffffff',
                cursor: 'pointer',
                opacity: tableTypes.length === 0 ? 0.5 : 1
              }}
            >
              {t('tabs.editTables')}
            </button>
          </div>
          {renderTabContent()}
        </section>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-semibold mb-5 text-center">{t('profile.editBar')}</h3>

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
                  {editingField === "avatar" ? t('profile.close') : t('profile.editProfile')}
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
                  {editingField === "background" ? t('profile.close') : t('profile.editProfile')}
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
                  <p className="font-medium text-lg">{t('profile.bio')}</p>
                  <p className="text-sm text-gray-500">
                    {profile.Bio || "Chưa có tiểu sử"}
                  </p>
                </div>
                <button
                  onClick={() => setEditingField(editingField === "bio" ? null : "bio")}
                  className="text-[#a78bfa] hover:text-[#8b5cf6] font-medium"
                >
                  {editingField === "bio" ? t('profile.close') : t('profile.editProfile')}
                </button>
              </div>
              {editingField === "bio" && (
                <div className="mt-3">
                  <textarea
                    rows={3}
                    placeholder={t('input.caption')}
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
                  <p className="font-medium text-lg mb-1">{t('profile.about')}</p>
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
                    <span className="text-sm font-medium">{t('profile.barName')}:</span>
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
                    <span className="text-sm font-medium block mb-2">{t('profile.address')}:</span>
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
                    <span className="text-sm font-medium">{t('profile.phone')}:</span>
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
                    <span className="text-sm font-medium">{t('profile.email')}:</span>
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
                  {t('profile.close')}
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
                  {saving ? t('profile.saving') : t('profile.saveChanges')}
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
