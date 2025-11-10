import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import barPageApi from "../../../api/barPageApi";
import { locationApi } from "../../../api/locationApi";
import AddressSelector from "../../../components/common/AddressSelector";
import PostFeed from "../../feeds/components/post/PostFeed";
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
import { cn } from "../../../utils/cn";

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
    <div className={cn("min-h-screen bg-background")}>
      {/* Cover Photo Section - Instagram Style */}
      <section className={cn("relative w-full h-[200px] md:h-[250px] overflow-hidden rounded-b-lg")}>
        <div
          className={cn("absolute inset-0 bg-cover bg-center")}
          style={{
            backgroundImage: `url(${profile.Background || "https://i.imgur.com/6IUbEMn.jpg"})`,
          }}
        />
        {/* Gradient Overlay */}
        <div className={cn("absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60")} />
        
        {/* Action Buttons */}
        <div className={cn("absolute top-4 right-4 z-10 flex items-center gap-2")}>
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
                followingId={profile?.AccountId}
                followingType="BAR"
              />
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
        </div>

        {/* Profile Info Overlay */}
        <div className={cn("absolute bottom-0 left-0 right-0 p-4 md:p-6")}>
          <div className={cn("flex items-end gap-3 md:gap-4")}>
            {/* Avatar */}
            <div className={cn("relative")}>
              <img
                src={profile.Avatar || "https://via.placeholder.com/150"}
                alt={profile.BarName}
                className={cn(
                  "w-20 h-20 md:w-24 md:h-24 rounded-full object-cover",
                  "border-4 border-card shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
                  "bg-card"
                )}
              />
            </div>
            <div className={cn("flex-1 pb-1")}>
              <h1 className={cn(
                "text-xl md:text-2xl font-bold text-primary-foreground mb-0.5",
                "drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              )}>
                {profile.BarName || t('profile.barName')}
              </h1>
              <div className={cn(
                "text-xs md:text-sm text-primary-foreground/90",
                "drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
              )}>
                BAR
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className={cn("max-w-6xl mx-auto px-4 md:px-6 py-6")}>
        {/* Stats Bar - Refined & Balanced Design */}
        <section className={cn(
          "flex items-center justify-center gap-8 md:gap-12 lg:gap-16",
          "py-6 px-4",
          "border-b border-border/30"
        )}>
          <button className={cn(
            "flex flex-col items-center gap-1.5 cursor-pointer",
            "group transition-all duration-200",
            "hover:opacity-90 active:scale-95"
          )}>
            <span className={cn(
              "text-2xl md:text-3xl font-bold text-foreground",
              "tracking-tight leading-none",
              "group-hover:text-primary transition-colors duration-200"
            )}>
              {followers.length}
            </span>
            <span className={cn(
              "text-[11px] md:text-xs text-muted-foreground",
              "font-medium uppercase tracking-wider",
              "group-hover:text-foreground/80 transition-colors duration-200"
            )}>
              {t('publicProfile.followers')}
            </span>
          </button>
          
          <div className={cn(
            "h-10 w-px bg-border/20",
            "hidden md:block"
          )} />
          
          <button className={cn(
            "flex flex-col items-center gap-1.5 cursor-pointer",
            "group transition-all duration-200",
            "hover:opacity-90 active:scale-95"
          )}>
            <span className={cn(
              "text-2xl md:text-3xl font-bold text-foreground",
              "tracking-tight leading-none",
              "group-hover:text-primary transition-colors duration-200"
            )}>
              {following.length}
            </span>
            <span className={cn(
              "text-[11px] md:text-xs text-muted-foreground",
              "font-medium uppercase tracking-wider",
              "group-hover:text-foreground/80 transition-colors duration-200"
            )}>
              {t('publicProfile.following')}
            </span>
          </button>
        </section>

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
                disabled={tableTypes.length === 0}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                  "transition-all duration-200 relative whitespace-nowrap",
                  activeTab === "posts"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  tableTypes.length === 0 && "opacity-50 cursor-not-allowed"
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
                disabled={tableTypes.length === 0}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                  "transition-all duration-200 relative whitespace-nowrap",
                  activeTab === "videos"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  tableTypes.length === 0 && "opacity-50 cursor-not-allowed"
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
                disabled={tableTypes.length === 0}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                  "transition-all duration-200 relative whitespace-nowrap",
                  activeTab === "reviews"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  tableTypes.length === 0 && "opacity-50 cursor-not-allowed"
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
                onClick={() => setActiveTab("table-types")}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                  "transition-all duration-200 relative whitespace-nowrap",
                  activeTab === "table-types"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t('tabs.tableTypes')}
                {activeTab === "table-types" && (
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
                    <input
                      type="text"
                      placeholder="Nhập link ảnh đại diện..."
                      value={profile.Avatar || ""}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, Avatar: e.target.value }))
                      }
                      className={cn(
                        "w-full px-4 py-2.5 rounded-lg",
                        "border-[0.5px] border-border/20",
                        "bg-background text-foreground",
                        "outline-none transition-all duration-200",
                        "placeholder:text-muted-foreground/60",
                        "focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                      )}
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
                    <input
                      type="text"
                      placeholder="Nhập link ảnh bìa..."
                      value={profile.Background || ""}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, Background: e.target.value }))
                      }
                      className={cn(
                        "w-full px-4 py-2.5 rounded-lg",
                        "border-[0.5px] border-border/20",
                        "bg-background text-foreground",
                        "outline-none transition-all duration-200",
                        "placeholder:text-muted-foreground/60",
                        "focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                      )}
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
                disabled={saving}
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
    </div>
  );
}
