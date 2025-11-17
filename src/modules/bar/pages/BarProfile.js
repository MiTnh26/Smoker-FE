import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import barPageApi from "../../../api/barPageApi";
import { locationApi } from "../../../api/locationApi";
import AddressSelector from "../../../components/common/AddressSelector";
import PostCard from "../../feeds/components/post/PostCard";
import { getPostsByAuthor } from "../../../api/postApi";
import BarEvent from "../components/BarEvent";
import BarMenu from "../components/BarMenuCombo";
import BarFollowInfo from "../components/BarFollowInfo";
import BarVideo from "../components/BarVideo";
import BarReview from "../components/BarReview";
import BarTables from "../components/BarTables";
import FollowButton from "../../../components/common/FollowButton";
import { useFollowers, useFollowing } from "../../../hooks/useFollow";
import messageApi from "../../../api/messageApi";
import publicProfileApi from "../../../api/publicProfileApi";
import { userApi } from "../../../api/userApi";
import { cn } from "../../../utils/cn";
import ReportEntityModal from "../../feeds/components/modals/ReportEntityModal";
import { mapPostForCard } from "../../../utils/postTransformers";
import { useProfilePosts } from "../../../hooks/useProfilePosts";
import { useCurrentUserEntity } from "../../../hooks/useCurrentUserEntity";
import { ProfileHeader } from "../../../components/profile/ProfileHeader";
import { ProfileStats } from "../../../components/profile/ProfileStats";
import { ImageUploadField } from "../../../components/profile/ImageUploadField";
import BannedAccountOverlay from "../../../components/common/BannedAccountOverlay";

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
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const menuRef = useRef(null);
  // Location states
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  
  // Upload states - track separately for avatar and background
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  
  // Get current user entity ID using shared hook
  const currentUserEntityId = useCurrentUserEntity();
  
  // Use EntityAccountId or barPageId (will be normalized by backend)
  const followEntityId = profile?.EntityAccountId || profile?.entityAccountId || barPageId;
  const { followers, fetchFollowers } = useFollowers(followEntityId);
  const { following, fetchFollowing } = useFollowing(followEntityId);
  
  // Use shared hook for posts
  const entityIdForPosts = profile?.EntityAccountId || barPageId;
  const { posts: barPosts, loading: postsLoading } = useProfilePosts(entityIdForPosts);
  
  useEffect(() => {
    if (followEntityId) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [followEntityId, fetchFollowers, fetchFollowing]);

  useEffect(() => {
    const fetchProfile = async () => {
      console.log("👉 useParams barPageId:", barPageId);
      try {
        // Guard invalid id to avoid backend 500
        const isGuid = typeof barPageId === "string" && /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(barPageId);
        if (!barPageId || !isGuid) {
          setLoading(false);
          return;
        }
        const res = await barPageApi.getBarPageById(barPageId);
        console.log("✅ API Response getBarPageById:", res);
        if (res.status === "success" && res.data) {
          setProfile(res.data);
          setProfileStatus((res.data.Status || res.data.status || "").toLowerCase());

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
        // Guard invalid id to avoid backend 500
        const isGuid = typeof barPageId === "string" && /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(barPageId);
        if (!barPageId || !isGuid) {
          setTableTypes([]);
          return;
        }
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

  useEffect(() => {
    if (!actionMenuOpen) return;
    const handleOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [actionMenuOpen]);

  if (loading) {
    return (
      <div className={cn("min-h-screen bg-background flex items-center justify-center")}>
        <div className={cn("text-muted-foreground")}>{t('profile.loadingProfile')}</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={cn("min-h-screen bg-background flex items-center justify-center")}>
        <div className={cn("text-danger")}>{error}</div>
      </div>
    );
  }

  const isPending = profileStatus === "pending";
  if (isPending) {
    return (
      <div className={cn("min-h-screen bg-background flex items-center justify-center px-4")}>
        <div className={cn("max-w-xl text-center bg-card border border-border/30 rounded-2xl p-8 shadow-sm")}>
          <h2 className="text-2xl font-semibold mb-3">{t('profile.pendingTitle', { defaultValue: "Hồ sơ đang chờ duyệt" })}</h2>
          <p className="text-muted-foreground mb-4">
            {t('profile.pendingDescriptionBar', {
              defaultValue: "Trang Bar của bạn đang được quản trị viên xem xét. Tất cả tính năng sẽ hoạt động trở lại sau khi được phê duyệt."
            })}
          </p>
          <p className="text-sm text-muted-foreground">{t('profile.contactSupport', { defaultValue: "Liên hệ đội ngũ hỗ trợ nếu bạn cần được trợ giúp nhanh hơn." })}</p>
        </div>
      </div>
    );
  }
  const isBanned = profileStatus === "banned";
  const renderTabContent = () => {
    switch (activeTab) {
      case "info":
        return (
          <div className={cn("flex flex-col gap-6")}>
            <BarEvent barPageId={barPageId} />
            <div className={cn("bg-card rounded-lg p-6 border-[0.5px] border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]")}>
              <BarMenu barPageId={barPageId} />
            </div>
          </div>
        );
      case "posts":
        return (
          <div className="flex flex-col gap-6">
            {postsLoading ? (
              <div className={cn("text-center py-12 text-muted-foreground")}>
                {t('common.loading')}
              </div>
            ) : barPosts && barPosts.length > 0 ? (
              <div className={cn("space-y-4")}>
                {barPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                  />
                ))}
              </div>
            ) : (
              <div className={cn(
                "text-center py-12 text-muted-foreground",
                "bg-card rounded-lg border-[0.5px] border-border/20 p-8"
              )}>
                {t("publicProfile.noPosts")}
              </div>
            )}
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
      default:
        return null;
    }
  };

  const contactList = [
    profile.Address && `${t('profile.address')}: ${profile.Address}`,
    profile.PhoneNumber && `${t('profile.phone')}: ${profile.PhoneNumber}`,
    profile.Email && `${t('profile.email')}: ${profile.Email}`,
  ].filter(Boolean);

  const handleBlock = () => {
    setActionMenuOpen(false);
    const confirmed = window.confirm(
      t("publicProfile.blockConfirm", { name: profile.BarName || t("publicProfile.thisUser") })
    );
    if (!confirmed) return;
    try {
      const blockedRaw = localStorage.getItem("blockedEntities");
      const blocked = blockedRaw ? JSON.parse(blockedRaw) : [];
      if (!blocked.includes(barPageId)) {
        blocked.push(barPageId);
        localStorage.setItem("blockedEntities", JSON.stringify(blocked));
      }
      alert(t("publicProfile.blockSuccess"));
    } catch (err) {
      console.error("[BarProfile] Failed to persist block list:", err);
      alert(t("publicProfile.blockError"));
    }
  };
  
  const isOwnProfile = activeBarPageId && String(activeBarPageId).toLowerCase() === String(barPageId).toLowerCase();

  const handleUploadStateChange = (fieldKey, uploading) => {
    if (fieldKey === "Avatar" || fieldKey === "avatar") {
      setUploadingAvatar(uploading);
    } else if (fieldKey === "Background" || fieldKey === "background") {
      setUploadingBackground(uploading);
    }
  };

  return (
    <>
      <div className={cn("min-h-screen bg-background", isBanned && "opacity-30 pointer-events-none")}>
      <ProfileHeader
        background={profile.Background}
        avatar={profile.Avatar}
        name={profile.BarName}
        role="BAR"
      >
        {!isOwnProfile && (
          <>
            <button
              onClick={async () => {
                try {
                  if (!currentUserEntityId) {
                    console.error("[BarProfile] Cannot open chat: currentUserEntityId is null");
                    return;
                  }
                  
                  let barEntityId = profile.EntityAccountId || null;
                  
                  if (!barEntityId && barPageId) {
                    try {
                      const profileRes = await publicProfileApi.getByEntityId(barPageId);
                      barEntityId = profileRes?.data?.data?.entityId || profileRes?.data?.entityId || null;
                    } catch (err) {
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
                  
                  if (!barEntityId && barPageId && /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(barPageId)) {
                    barEntityId = barPageId;
                  }
                  
                  if (!barEntityId) {
                    console.error("[BarProfile] Cannot open chat: barEntityId is null");
                    return;
                  }
                  
                  const res = await messageApi.createOrGetConversation(currentUserEntityId, barEntityId);
                  const conversation = res?.data?.data || res?.data;
                  const conversationId = conversation?._id || conversation?.conversationId || conversation?.id;
                  if (conversationId && window.__openChat) {
                    window.__openChat({
                      id: conversationId,
                      name: profile.BarName || "Bar",
                      avatar: profile.Avatar || null,
                      entityId: barEntityId
                    });
                  }
                } catch (error) {
                  console.error("[BarProfile] Error opening chat:", error);
                }
              }}
              className={cn(
                "px-4 py-2 rounded-lg font-semibold text-sm",
                "bg-card/80 backdrop-blur-sm text-foreground border-none",
                "hover:bg-card/90 transition-all duration-200",
                "active:scale-95",
                "flex items-center gap-2"
              )}
            >
              <i className="bx bx-message-rounded text-base"></i>
              Chat
            </button>
            <FollowButton
              followingId={profile?.EntityAccountId || profile?.entityAccountId || barPageId}
              followingType="BAR"
            />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setActionMenuOpen((prev) => !prev)}
                className={cn(
                  "w-10 h-10 rounded-full border border-border/40 text-foreground/80",
                  "bg-card/70 backdrop-blur-sm flex items-center justify-center",
                  "hover:bg-card/90 transition-all duration-200 active:scale-95"
                )}
                aria-haspopup="true"
                aria-expanded={actionMenuOpen}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              {actionMenuOpen && (
                <div
                  className={cn(
                    "absolute right-0 mt-2 w-48 rounded-lg border border-border/30",
                    "bg-card/95 backdrop-blur-sm text-foreground shadow-[0_10px_30px_rgba(0,0,0,0.25)]",
                    "overflow-hidden z-20"
                  )}
                  role="menu"
                >
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm",
                      "hover:bg-danger/10 hover:text-danger transition-all duration-150"
                    )}
                    onClick={() => {
                      setActionMenuOpen(false);
                      setReportModalOpen(true);
                    }}
                  >
                    {t("publicProfile.reportProfile")}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm",
                      "hover:bg-muted/40 transition-all duration-150"
                    )}
                    onClick={handleBlock}
                  >
                    {t("publicProfile.blockProfile")}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        {isOwnProfile && (
          <button
            onClick={handleEditClick}
            className={cn(
              "px-4 py-2 rounded-lg font-semibold text-sm",
              "bg-card/80 backdrop-blur-sm text-foreground border-none",
              "hover:bg-card/90 transition-all duration-200",
              "active:scale-95",
              "flex items-center gap-2"
            )}
          >
            <i className="bx bx-edit text-base"></i>
            {t('profile.editProfile')}
          </button>
        )}
      </ProfileHeader>

      {/* Main Content Container */}
      <div className={cn("max-w-6xl mx-auto px-4 md:px-6 py-6")}>
        <ProfileStats followers={followers} following={following} />

        {/* Bio & Info Section */}
        {(profile.Bio || profile.Email || profile.PhoneNumber || profile.Address) && (
          <section className={cn(
            "py-6 border-b border-border/30",
            "bg-card rounded-lg p-6 mb-6",
            "border-[0.5px] border-border/20",
            "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          )}>
            {profile.Bio && (
              <div className={cn("mb-4")}>
                <h3 className={cn("text-lg font-semibold text-foreground mb-2")}>
                  {t("publicProfile.about")}
                </h3>
                <p className={cn("text-foreground whitespace-pre-wrap leading-relaxed")}>
                  {profile.Bio}
                </p>
              </div>
            )}
            {(profile.Email || profile.PhoneNumber || profile.Address) && (
              <div className={cn("mt-4 pt-4 border-t border-border/30")}>
                <h4 className={cn("text-base font-semibold text-foreground mb-3")}>
                  {t("publicProfile.contact")}
                </h4>
                <div className={cn("space-y-2 text-sm text-muted-foreground")}>
                  {profile.Email && (
                    <div className={cn("flex items-center gap-2")}>
                      <i className="bx bx-envelope text-base"></i>
                      <span>{t("common.email")}: {profile.Email}</span>
                    </div>
                  )}
                  {profile.PhoneNumber && (
                    <div className={cn("flex items-center gap-2")}>
                      <i className="bx bx-phone text-base"></i>
                      <span>{t("common.phone") || "Phone"}: {profile.PhoneNumber}</span>
                    </div>
                  )}
                  {profile.Address && (
                    <div className={cn("flex items-center gap-2")}>
                      <i className="bx bx-map text-base"></i>
                      <span>{t("common.address") || "Address"}: {profile.Address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Tabs Section - Only for Own Profile */}
        {isOwnProfile && (
          <section className={cn("py-6")}>
            {/* Tabs Navigation */}
            <div className={cn("flex items-center gap-1 mb-6 border-b border-border/30 overflow-x-auto")}>
              <button
                onClick={() => setActiveTab("info")}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                  "transition-all duration-200 relative whitespace-nowrap",
                  activeTab === "info"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t('profile.infoTab')}
                {activeTab === "info" && (
                  <span className={cn(
                    "absolute bottom-0 left-0 right-0 h-0.5",
                    "bg-primary"
                  )} />
                )}
              </button>
              <button
                onClick={() => setActiveTab("posts")}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                  "transition-all duration-200 relative whitespace-nowrap",
                  activeTab === "posts"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t('profile.postsTab')}
                {activeTab === "posts" && (
                  <span className={cn(
                    "absolute bottom-0 left-0 right-0 h-0.5",
                    "bg-primary"
                  )} />
                )}
              </button>
              <button
                onClick={() => setActiveTab("videos")}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                  "transition-all duration-200 relative whitespace-nowrap",
                  activeTab === "videos"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t('tabs.video')}
                {activeTab === "videos" && (
                  <span className={cn(
                    "absolute bottom-0 left-0 right-0 h-0.5",
                    "bg-primary"
                  )} />
                )}
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                  "transition-all duration-200 relative whitespace-nowrap",
                  activeTab === "reviews"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t('tabs.reviews')}
                {activeTab === "reviews" && (
                  <span className={cn(
                    "absolute bottom-0 left-0 right-0 h-0.5",
                    "bg-primary"
                  )} />
                )}
              </button>
              <button
                onClick={() => setActiveTab("tables")}
                disabled={tableTypes.length === 0}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                  "transition-all duration-200 relative whitespace-nowrap",
                  activeTab === "tables"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  tableTypes.length === 0 && "opacity-50 cursor-not-allowed"
                )}
              >
                {t('tabs.editTables')}
                {activeTab === "tables" && (
                  <span className={cn(
                    "absolute bottom-0 left-0 right-0 h-0.5",
                    "bg-primary"
                  )} />
                )}
              </button>
            </div>
            
            {/* Tab Content */}
            <div className={cn("mt-6")}>
              {renderTabContent()}
            </div>
          </section>
        )}
      </div>
      </div>

      {showEditModal && (
        <div className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm",
          "flex items-center justify-center z-50 p-4"
        )}>
          <div className={cn(
            "bg-card text-card-foreground rounded-lg",
            "border-[0.5px] border-border/20",
            "shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
            "w-full max-w-2xl max-h-[90vh] overflow-y-auto",
            "flex flex-col"
          )}>
            {/* Header */}
            <div className={cn(
              "p-4 border-b border-border/30",
              "flex items-center justify-between flex-shrink-0"
            )}>
              <h3 className={cn("text-xl font-semibold text-foreground")}>
                {t('profile.editBar')}
              </h3>
              <button
                onClick={handleCloseEdit}
                className={cn(
                  "w-8 h-8 flex items-center justify-center",
                  "bg-transparent border-none text-muted-foreground",
                  "rounded-lg transition-all duration-200",
                  "hover:bg-muted/50 hover:text-foreground",
                  "active:scale-95"
                )}
              >
                <i className="bx bx-x text-xl"></i>
              </button>
            </div>

            {/* Content */}
            <div className={cn("p-6 flex-1 overflow-y-auto")}>
              <div className={cn("space-y-6")}>
                {/* --- Ảnh đại diện --- */}
                <div className={cn("flex justify-between items-center border-b border-border/30 pb-4")}>
                  <div className={cn("flex items-center gap-4")}>
                    <div className={cn("relative")}>
                      <img
                        src={profile.Avatar || "https://via.placeholder.com/100"}
                        alt="Avatar"
                        className={cn(
                          "w-20 h-20 rounded-full object-cover",
                          "border-2 border-border/20"
                        )}
                      />
                    </div>
                    <div>
                      <p className={cn("font-semibold text-base text-foreground")}>
                        Ảnh đại diện
                      </p>
                      <p className={cn("text-sm text-muted-foreground")}>
                        Hiển thị cho người dùng
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingField(editingField === "avatar" ? null : "avatar")}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium text-sm",
                      "bg-transparent border-none text-primary",
                      "hover:bg-primary/10 transition-all duration-200",
                      "active:scale-95"
                    )}
                  >
                    {editingField === "avatar" ? t('profile.close') : t('profile.editProfile')}
                  </button>
                </div>
                {editingField === "avatar" && (
                  <div className={cn("mt-4")}>
                    <ImageUploadField
                      label="Ảnh đại diện"
                      value={profile.Avatar}
                      onChange={(url) => setProfile((prev) => ({ ...prev, Avatar: url }))}
                      uploadMode={true}
                      urlInput={true}
                      uploading={uploadingAvatar}
                      onUploadStateChange={(uploading) => setUploadingAvatar(uploading)}
                    />
                  </div>
                )}

                {/* --- Ảnh nền --- */}
                <div className={cn("flex justify-between items-center border-b border-border/30 pb-4")}>
                  <div className={cn("flex items-center gap-4")}>
                    <div className={cn("relative")}>
                      <img
                        src={profile.Background || "https://i.imgur.com/6IUbEMn.jpg"}
                        alt="Background"
                        className={cn(
                          "w-24 h-16 rounded-lg object-cover",
                          "border-2 border-border/20"
                        )}
                      />
                    </div>
                    <div>
                      <p className={cn("font-semibold text-base text-foreground")}>
                        Ảnh bìa
                      </p>
                      <p className={cn("text-sm text-muted-foreground")}>
                        Hiển thị ở đầu trang
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingField(editingField === "background" ? null : "background")}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium text-sm",
                      "bg-transparent border-none text-primary",
                      "hover:bg-primary/10 transition-all duration-200",
                      "active:scale-95"
                    )}
                  >
                    {editingField === "background" ? t('profile.close') : t('profile.editProfile')}
                  </button>
                </div>
                {editingField === "background" && (
                  <div className={cn("mt-4")}>
                    <ImageUploadField
                      label="Ảnh bìa"
                      value={profile.Background}
                      onChange={(url) => setProfile((prev) => ({ ...prev, Background: url }))}
                      uploadMode={true}
                      urlInput={true}
                      uploading={uploadingBackground}
                      onUploadStateChange={(uploading) => setUploadingBackground(uploading)}
                    />
                  </div>
                )}

                {/* --- Tiểu sử / Bio --- */}
                <div className={cn("flex justify-between items-center border-b border-border/30 pb-4")}>
                  <div>
                    <p className={cn("font-semibold text-base text-foreground")}>
                      {t('profile.bio')}
                    </p>
                    <p className={cn("text-sm text-muted-foreground mt-1")}>
                      {profile.Bio || "Chưa có tiểu sử"}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingField(editingField === "bio" ? null : "bio")}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium text-sm",
                      "bg-transparent border-none text-primary",
                      "hover:bg-primary/10 transition-all duration-200",
                      "active:scale-95"
                    )}
                  >
                    {editingField === "bio" ? t('profile.close') : t('profile.editProfile')}
                  </button>
                </div>
                {editingField === "bio" && (
                  <div className={cn("mt-4")}>
                    <textarea
                      rows={3}
                      placeholder={t('input.caption')}
                      value={profile.Bio || ""}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, Bio: e.target.value }))
                      }
                      className={cn(
                        "w-full px-4 py-2.5 rounded-lg",
                        "border-[0.5px] border-border/20",
                        "bg-background text-foreground",
                        "outline-none transition-all duration-200",
                        "placeholder:text-muted-foreground/60",
                        "focus:border-primary/40 focus:ring-1 focus:ring-primary/20",
                        "resize-y"
                      )}
                    />
                  </div>
                )}

                {/* --- Thông tin chi tiết --- */}
                <div className={cn("flex justify-between items-start border-b border-border/30 pb-4")}>
                  <div>
                    <p className={cn("font-semibold text-base text-foreground mb-2")}>
                      {t('profile.about')}
                    </p>
                    <div className={cn("text-sm text-muted-foreground space-y-1")}>
                      <p><strong className={cn("text-foreground")}>Tên quán:</strong> {profile.BarName || "Chưa có tên quán"}</p>
                      <p><strong className={cn("text-foreground")}>Địa chỉ:</strong> {profile.Address || "Chưa có địa chỉ"}</p>
                      <p><strong className={cn("text-foreground")}>Điện thoại:</strong> {profile.PhoneNumber || "Chưa có"}</p>
                      <p><strong className={cn("text-foreground")}>Email:</strong> {profile.Email || "Chưa có"}</p>
                      <p><strong className={cn("text-foreground")}>Vai trò:</strong> {profile.Role || "Bar"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingField(editingField === "info" ? null : "info")}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium text-sm",
                      "bg-transparent border-none text-primary",
                      "hover:bg-primary/10 transition-all duration-200",
                      "active:scale-95 self-start"
                    )}
                  >
                    {editingField === "info" ? "Đóng" : "Chỉnh sửa"}
                  </button>
                </div>

                {editingField === "info" && (
                  <div className={cn("mt-4 space-y-4")}>
                    <label className={cn("block")}>
                      <span className={cn("text-sm font-medium text-foreground block mb-2")}>
                        {t('profile.barName')}:
                      </span>
                      <input
                        type="text"
                        value={profile.BarName || ""}
                        onChange={(e) =>
                          setProfile((prev) => ({ ...prev, BarName: e.target.value }))
                        }
                        className={cn(
                          "w-full px-4 py-2.5 rounded-lg",
                          "border-[0.5px] border-border/20",
                          "bg-background text-foreground",
                          "outline-none transition-all duration-200",
                          "focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                        )}
                      />
                    </label>

                    <div>
                      <span className={cn("text-sm font-medium text-foreground block mb-2")}>
                        {t('profile.address')}:
                      </span>
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

                    <label className={cn("block")}>
                      <span className={cn("text-sm font-medium text-foreground block mb-2")}>
                        {t('profile.phone')}:
                      </span>
                      <input
                        type="text"
                        value={profile.PhoneNumber || ""}
                        onChange={(e) =>
                          setProfile((prev) => ({ ...prev, PhoneNumber: e.target.value }))
                        }
                        className={cn(
                          "w-full px-4 py-2.5 rounded-lg",
                          "border-[0.5px] border-border/20",
                          "bg-background text-foreground",
                          "outline-none transition-all duration-200",
                          "focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                        )}
                      />
                    </label>

                    <label className={cn("block")}>
                      <span className={cn("text-sm font-medium text-foreground block mb-2")}>
                        {t('profile.email')}:
                      </span>
                      <input
                        type="email"
                        value={profile.Email || ""}
                        onChange={(e) =>
                          setProfile((prev) => ({ ...prev, Email: e.target.value }))
                        }
                        className={cn(
                          "w-full px-4 py-2.5 rounded-lg",
                          "border-[0.5px] border-border/20",
                          "bg-background text-foreground",
                          "outline-none transition-all duration-200",
                          "focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                        )}
                      />
                    </label>
                  </div>
                )}

              </div>
            </div>

            {/* Footer */}
            <div className={cn(
              "p-4 border-t border-border/30",
              "flex items-center justify-end gap-3 flex-shrink-0"
            )}>
              <button
                onClick={handleCloseEdit}
                disabled={saving}
                className={cn(
                  "px-4 py-2 rounded-lg font-semibold text-sm",
                  "bg-transparent border-none text-muted-foreground",
                  "hover:text-foreground hover:bg-muted/50",
                  "transition-all duration-200",
                  "active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
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
                disabled={saving || uploadingAvatar || uploadingBackground}
                className={cn(
                  "px-4 py-2 rounded-lg font-semibold text-sm",
                  "bg-primary text-primary-foreground border-none",
                  "hover:bg-primary/90 transition-all duration-200",
                  "active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {saving ? t('profile.saving') : t('profile.saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}
      {reportModalOpen && (
        <ReportEntityModal
          open={reportModalOpen}
          entityId={profile?.EntityAccountId || barPageId}
          entityType="BarPage"
          entityName={profile?.BarName}
          onClose={() => setReportModalOpen(false)}
          onSubmitted={() => {
            setReportModalOpen(false);
            alert(t("publicProfile.reportSubmitted"));
          }}
        />
      )}
      {isBanned && (
        <BannedAccountOverlay 
          userRole="Bar"
          entityType="BarPage"
          entityName={profile?.BarName || profile?.barName}
        />
      )}
    </>
  );
}
