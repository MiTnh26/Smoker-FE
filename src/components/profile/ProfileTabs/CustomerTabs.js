import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import PostCard from '../../../modules/feeds/components/post/PostCard';
import { ProfileInfoSection, ProfilePostsSection } from '../ProfileInfoSection';

export const CustomerTabs = ({
  profile,
  posts,
  postsLoading,
  activeTab,
  entityId,
  playingPost,
  setPlayingPost,
  sharedAudioRef,
  sharedCurrentTime,
  sharedDuration,
  sharedIsPlaying,
  handleSeek,
  setActivePlayer,
  onEdit,
  onDelete,
  isOwnProfile,
  onImageClick,
}) => {
  const { t } = useTranslation();

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
            playingPost={playingPost}
            setPlayingPost={setPlayingPost}
            sharedAudioRef={sharedAudioRef}
            sharedCurrentTime={sharedCurrentTime}
            sharedDuration={sharedDuration}
            sharedIsPlaying={sharedIsPlaying}
            onSeek={handleSeek}
            setActivePlayer={setActivePlayer}
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
                  key={post._id || post.id}
                  post={post}
                  isOwnProfile={isOwnProfile}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onImageClick={onImageClick}
                  playingPost={playingPost}
                  setPlayingPost={(id) => {
                    setPlayingPost?.(id);
                    if (id === (post.id || post._id)) {
                      setActivePlayer?.(post);
                    } else if (!id) {
                      setActivePlayer?.(null);
                    }
                  }}
                  sharedAudioRef={sharedAudioRef}
                  sharedCurrentTime={sharedCurrentTime}
                  sharedDuration={sharedDuration}
                  sharedIsPlaying={sharedIsPlaying && playingPost === (post.id || post._id)}
                  onSeek={handleSeek}
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
              postId: post._id || post.id,
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
            <div className={cn('flex flex-col gap-1.5 -mx-4 md:-mx-6')}>
              {videoPosts.map(post => (
                <PostCard
                  key={post._id || post.id}
                  post={post}
                  isOwnProfile={isOwnProfile}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onImageClick={onImageClick}
                  playingPost={playingPost}
                  setPlayingPost={(id) => {
                    setPlayingPost?.(id);
                    if (id === (post.id || post._id)) {
                      setActivePlayer?.(post);
                    } else if (!id) {
                      setActivePlayer?.(null);
                    }
                  }}
                  sharedAudioRef={sharedAudioRef}
                  sharedCurrentTime={sharedCurrentTime}
                  sharedDuration={sharedDuration}
                  sharedIsPlaying={sharedIsPlaying && playingPost === (post.id || post._id)}
                  onSeek={handleSeek}
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
              {t('publicProfile.noVideos') || t('publicProfile.noPosts')}
            </div>
          )}
        </div>
      );
    }
    default:
      return null;
  }
};

