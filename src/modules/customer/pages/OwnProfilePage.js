import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import { useCurrentUserEntity } from '../../../hooks/useCurrentUserEntity';
import { useProfilePosts } from '../../../hooks/useProfilePosts';
import { useFollowers, useFollowing } from '../../../hooks/useFollow';
import { useProfileType } from '../../../hooks/useProfileType';
import { userApi } from '../../../api/userApi';
import barPageApi from '../../../api/barPageApi';
import businessApi from '../../../api/businessApi';
import publicProfileApi from '../../../api/publicProfileApi';
import { ProfileHeader } from '../../../components/profile/ProfileHeader';
import { ProfileStats } from '../../../components/profile/ProfileStats';
import { CustomerTabs, BarTabs, DJTabs, DancerTabs } from '../../../components/profile/ProfileTabs';
import ProfileEditModal from '../../../components/profile/ProfileEditModal';
import { normalizeProfileData } from '../../../utils/profileDataMapper';
import bookingApi from '../../../api/bookingApi';
import DJBookingRequests from '../../dj/components/DJBookingRequests';

// A new hook to fetch profile data based on type
const unwrapProfileResponse = (response) => {
  if (!response) return null;
  return response?.data?.data || response?.data || response;
};

const useProfileData = (profileType, entityId) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      switch (profileType) {
        case 'Account':
          res = await userApi.me();
          break;
        case 'BarPage': {
          // For BarPage, the entityId is the Bar's EntityAccountId.
          // We need to get the BarPageId from the public profile endpoint first.
          const publicProfileRes = await publicProfileApi.getByEntityId(entityId);
          
          console.log('[OwnProfilePage] publicProfileRes:', {
            success: publicProfileRes?.success,
            data: publicProfileRes?.data ? {
              targetId: publicProfileRes.data.targetId,
              targetType: publicProfileRes.data.targetType,
              BarPageId: publicProfileRes.data.BarPageId,
              barPageId: publicProfileRes.data.barPageId,
              id: publicProfileRes.data.id
            } : null
          });
          
          const publicProfileData = normalizeProfileData(publicProfileRes?.data);
          
          // getByEntityId returns targetId which is the BarPageId for BarPage
          // Try multiple sources for barPageId (prioritize targetId from API response)
          const rawData = publicProfileRes?.data || {};
          const barPageId = rawData.targetId ||  // Primary source from API
                           publicProfileData?.BarPageId || 
                           publicProfileData?.barPageId || 
                           publicProfileData?.barPageID ||
                           publicProfileData?.BarPageID ||
                           publicProfileData?.targetId ||
                           publicProfileData?.targetID ||
                           publicProfileData?.id;

          console.log('[OwnProfilePage] Resolved barPageId:', {
            barPageId,
            barPageIdType: typeof barPageId,
            barPageIdLength: barPageId?.length,
            rawDataTargetId: rawData.targetId,
            normalizedData: {
              BarPageId: publicProfileData?.BarPageId,
              barPageId: publicProfileData?.barPageId,
              id: publicProfileData?.id,
              targetId: publicProfileData?.targetId
            }
          });

          if (!barPageId) {
            console.error('[OwnProfilePage] Could not resolve BarPageId. Full response:', publicProfileRes);
            throw new Error('Could not resolve BarPageId from EntityAccountId');
          }

          // Validate GUID format
          const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!guidRegex.test(barPageId)) {
            console.error('[OwnProfilePage] Invalid GUID format for barPageId:', barPageId);
            throw new Error(`Invalid BarPageId format: ${barPageId}`);
          }

          // Then, fetch the full bar page details using the correct BarPageId.
          console.log('[OwnProfilePage] Calling barPageApi.getBarPageById with:', barPageId);
          res = await barPageApi.getBarPageById(barPageId);
          break;
        }
        case 'BusinessAccount': {
          // Similar to BarPage, resolve the BusinessAccountId from the EntityAccountId
          const publicProfileRes = await publicProfileApi.getByEntityId(entityId);
          const publicProfilePayload = unwrapProfileResponse(publicProfileRes);
          const normalizedProfile = normalizeProfileData(publicProfilePayload);
          const businessAccountId =
            normalizedProfile?.businessAccountId ||
            normalizedProfile?.BusinessAccountId ||
            normalizedProfile?.id ||
            normalizedProfile?.Id ||
            normalizedProfile?.entityId ||
            normalizedProfile?.EntityId;

          if (!businessAccountId) {
            throw new Error('Could not resolve BusinessAccountId from EntityAccountId');
          }

          // Then, fetch the full business details using the correct BusinessAccountId.
          res = await businessApi.getBusinessById(businessAccountId);
          break;
        }
        default:
          throw new Error('Invalid profile type');
      }
      if (res && res.status === 'success' && res.data) {
        // Normalize profile data for consistency
        const normalizedData = normalizeProfileData(res.data);
        // Preserve EntityAccountId from entityId
        normalizedData.EntityAccountId = entityId;
        normalizedData.entityAccountId = entityId;
        
        // For BarPage, ensure BarPageId is set correctly
        // res.data should have BarPageId field from barPageApi.getBarPageById()
        if (profileType === 'BarPage' && res.data && res.data.BarPageId) {
          normalizedData.BarPageId = res.data.BarPageId;
          normalizedData.barPageId = res.data.BarPageId;
          normalizedData.id = res.data.BarPageId; // Also set id to BarPageId for consistency
        }
        
        console.log('[OwnProfilePage] Normalized profile data:', {
          barPageId: normalizedData.BarPageId || normalizedData.barPageId,
          id: normalizedData.id,
          hasBarPageId: !!(normalizedData.BarPageId || normalizedData.barPageId)
        });
        
        setProfile(normalizedData);
      } else {
        setError('Failed to load profile');
      }
    } catch (e) {
      setError(e.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [profileType, entityId]);

  useEffect(() => {
    if (entityId) {
      fetchProfile();
    }
  }, [entityId, fetchProfile]);

  return { profile, loading, error, fetchProfile };
};

export default function OwnProfilePage({ profileType: initialProfileType }) {
  const { t } = useTranslation();
  const currentUserEntityId = useCurrentUserEntity();
  const { profile, loading, error, fetchProfile } = useProfileData(initialProfileType, currentUserEntityId);
  const profileEntityAccountId = profile?.EntityAccountId || profile?.entityAccountId || currentUserEntityId;
  const { posts, loading: postsLoading } = useProfilePosts(profileEntityAccountId, currentUserEntityId);
  const { followers, fetchFollowers } = useFollowers(currentUserEntityId);
  const { following, fetchFollowing } = useFollowing(currentUserEntityId);
  const profileType = useProfileType(profile);

  const [activeTab, setActiveTab] = useState('info');
  const [showEditModal, setShowEditModal] = useState(false);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);

  useEffect(() => {
    if (currentUserEntityId) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [currentUserEntityId, fetchFollowers, fetchFollowing]);

  const handleProfileUpdate = () => {
    fetchProfile(); // Refetch profile data after update
    fetchFollowers();
    fetchFollowing();
  };

  // Use profileType hook results
  const isBarProfile = profileType.isBar;
  const isDJProfile = profileType.isDJ;
  const isDancerProfile = profileType.isDancer;
  const isCustomerProfile = profileType.isCustomer;
  
  const performerTargetId = (profileType.isPerformer)
    ? profile?.targetId || profile?.targetID || profile?.businessAccountId || profile?.BusinessAccountId || currentUserEntityId
    : null;
  
  // Get barPageId for bar profile - try multiple sources
  const barPageId = isBarProfile ? (
    profile?.BarPageId || 
    profile?.barPageId || 
    profile?.barPageID ||
    profile?.BarPageID ||
    profile?.id ||  // Fallback to id
    null
  ) : null;

  useEffect(() => {
    if (!isDJProfile || !profileEntityAccountId) {
      setPendingBookingsCount(0);
      return undefined;
    }

    let cancelled = false;

    const fetchPendingCount = async () => {
      try {
        const res = await bookingApi.getBookingsByReceiver(profileEntityAccountId, { limit: 100 });
        const bookings = res.data?.data || res.data || [];
        if (!cancelled) {
          const pendingCount = bookings.filter(
            (booking) => (booking.scheduleStatus || booking.ScheduleStatus) === 'Pending'
          ).length;
          setPendingBookingsCount(pendingCount);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[OwnProfilePage] Failed to fetch pending bookings count:', err);
        }
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isDJProfile, profileEntityAccountId]);

  const renderTabContent = () => {
    const props = { profile, posts, postsLoading, activeTab, isOwnProfile: true, entityId: currentUserEntityId };
    if (isBarProfile) return <BarTabs {...props} barPageId={barPageId} currentUserRole={profile?.role || profile?.Role} />;
    if (isDJProfile) {
      if (activeTab === 'bookings') {
        return (
          <div className={cn('flex flex-col gap-6')}>
            <DJBookingRequests performerEntityAccountId={profileEntityAccountId} />
          </div>
        );
      }
      return <DJTabs {...props} performerTargetId={performerTargetId} />;
    }
    if (isDancerProfile) return <DancerTabs {...props} performerTargetId={performerTargetId} entityId={currentUserEntityId} />;
    if (isCustomerProfile) return <CustomerTabs {...props} entityId={currentUserEntityId} />;
    return null;
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">{t('publicProfile.loading')}</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-background flex items-center justify-center">{error}</div>;
  }

  if (!profile) {
    return <div className="min-h-screen bg-background flex items-center justify-center">{t('publicProfile.notFound')}</div>;
  }

  return (
    <div className={cn('min-h-screen bg-background')}>
      <ProfileHeader
        background={profile.background || profile.Background}
        avatar={profile.avatar || profile.Avatar}
        name={profile.BarName || profile.barName || profile.userName || profile.name || profile.Name || ''}
        role={profile.role || profile.Role || 'USER'}
      >
        <button
          onClick={() => setShowEditModal(true)}
          className={cn(
            'px-4 py-2 rounded-lg font-semibold text-sm',
            'bg-card/80 backdrop-blur-sm text-foreground border-none',
            'hover:bg-card/90 transition-all duration-200',
            'active:scale-95',
            'flex items-center gap-2'
          )}
        >
          <i className="bx bx-edit text-base"></i>
          {t('profile.editProfile')}
        </button>
      </ProfileHeader>

      <div className={cn('max-w-6xl mx-auto px-4 md:px-6 py-6')}>
        <ProfileStats followers={followers} following={following} />
        
        {/* Tabs Section */}
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
            
            {/* Booking Tab - DJ only */}
            {isDJProfile && (
              <button
                onClick={() => setActiveTab("bookings")}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                  "transition-all duration-200 relative whitespace-nowrap",
                  "flex items-center gap-2",
                  activeTab === "bookings"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t('profile.bookingsTab') || "Yêu cầu booking"}
                {pendingBookingsCount > 0 && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-bold",
                      "flex items-center justify-center min-w-[20px]"
                    )}
                    style={{
                      backgroundColor: "rgb(var(--danger))",
                      color: "white"
                    }}
                  >
                    {pendingBookingsCount > 99 ? "99+" : pendingBookingsCount}
                  </span>
                )}
                {activeTab === "bookings" && (
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
            
            {/* Ads Tab - Bar only (for bar owners) */}
            {isBarProfile && (
              <button
                onClick={() => setActiveTab("ads")}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-none bg-transparent",
                  "transition-all duration-200 relative whitespace-nowrap",
                  activeTab === "ads"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Quảng cáo
                {activeTab === "ads" && (
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

      {showEditModal && (
        <ProfileEditModal
          profile={profile}
          profileType={profileType.type}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleProfileUpdate}
        />
      )}
    </div>
  );
}

