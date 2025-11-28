import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import PostCard from '../../../modules/feeds/components/post/PostCard';
import BarEvent from '../../../modules/bar/components/BarEvent';
import BarMenu from '../../../modules/bar/components/BarMenuCombo';
import { ProfileInfoSection } from '../ProfileInfoSection';
import BarVideo from '../../../modules/bar/components/BarVideo';
import BarReview from '../../../modules/bar/components/BarReview';
import BarTables from '../../../modules/bar/components/BarTables';
import BarAdDashboard from '../../../modules/bar/components/BarAdDashboard';

export const BarTabs = ({ profile, posts, postsLoading, activeTab, barPageId, isOwnProfile, currentUserRole }) => {
  const { t } = useTranslation();
  
  // Debug log
  React.useEffect(() => {
    if (activeTab === 'ads') {
      console.log('[BarTabs] Rendering ads tab with barPageId:', barPageId, {
        barPageIdType: typeof barPageId,
        barPageIdLength: barPageId?.length,
        profile: profile ? {
          id: profile.id,
          BarPageId: profile.BarPageId,
          barPageId: profile.barPageId
        } : null
      });
    }
  }, [activeTab, barPageId, profile]);

  switch (activeTab) {
    case 'info':
      return (
        <div className={cn('flex flex-col gap-6')}>
          <ProfileInfoSection profile={profile} />
          <BarEvent barPageId={barPageId} />
          <div className={cn('bg-card rounded-lg p-6 border-[0.5px] border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]')}>
            <BarMenu barPageId={barPageId} />
          </div>
        </div>
      );
    case 'posts':
      return (
        <div className="flex flex-col gap-6">
          {postsLoading ? (
            <div className={cn('text-center py-12 text-muted-foreground')}>
              {t('common.loading')}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className={cn('space-y-4')}>
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                />
              ))}
            </div>
          ) : (
            <div
              className={cn(
                'text-center py-12 text-muted-foreground',
                'bg-card rounded-lg border-[0.5px] border-border/20 p-8'
              )}
            >
              {t('publicProfile.noPosts')}
            </div>
          )}
        </div>
      );
    case 'videos':
      return (
        <div className="profile-section">
          <BarVideo barPageId={barPageId} />
        </div>
      );
    case 'reviews':
      return (
        <div className="profile-section">
          <BarReview barPageId={barPageId} />
        </div>
      );
    case 'tables':
      const canCreateTables = isOwnProfile && currentUserRole === 'BAR';
      return (
        <div className="profile-section">
          <BarTables barPageId={barPageId} readOnly={!canCreateTables} />
        </div>
      );
    case 'ads':
      // Chỉ hiển thị cho bar owner
      if (!isOwnProfile) return null;
      return (
        <div className="profile-section">
          <BarAdDashboard barPageId={barPageId} />
        </div>
      );
    default:
      return null;
  }
};

