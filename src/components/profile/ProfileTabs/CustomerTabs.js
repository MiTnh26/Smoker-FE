import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import PostCard from '../../../modules/feeds/components/post/PostCard';
import BarVideo from '../../../modules/bar/components/BarVideo';
import { ProfileInfoSection } from '../ProfileInfoSection';

export const CustomerTabs = ({ profile, posts, postsLoading, activeTab, entityId }) => {
  const { t } = useTranslation();

  switch (activeTab) {
    case 'info':
      return (
        <div className={cn('flex flex-col gap-6')}>
          <ProfileInfoSection profile={profile} />
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
                  key={post._id || post.id}
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
          <BarVideo barPageId={entityId} />
        </div>
      );
    default:
      return null;
  }
};

