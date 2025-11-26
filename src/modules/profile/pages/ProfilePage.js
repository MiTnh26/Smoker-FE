/* global globalThis */
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FollowButton from "../../../components/common/FollowButton";
import publicProfileApi from "../../../api/publicProfileApi";
import { useFollowers, useFollowing } from "../../../hooks/useFollow";
import messageApi from "../../../api/messageApi";
import barPageApi from "../../../api/barPageApi";
import businessApi from "../../../api/businessApi";
import { cn } from "../../../utils/cn";
import RequestBookingModal from "../../../components/booking/RequestBookingModal";
import ReportEntityModal from "../../feeds/components/modals/ReportEntityModal";
import { useProfilePosts } from "../../../hooks/useProfilePosts";
import { useCurrentUserEntity } from "../../../hooks/useCurrentUserEntity";
import { useProfileType } from "../../../hooks/useProfileType";
import { useIsOwnProfile } from "../../../hooks/useIsOwnProfile";
import { ProfileHeader } from "../../../components/profile/ProfileHeader";
import { ProfileStats } from "../../../components/profile/ProfileStats";
import BannedAccountOverlay from "../../../components/common/BannedAccountOverlay";
import { getSession } from "../../../utils/sessionManager";
import { userApi } from "../../../api/userApi";
import { normalizeProfileData } from "../../../utils/profileDataMapper";
import { CustomerTabs } from "../../../components/profile/ProfileTabs/CustomerTabs";
import { BarTabs } from "../../../components/profile/ProfileTabs/BarTabs";
import { DJTabs } from "../../../components/profile/ProfileTabs/DJTabs";
import { DancerTabs } from "../../../components/profile/ProfileTabs/DancerTabs";

const getWindow = () => (typeof globalThis !== "undefined" ? globalThis : undefined);

// eslint-disable-next-line complexity
export default function ProfilePage() {
  const { entityId } = useParams();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  
  // Get current user entity ID using shared hook
  const currentUserEntityId = useCurrentUserEntity();
  
  // Use new hooks for profile type and ownership
  const profileType = useProfileType(profile);
  const isOwnProfile = useIsOwnProfile(entityId);
  
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
  const [isBanned, setIsBanned] = useState(false);

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
            // Use normalized profile data mapper
            let mappedData = normalizeProfileData(data);
            
            // Ensure EntityAccountId and entityAccountId are set (for followers/following)
            if (!mappedData.EntityAccountId && !mappedData.entityAccountId) {
              mappedData.EntityAccountId = entityId;
              mappedData.entityAccountId = entityId;
            }
            
            // Step 2: If this is a DJ or Dancer profile, get full details from BusinessAccount
            const profileRole = (mappedData.role || mappedData.Role || "").toString().toUpperCase();
            const isPerformer = ["DJ", "DANCER"].includes(profileRole);
            
            if (isPerformer && alive) {
              // Get businessAccountId from the normalized data
              const businessAccountId = 
                mappedData.businessAccountId ||
                mappedData.BusinessAccountId ||
                mappedData.BussinessAccountId ||
                mappedData.businessId ||
                mappedData.BusinessId ||
                mappedData.targetId ||
                mappedData.targetID ||
                null;
              
              if (businessAccountId) {
                try {
                  // Fetch full business details
                  const businessRes = await businessApi.getBusinessById(businessAccountId);
                  
                  if (businessRes.status === "success" && businessRes.data && alive) {
                    const businessData = businessRes.data;
                    
                    // Normalize business data and merge with existing mappedData
                    const normalizedBusinessData = normalizeProfileData(businessData);
                    
                    // Merge business data (prioritize business data over public profile data)
                    mappedData = {
                      ...mappedData,
                      ...normalizedBusinessData,
                      // Preserve EntityAccountId from original mappedData if business data doesn't have it
                      EntityAccountId: normalizedBusinessData.EntityAccountId || mappedData.EntityAccountId,
                      entityAccountId: normalizedBusinessData.entityAccountId || mappedData.entityAccountId,
                    };
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

  // Helper to get current user role from session
  const getCurrentUserRole = () => {
    try {
      const session = getSession();
      if (!session) return null;
      const active = session?.activeEntity || {};
      return (active.role || active.Role || "").toString().toUpperCase();
    } catch (e) {
      return null;
    }
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

  // Use profileType hook results
  const targetType = profileType.type;
  const isBarProfile = profileType.isBar;
  const isPerformerProfile = profileType.isPerformer;
  const isDJProfile = profileType.isDJ;
  const isDancerProfile = profileType.isDancer;
  const isCustomerProfile = profileType.isCustomer;
  
  const performerTargetId = isPerformerProfile
    ? profile?.targetId || profile?.targetID || profile?.businessAccountId || profile?.BusinessAccountId || null
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

  const renderTabContent = () => {
    const props = { profile, posts, postsLoading, activeTab, isOwnProfile };

    if (isBarProfile) {
      return <BarTabs {...props} barPageId={barPageId} currentUserRole={getCurrentUserRole()} />;
    } else if (isDJProfile) {
      return <DJTabs {...props} performerTargetId={performerTargetId} />;
    } else if (isDancerProfile) {
      return <DancerTabs {...props} performerTargetId={performerTargetId} entityId={entityId} />;
    } else if (isCustomerProfile) {
      return <CustomerTabs {...props} entityId={entityId} />;
    } else {
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
        {isOwnProfile ? (
          // Show Edit Profile button for own profile
          <button
            onClick={() => {
              // Redirect to own profile page with edit functionality
              const win = getWindow();
              if (win?.location) {
                win.location.href = "/customer/profile";
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
            <i className="bx bx-edit text-base"></i>
            {t('profile.editProfile')}
          </button>
        ) : (
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
          {renderTabContent()}
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
          entityType={targetType}
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

