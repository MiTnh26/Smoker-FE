import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { X } from "lucide-react";
import { getPostDetail } from "../../../../api/postApi";
import PostCard from "../post/PostCard";
import CommentSection from "../comment/CommentSection";
import CommentInputForm from "../comment/CommentInputForm";
import { cn } from "../../../../utils/cn";

/**
 * Post Detail Modal
 * 
 * @param {boolean} open - Whether modal is open
 * @param {object} post - Post data (optional, if provided will skip fetching)
 * @param {string} postId - Post ID to fetch (required if post not provided)
 * @param {string} commentId - Comment ID to scroll to (optional)
 * @param {function} onClose - Close handler
 * @param {string} title - Custom modal title (optional)
 */
export default function PostDetailModal({ 
  open, 
  post: initialPost, 
  postId, 
  commentId, 
  onClose,
  title
}) {
  const { t } = useTranslation();
  const [postData, setPostData] = useState(initialPost || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const modalContentRef = useRef(null);
  const [playingPost, setPlayingPost] = useState(null);
  const sharedAudioRef = useRef(null);
  const [sharedCurrentTime, setSharedCurrentTime] = useState(0);
  // Comments always shown in PostDetailModal
  const [showComments, setShowComments] = useState(true);
  const [commentSectionKey, setCommentSectionKey] = useState(0);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      // Save current scroll position
      const scrollY = window.scrollY;
      
      // Disable body scroll
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      
      return () => {
        // Restore body scroll
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  // Fetch post data
  useEffect(() => {
    if (open) {
      if (initialPost) {
        setPostData(initialPost);
      } else if (postId) {
        fetchPost();
      }
      // Comments always shown in PostDetailModal
      setShowComments(true);
    } else {
      setPostData(null);
      setError(null);
      setShowComments(true);
    }
  }, [open, postId, initialPost]);


  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPostDetail(postId, { includeMedias: true, includeMusic: true });
      
      let post = null;
      if (response?.success && response.data) {
        post = response.data;
      } else if (response?._id) {
        post = response;
      } else {
        setError("Post not found");
        return;
      }

      // Transform post data using the same logic as PostFeed
      const transformedPost = transformPostData(post);
      setPostData(transformedPost);
    } catch (err) {
      console.error("[PostDetailModal] Error fetching post:", err);
      setError(err.message || "Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  // Helper: Get session data
  const getSession = () => {
    try {
      const raw = localStorage.getItem("session");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // Transform post data
  const transformPostData = (post) => {
    const session = getSession();
    const currentUser = session?.account;
    const activeEntity = session?.activeEntity || currentUser;

    // Helper: Normalize ID for comparison
    const normalizeId = (id) => id ? String(id).trim().toLowerCase() : null;
    
    // Check if liked
    const currentUserId = activeEntity?.id || currentUser?.id;
    let isLikedByCurrentUser = false;
    if (currentUserId && post?.likes) {
      const likesArray = post.likes instanceof Map
        ? Array.from(post.likes.values())
        : Array.isArray(post.likes)
        ? post.likes
        : typeof post.likes === 'object'
        ? Object.values(post.likes)
        : [];
      isLikedByCurrentUser = likesArray.some(likeObj => 
        likeObj && String(likeObj.accountId) === String(currentUserId)
      );
    }

    // Check ownership
    const ownerId = normalizeId(post.entityAccountId);
    const viewerEntityId = normalizeId(activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id);
    const canManage = ownerId && viewerEntityId && ownerId === viewerEntityId;

    // Helper: Count items in collection
    const countItems = (items) => {
      if (!items) return 0;
      if (items instanceof Map) return items.size;
      if (Array.isArray(items)) return items.length;
      if (typeof items === 'object') return Object.keys(items).length;
      return 0;
    };

    // Count comments and replies
    const commentsArray = post.comments 
      ? (post.comments instanceof Map 
          ? Array.from(post.comments.values())
          : Array.isArray(post.comments)
          ? post.comments
          : Object.values(post.comments))
      : [];
    
    let commentCount = commentsArray.length;
    commentsArray.forEach(c => {
      if (c?.replies) commentCount += countItems(c.replies);
    });

    // Count likes
    const likeCount = post.likes ? countItems(post.likes) : 0;

    // Format time
    const formatTimeDisplay = (value) => {
      try {
        const d = value ? new Date(value) : new Date();
        if (Number.isNaN(d.getTime())) return new Date().toLocaleString('vi-VN');
        
        const diffMs = new Date().getTime() - d.getTime();
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

    // Extract medias
    const extractMedias = (medias) => {
      if (!medias) return { images: [], videos: [], audios: [] };
      
      const images = [], videos = [], audios = [];
      const entries = Array.isArray(medias)
        ? medias.map((item, idx) => [item._id || item.id || idx, item])
        : medias instanceof Map
        ? Array.from(medias.entries())
        : Object.entries(medias);
      
      entries.forEach(([key, item]) => {
        if (!item?.url) return;
        
        const url = item.url.toLowerCase();
        const mediaObj = { id: key, url: item.url, caption: item.caption || "" };
        const isAudio = item.type === 'audio' || /\.(mp3|wav|m4a|ogg|aac)$/i.test(url);
        const isVideo = item.type === 'video' || /\.(mp4|webm|mov)$/i.test(url);
        
        if (isAudio) audios.push(mediaObj);
        else if (isVideo) videos.push(mediaObj);
        else images.push(mediaObj);
      });
      
      return { images, videos, audios };
    };

    const extractedMedias = extractMedias(post.medias);
    const populatedSong = post.song && typeof post.song === 'object' ? post.song : null;
    const populatedMusic = post.music && typeof post.music === 'object' ? post.music : null;

    // Get audio source
    const isAudioUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      const u = url.toLowerCase();
      return /\.(mp3|m4a|wav|ogg|aac)$/i.test(u);
    };

    const getAudioUrl = (obj) => {
      if (!obj) return null;
      const urls = [
        obj.audioUrl, obj.streamUrl, obj.fileUrl,
        obj.url, obj.sourceUrl, obj.downloadUrl
      ];
      return urls.find(isAudioUrl) || null;
    };

    const audioFromMusic = getAudioUrl(populatedMusic);
    const audioFromSong = getAudioUrl(populatedSong);
    const audioMedia = extractedMedias.audios?.[0];

    return {
      id: post._id || post.id,
      user: post.authorName || post.author?.userName || post.account?.userName || post.accountName || "Người dùng",
      avatar: post.authorAvatar || post.author?.avatar || post.account?.avatar || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlNWU3ZWIiLz4KPC9zdmc+",
      time: formatTimeDisplay(post.createdAt || post.updatedAt),
      content: post.content || post.caption || post["Tiêu Đề"] || "",
      caption: post.caption || "",
      medias: {
        images: extractedMedias.images,
        videos: extractedMedias.videos
      },
      image: extractedMedias.images?.[0]?.url || populatedMusic?.coverUrl || populatedSong?.coverUrl || post.musicBackgroundImage || post.thumbnail || null,
      videoSrc: extractedMedias.videos?.[0]?.url || null,
      audioSrc: audioFromMusic || audioFromSong || audioMedia?.url || post.audioSrc || null,
      audioTitle: populatedMusic?.title || populatedSong?.title || post.musicTitle || post["Tên Bài Nhạc"] || post.title || null,
      artistName: populatedMusic?.artist || populatedSong?.artist || post.artistName || post["Tên Nghệ Sĩ"] || post.authorName || post.user || null,
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
      ownerEntityAccountId: ownerId || null,
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
        "flex items-center justify-center p-4",
        "overflow-y-auto"
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
          "relative z-[10000]"
        )}
        ref={modalContentRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn(
          "p-5 border-b border-border/30",
          "flex items-center justify-between flex-shrink-0",
          "bg-card/80 backdrop-blur-sm relative z-[9998]"
        )}>
          <h2 className={cn(
            "text-xl font-semibold m-0 text-foreground"
          )}>
            {title || postData?.user || t('notifications.postDetail') || 'Bài viết'}
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
          "flex-1 flex flex-col min-h-0 relative z-10 overflow-hidden",
          "[&_.comment-section_form]:sticky [&_.comment-section_form]:bottom-0 [&_.comment-section_form]:z-[10001] [&_.comment-section_form]:bg-card [&_.comment-section_form]:shadow-[0_-2px_8px_rgba(0,0,0,0.1)]"
        )}>
          {loading && (
            <div className={cn(
              "flex-1 flex items-center justify-center py-12 px-8 text-center text-foreground"
            )}>
              <p>{t('action.loading') || 'Đang tải...'}</p>
            </div>
          )}

          {error && (
            <div className={cn(
              "flex-1 flex items-center justify-center py-12 px-8 text-center text-foreground"
            )}>
              <div>
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
            </div>
          )}

          {!loading && !error && postData && (
            <>
              {/* Scrollable area: Post + Comments (without input form) */}
              <div className={cn(
                "flex-1 overflow-y-auto min-h-0",
                "scrollbar-hide",
                // Hide input form in scrollable area
                "[&_form]:hidden"
              )}>
                {/* Post Card */}
                <div className={cn(
                  "p-0 border-b border-border/30",
                  "[&_.post-card]:m-0 [&_.post-card]:rounded-none [&_.post-card]:border-none [&_.post-card]:shadow-none",
                  "[&_.post-card_>_div:has(>_.comment-section)]:hidden",
                  "[&_.top-comments-preview]:hidden",
                  "[&_.view-all-comments-link]:hidden",
                  "[&_.post-card_.comment-section]:hidden"
                )}>
                  <PostCard
                    post={postData}
                    playingPost={playingPost}
                    setPlayingPost={setPlayingPost}
                    sharedAudioRef={sharedAudioRef}
                    sharedCurrentTime={sharedCurrentTime}
                    sharedDuration={0}
                    sharedIsPlaying={false}
                    onSeek={handleSeek}
                    disableCommentButton={true}
                  />
                </div>

                {/* Comment Section - without input form */}
                {showComments && postData?.id && (
                  <div className={cn(
                    "border-t border-border/30 pt-2",
                    "[&_.comment-section]:max-h-none [&_.comment-section-inline]:max-h-none",
                    "[&_.comment-section-inline]:border-none [&_.comment-section-inline]:pt-0"
                  )}>
                    <CommentSection
                      key={`comments-${postData.id || postId}-${commentSectionKey}`}
                      postId={String(postData.id || postId)}
                      alwaysOpen={true}
                      inline={true}
                      scrollToCommentId={commentId}
                    />
                  </div>
                )}
              </div>

              {/* Fixed input form at bottom */}
              {showComments && postData?.id && (
                <div className={cn(
                  "flex-shrink-0 border-t border-border/30 bg-card",
                  "relative z-[10001] shadow-[0_-2px_8px_rgba(0,0,0,0.1)]"
                )}>
                  <CommentInputForm
                    postId={String(postData.id || postId)}
                    onCommentAdded={() => {
                      // Force reload comments by updating key
                      setCommentSectionKey(prev => prev + 1);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

PostDetailModal.propTypes = {
  open: PropTypes.bool.isRequired,
  post: PropTypes.object,
  postId: PropTypes.string,
  commentId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
};
