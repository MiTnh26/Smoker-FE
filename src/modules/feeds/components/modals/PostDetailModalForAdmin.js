import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { X } from "lucide-react";
import { getPostDetail, getPostDetailAdmin } from "../../../../api/postApi";
import PostCard from "../post/PostCard";
import CommentSection from "../comment/CommentSection";
import { cn } from "../../../../utils/cn";


/**
 * Post Detail Modal for Admin
 * 
 * Admin-only version with restrictions:
 * - No commenting allowed
 * - No reporting allowed
 * - No profile navigation allowed
 * - Read-only view only
 * 
 * @param {boolean} open - Whether modal is open
 * @param {object} post - Post data (optional, if provided will skip fetching)
 * @param {string} postId - Post ID to fetch (required if post not provided)
 * @param {string} commentId - Comment ID to scroll to (optional)
 * @param {function} onClose - Close handler
 * @param {string} title - Custom modal title (optional)
 */
export default function PostDetailModalForAdmin({ 
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
  // Comments shown but read-only (no input form)
  const [showComments, setShowComments] = useState(true);
  const [commentSectionKey] = useState(0);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      
      // Prevent all navigation attempts (both post header and comments)
      const preventAllNavigation = (e) => {
        const target = e.target;
        
        // Check if click is on avatar or username in post header
        const isPostHeader = target.closest('.post-card > div:first-child');
        const isPostAvatar = target.tagName === 'IMG' && isPostHeader;
        const isPostUsername = target.tagName === 'H4' && isPostHeader;
        
        // Check if click is on avatar or username in comments
        const isCommentSection = target.closest('[class*="comment-section"]') || target.closest('[class*="comment"]');
        const isCommentAvatar = target.tagName === 'IMG' && isCommentSection;
        const isCommentUsername = (target.tagName === 'SPAN' || target.tagName === 'DIV') && isCommentSection;
        
        if (
          isPostHeader ||
          isPostAvatar ||
          isPostUsername ||
          isCommentSection ||
          isCommentAvatar ||
          isCommentUsername ||
          target.tagName === 'IMG' ||
          target.tagName === 'H4' ||
          target.closest('img') ||
          target.closest('h4')
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      };
      
      // Add multiple event listeners to catch all navigation attempts
      document.addEventListener('click', preventAllNavigation, true); // Use capture phase
      document.addEventListener('mousedown', preventAllNavigation, true);
      
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener('click', preventAllNavigation, true);
        document.removeEventListener('mousedown', preventAllNavigation, true);
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
      setShowComments(true);
    } else {
      setPostData(null);
      setError(null);
      setShowComments(true);
    }
  }, [open, postId, initialPost]);

  const fetchPost = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try public endpoint first
      const response = await getPostDetail(postId, { includeMedias: true, includeMusic: true });
      let post = response?.data ?? response;
      if (post?.success && post.data) post = post.data;
      const postIdCandidate = post?._id || post?.id || post?.Id || post?.postId || post?.PostId;
      if (!postIdCandidate) throw new Error("Post not found");

      const transformedPost = transformPostData(post);
      setPostData(transformedPost);
      return;
    } catch (err) {
      const status = err?.response?.status;
      // Fallback: try admin endpoint for deleted/private posts
      if (status === 404) {
        try {
          const adminRes = await getPostDetailAdmin(postId, { includeMedias: true, includeMusic: true });
          let post = adminRes?.data ?? adminRes;
          if (post?.success && post.data) post = post.data;
          const postIdCandidate = post?._id || post?.id || post?.Id || post?.postId || post?.PostId;
          if (!postIdCandidate) throw new Error("Post not found");

          const transformedPost = transformPostData(post);
          setPostData(transformedPost);
          return;
        } catch (errAdmin) {
          console.error("[PostDetailModalForAdmin] Admin fetch post 404/failed:", errAdmin);
          setError(t("common.notFound") || "Post not found");
          return;
        }
      }

      console.error("[PostDetailModalForAdmin] Error fetching post:", err);
      const msg = status === 404
        ? (t("common.notFound") || "Post not found")
        : (err.message || "Failed to load post");
      setError(msg);
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

  // Transform post data (same as PostDetailModal)
  const transformPostData = (post) => {
    const session = getSession();
    const currentUser = session?.account;
    const activeEntity = session?.activeEntity || currentUser;

    // Helper: Normalize ID for comparison
    const normalizeId = (id) => id ? String(id).trim().toLowerCase() : null;
    
    // Admin can't like, share, or manage - all interactions disabled
    // Check ownership - read from new DTO schema: author.entityAccountId or legacy format
    const ownerId = normalizeId(post.author?.entityAccountId || post.entityAccountId);

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

    // Extract medias - support both new DTO schema (array) and legacy format
    const extractMedias = (medias) => {
      if (!medias) return { images: [], videos: [], audios: [] };
      
      // New DTO schema: medias is already a clean array
      if (Array.isArray(medias)) {
        const images = [], videos = [], audios = [];
        medias.forEach(item => {
          if (!item?.url) return;
          const url = item.url.toLowerCase();
          const mediaObj = { 
            id: item.id || item._id || '', 
            url: item.url, 
            caption: item.caption || "",
            type: item.type
          };
          const isAudio = item.type === 'audio' || /\.(mp3|wav|m4a|ogg|aac)$/i.test(url);
          const isVideo = item.type === 'video' || /\.(mp4|webm|mov)$/i.test(url);
          
          if (isAudio) audios.push(mediaObj);
          else if (isVideo) videos.push(mediaObj);
          else images.push(mediaObj);
        });
        return { images, videos, audios };
      }
      
      // Legacy format: object or Map
      const images = [], videos = [], audios = [];
      const entries = medias instanceof Map
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

    // Read from new DTO schema: author.name or legacy format
    const authorName = post.author?.name || post.authorName || post.account?.userName || post.accountName || "Người dùng";
    const authorAvatar = post.author?.avatar || post.authorAvatar || post.account?.avatar || null;
    
    // Read stats from new DTO schema or legacy format
    const stats = post.stats || {};
    const finalLikeCount = stats.likeCount !== undefined ? stats.likeCount : likeCount;
    const finalCommentCount = stats.commentCount !== undefined ? stats.commentCount : commentCount;
    
    // Read medias from new DTO schema (clean array) or legacy format
    const mediasArray = post.medias || extractedMedias;
    const finalImages = Array.isArray(mediasArray) 
      ? mediasArray.filter(m => m.type === 'image' || (!m.type && !m.url?.match(/\.(mp4|webm|mov|mp3|wav|m4a|ogg|aac)$/i)))
      : (mediasArray.images || extractedMedias.images || []);
    const finalVideos = Array.isArray(mediasArray)
      ? mediasArray.filter(m => m.type === 'video' || m.url?.match(/\.(mp4|webm|mov)$/i))
      : (mediasArray.videos || extractedMedias.videos || []);

    return {
      id: post._id || post.id,
      user: authorName,
      avatar: authorAvatar || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlNWU3ZWIiLz4KPC9zdmc+",
      time: formatTimeDisplay(post.createdAt || post.updatedAt),
      content: post.content || post.caption || post["Tiêu Đề"] || "",
      caption: post.caption || "",
      medias: {
        images: finalImages,
        videos: finalVideos
      },
      image: finalImages?.[0]?.url || populatedMusic?.coverUrl || populatedSong?.coverUrl || post.musicBackgroundImage || post.thumbnail || null,
      videoSrc: finalVideos?.[0]?.url || null,
      audioSrc: audioFromMusic || audioFromSong || audioMedia?.url || post.audioSrc || null,
      audioTitle: populatedMusic?.title || populatedSong?.title || post.musicTitle || post["Tên Bài Nhạc"] || post.title || null,
      artistName: populatedMusic?.artist || populatedSong?.artist || post.artistName || post["Tên Nghệ Sĩ"] || authorName || null,
      album: post.album || null,
      genre: populatedMusic?.hashTag || populatedSong?.hashTag || post.hashTag || post["HashTag"] || null,
      releaseDate: post.releaseDate || post.createdAt || null,
      description: post.description || populatedMusic?.details || populatedSong?.details || post["Chi Tiết"] || post.content || null,
      thumbnail: populatedMusic?.coverUrl || populatedSong?.coverUrl || post.musicBackgroundImage || post.thumbnail || null,
      likes: finalLikeCount,
      likedByCurrentUser: false, // Admin can't like
      comments: finalCommentCount,
      shares: stats.shareCount !== undefined ? stats.shareCount : (typeof post.shares === 'number' ? post.shares : Number(post.shares) || 0),
      views: stats.viewCount !== undefined ? stats.viewCount : (post.views || 0),
      hashtags: post.hashtags || [],
      verified: post.verified || false,
      location: post.location || null,
      title: post.title || null,
      canManage: false, // Admin can't manage in this view
      ownerEntityAccountId: post.author?.entityAccountId || ownerId || null,
      _id: post._id || post.id,
      accountId: post.accountId,
      entityAccountId: post.author?.entityAccountId || post.entityAccountId,
      entityId: post.author?.entityId || post.entityId,
      entityType: post.author?.entityType || post.entityType,
      authorEntityId: post.author?.entityId || post.authorEntityId,
      authorEntityType: post.author?.entityType || post.authorEntityType,
      authorEntityAccountId: post.author?.entityAccountId || post.authorEntityAccountId,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      type: post.type,
      originalPost: post.originalPost || null,
      repostedFromId: post.repostedFromId || null,
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
        "fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]",
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
            {title || postData?.user || t('notifications.postDetail') || 'Chi tiết bài viết (Chế độ Admin)'}
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
          "flex-1 flex flex-col min-h-0 relative z-10 overflow-hidden"
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
              {/* Scrollable area: Post + Comments (read-only) */}
              <div className={cn(
                "flex-1 overflow-y-auto min-h-0",
                "scrollbar-hide"
              )}>
                {/* Post Card - with all interactions disabled (read-only view) */}
                <div 
                  className={cn(
                    "p-0 border-b border-border/30",
                    "[&_.post-card]:m-0 [&_.post-card]:rounded-none [&_.post-card]:border-none [&_.post-card]:shadow-none",
                    "[&_.post-card_>_div:has(>_.comment-section)]:hidden",
                    "[&_.top-comments-preview]:hidden",
                    "[&_.view-all-comments-link]:hidden",
                    "[&_.post-card_.comment-section]:hidden",
                    // Disable ALL interactive elements - no like, share, comment, or navigation
                    "[&_a]:pointer-events-none [&_a]:cursor-default [&_a]:opacity-70",
                    "[&_button]:pointer-events-none [&_button]:cursor-not-allowed [&_button]:opacity-50",
                    "[&_button[aria-label*='Like']]:pointer-events-none [&_button[aria-label*='Like']]:opacity-50",
                    "[&_button[aria-label*='Share']]:pointer-events-none [&_button[aria-label*='Share']]:opacity-50",
                    "[&_button[aria-label*='Comment']]:pointer-events-none [&_button[aria-label*='Comment']]:opacity-50",
                    "[&_button[class*='like']]:pointer-events-none [&_button[class*='like']]:opacity-50",
                    "[&_button[class*='comment']]:pointer-events-none [&_button[class*='comment']]:opacity-50",
                    "[&_button[class*='share']]:pointer-events-none [&_button[class*='share']]:opacity-50",
                    "[&_button[class*='report']]:pointer-events-none [&_button[class*='report']]:opacity-50",
                    "[&_button[class*='menu']]:pointer-events-none [&_button[class*='menu']]:opacity-50",
                    // Disable avatar/username clicks to profile - CRITICAL: prevent navigation
                    // Target the header section containing avatar and username
                    "[&_.post-card_>_div:first-child]:pointer-events-none",
                    "[&_.post-card_>_div:first-child_*]:pointer-events-none",
                    "[&_img]:pointer-events-none [&_img]:cursor-default",
                    "[&_h4]:pointer-events-none [&_h4]:cursor-default",
                    "[&_div[class*='flex'][class*='items-center']]:pointer-events-none",
                    "[&_div[class*='flex'][class*='items-center']_*]:pointer-events-none",
                    // Disable ShareModal if it opens
                    "[&_.share-modal]:hidden",
                    // Prevent text selection
                    "[&_*]:select-none"
                  )}
                  onClick={(e) => {
                    // Prevent ALL clicks - especially profile navigation
                    const target = e.target;
                    const headerArea = target.closest('.post-card > div:first-child');
                    
                    // Block all clicks on header area (avatar + username), buttons, links
                    if (
                      headerArea || // Click anywhere in header area containing avatar/username
                      target.tagName === 'IMG' ||
                      target.tagName === 'H4' ||
                      target.closest('img') ||
                      target.closest('h4') ||
                      target.tagName === 'BUTTON' ||
                      target.closest('button') ||
                      target.tagName === 'A' ||
                      target.closest('a')
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                      e.stopImmediatePropagation();
                      return false;
                    }
                  }}
                  onMouseDown={(e) => {
                    // Prevent mousedown on avatar/username/header to block navigation
                    const target = e.target;
                    const headerArea = target.closest('.post-card > div:first-child');
                    
                    if (
                      headerArea ||
                      target.tagName === 'IMG' ||
                      target.tagName === 'H4' ||
                      target.closest('img') ||
                      target.closest('h4')
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                      e.stopImmediatePropagation();
                      return false;
                    }
                  }}
                >
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
                    hideMenu={true}
                    // Disable ALL interactions - no-op handlers
                    onReport={() => {}} // No-op - prevent reporting
                    onEdit={() => {}} // No-op - prevent editing
                    onDelete={() => {}} // No-op - prevent deleting
                    onShared={() => {}} // No-op - prevent share callback
                  />
                </div>

                {/* Comment Section - completely read-only, no interactions */}
                {showComments && postData?.id && (
                  <div 
                    className={cn(
                      "border-t border-border/30 pt-2",
                      "[&_.comment-section]:max-h-none [&_.comment-section-inline]:max-h-none",
                      "[&_.comment-section-inline]:border-none [&_.comment-section-inline]:pt-0",
                      // Hide ALL input forms and textareas
                      "[&_form]:hidden [&_textarea]:hidden [&_input]:hidden",
                      "[&_.comment-input-form]:hidden [&_.comment-input]:hidden",
                      "[&_button[type='submit']]:hidden [&_button[type='button']]:hidden",
                      // Disable ALL buttons in comment section (like, reply, etc.)
                      "[&_button]:pointer-events-none [&_button]:cursor-not-allowed [&_button]:opacity-50",
                      "[&_button[aria-label*='Like']]:pointer-events-none [&_button[aria-label*='Like']]:opacity-50",
                      "[&_button[aria-label*='Reply']]:pointer-events-none [&_button[aria-label*='Reply']]:opacity-50",
                      "[&_button[aria-label*='like']]:pointer-events-none [&_button[aria-label*='like']]:opacity-50",
                      "[&_button[aria-label*='reply']]:pointer-events-none [&_button[aria-label*='reply']]:opacity-50",
                      "[&_button[class*='like']]:pointer-events-none [&_button[class*='like']]:opacity-50",
                      "[&_button[class*='reply']]:pointer-events-none [&_button[class*='reply']]:opacity-50",
                      "[&_button[class*='comment']]:pointer-events-none [&_button[class*='comment']]:opacity-50",
                      // Disable all links
                      "[&_a]:pointer-events-none [&_a]:cursor-default [&_a]:opacity-70",
                      // CRITICAL: Disable avatar and username clicks in comments (prevent profile navigation)
                      "[&_img]:pointer-events-none [&_img]:cursor-default",
                      "[&_span]:pointer-events-none [&_span]:cursor-default",
                      "[&_div[class*='flex'][class*='items-center'][class*='gap']]:pointer-events-none",
                      "[&_div[class*='flex'][class*='items-center'][class*='gap']_img]:pointer-events-none",
                      "[&_div[class*='flex'][class*='items-center'][class*='gap']_span]:pointer-events-none",
                      // Prevent text selection
                      "[&_*]:select-none"
                    )}
                    onClick={(e) => {
                      // Prevent ALL clicks on interactive elements in comment section
                      const target = e.target;
                      
                      // Block clicks on avatar (img) or username (span) in comments
                      const isCommentAvatar = target.tagName === 'IMG' && target.closest('[class*="comment"]');
                      const isCommentUsername = target.tagName === 'SPAN' && target.closest('[class*="comment"]');
                      const isReplyAvatar = target.tagName === 'IMG' && target.closest('[class*="reply"]');
                      const isReplyUsername = target.tagName === 'SPAN' && target.closest('[class*="reply"]');
                      
                      if (
                        isCommentAvatar ||
                        isCommentUsername ||
                        isReplyAvatar ||
                        isReplyUsername ||
                        target.tagName === 'BUTTON' || 
                        target.closest('button') ||
                        target.tagName === 'INPUT' ||
                        target.tagName === 'TEXTAREA' ||
                        target.tagName === 'FORM' ||
                        target.closest('form') ||
                        // Block any click on img or span in comment section
                        (target.tagName === 'IMG' && target.closest('[class*="comment-section"]')) ||
                        (target.tagName === 'SPAN' && target.closest('[class*="comment-section"]'))
                      ) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return false;
                      }
                    }}
                    onMouseDown={(e) => {
                      // Prevent mousedown on avatar/username in comments
                      const target = e.target;
                      const isCommentAvatar = target.tagName === 'IMG' && target.closest('[class*="comment"]');
                      const isCommentUsername = target.tagName === 'SPAN' && target.closest('[class*="comment"]');
                      const isReplyAvatar = target.tagName === 'IMG' && target.closest('[class*="reply"]');
                      const isReplyUsername = target.tagName === 'SPAN' && target.closest('[class*="reply"]');
                      
                      if (
                        isCommentAvatar ||
                        isCommentUsername ||
                        isReplyAvatar ||
                        isReplyUsername ||
                        (target.tagName === 'IMG' && target.closest('[class*="comment-section"]')) ||
                        (target.tagName === 'SPAN' && target.closest('[class*="comment-section"]'))
                      ) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return false;
                      }
                    }}
                  >
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

              {/* Admin notice - completely read-only */}
              <div className={cn(
                "flex-shrink-0 border-t border-border/30 bg-muted/20 p-3",
                "text-sm text-muted-foreground text-center"
              )}>
                <span className="text-xs">⚠️ Chế độ xem chỉ dành cho Admin - Chỉ xem, không thể like, share, bình luận, phản hồi hoặc tương tác gì</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

PostDetailModalForAdmin.propTypes = {
  open: PropTypes.bool.isRequired,
  post: PropTypes.object,
  postId: PropTypes.string,
  commentId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
};

