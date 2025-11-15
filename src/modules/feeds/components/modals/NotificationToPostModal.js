import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { X } from "lucide-react";
import { getPostById } from "../../../../api/postApi";
import PostCard from "../post/PostCard";
import CommentSection from "../comment/CommentSection";
import { cn } from "../../../../utils/cn";

export default function NotificationToPostModal({ open, postId, commentId, onClose }) {
  const { t } = useTranslation();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const modalContentRef = useRef(null);
  const [playingPost, setPlayingPost] = useState(null);
  const sharedAudioRef = useRef(null);
  const [sharedCurrentTime, setSharedCurrentTime] = useState(0);
  const [sharedDuration, setSharedDuration] = useState(0);
  const [sharedIsPlaying, setSharedIsPlaying] = useState(false);

  // Fetch post data
  useEffect(() => {
    if (open && postId) {
      fetchPost();
    } else {
      setPost(null);
      setError(null);
    }
  }, [open, postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPostById(postId, { includeMedias: true, includeMusic: true });
      
      let postData = null;
      if (response?.success && response.data) {
        postData = response.data;
      } else if (response && response._id) {
        postData = response;
      } else {
        setError("Post not found");
        return;
      }

      // Use PostFeed's transformPost logic
      // We'll need to access the transformPost function from PostFeed
      // For now, let's create a simplified transform
      const transformedPost = transformPostData(postData);
      setPost(transformedPost);
    } catch (err) {
      console.error("[NotificationToPostModal] Error fetching post:", err);
      setError(err.message || "Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  // Transform post data - simplified version based on PostFeed logic
  const transformPostData = (post) => {
    // Read session for user info
    let session;
    try {
      const raw = localStorage.getItem("session");
      session = raw ? JSON.parse(raw) : null;
    } catch (e) {
      session = null;
    }
    const currentUser = session?.account;
    const activeEntity = session?.activeEntity || currentUser;

    // Check if liked
    const viewerId = activeEntity?.id || currentUser?.id;
    let isLikedByCurrentUser = false;
    if (viewerId && post?.likes) {
      const likes = post.likes;
      const isMatch = (likeObj) => likeObj && String(likeObj.accountId) === String(viewerId);
      if (likes instanceof Map) {
        for (const [, likeObj] of likes.entries()) if (isMatch(likeObj)) {
          isLikedByCurrentUser = true;
          break;
        }
      } else if (Array.isArray(likes)) {
        isLikedByCurrentUser = likes.some(isMatch);
      } else if (typeof likes === 'object') {
        isLikedByCurrentUser = Object.values(likes).some(isMatch);
      }
    }

    // Check ownership
    const ownerEntityAccountId = post.entityAccountId ? String(post.entityAccountId).trim() : null;
    const viewerEntityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id 
      ? String(activeEntity.EntityAccountId || activeEntity.entityAccountId || activeEntity.id).trim() 
      : null;
    const canManage = ownerEntityAccountId && 
                      viewerEntityAccountId && 
                      ownerEntityAccountId.length > 0 &&
                      viewerEntityAccountId.length > 0 &&
                      ownerEntityAccountId.toLowerCase() === viewerEntityAccountId.toLowerCase();

    // Count comments
    let commentCount = 0;
    if (post.comments) {
      if (post.comments instanceof Map) {
        for (const [, c] of post.comments.entries()) {
          commentCount += 1;
          const replies = c?.replies;
          if (replies) {
            if (replies instanceof Map) {
              commentCount += replies.size;
            } else if (Array.isArray(replies)) {
              commentCount += replies.length;
            } else if (typeof replies === 'object') {
              commentCount += Object.keys(replies).length;
            }
          }
        }
      } else if (Array.isArray(post.comments)) {
        for (const c of post.comments) {
          commentCount += 1;
          const replies = c?.replies;
          if (replies) {
            if (replies instanceof Map) {
              commentCount += replies.size;
            } else if (Array.isArray(replies)) {
              commentCount += replies.length;
            } else if (typeof replies === 'object') {
              commentCount += Object.keys(replies).length;
            }
          }
        }
      } else if (typeof post.comments === 'object') {
        for (const key of Object.keys(post.comments)) {
          const c = post.comments[key];
          if (!c || typeof c !== 'object') continue;
          commentCount += 1;
          const replies = c?.replies;
          if (replies) {
            if (replies instanceof Map) {
              commentCount += replies.size;
            } else if (Array.isArray(replies)) {
              commentCount += replies.length;
            } else if (typeof replies === 'object') {
              commentCount += Object.keys(replies).length;
            }
          }
        }
      }
    }

    // Count likes
    let likeCount = 0;
    if (post.likes) {
      if (post.likes instanceof Map) {
        likeCount = post.likes.size;
      } else if (typeof post.likes === 'object' && !Array.isArray(post.likes)) {
        likeCount = Object.keys(post.likes).length;
      } else if (typeof post.likes === 'number') {
        likeCount = post.likes;
      }
    }

    // Format time
    const formatTimeDisplay = (value) => {
      try {
        const d = value ? new Date(value) : new Date();
        if (isNaN(d.getTime())) return new Date().toLocaleString('vi-VN');
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        if (diffMs < 0) return d.toLocaleString('vi-VN');
        const minutes = Math.floor(diffMs / 60000);
        if (minutes < 1) return t('time.justNow') || 'Vừa xong';
        if (minutes < 60) return `${minutes} phút trước`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Hôm qua';
        if (days < 7) return `${days} ngày trước`;
        return d.toLocaleDateString('vi-VN');
      } catch {
        return new Date().toLocaleString('vi-VN');
      }
    };

    // Extract medias - simplified
    const extractMedias = (medias) => {
      if (!medias) return { images: [], videos: [], audios: [] };
      const images = [];
      const videos = [];
      const audios = [];
      
      if (Array.isArray(medias)) {
        for (const mediaItem of medias) {
          if (!mediaItem?.url) continue;
          const url = mediaItem.url.toLowerCase();
          if (mediaItem.type === 'audio' || url.includes('.mp3') || url.includes('.wav') || url.includes('.m4a')) {
            audios.push({ id: mediaItem._id || mediaItem.id, url: mediaItem.url, caption: mediaItem.caption || "" });
          } else if (mediaItem.type === 'video' || url.includes('.mp4') || url.includes('.webm') || url.includes('.mov')) {
            videos.push({ id: mediaItem._id || mediaItem.id, url: mediaItem.url, caption: mediaItem.caption || "" });
          } else {
            images.push({ id: mediaItem._id || mediaItem.id, url: mediaItem.url, caption: mediaItem.caption || "" });
          }
        }
      } else if (typeof medias === 'object') {
        const entries = medias instanceof Map ? Array.from(medias.entries()) : Object.entries(medias);
        for (const [key, mediaItem] of entries) {
          if (!mediaItem?.url) continue;
          const url = mediaItem.url.toLowerCase();
          if (url.includes('.mp3') || url.includes('.wav') || url.includes('.m4a')) {
            audios.push({ id: key, url: mediaItem.url, caption: mediaItem.caption || "" });
          } else if (url.includes('.mp4') || url.includes('.webm') || url.includes('.mov')) {
            videos.push({ id: key, url: mediaItem.url, caption: mediaItem.caption || "" });
          } else {
            images.push({ id: key, url: mediaItem.url, caption: mediaItem.caption || "" });
          }
        }
      }
      
      return { images, videos, audios };
    };

    const extractedMedias = extractMedias(post.medias);
    const populatedSong = (post.song && typeof post.song === 'object') ? post.song : null;
    const populatedMusic = (post.music && typeof post.music === 'object') ? post.music : null;

    // Get audio source
    const isAudioUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      const u = url.toLowerCase();
      return u.includes('.mp3') || u.includes('.m4a') || u.includes('.wav') || u.includes('.ogg') || u.includes('.aac');
    };

    const audioFromMusic = populatedMusic ? [
      populatedMusic.audioUrl, populatedMusic.streamUrl, populatedMusic.fileUrl,
      populatedMusic.url, populatedMusic.sourceUrl, populatedMusic.downloadUrl
    ].find(isAudioUrl) : null;

    const audioFromSong = populatedSong ? [
      populatedSong.audioUrl, populatedSong.streamUrl, populatedSong.fileUrl,
      populatedSong.url, populatedSong.sourceUrl, populatedSong.downloadUrl
    ].find(isAudioUrl) : null;

    const audioMedia = extractedMedias.audios?.[0];

    return {
      id: post._id || post.id,
      user: post.authorName || post.authorEntityName || post.author?.userName || post.account?.userName || post.accountName || "Người dùng",
      avatar: post.authorAvatar || post.authorEntityAvatar || post.author?.avatar || post.account?.avatar || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlNWU3ZWIiLz4KPC9zdmc+",
      time: formatTimeDisplay(post.createdAt || post.updatedAt),
      content: post.content || post.caption || post["Tiêu Đề"] || "",
      medias: {
        images: extractedMedias.images,
        videos: extractedMedias.videos
      },
      image: extractedMedias.images?.[0]?.url || populatedMusic?.coverUrl || populatedSong?.coverUrl || post.musicBackgroundImage || post.thumbnail || null,
      videoSrc: extractedMedias.videos?.[0]?.url || null,
      audioSrc: audioFromMusic || audioFromSong || audioMedia?.url || post.audioSrc || null,
      audioTitle: populatedMusic?.title || populatedSong?.title || post.musicTitle || post["Tên Bài Nhạc"] || post.title || null,
      artistName: populatedMusic?.artist || populatedSong?.artist || post.artistName || post["Tên Nghệ Sĩ"] || post.authorEntityName || post.user || null,
      album: post.album || null,
      genre: populatedMusic?.hashTag || populatedSong?.hashTag || post.hashTag || post["HashTag"] || null,
      releaseDate: post.releaseDate || post.createdAt || null,
      description: post.description || populatedMusic?.details || populatedSong?.details || post["Chi Tiết"] || post.content || null,
      thumbnail: populatedMusic?.coverUrl || populatedSong?.coverUrl || post.musicBackgroundImage || post.thumbnail || null,
      likes: likeCount,
      likedByCurrentUser: isLikedByCurrentUser,
      comments: commentCount,
      shares: typeof post.shares === 'number' ? post.shares : Number(post.shares) || 0,
      views: post.views || 0,
      hashtags: post.hashtags || [],
      verified: post.verified || false,
      location: post.location || null,
      title: post.title || null,
      canManage,
      ownerEntityAccountId: ownerEntityAccountId || null,
      // Pass through only safe fields from original post
      _id: post._id || post.id,
      accountId: post.accountId,
      entityAccountId: post.entityAccountId,
      entityId: post.entityId,
      entityType: post.entityType,
      authorEntityId: post.authorEntityId,
      authorEntityType: post.authorEntityType,
      authorEntityAccountId: post.authorEntityAccountId,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      type: post.type,
      // Don't spread post directly as it may contain Maps/Objects that can't be rendered
    };
  };

  const handleSeek = (newTime) => {
    setSharedCurrentTime(newTime);
    if (sharedAudioRef.current) {
      sharedAudioRef.current.currentTime = newTime;
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div 
      className={cn(
        "fixed inset-0 bg-black/75 backdrop-blur-xl z-[9999]",
        "flex items-center justify-center p-4 overflow-y-auto"
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className={cn(
          "w-full max-w-[680px] max-h-[90vh]",
          "bg-card text-card-foreground rounded-lg",
          "border-[0.5px] border-border/20 shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
          "overflow-hidden flex flex-col",
          "relative"
        )}
        ref={modalContentRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn(
          "p-5 border-b border-border/30",
          "flex items-center justify-between flex-shrink-0",
          "bg-card/80 backdrop-blur-sm relative z-10"
        )}>
          <h2 className={cn(
            "text-xl font-semibold m-0 text-foreground"
          )}>
            {t('notification.postDetail') || 'Bài viết'}
          </h2>
          <button
            className={cn(
              "w-9 h-9 border-none bg-transparent text-foreground",
              "cursor-pointer flex items-center justify-center",
              "rounded-full transition-all duration-300",
              "hover:bg-muted/50 hover:scale-110",
              "active:scale-95 p-0"
            )}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={cn(
          "flex-1 overflow-y-auto flex flex-col min-h-0 relative z-10"
        )}>
          {loading && (
            <div className={cn(
              "py-12 px-8 text-center text-foreground"
            )}>
              <p>{t('action.loading') || 'Đang tải...'}</p>
            </div>
          )}

          {error && (
            <div className={cn(
              "py-12 px-8 text-center text-foreground"
            )}>
              <p>{error}</p>
              <button 
                onClick={fetchPost}
                className={cn(
                  "mt-4 px-6 py-2.5 bg-primary",
                  "text-primary-foreground border-none rounded-lg",
                  "cursor-pointer font-medium transition-all duration-200",
                  "hover:opacity-90",
                  "active:scale-95"
                )}
              >
                {t('action.retry') || 'Thử lại'}
              </button>
            </div>
          )}

          {!loading && !error && post && (
            <>
              {/* Post Card */}
              <div className={cn(
                "p-0 border-b border-border/30 flex-shrink-0",
                "[&_.post-card]:m-0 [&_.post-card]:rounded-none [&_.post-card]:border-none [&_.post-card]:shadow-none"
              )}>
                <PostCard
                  post={post}
                  playingPost={playingPost}
                  setPlayingPost={setPlayingPost}
                  sharedAudioRef={sharedAudioRef}
                  sharedCurrentTime={sharedCurrentTime}
                  sharedDuration={sharedDuration}
                  sharedIsPlaying={sharedIsPlaying}
                  onSeek={handleSeek}
                />
              </div>

              {/* Comment Section - Always Open */}
              <div className={cn(
                "flex-1 min-h-0 overflow-y-auto p-0",
                "[&_.comment-section]:max-h-none"
              )}>
                <CommentSection
                  postId={postId}
                  alwaysOpen={true}
                  inline={true}
                  scrollToCommentId={commentId}
                  onClose={null} // No close button when alwaysOpen
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

NotificationToPostModal.propTypes = {
  open: PropTypes.bool.isRequired,
  postId: PropTypes.string,
  commentId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

