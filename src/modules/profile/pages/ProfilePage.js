/* global globalThis */
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FollowButton from "../../../components/common/FollowButton";
import { getProfile } from "../../../api/profileApi";
import { getPostsByAuthor } from "../../../api/postApi";
import messageApi from "../../../api/messageApi";
import { cn } from "../../../utils/cn";
import RequestBookingModal from "../../../components/booking/RequestBookingModal";
import ReportEntityModal from "../../feeds/components/modals/ReportEntityModal";
import { useCurrentUserEntity } from "../../../hooks/useCurrentUserEntity";
import { useProfileType } from "../../../hooks/useProfileType";
import { useIsOwnProfile } from "../../../hooks/useIsOwnProfile";
import { ProfileHeader } from "../../../components/profile/ProfileHeader";
import { ProfileStats } from "../../../components/profile/ProfileStats";
import BannedAccountOverlay from "../../../components/common/BannedAccountOverlay";
import { getSession } from "../../../utils/sessionManager";
import { userApi } from "../../../api/userApi";
import { normalizeProfileData } from "../../../utils/profileDataMapper";
import { mapPostForCard } from "../../../utils/postTransformers";
import PostCard from "../../feeds/components/post/PostCard";
import { DollarSign, MessageCircle } from "lucide-react";
import BarEvent from "../../bar/components/BarEvent";
import BarMenu from "../../bar/components/BarMenuCombo";
import BarVideo from "../../bar/components/BarVideo";
import BarReview from "../../bar/components/BarReview";
import BarTables from "../../bar/components/BarTables";
import BarTablesPage from "../../customer/pages/BarTablesPage";
import PerformerReviews from "../../business/components/PerformerReviews";
import { ProfileInfoSection } from "../../../components/profile/ProfileInfoSection";
import AudioPlayerBar from "../../feeds/components/audio/AudioPlayerBar";
import { useSharedAudioPlayer } from "../../../hooks/useSharedAudioPlayer";

const getWindow = () => (typeof globalThis !== "undefined" ? globalThis : undefined);

// eslint-disable-next-line complexity
export default function ProfilePage() {
  const { entityId } = useParams();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rawPosts, setRawPosts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsPagination, setPostsPagination] = useState({ nextCursor: null, hasMore: false });
  
  // Get current user entity ID using shared hook
  const currentUserEntityId = useCurrentUserEntity();
  
  // Use new hooks for profile type and ownership
  const profileType = useProfileType(profile);
  const isOwnProfile = useIsOwnProfile(entityId);
  
  // Calculate followEntityId from profile data
  const followEntityId = profile?.EntityAccountId || profile?.entityAccountId || entityId;
  const [bookingOpen, setBookingOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const menuRef = useRef(null);
  const [activeTab, setActiveTab] = useState("info");
  const [isBanned, setIsBanned] = useState(false);
  const [showBookingView, setShowBookingView] = useState(false);

  // Shared audio player for profile pages (used when playing music posts)
  const {
    playingPost,
    setPlayingPost,
    activePlayer,
    setActivePlayer,
    sharedAudioRef,
    sharedCurrentTime,
    sharedDuration,
    sharedIsPlaying,
    handleSeek,
  } = useSharedAudioPlayer();

  useEffect(() => {
    let alive = true;
    const fetchProfileData = async () => {
      setLoading(true);
      setError("");
      try {
        const profileData = await getProfile(entityId);
        if (!alive) return;

        // profileApi.getProfile() trả về profileData trực tiếp (không có wrapper { success, data })
        if (profileData) {
          // Dữ liệu profile đã được gộp sẵn từ backend
          const mappedData = normalizeProfileData(profileData);
          setProfile(mappedData);
        } else {
          if (alive) {
            setError('Profile not found');
            setRawPosts([]);
            setPosts([]);
          }
        }
      } catch (e) {
        if (alive) {
          const errorMessage = e?.response?.data?.message || e?.message || 'Failed to fetch profile';
          setError(errorMessage);
          setRawPosts([]);
          setPosts([]);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    if (entityId) {
      fetchProfileData();
    }

    return () => { alive = false; };
  }, [entityId, t]);

  // Fetch posts separately to include reposts
  useEffect(() => {
    let alive = true;
    const fetchPosts = async () => {
      if (!entityId) {
        setPostsLoading(false);
        return;
      }

      setPostsLoading(true);
      try {
        // Use getPostsByAuthor API which includes reposts
        const response = await getPostsByAuthor(entityId, { 
          includeMedias: true, 
          includeMusic: true,
          populateReposts: true 
        });
        
        if (!alive) return;

        let rawPosts = [];
        if (Array.isArray(response?.data)) {
          rawPosts = response.data;
        } else if (Array.isArray(response?.data?.data)) {
          rawPosts = response.data.data;
        } else if (response?.data?.posts && Array.isArray(response.data.posts)) {
          rawPosts = response.data.posts;
        }

        setRawPosts(rawPosts);
        setPostsPagination(response?.data?.pagination || { nextCursor: null, hasMore: false });
      } catch (e) {
        if (alive) {
          console.error("[ProfilePage] Error fetching posts:", e);
          setRawPosts([]);
          setPosts([]);
        }
      } finally {
        if (alive) {
          setPostsLoading(false);
        }
      }
    };

    if (entityId) {
      fetchPosts();
    }

    return () => { alive = false; };
  }, [entityId]);

  useEffect(() => {
    const transformedPosts = rawPosts.map((post) => mapPostForCard(post, t, currentUserEntityId));
    setPosts(transformedPosts);
  }, [rawPosts, currentUserEntityId, t]);

  // Auto-redirect to own profile page if viewing own profile
  useEffect(() => {
    if (isOwnProfile && profile) {
      const win = getWindow();
      if (win?.location) {
        win.location.href = "/own/profile";
      }
    }
  }, [isOwnProfile, profile]);





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

  const targetType = profileType.type;
  const isBarProfile = profileType.isBar;
  const isPerformerProfile = profileType.isPerformer;
  const isDJProfile = profileType.isDJ;
  const isDancerProfile = profileType.isDancer;
  const isCustomerProfile = profileType.isCustomer;
  const canRequestBooking = !isOwnProfile && isPerformerProfile;

  useEffect(() => {
    if (!canRequestBooking && bookingOpen) {
      setBookingOpen(false);
    }
  }, [canRequestBooking, bookingOpen]);

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
            <ProfileInfoSection profile={profile} />
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
              <div className={cn("space-y-4 -mx-4 md:-mx-6")}>
                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    playingPost={playingPost}
                    setPlayingPost={setPlayingPost}
                    sharedAudioRef={sharedAudioRef}
                    sharedCurrentTime={sharedCurrentTime}
                    sharedDuration={sharedDuration}
                    sharedIsPlaying={sharedIsPlaying && playingPost === (post.id)}
                    onSeek={handleSeek}
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
      case "videos": {
        const videoPosts = (posts || []).filter((post) => {
          const hasVideoMedia = post.medias?.videos && post.medias.videos.length > 0;
          return hasVideoMedia || post.videoSrc;
        });

        return (
          <div className="flex flex-col gap-6">
            {postsLoading ? (
              <div className={cn("text-center py-12 text-muted-foreground")}>
                {t('common.loading')}
              </div>
            ) : videoPosts && videoPosts.length > 0 ? (
              <div className={cn("space-y-4 -mx-4 md:-mx-6")}>
                {videoPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    playingPost={null}
                    setPlayingPost={() => {}}
                  />
                ))}
              </div>
            ) : (
              <div className={cn(
                "text-center py-12 text-muted-foreground",
                "bg-card rounded-lg border-[0.5px] border-border/20 p-8"
              )}>
                {t("publicProfile.noVideos") || t("publicProfile.noPosts")}
              </div>
            )}
          </div>
        );
      }
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
            {!canCreateTables ? (
              // Customer view: chỉ hiển thị nút "Đặt bàn ngay"
              <div className="flex flex-col items-center justify-center py-12">
                <button
                  onClick={() => setShowBookingView(!showBookingView)}
                  className={cn(
                    "px-8 py-4 rounded-xl font-bold text-lg",
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
                {showBookingView && <BarTablesPage barId={barPageId} />}
              </div>
            ) : (
              // Bar owner view: hiển thị danh sách bàn để quản lý
              <BarTables barPageId={barPageId} readOnly={!canCreateTables} />
            )}
          </div>
        );
        case "booking":
  // Bất kỳ user đã đăng nhập nào cũng có thể đặt bàn
  // (Không cần kiểm tra role BAR hay chủ quán nữa)
  return (
    <div className="profile-section">
      <div className="flex flex-col items-center justify-center py-12">
        <button
          onClick={() => setShowBookingView(!showBookingView)}
          className={cn(
            "px-8 py-4 rounded-xl font-bold text-lg",
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
              ? "0 4px 12px rgba(0, 0, 0, 0.15)"
              : "0 4px 16px rgba(var(--success), 0.4)",
          }}
        >
          <span>{showBookingView ? "Hủy đặt bàn" : "Đặt bàn ngay"}</span>
        </button>

        {/* Hiển thị form/component đặt bàn khi người dùng bấm nút */}
        {showBookingView && <BarTablesPage barId={barPageId} />}
      </div>
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
            <ProfileInfoSection profile={profile} />
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
                    playingPost={playingPost}
                    setPlayingPost={setPlayingPost}
                    sharedAudioRef={sharedAudioRef}
                    sharedCurrentTime={sharedCurrentTime}
                    sharedDuration={sharedDuration}
                    sharedIsPlaying={sharedIsPlaying && playingPost === (post.id)}
                    onSeek={handleSeek}
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
        // Filter posts that have music (avoid including pure video posts)
        const musicPosts = posts.filter(post => {
          const hasExplicitMusic = post.audioSrc || post.audioTitle || post.purchaseLink;
          const hasAudioMedias = post.medias?.audios && post.medias.audios.length > 0;
          return hasExplicitMusic || hasAudioMedias;
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
                    playingPost={playingPost}
                    setPlayingPost={setPlayingPost}
                    sharedAudioRef={sharedAudioRef}
                    sharedCurrentTime={sharedCurrentTime}
                    sharedDuration={sharedDuration}
                    sharedIsPlaying={sharedIsPlaying && playingPost === (post.id)}
                    onSeek={handleSeek}
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
            <ProfileInfoSection profile={profile} />
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
                    playingPost={null}
                    setPlayingPost={() => {}}
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
      case "videos": {
        const videoPosts = (posts || []).filter((post) => {
          const hasVideoMedia = post.medias?.videos && post.medias.videos.length > 0;
          return hasVideoMedia || post.videoSrc;
        });

        return (
          <div className="flex flex-col gap-6">
            {postsLoading ? (
              <div className={cn("text-center py-12 text-muted-foreground")}>
                {t('common.loading')}
              </div>
            ) : videoPosts && videoPosts.length > 0 ? (
              <div className={cn("space-y-4")}>
                {videoPosts.map(post => (
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
                {t("publicProfile.noVideos") || t("publicProfile.noPosts")}
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
            <ProfileInfoSection profile={profile} />
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
      case "videos": {
        const videoPosts = (posts || []).filter((post) => {
          const hasVideoMedia = post.medias?.videos && post.medias.videos.length > 0;
          return hasVideoMedia || post.videoSrc;
        });

        return (
          <div className="flex flex-col gap-6">
            {postsLoading ? (
              <div className={cn("text-center py-12 text-muted-foreground")}>
                {t('common.loading')}
              </div>
            ) : videoPosts && videoPosts.length > 0 ? (
              <div className={cn("space-y-4")}>
                {videoPosts.map(post => (
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
                {t("publicProfile.noVideos") || t("publicProfile.noPosts")}
              </div>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  };

  const renderTabContent = () => {
    // Dùng các component tabs cũ cho cả own profile và profile của người khác
    const props = { profile, posts, postsLoading, activeTab, isOwnProfile };

    if (isBarProfile) {
      return renderBarTabContent();
    } else if (isDJProfile) {
      return renderDJTabContent();
    } else if (isDancerProfile) {
      return renderDancerTabContent();
    } else if (isCustomerProfile) {
      return renderCustomerTabContent();
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
        {!isOwnProfile && (
          <>
            {/* Request booking button - chỉ hiển thị cho DJ/Dancer (không phải own profile) */}
            {canRequestBooking && (
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
            )}
            {/* Chat button - hiển thị cho tất cả */}
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
                "w-10 h-10 rounded-xl font-medium",
                "bg-primary/10 text-primary border border-primary/30",
                "hover:bg-primary/20 hover:border-primary/50",
                "shadow-sm hover:shadow-md",
                "transition-all duration-200 ease-out",
                "active:scale-[0.98]",
                "flex items-center justify-center"
              )}
              title="Chat"
              aria-label="Chat"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <FollowButton
              followingId={followEntityId}
              followingType={profile.type === 'BAR' ? 'BAR' : 'USER'}
              onChange={(isFollowing) => {
                // isFollowing = true khi follow, false khi unfollow
                setProfile(p => ({
                  ...p,
                  isFollowing: isFollowing,
                  followersCount: isFollowing 
                    ? (p.followersCount || 0) + 1  // Tăng khi follow
                    : Math.max(0, (p.followersCount || 0) - 1),  // Giảm khi unfollow (không âm)
                }));
              }}
            />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setActionMenuOpen((prev) => !prev)}
                className={cn(
                  "w-10 h-10 rounded-xl border border-border/50 text-foreground/80",
                  "bg-background/80 backdrop-blur-sm flex items-center justify-center",
                  "hover:bg-background hover:border-border/70 hover:text-foreground",
                  "shadow-sm hover:shadow-md",
                  "transition-all duration-200 ease-out active:scale-[0.98]"
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
                    "overflow-hidden z-[9]"
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
                <ProfileStats followers={profile.followersCount} following={profile.followingCount} />

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

      {canRequestBooking && bookingOpen && (
        <RequestBookingModal
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          performerEntityAccountId={entityId}
          performerRole={(profile.role || profile.type || "").toString().toUpperCase().includes("DANCER") ? "DANCER" : "DJ"}
          performerProfile={{
            pricePerHours: profile.pricePerHours || profile.PricePerHours || profile.pricePerHour || profile.PricePerHour || 0,
            pricePerSession: profile.pricePerSession || profile.PricePerSession || 0,
          }}
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

    {/* Shared audio player bar for profile pages (reused like in feed) */}
    {activePlayer?.audioSrc && (
      <AudioPlayerBar
        audioSrc={activePlayer.audioSrc}
        audioTitle={activePlayer.audioTitle || activePlayer.title}
        artistName={activePlayer.artistName || activePlayer.user}
        thumbnail={activePlayer.thumbnail}
        isPlaying={playingPost === activePlayer.id}
        onPlayPause={() => {
          setPlayingPost(playingPost === activePlayer.id ? null : activePlayer.id);
        }}
        onClose={() => {
          setPlayingPost(null);
          setActivePlayer(null);
        }}
        sharedAudioRef={sharedAudioRef}
        sharedCurrentTime={sharedCurrentTime}
        sharedDuration={sharedDuration}
        onSeek={handleSeek}
      />
    )}

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

