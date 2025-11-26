/* global globalThis */
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FollowButton from "../../../components/common/FollowButton";
import publicProfileApi from "../../../api/publicProfileApi";
import { useFollowers, useFollowing } from "../../../hooks/useFollow";
import messageApi from "../../../api/messageApi";
import barPageApi from "../../../api/barPageApi";
import businessApi from "../../../api/businessApi";
import { cn } from "../../../utils/cn";
import PostCard from "../../feeds/components/post/PostCard";
import RequestBookingModal from "../../../components/booking/RequestBookingModal";
import ReportEntityModal from "../../feeds/components/modals/ReportEntityModal";
import PerformerReviews from "../../business/components/PerformerReviews";
import BarEvent from "../../bar/components/BarEvent";
import BarMenu from "../../bar/components/BarMenuCombo";
import BarVideo from "../../bar/components/BarVideo";
import BarReview from "../../bar/components/BarReview";
import BarTables from "../../bar/components/BarTables";
import BarTablesPage from "./BarTablesPage";
import { useProfilePosts } from "../../../hooks/useProfilePosts";
import { useCurrentUserEntity } from "../../../hooks/useCurrentUserEntity";
import { ProfileHeader } from "../../../components/profile/ProfileHeader";
import { ProfileStats } from "../../../components/profile/ProfileStats";
import { DollarSign } from "lucide-react";
import BannedAccountOverlay from "../../../components/common/BannedAccountOverlay";
import { getSession } from "../../../utils/sessionManager";
import { userApi } from "../../../api/userApi";

const getWindow = () => (typeof globalThis !== "undefined" ? globalThis : undefined);

// eslint-disable-next-line complexity
export default function PublicProfile() {
  const { entityId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  
  // Get current user entity ID using shared hook
  const currentUserEntityId = useCurrentUserEntity();
  
  // Calculate followEntityId from profile data (like own profiles)
  // Prioritize EntityAccountId from profile, fallback to entityId from URL
  const followEntityId = profile?.EntityAccountId || profile?.entityAccountId || profile?.entityAccountID || entityId;
  const { followers, fetchFollowers } = useFollowers(followEntityId);
  const { following, fetchFollowing } = useFollowing(followEntityId);
  
  // Use shared hook for posts
  const { posts, loading: postsLoading } = useProfilePosts(entityId);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const menuRef = useRef(null);
  const [activeTab, setActiveTab] = useState("info");
  const [tableTypes, setTableTypes] = useState([]);
  const [isBanned, setIsBanned] = useState(false);
  const [showBookingView, setShowBookingView] = useState(false); // Toggle booking view

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        // Step 1: Get basic profile from entityId
        const body = await publicProfileApi.getByEntityId(entityId);
        if (alive) {
          const data = body?.data || null;
          if (data) {
            // Map data from PascalCase to camelCase for consistency with own profiles
            let mappedData = {
              ...data,
              userName: data.userName || data.UserName || data.name || data.Name,
              role: data.role || data.Role,
              avatar: data.avatar || data.Avatar,
              background: data.background || data.Background,
              address: data.address || data.Address || data.AddressDetail,
              phone: data.phone || data.Phone || data.phoneNumber || data.PhoneNumber,
              bio: data.bio || data.Bio || data.description || data.Description || data.about || data.About,
              gender: data.gender || data.Gender,
              pricePerHours: data.pricePerHours || data.PricePerHours || data.pricePerHour || data.PricePerHour,
              pricePerSession: data.pricePerSession || data.PricePerSession || data.pricePerSession || data.PricePerSession,
              name: data.name || data.Name || data.userName || data.UserName,
              // Map EntityAccountId for followers/following (like own profiles)
              EntityAccountId: data.EntityAccountId || data.entityAccountId || data.entityAccountID || entityId,
              entityAccountId: data.EntityAccountId || data.entityAccountId || data.entityAccountID || entityId,
              // Map barPageId for bar profiles
              barPageId: data.barPageId || data.BarPageId || data.barPageID || data.targetId || data.targetID || data.id,
            };
            
            // Step 2: If this is a DJ or Dancer profile, get full details from BusinessAccount
            const profileRole = (mappedData.role || "").toString().toUpperCase();
            const isPerformer = ["DJ", "DANCER"].includes(profileRole);
            
            if (isPerformer && alive) {
              // Get businessAccountId from the data
              const businessAccountId = 
                data.BussinessAccountId ||
                data.BusinessAccountId ||
                data.BusinessId ||
                data.businessAccountId ||
                data.businessId ||
                data.targetId ||
                data.targetID ||
                null;
              
              console.log("🎭 Performer profile detected, fetching business details. businessAccountId:", businessAccountId);
              
              if (businessAccountId) {
                try {
                  // Fetch full business details
                  const businessRes = await businessApi.getBusinessById(businessAccountId);
                  console.log("✅ Business API response:", businessRes);
                  
                  if (businessRes.status === "success" && businessRes.data && alive) {
                    const businessData = businessRes.data;
                    
                    // Map gender from Vietnamese to English if needed
                    const mapGender = (gender) => {
                      if (!gender) return '';
                      const genderLower = gender.toLowerCase();
                      if (genderLower === 'nam' || genderLower === 'male') return 'male';
                      if (genderLower === 'nữ' || genderLower === 'female') return 'female';
                      if (genderLower === 'khác' || genderLower === 'other') return 'other';
                      return gender;
                    };
                    
                    // Merge business data (prioritize business data over public profile data)
                    mappedData = {
                      ...mappedData,
                      userName: businessData.UserName || mappedData.userName,
                      role: businessData.Role || mappedData.role,
                      avatar: businessData.Avatar || mappedData.avatar,
                      background: businessData.Background || mappedData.background,
                      address: businessData.Address || mappedData.address,
                      phone: businessData.Phone || mappedData.phone,
                      bio: businessData.Bio || mappedData.bio,
                      gender: mapGender(businessData.Gender) || mappedData.gender,
                      pricePerHours: businessData.PricePerHours || mappedData.pricePerHours,
                      pricePerSession: businessData.PricePerSession || mappedData.pricePerSession,
                      // Preserve EntityAccountId from business data if available
                      EntityAccountId: businessData.EntityAccountId || mappedData.EntityAccountId,
                      entityAccountId: businessData.EntityAccountId || businessData.entityAccountId || mappedData.entityAccountId,
                    };
                    
                    console.log("✅ Merged profile data:", {
                      hasBio: !!mappedData.bio,
                      hasGender: !!mappedData.gender,
                      hasAddress: !!mappedData.address,
                      hasPhone: !!mappedData.phone,
                      hasPricePerHours: !!mappedData.pricePerHours,
                      hasPricePerSession: !!mappedData.pricePerSession,
                    });
                  }
                } catch (businessError) {
                  console.error("❌ Error fetching business details:", businessError);
                  // Continue with public profile data if business API fails
                }
              }
            }
            
            setProfile(mappedData);
          } else {
            setProfile(null);
          }
        }
      } catch (e) {
        if (alive) setError(e?.response?.data?.message || e.message);
      } finally {
        if (alive) setLoading(false);
      }
    };
    if (entityId) run();
    return () => { alive = false; };
  }, [entityId]);

  useEffect(() => {
    // Fetch followers/following when followEntityId changes (like own profiles)
    if (followEntityId) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [followEntityId, refreshTick, fetchFollowers, fetchFollowing]);

  // Determine if this is a bar profile (before early returns)
  const targetTypeForBar = profile ? (() => {
    const type = (profile?.type || profile?.role || "").toString().toUpperCase();
    if (type === "BAR" || type.includes("BARPAGE")) return "BarPage";
    if (type.includes("BUSINESS") || type.includes("DJ") || type.includes("DANCER")) {
      return "BusinessAccount";
    }
    return "Account";
  })() : "Account";
  const isBarProfileForEffect = targetTypeForBar === "BarPage";
  const barPageIdForEffect = isBarProfileForEffect ? (entityId || profile?.id || profile?.barPageId) : null;

  // Load table types for bar profile (before early returns)
  useEffect(() => {
    const fetchTableTypes = async () => {
      if (!isBarProfileForEffect || !barPageIdForEffect) {
        setTableTypes([]);
        return;
      }
      try {
        const isGuid = typeof barPageIdForEffect === "string" && /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(barPageIdForEffect);
        if (!isGuid) {
          setTableTypes([]);
          return;
        }
        const res = await barPageApi.getTableTypes(barPageIdForEffect);
        setTableTypes(res.data || []);
      } catch (err) {
        console.error("❌ Lỗi tải loại bàn:", err);
        setTableTypes([]);
      }
    };
    fetchTableTypes();
  }, [isBarProfileForEffect, barPageIdForEffect]);

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

  // Check if current user's Account is banned
  useEffect(() => {
    const checkBannedStatus = async () => {
      try {
        const session = getSession();
        if (session?.accountId) {
          const accountRes = await userApi.me();
          const accountStatus = accountRes?.data?.Status || accountRes?.data?.status;
          if (accountStatus === 'banned') {
            setIsBanned(true);
          }
        }
      } catch (err) {
        console.error("[PublicProfile] Error checking banned status:", err);
      }
    };
    checkBannedStatus();
  }, []);

  if (loading) {
    return (
      <div className={cn("min-h-screen bg-background flex items-center justify-center")}>
        <div className={cn("text-muted-foreground")}>{t("publicProfile.loading")}</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={cn("min-h-screen bg-background flex items-center justify-center")}>
        <div className={cn("text-danger")}>{t("publicProfile.error")}</div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className={cn("min-h-screen bg-background flex items-center justify-center")}>
        <div className={cn("text-muted-foreground")}>{t("publicProfile.notFound")}</div>
      </div>
    );
  }

  const isOwnProfile = currentUserEntityId && String(currentUserEntityId).toLowerCase() === String(entityId).toLowerCase();

  // Helper to get current user role from session
  const getCurrentUserRole = () => {
    try {
      const sessionRaw = localStorage.getItem("session");
      if (!sessionRaw) return null;
      const session = JSON.parse(sessionRaw);
      const active = session?.activeEntity || {};
      return (active.role || active.Role || "").toString().toUpperCase();
    } catch (e) {
      return null;
    }
  };

  const resolveTargetType = () => {
    // Use profile.type first (from API), then fallback to role
    // This ensures we get the correct type even when current user has different role
    const type = (profile?.type || profile?.Type || "").toString().toUpperCase();
    const role = (profile?.role || profile?.Role || "").toString().toUpperCase();
    
    // Check type first (more reliable)
    if (type === "BAR" || type === "BARPAGE" || type.includes("BARPAGE")) {
      return "BarPage";
    }
    if (type === "BUSINESS" || type === "BUSINESSACCOUNT") {
      return "BusinessAccount";
    }
    
    // Fallback to role only if type is not available
    if (!type || type === "ACCOUNT") {
      if (role === "BAR" || role.includes("BARPAGE")) return "BarPage";
      if (role === "DJ" || role === "DANCER") return "BusinessAccount";
    }
    
    return "Account";
  };

  const handleBlock = () => {
    setActionMenuOpen(false);
    const win = getWindow();
    const confirmed = win?.confirm
      ? win.confirm(t("publicProfile.blockConfirm", { name: profile.name || t("publicProfile.thisUser") }))
      : false;
    if (!confirmed) return;
    try {
      const blockedRaw = localStorage.getItem("blockedEntities");
      const blocked = blockedRaw ? JSON.parse(blockedRaw) : [];
      if (!blocked.includes(entityId)) {
        blocked.push(entityId);
        localStorage.setItem("blockedEntities", JSON.stringify(blocked));
      }
      alert(t("publicProfile.blockSuccess"));
    } catch (err) {
      console.error("Failed to persist block list:", err);
      alert(t("publicProfile.blockError"));
    }
  };

  const targetType = resolveTargetType();
  const isBarProfile = targetType === "BarPage";
  const isPerformerProfile =
    targetType === "BusinessAccount" &&
    ["DJ", "DANCER"].includes((profile?.role || "").toString().toUpperCase());
  const performerTargetId = isPerformerProfile
    ? profile?.targetId || profile?.targetID || null
    : null;
  
  // Get barPageId for bar profile
  // Try multiple sources: from profile data, entityId, or profile.id
  const barPageId = isBarProfile ? (
    profile?.barPageId || 
    profile?.BarPageId || 
    profile?.barPageID ||
    profile?.targetId || 
    profile?.targetID ||
    entityId || 
    profile?.id
  ) : null;
  
  // Debug barPageId for reviews
  if (isBarProfile) {
    console.log("🍺 Bar profile - barPageId for reviews:", barPageId, {
      fromProfile: profile?.barPageId || profile?.BarPageId || profile?.barPageID,
      fromTargetId: profile?.targetId || profile?.targetID,
      fromEntityId: entityId,
      fromProfileId: profile?.id,
    });
  }

  // Determine profile role for tabs
  const profileRole = (profile?.role || "").toString().toUpperCase();
  const isDJProfile = isPerformerProfile && profileRole === "DJ";
  const isDancerProfile = isPerformerProfile && profileRole === "DANCER";
  const isCustomerProfile = !isBarProfile && !isPerformerProfile;

  // Helper to display gender in Vietnamese
  const displayGender = (gender) => {
    if (!gender) return "Chưa cập nhật";
    const genderLower = gender.toLowerCase();
    if (genderLower === 'male') return 'Nam';
    if (genderLower === 'female') return 'Nữ';
    if (genderLower === 'other') return 'Khác';
    // If already in Vietnamese, return as-is
    return gender;
  };

  // Render tab content for bar profile
  const renderBarTabContent = () => {
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
            ) : posts && posts.length > 0 ? (
              <div className={cn("space-y-4")}>
                {posts.map(post => (
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
        // Only bar owners can create tables, others can only view
        const currentUserRole = getCurrentUserRole();
        const canCreateTables = isOwnProfile && currentUserRole === "BAR";
        return (
          <div className="profile-section">
            {!canCreateTables && (
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">Danh sách bàn</h2>
                <button
                  onClick={() => setShowBookingView(!showBookingView)}
                  className={cn(
                    "px-6 py-3 rounded-xl font-bold text-base",
                    "border-none",
                    "transition-all duration-300",
                    "active:scale-95",
                    "flex items-center gap-2",
                    "shadow-lg hover:shadow-xl",
                    showBookingView 
                      ? "bg-gray-500 text-white hover:bg-gray-600" 
                      : "bg-gradient-to-r from-[rgb(var(--success))] to-[rgb(var(--primary))] text-white hover:from-[rgb(var(--success))] hover:to-[rgb(var(--primary-hover))]",
                    "transform hover:scale-105"
                  )}
                  style={{
                    boxShadow: showBookingView 
                      ? '0 4px 12px rgba(0, 0, 0, 0.15)' 
                      : '0 4px 16px rgba(var(--success), 0.4)'
                  }}
                >
                  <span>{showBookingView ? "Hủy đặt bàn" : "🍽️ Đặt bàn ngay"}</span>
                </button>
              </div>
            )}
            {showBookingView && !canCreateTables ? (
              <BarTablesPage barId={barPageId} />
            ) : (
              <BarTables barPageId={barPageId} readOnly={!canCreateTables} />
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Render tab content for DJ profile
  const renderDJTabContent = () => {
    switch (activeTab) {
      case "info":
  return (
          <div className={cn("flex flex-col gap-6")}>
            {/* Price Highlight Section */}
            {(profile.pricePerHours || profile.pricePerSession) && (
              <div className={cn(
                "bg-gradient-to-br from-primary/20 to-primary/5",
                "rounded-lg p-6 border-[0.5px] border-primary/30",
                "shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              )}>
                <h3 className={cn("text-xl font-bold text-foreground mb-4 flex items-center gap-2")}>
                  <DollarSign className="w-5 h-5" />
                  {t('profile.priceTable')}
                </h3>
                <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4")}>
                  {profile.pricePerHours && (
                    <div className={cn(
                      "bg-card rounded-lg p-4 border border-border/20"
                    )}>
                      <p className={cn("text-sm text-muted-foreground mb-1")}>
                        {t('profile.pricePerHour')}
                      </p>
                      <p className={cn("text-2xl font-bold text-primary")}>
                        {Number.parseInt(profile.pricePerHours || 0, 10).toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                  )}
                  {profile.pricePerSession && (
                    <div className={cn(
                      "bg-card rounded-lg p-4 border border-border/20"
                    )}>
                      <p className={cn("text-sm text-muted-foreground mb-1")}>
                        {t('profile.pricePerSession')}
                      </p>
                      <p className={cn("text-2xl font-bold text-primary")}>
                        {Number.parseInt(profile.pricePerSession || 0, 10).toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Info Card */}
            <div className={cn(
              "bg-card rounded-lg p-6 border-[0.5px] border-border/20",
              "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            )}>
              <h3 className={cn("text-lg font-semibold text-foreground mb-4")}>
                {t('profile.about')}
              </h3>
              <div className={cn("space-y-3 text-sm")}>
                {profile.bio && (
                  <p className={cn("text-foreground whitespace-pre-wrap leading-relaxed")}>
                    {profile.bio}
                  </p>
                )}
                <div className={cn("space-y-2 text-muted-foreground")}>
                  {profile.gender && (
                    <p><strong className={cn("text-foreground")}>{t('profile.gender')}:</strong> {displayGender(profile.gender)}</p>
                  )}
                  {profile.address && (
                    <p><strong className={cn("text-foreground")}>{t('profile.address')}:</strong> {profile.address}</p>
                  )}
                  {profile.phone && (
                    <p><strong className={cn("text-foreground")}>{t('profile.phone')}:</strong> {profile.phone}</p>
                  )}
                </div>
              </div>
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
            ) : posts && posts.length > 0 ? (
              <div className={cn("space-y-4")}>
                {posts.map(post => (
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
      case "music": {
        // Filter posts that have music
        const musicPosts = posts.filter(post => {
          return post.audioSrc || 
                 post.audioTitle || 
                 post.purchaseLink ||
                 post.targetType === "music" ||
                 (post.medias?.audios && post.medias.audios.length > 0);
        });
        
        return (
          <div className={cn("flex flex-col gap-6")}>
            {postsLoading ? (
              <div className={cn("text-center py-12 text-muted-foreground")}>
                {t('common.loading')}
              </div>
            ) : musicPosts && musicPosts.length > 0 ? (
              <div className={cn("space-y-4")}>
                {musicPosts.map(post => (
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
                <p>{t('profile.musicTab')}</p>
                <p className={cn("text-sm mt-2")}>Chưa có bài nhạc nào</p>
              </div>
            )}
          </div>
        );
      }
      case "reviews":
        return (
          <div className={cn("flex flex-col gap-6")}>
            {performerTargetId && (
              <PerformerReviews
                businessAccountId={performerTargetId}
                performerName={profile.name}
                performerRole={profile.role || "DJ"}
                isOwnProfile={isOwnProfile}
                allowSubmission={!isOwnProfile}
              />
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Render tab content for Dancer profile
  const renderDancerTabContent = () => {
    switch (activeTab) {
      case "info":
        return (
          <div className={cn("flex flex-col gap-6")}>
            {/* Price Highlight Section */}
            {(profile.pricePerHours || profile.pricePerSession) && (
              <div className={cn(
                "bg-gradient-to-br from-primary/20 to-primary/5",
                "rounded-lg p-6 border-[0.5px] border-primary/30",
                "shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              )}>
                <h3 className={cn("text-xl font-bold text-foreground mb-4 flex items-center gap-2")}>
                  <DollarSign className="w-5 h-5" />
                  {t('profile.priceTable')}
                </h3>
                <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4")}>
                  {profile.pricePerHours && (
                    <div className={cn(
                      "bg-card rounded-lg p-4 border border-border/20"
                    )}>
                      <p className={cn("text-sm text-muted-foreground mb-1")}>
                        {t('profile.pricePerHour')}
                      </p>
                      <p className={cn("text-2xl font-bold text-primary")}>
                        {Number.parseInt(profile.pricePerHours || 0, 10).toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                  )}
                  {profile.pricePerSession && (
                    <div className={cn(
                      "bg-card rounded-lg p-4 border border-border/20"
                    )}>
                      <p className={cn("text-sm text-muted-foreground mb-1")}>
                        {t('profile.pricePerSession')}
                      </p>
                      <p className={cn("text-2xl font-bold text-primary")}>
                        {Number.parseInt(profile.pricePerSession || 0, 10).toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Info Card */}
            <div className={cn(
              "bg-card rounded-lg p-6 border-[0.5px] border-border/20",
              "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            )}>
              <h3 className={cn("text-lg font-semibold text-foreground mb-4")}>
                {t('profile.about')}
              </h3>
              <div className={cn("space-y-3 text-sm")}>
                {profile.bio && (
                  <p className={cn("text-foreground whitespace-pre-wrap leading-relaxed")}>
                    {profile.bio}
                  </p>
                )}
                <div className={cn("space-y-2 text-muted-foreground")}>
                  {profile.gender && (
                    <p><strong className={cn("text-foreground")}>{t('profile.gender')}:</strong> {displayGender(profile.gender)}</p>
                  )}
                  {profile.address && (
                    <p><strong className={cn("text-foreground")}>{t('profile.address')}:</strong> {profile.address}</p>
                  )}
                  {profile.phone && (
                    <p><strong className={cn("text-foreground")}>{t('profile.phone')}:</strong> {profile.phone}</p>
                  )}
                </div>
              </div>
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
            ) : posts && posts.length > 0 ? (
              <div className={cn("space-y-4")}>
                {posts.map(post => (
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
            <BarVideo barPageId={entityId} />
          </div>
        );
      case "reviews":
        return (
          <div className={cn("flex flex-col gap-6")}>
            {performerTargetId && (
              <PerformerReviews
                businessAccountId={performerTargetId}
                performerName={profile.name}
                performerRole={profile.role || "Dancer"}
                isOwnProfile={isOwnProfile}
                allowSubmission={!isOwnProfile}
              />
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Render tab content for Customer/Account profile
  const renderCustomerTabContent = () => {
    switch (activeTab) {
      case "info":
        return (
          <div className={cn("flex flex-col gap-6")}>
            {/* Bio & Info Section */}
            {(profile.bio || (profile.contact && (profile.contact.email || profile.contact.phone || profile.contact.address))) && (
              <section className={cn(
                "py-6 border-b border-border/30",
                "bg-card rounded-lg p-6 mb-6",
                "border-[0.5px] border-border/20",
                "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              )}>
                {profile.bio && (
                  <div className={cn("mb-4")}>
                    <h3 className={cn("text-lg font-semibold text-foreground mb-2")}>
                      {t("publicProfile.about")}
                    </h3>
                    <p className={cn("text-foreground whitespace-pre-wrap leading-relaxed")}>
                      {profile.bio}
                    </p>
                  </div>
                )}
                {profile.contact && (profile.contact.email || profile.contact.phone || profile.contact.address) && (
                  <div className={cn("mt-4 pt-4 border-t border-border/30")}>
                    <h4 className={cn("text-base font-semibold text-foreground mb-3")}>
                      {t("publicProfile.contact")}
                    </h4>
                    <div className={cn("space-y-2 text-sm text-muted-foreground")}>
                      {profile.contact.email && (
                        <div className={cn("flex items-center gap-2")}>
                          <i className="bx bx-envelope text-base"></i>
                          <span>{t("common.email")}: {profile.contact.email}</span>
                        </div>
                      )}
                      {profile.contact.phone && (
                        <div className={cn("flex items-center gap-2")}>
                          <i className="bx bx-phone text-base"></i>
                          <span>{t("common.phone") || "Phone"}: {profile.contact.phone}</span>
                        </div>
                      )}
                      {profile.contact.address && (
                        <div className={cn("flex items-center gap-2")}>
                          <i className="bx bx-map text-base"></i>
                          <span>{t("common.address") || "Address"}: {profile.contact.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        );
      case "posts":
        return (
          <div className="flex flex-col gap-6">
            {postsLoading ? (
              <div className={cn("text-center py-12 text-muted-foreground")}>
                {t('common.loading')}
              </div>
            ) : posts && posts.length > 0 ? (
              <div className={cn("space-y-4")}>
                {posts.map(post => (
                  <PostCard
                    key={post._id || post.id}
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
            <BarVideo barPageId={entityId} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
    <div className={cn("min-h-screen bg-background", isBanned && "opacity-30 pointer-events-none")}>
      <ProfileHeader
        background={profile.background}
        avatar={profile.avatar}
        name={profile.name}
        role={(profile.type || profile.role || "USER").toString()}
      >
        {!isOwnProfile && (
          <>
            <button
              onClick={() => setBookingOpen(true)}
              className={cn(
                "px-4 py-2 rounded-lg font-semibold text-sm",
                "bg-primary text-primary-foreground border-none",
                "hover:bg-primary/90 transition-all duration-200",
                "active:scale-95",
                "flex items-center gap-2"
              )}
            >
              <i className="bx bxs-calendar-check text-base" />
              <span>Request booking</span>
            </button>
            <button
              onClick={async () => {
                try {
                  if (!currentUserEntityId) return;

                  const res = await messageApi.createOrGetConversation(currentUserEntityId, entityId);
                  const conversation = res?.data?.data || res?.data;
                  const conversationId = conversation?._id || conversation?.conversationId || conversation?.id;
                  const win = getWindow();
                  if (conversationId && win?.__openChat) {
                    win.__openChat({
                      id: conversationId,
                      name: profile.name || "User",
                      avatar: profile.avatar || null,
                      entityId: entityId
                    });
                  }
                } catch (error) {
                  console.error("Error opening chat:", error);
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
              <i className="bx bx-message-rounded text-base" />
              <span>Chat</span>
            </button>
            <FollowButton
              followingId={followEntityId}
              followingType={profile.type === 'BAR' ? 'BAR' : 'USER'}
              onChange={() => setRefreshTick(v => v + 1)}
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
      </ProfileHeader>

      {/* Main Content Container */}
      <div className={cn("max-w-6xl mx-auto px-4 md:px-6 py-6")}>
        <ProfileStats followers={followers} following={following} />

        {/* Tabs Section - All Profile Types */}
          <section className={cn("py-6")}>
            {/* Tabs Navigation */}
            <div className={cn("flex items-center gap-1 mb-6 border-b border-border/30 overflow-x-auto")}>
            {/* Info Tab - All profiles */}
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
            
            {/* Posts Tab - All profiles */}
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
            
            {/* Videos Tab - Bar, Dancer, Customer */}
            {(isBarProfile || isDancerProfile || isCustomerProfile) && (
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
                {t('profile.videosTab')}
                {activeTab === "videos" && (
                  <span className={cn(
                    "absolute bottom-0 left-0 right-0 h-0.5",
                    "bg-primary"
                  )} />
                )}
              </button>
            )}
            
            {/* Music Tab - DJ only */}
            {isDJProfile && (
              <button
                onClick={() => setActiveTab("music")}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                  "transition-all duration-200 relative whitespace-nowrap",
                  activeTab === "music"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t('profile.musicTab')}
                {activeTab === "music" && (
                  <span className={cn(
                    "absolute bottom-0 left-0 right-0 h-0.5",
                    "bg-primary"
                  )} />
                )}
              </button>
            )}
            
            {/* Reviews Tab - Bar, DJ, Dancer */}
            {(isBarProfile || isDJProfile || isDancerProfile) && (
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
                {t('profile.reviewsTab')}
                {activeTab === "reviews" && (
                  <span className={cn(
                    "absolute bottom-0 left-0 right-0 h-0.5",
                    "bg-primary"
                  )} />
                )}
              </button>
            )}
            
            {/* Tables Tab - Bar only */}
            {isBarProfile && (
              <button
                onClick={() => setActiveTab("tables")}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                  "transition-all duration-200 relative whitespace-nowrap",
                  activeTab === "tables"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t('profile.tablesTab')}
                {activeTab === "tables" && (
                  <span className={cn(
                    "absolute bottom-0 left-0 right-0 h-0.5",
                    "bg-primary"
                  )} />
                )}
              </button>
            )}
            </div>
          
            {/* Tab Content */}
          {isBarProfile && renderBarTabContent()}
          {isDJProfile && renderDJTabContent()}
          {isDancerProfile && renderDancerTabContent()}
          {isCustomerProfile && renderCustomerTabContent()}
          </section>
      </div>

      {bookingOpen && (
        <RequestBookingModal
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          performerEntityAccountId={entityId}
          performerRole={(profile.role || profile.type || "").toString().toUpperCase().includes("DANCER") ? "DANCER" : "DJ"}
        />
      )}
      {reportModalOpen && (
        <ReportEntityModal
          open={reportModalOpen}
          entityId={entityId}
          entityType={resolveTargetType()}
          entityName={profile.name}
          onClose={() => setReportModalOpen(false)}
          onSubmitted={() => {
            setReportModalOpen(false);
            alert(t("publicProfile.reportSubmitted"));
          }}
        />
      )}
    </div>
    {isBanned && (
      <BannedAccountOverlay 
        userRole="Customer"
        entityType="Account"
        entityName={profile?.userName || profile?.UserName}
      />
    )}
    </>
  );
}
 
 
