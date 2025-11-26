import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { cn } from "../../../../utils/cn";

export default function TrashModal({ open, posts, loading, onClose, onRestore, onClear }) {
  const { t, i18n } = useTranslation();
  
  if (!open) return null;

  // Helper function to extract medias from Map/Object/Array (reused from PostFeed.js)
  const extractMedias = (medias) => {
    if (!medias) return { images: [], videos: [], audios: [] };
    
    const images = [];
    const videos = [];
    const audios = [];
    
    // Handle Array (from populated mediaIds)
    if (Array.isArray(medias)) {
      for (const mediaItem of medias) {
        if (!mediaItem?.url) continue;
        
        const originalUrl = mediaItem.url;
        const caption = mediaItem.caption || "";
        
        const mediaData = {
          id: mediaItem._id || mediaItem.id || null,
          url: originalUrl,
          caption,
          uploadDate: mediaItem.uploadDate || mediaItem.createdAt || null,
          type: mediaItem.type || null
        };
        
        // Ưu tiên check type field từ backend (đã được set đúng)
        if (mediaItem.type === 'audio') {
          audios.push(mediaData);
        } else if (mediaItem.type === 'video') {
          videos.push(mediaData);
        } else if (mediaItem.type === 'image') {
          images.push(mediaData);
        } else {
          // Fallback: detect từ URL nếu không có type field
          const url = originalUrl.toLowerCase();
          const isAudio = url.includes('.mp3') || 
                         url.includes('.wav') || 
                         url.includes('.m4a') ||
                         url.includes('.ogg') ||
                         url.includes('.aac') ||
                         url.includes('audio');
          
          const isVideo = !isAudio && (
                         url.includes('.mp4') || 
                         url.includes('.webm') || 
                         url.includes('.mov') ||
                         url.includes('.avi') ||
                         url.includes('.mkv') ||
                         url.includes('video') ||
                         mediaItem.resource_type === 'video');
          
          if (isAudio) {
            audios.push(mediaData);
          } else if (isVideo) {
            videos.push(mediaData);
          } else {
            // Default to image
            images.push(mediaData);
          }
        }
      }
      return { images, videos, audios };
    }
    
    // Handle both Map (MongoDB) and plain Object
    const mediasEntries = medias instanceof Map 
      ? Array.from(medias.entries())
      : Object.entries(medias || {});
    
    for (const [key, mediaItem] of mediasEntries) {
      if (!mediaItem?.url) continue;
      
      const url = mediaItem.url.toLowerCase();
      const originalUrl = mediaItem.url; // Keep original case
      const caption = mediaItem.caption || "";
      
      const mediaData = {
        id: key,
        url: originalUrl,
        caption,
        uploadDate: mediaItem.uploadDate || null
      };
      
      // Check for audio files first (most specific)
      const isAudio = url.includes('.mp3') || 
                     url.includes('.wav') || 
                     url.includes('.m4a') ||
                     url.includes('.ogg') ||
                     url.includes('.aac') ||
                     url.includes('audio');
      
      // Then check for video files (exclude if it's audio)
      const isVideo = !isAudio && (
                     url.includes('.mp4') || 
                     url.includes('.webm') || 
                     url.includes('.mov') ||
                     url.includes('.avi') ||
                     url.includes('.mkv') ||
                     url.includes('video') ||
                     mediaItem.type === 'video' ||
                     mediaItem.resource_type === 'video');
      
      if (isAudio) {
        audios.push(mediaData);
      } else if (isVideo) {
        videos.push(mediaData);
      } else {
        // Default to image if not audio or video
        images.push(mediaData);
      }
    }
    
    return { images, videos, audios };
  };

  // Count likes from Map/Object/Array/Number
  const countLikes = (likes) => {
    if (!likes) return 0;
    // Handle Map (trước khi toObject)
    if (likes instanceof Map) {
      return likes.size;
    }
    // Handle object (sau khi toObject từ Map)
    if (typeof likes === 'object' && !Array.isArray(likes)) {
      return Object.keys(likes).length;
    }
    // Handle Array
    if (Array.isArray(likes)) {
      return likes.length;
    }
    // Handle number (nếu đã được count sẵn)
    if (typeof likes === 'number') {
      return likes;
    }
    return 0;
  };

  // Count comments including replies
  const countComments = (comments) => {
    if (!comments) return 0;
    let total = 0;
    // Handle Map
    if (comments instanceof Map) {
      for (const [, c] of comments.entries()) {
        total += 1;
        const replies = c?.replies;
        if (replies) {
          if (replies instanceof Map) {
            total += replies.size;
          } else if (Array.isArray(replies)) {
            total += replies.length;
          } else if (typeof replies === 'object') {
            total += Object.keys(replies).length;
          }
        }
      }
      return total;
    }
    // Handle Array of comments
    if (Array.isArray(comments)) {
      for (const c of comments) {
        total += 1;
        const replies = c?.replies;
        if (replies) {
          if (replies instanceof Map) {
            total += replies.size;
          } else if (Array.isArray(replies)) {
            total += replies.length;
          } else if (typeof replies === 'object') {
            total += Object.keys(replies).length;
          }
        }
      }
      return total;
    }
    // Handle plain object map
    if (typeof comments === 'object') {
      for (const key of Object.keys(comments)) {
        const c = comments[key];
        if (!c || typeof c !== 'object') continue;
        total += 1;
        const replies = c?.replies;
        if (replies) {
          if (replies instanceof Map) {
            total += replies.size;
          } else if (Array.isArray(replies)) {
            total += replies.length;
          } else if (typeof replies === 'object') {
            total += Object.keys(replies).length;
          }
        }
      }
      return total;
    }
    return 0;
  };

  // Format relative time
  const formatRelativeTime = (date) => {
    try {
      const d = date ? new Date(date) : new Date();
      if (isNaN(d.getTime())) return new Date().toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US');
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      if (diffMs < 0) return d.toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US');
      
      const minutes = Math.floor(diffMs / 60000);
      if (minutes < 1) return t('time.justNow');
      if (minutes < 60) return t('time.minutesAgo', { minutes });
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return t('time.hoursAgo', { hours });
      
      const days = Math.floor(hours / 24);
      if (days < 30) {
        if (i18n.language === 'vi') {
          return `${days} ngày trước`;
        }
        return `${days} days ago`;
      }
      
      return d.toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US');
    } catch {
      return new Date().toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US');
    }
  };

  // Format trashed time
  const formatTrashedTime = (date) => {
    try {
      const d = date ? new Date(date) : new Date();
      if (isNaN(d.getTime())) return t('modal.trashedJustNow') || 'Vừa xóa';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      if (diffMs < 0) return t('modal.trashedJustNow') || 'Vừa xóa';
      
      const minutes = Math.floor(diffMs / 60000);
      if (minutes < 1) return t('modal.trashedJustNow') || 'Vừa xóa';
      if (minutes < 60) return t('modal.trashedMinutesAgo', { minutes }) || `Đã xóa ${minutes} phút trước`;
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return t('modal.trashedHoursAgo', { hours }) || `Đã xóa ${hours} giờ trước`;
      
      const days = Math.floor(hours / 24);
      return t('modal.trashedDaysAgo', { days }) || `Đã xóa ${days} ngày trước`;
    } catch {
      return t('modal.trashedJustNow') || 'Vừa xóa';
    }
  };

  // Get post type: music/image/video/text
  const getPostType = (post) => {
    // Check for audio/music first
    const isAudioUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      const u = url.toLowerCase();
      return (
        u.includes('.mp3') ||
        u.includes('.m4a') ||
        u.includes('.wav') ||
        u.includes('.ogg') ||
        u.includes('.aac')
      );
    };

    // Check populated music/song objects
    const populatedMusic = (post.musicId && typeof post.musicId === 'object') ? post.musicId : 
                          (post.music && typeof post.music === 'object') ? post.music : null;
    const populatedSong = (post.songId && typeof post.songId === 'object') ? post.songId : 
                          (post.song && typeof post.song === 'object') ? post.song : null;

    // Check for audio URL in various fields
    const audioFromMusic = populatedMusic ? [
      populatedMusic.audioUrl,
      populatedMusic.streamUrl,
      populatedMusic.fileUrl,
      populatedMusic.url,
      populatedMusic.sourceUrl,
      populatedMusic.downloadUrl,
    ].find(isAudioUrl) : null;

    const audioFromSong = populatedSong ? [
      populatedSong.audioUrl,
      populatedSong.streamUrl,
      populatedSong.fileUrl,
      populatedSong.url,
      populatedSong.sourceUrl,
      populatedSong.downloadUrl,
    ].find(isAudioUrl) : null;

    const extractedMedias = extractMedias(post.medias);
    const audioFromMedias = extractedMedias.audios?.[0]?.url;

    const hasAudio = post.audioSrc || audioFromMusic || audioFromSong || audioFromMedias || isAudioUrl(post.audioUrl);

    if (hasAudio) return 'music';

    // Check images
    if (extractedMedias.images.length > 0) return 'image';

    // Check videos
    if (extractedMedias.videos.length > 0) return 'video';

    // Default to text
    return 'text';
  };

  // Get media thumbnail URL
  const getMediaThumbnail = (post, postType) => {
    if (postType === 'music') {
      const populatedMusic = (post.musicId && typeof post.musicId === 'object') ? post.musicId : 
                            (post.music && typeof post.music === 'object') ? post.music : null;
      const populatedSong = (post.songId && typeof post.songId === 'object') ? post.songId : 
                            (post.song && typeof post.song === 'object') ? post.song : null;
      
      return populatedMusic?.coverUrl || 
             populatedSong?.coverUrl || 
             post.thumbnail || 
             post.musicBackgroundImage || 
             null;
    }
    
    if (postType === 'image') {
      const extractedMedias = extractMedias(post.medias);
      return extractedMedias.images?.[0]?.url || null;
    }
    
    if (postType === 'video') {
      const extractedMedias = extractMedias(post.medias);
      return extractedMedias.videos?.[0]?.thumbnail || 
             extractedMedias.videos?.[0]?.poster || 
             null;
    }
    
    return null;
  };

  // Transform post for display
  const transformPost = (post) => {
    const extractedMedias = extractMedias(post.medias);
    const postType = getPostType(post);
    const thumbnail = getMediaThumbnail(post, postType);
    
    return {
      id: post._id || post.postId || post.id,
      authorName: post.authorName || post.author?.userName || post.account?.userName || 'Người dùng',
      authorAvatar: post.authorAvatar || post.author?.avatar || post.account?.avatar || null,
      content: post.content || post.caption || post.title || '',
      postType,
      thumbnail,
      likes: countLikes(post.likes),
      comments: countComments(post.comments),
      createdAt: post.createdAt,
      trashedAt: post.trashedAt,
      medias: extractedMedias,
    };
  };

  // Get post type icon and label
  const getPostTypeInfo = (postType) => {
    switch (postType) {
      case 'music':
        return { icon: '🎵', label: t('modal.postTypeMusic') || 'Âm nhạc' };
      case 'image':
        return { icon: '🖼️', label: t('modal.postTypeImage') || 'Ảnh' };
      case 'video':
        return { icon: '🎥', label: t('modal.postTypeVideo') || 'Video' };
      default:
        return { icon: '📝', label: t('modal.postTypeText') || 'Bài viết' };
    }
  };

  // Truncate content
  const truncateContent = (content, maxLength = 120) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  return (
    <div 
      className={cn(
        "fixed inset-0 bg-black/75 backdrop-blur-xl z-[1000]",
        "flex items-center justify-center p-4"
      )}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      tabIndex={-1}
    >
      <div 
        className={cn(
          "w-full max-w-[680px] max-h-[90vh] bg-card text-card-foreground",
          "rounded-lg border-[0.5px] border-border/20 shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
          "overflow-hidden flex flex-col relative"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          "p-5 border-b border-border/30 font-semibold text-lg",
          "bg-card/80 backdrop-blur-sm flex-shrink-0 relative z-10",
          "flex justify-between items-center"
        )}>
          <span>🗑️ {t('modal.trash')}</span>
          <button 
            type="button" 
            onClick={onClear}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium",
              "bg-danger/10 text-danger",
              "cursor-pointer transition-all duration-200",
              "hover:bg-danger/20",
              "active:scale-95"
            )}
          >
            {t('modal.clearAll')}
          </button>
        </div>
        <div className={cn(
          "flex-1 overflow-y-auto p-5 relative z-10"
        )}>
          {loading ? (
            <p className={cn("text-muted-foreground text-center py-8")}>
              {t('common.loading') || 'Loading...'}
            </p>
          ) : posts.length === 0 ? (
            <div className={cn("text-center py-12")}>
              <p className={cn("text-muted-foreground")}>
                {t('modal.emptyTrash')}
              </p>
            </div>
          ) : (
            <div className={cn("flex flex-col gap-3")}>
              {posts.map((p) => {
                const transformed = transformPost(p);
                const typeInfo = getPostTypeInfo(transformed.postType);
                const id = transformed.id;
                
                return (
                  <div 
                    key={id} 
                    className={cn(
                      "p-4 rounded-lg border-[0.5px] border-border/20",
                      "bg-card",
                      "shadow-md hover:shadow-lg transition-all duration-300"
                    )}
                  >
                    <div className={cn("flex justify-between items-start mb-3")}>
                      <div className={cn("flex gap-3 items-start")}>
                        <img
                          src={transformed.authorAvatar || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlNWU3ZWIiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAxMkMxNC4yMDkxIDEyIDE2IDEwLjIwOTEgMTYgOEMxNiA1Ljc5MDg2IDE0LjIwOTEgNCAxMiA0QzkuNzkwODYgNCA4IDUuNzkwODYgOCA4QzggMTAuMjA5MSA5Ljc5MDg2IDEyIDEyIDEyWiIgZmlsbD0iIzljYTNhZiIvPgo8cGF0aCBkPSJNMTIgMTRDMTUuMzEzNyAxNCAxOCAxNi42ODYzIDE4IDIwSDEwQzEwIDE2LjY4NjMgMTIuNjg2MyAxNCAxMiAxNFoiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+Cjwvc3ZnPgo="}
                          alt={transformed.authorName}
                          className={cn("w-10 h-10 rounded-full object-cover flex-shrink-0")}
                        />
                        <div className={cn("flex flex-col gap-1")}>
                          <div className={cn("font-semibold text-foreground text-sm")}>
                            {transformed.authorName}
                          </div>
                          <div className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium",
                            "bg-muted/30 text-muted-foreground"
                          )}>
                            <span>{typeInfo.icon}</span>
                            <span>{typeInfo.label}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRestore(id)}
                        aria-label={t('modal.restore')}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold",
                          "bg-gradient-to-r from-primary/20 to-primary/10 text-primary",
                          "border-[0.5px] border-primary/30 cursor-pointer transition-all duration-300",
                          "hover:from-primary/30 hover:to-primary/20 hover:border-primary/40",
                          "hover:shadow-md active:scale-95"
                        )}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                          <path d="M21 3v5h-5" />
                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                          <path d="M3 21v-5h5" />
                        </svg>
                        {t('modal.restore')}
                      </button>
                    </div>
                    
                    <div className={cn("flex gap-3 mb-3")}>
                      {transformed.thumbnail && (
                        <div className={cn("relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0")}>
                          <img
                            src={transformed.thumbnail}
                            alt={typeInfo.label}
                            className={cn("w-full h-full object-cover")}
                          />
                          <div className={cn(
                            "absolute inset-0 bg-black/40 flex items-center justify-center",
                            "text-2xl"
                          )}>
                            {typeInfo.icon}
                          </div>
                        </div>
                      )}
                      {!transformed.thumbnail && (
                        <div className={cn(
                          "w-20 h-20 rounded-xl bg-muted/30 flex items-center justify-center",
                          "text-3xl flex-shrink-0"
                        )}>
                          {typeInfo.icon}
                        </div>
                      )}
                      <div className={cn("flex-1 min-w-0")}>
                        <p className={cn(
                          "text-sm text-foreground leading-5 line-clamp-3",
                          "break-words overflow-hidden"
                        )}>
                          {truncateContent(transformed.content)}
                        </p>
                      </div>
                    </div>
                    
                    <div className={cn("flex justify-between items-center pt-3 border-t border-border/30")}>
                      <div className={cn("flex gap-3 items-center")}>
                        <span className={cn("flex items-center gap-1 text-xs text-muted-foreground")}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          {transformed.likes}
                        </span>
                        <span className={cn("flex items-center gap-1 text-xs text-muted-foreground")}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          {transformed.comments}
                        </span>
                      </div>
                      <div className={cn("flex flex-col items-end gap-1")}>
                        <span className={cn("text-xs text-muted-foreground")}>
                          {t('modal.postCreatedAt') || 'Đăng lúc'}: {formatRelativeTime(transformed.createdAt)}
                        </span>
                        {transformed.trashedAt && (
                          <span className={cn("text-xs text-danger")}>
                            {formatTrashedTime(transformed.trashedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className={cn(
          "p-5 border-t border-border/30 flex-shrink-0 relative z-10",
          "flex justify-end"
        )}>
          <button 
            type="button" 
            onClick={onClose}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-medium",
              "cursor-pointer transition-all duration-200",
              "bg-muted/30 text-foreground",
              "hover:bg-muted/50",
              "active:scale-95"
            )}
          >
            {t('modal.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

TrashModal.propTypes = {
  open: PropTypes.bool,
  posts: PropTypes.array,
  loading: PropTypes.bool,
  onClose: PropTypes.func,
  onRestore: PropTypes.func,
  onClear: PropTypes.func,
};
