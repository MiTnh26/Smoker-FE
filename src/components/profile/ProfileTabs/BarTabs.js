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
// NOTE: Bar booking list + ad dashboard have been moved to sidebar pages.
// We keep bar profile tabs focused on public profile content only.

export const BarTabs = ({ profile, posts, postsLoading, activeTab, barPageId, isOwnProfile, currentUserRole, onEdit, onDelete, onImageClick }) => {
  const { t } = useTranslation();
  
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
          <div className={cn('space-y-4 -mx-4 md:-mx-6')}>
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  isOwnProfile={isOwnProfile}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onImageClick={onImageClick}
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
    default:
      return null;
  }
};

