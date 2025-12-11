import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import { DollarSign } from 'lucide-react';
import PostCard from '../../../modules/feeds/components/post/PostCard';
import PerformerReviews from '../../../modules/business/components/PerformerReviews';
import BarVideo from '../../../modules/bar/components/BarVideo';
import { ProfileInfoSection } from '../ProfileInfoSection';

export const DancerTabs = ({ profile, posts, postsLoading, activeTab, performerTargetId, isOwnProfile, entityId, onEdit, onDelete, onImageClick }) => {
  const { t } = useTranslation();

  switch (activeTab) {
    case 'info':
      return (
        <div className={cn('flex flex-col gap-6')}>
          {(profile.pricePerHours || profile.pricePerSession) && (
            <div
              className={cn(
                'bg-gradient-to-br from-primary/20 to-primary/5',
                'rounded-lg p-6 border-[0.5px] border-primary/30',
                'shadow-[0_2px_8px_rgba(0,0,0,0.1)]'
              )}
            >
              <h3 className={cn('text-xl font-bold text-foreground mb-4 flex items-center gap-2')}>
                <DollarSign className="w-5 h-5" />
                {t('profile.priceTable')}
              </h3>
              <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
                {profile.pricePerHours && (
                  <div className={cn('bg-card rounded-lg p-4 border border-border/20')}>
                    <p className={cn('text-sm text-muted-foreground mb-1')}>
                      {t('profile.pricePerHour')}
                    </p>
                    <p className={cn('text-2xl font-bold text-primary')}>
                      {Number.parseInt(profile.pricePerHours || 0, 10).toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                )}
                {profile.pricePerSession && (
                  <div className={cn('bg-card rounded-lg p-4 border border-border/20')}>
                    <p className={cn('text-sm text-muted-foreground mb-1')}>
                      {t('profile.pricePerSession')}
                    </p>
                    <p className={cn('text-2xl font-bold text-primary')}>
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
                <PostCard key={post.id} post={post} isOwnProfile={isOwnProfile} onEdit={onEdit} onDelete={onDelete} onImageClick={onImageClick} />
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
    case 'videos': {
      const videoPosts = (posts || []).filter((post) => {
        const hasVideoMedia = post.medias?.videos && post.medias.videos.length > 0;
        return hasVideoMedia || post.videoSrc;
      });

      return (
        <div className="flex flex-col gap-6">
          {postsLoading ? (
            <div className={cn('text-center py-12 text-muted-foreground')}>
              {t('common.loading')}
            </div>
          ) : videoPosts && videoPosts.length > 0 ? (
            <div className={cn('space-y-4')}>
              {videoPosts.map(post => (
                <PostCard key={post.id} post={post} isOwnProfile={isOwnProfile} onEdit={onEdit} onDelete={onDelete} onImageClick={onImageClick} />
              ))}
            </div>
          ) : (
            <div
              className={cn(
                'text-center py-12 text-muted-foreground',
                'bg-card rounded-lg border-[0.5px] border-border/20 p-8'
              )}
            >
              {t('publicProfile.noVideos') || t('publicProfile.noPosts')}
            </div>
          )}
        </div>
      );
    }
    case 'reviews':
      return (
        <div className={cn('flex flex-col gap-6')}>
          {performerTargetId && (
            <PerformerReviews
              businessAccountId={performerTargetId}
              performerName={profile.name}
              performerRole={profile.role || 'Dancer'}
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

