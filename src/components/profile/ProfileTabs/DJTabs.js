import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import { DollarSign } from 'lucide-react';
import PostCard from '../../../modules/feeds/components/post/PostCard';
import PerformerReviews from '../../../modules/business/components/PerformerReviews';
import { ProfileInfoSection, ProfilePostsSection } from '../ProfileInfoSection';

export const DJTabs = ({ profile, posts, postsLoading, activeTab, performerTargetId, isOwnProfile, onEdit, onDelete, onImageClick }) => {
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
          <ProfilePostsSection 
            posts={posts}
            postsLoading={postsLoading}
            onImageClick={onImageClick}
            onReport={null}
            onEdit={onEdit}
            onDelete={onDelete}
            isOwnProfile={isOwnProfile}
          />
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
                  playingPost={null}
                  setPlayingPost={() => {}}
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
    case 'music': {
      const musicPosts = posts.filter(post => {
        const hasExplicitMusic = post.audioSrc || post.audioTitle || post.purchaseLink;
        const hasAudioMedias = post.medias?.audios && post.medias.audios.length > 0;
        return hasExplicitMusic || hasAudioMedias;
      });
      
      return (
        <div className={cn('flex flex-col gap-6')}>
          {postsLoading ? (
            <div className={cn('text-center py-12 text-muted-foreground')}>
              {t('common.loading')}
            </div>
          ) : musicPosts && musicPosts.length > 0 ? (
            <div className={cn('flex flex-col gap-1.5 -mx-4 md:-mx-6')}>
              {musicPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  isOwnProfile={isOwnProfile}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onImageClick={onImageClick}
                  playingPost={null}
                  setPlayingPost={() => {}}
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
              <p>{t('profile.musicTab')}</p>
              <p className={cn('text-sm mt-2')}>Chưa có bài nhạc nào</p>
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
              performerRole={profile.role || 'DJ'}
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

