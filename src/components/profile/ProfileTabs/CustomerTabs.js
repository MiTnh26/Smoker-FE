import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import PostCard from '../../../modules/feeds/components/post/PostCard';
import { ProfileInfoSection } from '../ProfileInfoSection';

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

