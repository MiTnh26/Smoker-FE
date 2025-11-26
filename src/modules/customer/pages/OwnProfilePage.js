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

// A new hook to fetch profile data based on type
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
          const publicProfileData = normalizeProfileData(publicProfileRes?.data);
          const barPageId = publicProfileData?.barPageId;

          if (!barPageId) {
            throw new Error('Could not resolve BarPageId from EntityAccountId');
          }

          // Then, fetch the full bar page details using the correct BarPageId.
          res = await barPageApi.getBarPageById(barPageId);
          break;
        }
        case 'BusinessAccount': {
          // Similar to BarPage, resolve the BusinessAccountId from the EntityAccountId
          const publicProfileRes = await publicProfileApi.getByEntityId(entityId);
          const businessAccountId = publicProfileRes?.data?.id || publicProfileRes?.data?.Id;

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
  const { posts, loading: postsLoading } = useProfilePosts(currentUserEntityId);
  const { followers, fetchFollowers } = useFollowers(currentUserEntityId);
  const { following, fetchFollowing } = useFollowing(currentUserEntityId);
  const profileType = useProfileType(profile);

  const [activeTab, setActiveTab] = useState('info');
  const [showEditModal, setShowEditModal] = useState(false);

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
  
  const barPageId = isBarProfile ? profile?.id : null;

  const renderTabContent = () => {
    const props = { profile, posts, postsLoading, activeTab, isOwnProfile: true, entityId: currentUserEntityId };
    if (isBarProfile) return <BarTabs {...props} barPageId={barPageId} currentUserRole={profile?.role || profile?.Role} />;
    if (isDJProfile) return <DJTabs {...props} performerTargetId={performerTargetId} />;
    if (isDancerProfile) return <DancerTabs {...props} performerTargetId={performerTargetId} entityId={currentUserEntityId} />;
    if (isCustomerProfile) return <CustomerTabs {...props} entityId={currentUserEntityId} />;
    return null;
  };

  if (loading || !profile) {
    return <div className="min-h-screen bg-background flex items-center justify-center">{t('publicProfile.loading')}</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-background flex items-center justify-center">{error}</div>;
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

