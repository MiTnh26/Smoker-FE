import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import PostCard from '../../../modules/feeds/components/post/PostCard';
import BarEvent from '../../../modules/bar/components/BarEvent';
import BarMenu from '../../../modules/bar/components/BarMenuCombo';
import { ProfileInfoSection, ProfilePostsSection } from '../ProfileInfoSection';
import BarVideo from '../../../modules/bar/components/BarVideo';
import BarReview from '../../../modules/bar/components/BarReview';
import BarTables from '../../../modules/bar/components/BarTables';
import BarAdDashboard from '../../../modules/bar/components/BarAdDashboard';
import BarBookingList from '../../../modules/bar/components/BarBookingList';

export const BarTabs = ({ profile, posts, postsLoading, activeTab, barPageId, isOwnProfile, currentUserRole, onEdit, onDelete, onImageClick }) => {
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
          <ProfilePostsSection 
            posts={posts}
            postsLoading={postsLoading}
            onImageClick={onImageClick}
            onReport={null}
            onEdit={onEdit}
            onDelete={onDelete}
            isOwnProfile={isOwnProfile}
          />
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
          <div className={cn('flex flex-col gap-1.5 -mx-4 md:-mx-6')}>
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
    case 'images': {
      // Lọc tất cả ảnh từ posts có medias.images
      const allImages = [];
      (posts || []).forEach(post => {
        if (post.medias?.images && post.medias.images.length > 0) {
          post.medias.images.forEach(image => {
            allImages.push({
              ...image,
              postId: post.id || post._id,
              post: post
            });
          });
        }
      });

      return (
        <div className="flex flex-col gap-6">
          {postsLoading ? (
            <div className={cn('text-center py-12 text-muted-foreground')}>
              {t('common.loading')}
            </div>
          ) : allImages && allImages.length > 0 ? (
            <div className={cn('grid grid-cols-3 gap-0 -mx-4 md:-mx-6')}>
              {allImages.map((image, idx) => (
                <div
                  key={`${image.postId}-${image.id || idx}`}
                  className={cn(
                    'relative aspect-square overflow-hidden cursor-pointer',
                    'bg-card group rounded-lg',
                    'border-[0.5px] border-border/20',
                    'shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                  )}
                  onClick={() => {
                    if (onImageClick) {
                      onImageClick({
                        imageUrl: image.url,
                        postId: image.postId,
                        mediaId: image.id || image._id,
                        allImages: allImages.map(img => ({ url: img.url, _id: img.id || img._id })),
                        currentIndex: idx
                      });
                    }
                  }}
                >
                  <img
                    src={image.url}
                    alt=""
                    className={cn(
                      'w-full h-full object-cover transition-transform duration-200',
                      'group-hover:scale-105'
                    )}
                    loading="lazy"
                  />
                  <div className={cn(
                    'absolute inset-0 bg-black/0 group-hover:bg-black/10',
                    'transition-colors duration-200'
                  )} />
                </div>
              ))}
            </div>
          ) : (
            <div
              className={cn(
                'text-center py-12 text-muted-foreground',
                'bg-card rounded-lg border-[0.5px] border-border/20 p-8'
              )}
            >
              {t('publicProfile.noImages') || t('publicProfile.noPosts')}
            </div>
          )}
        </div>
      );
    }
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
    case 'bookings':
      return (
        <div className="profile-section">
          <BarBookingList barPageId={barPageId} isOwnProfile={isOwnProfile} />
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

