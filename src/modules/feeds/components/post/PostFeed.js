import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getPosts, trashPost } from "../../../../api/postApi";
import PostCard from "./PostCard";
import ReviveAdCard from "./ReviveAdCard";
import PostComposerModal from "../modals/PostComposerModal";
import MusicPostModal from "../music/MusicPostModal";
import CreatePostBox from "../shared/CreatePostBox";
import AudioPlayerBar from "../audio/AudioPlayerBar";
import PostEditModal from "../modals/PostEditModal";
import ReportPostModal from "../modals/ReportPostModal";
import ImageDetailModal from "../media/mediasOfPost/ImageDetailModal";

export default function PostFeed({ onGoLive }) {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingPost, setPlayingPost] = useState(null);
  const [activePlayer, setActivePlayer] = useState(null); // Post info for player bar
  const [showMediaComposer, setShowMediaComposer] = useState(false);
  const [showMusicComposer, setShowMusicComposer] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [reportingPost, setReportingPost] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Cursor-based pagination state
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreTriggerRef = useRef(null); // Ref for IntersectionObserver target
  
  // Current bar page ID for ads
  const [currentBarPageId, setCurrentBarPageId] = useState(null);

  // Lấy entityAccountId của user hiện tại (cần cho trash post)
  const getCurrentEntityAccountId = () => {
    try {
      const raw = localStorage.getItem("session");
      const session = raw ? JSON.parse(raw) : null;
      if (!session) return null;
      
      const activeEntity = session?.activeEntity || session?.account;
      return activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
    } catch {
      return null;
    }
  };
  
  // Shared audio state for synchronization
  const sharedAudioRef = useRef(null);
  const [sharedCurrentTime, setSharedCurrentTime] = useState(0);
  const [sharedDuration, setSharedDuration] = useState(0);
  const [sharedIsPlaying, setSharedIsPlaying] = useState(false);

  // Initialize shared audio element
  useEffect(() => {
    if (!sharedAudioRef.current) {
      sharedAudioRef.current = new Audio();
      sharedAudioRef.current.preload = "metadata";
      
      // Sync currentTime updates
      const handleTimeUpdate = () => {
        if (sharedAudioRef.current) {
          setSharedCurrentTime(sharedAudioRef.current.currentTime);
        }
      };
      
      const handleLoadedMetadata = () => {
        if (sharedAudioRef.current) {
          setSharedDuration(sharedAudioRef.current.duration);
        }
      };
      
      const handlePlay = () => {
        setSharedIsPlaying(true);
      };
      
      const handlePause = () => {
        setSharedIsPlaying(false);
      };
      
      const handleEnded = () => {
        setSharedIsPlaying(false);
        setSharedCurrentTime(0);
        setPlayingPost(null);
      };
      
      sharedAudioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      sharedAudioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      sharedAudioRef.current.addEventListener('play', handlePlay);
      sharedAudioRef.current.addEventListener('pause', handlePause);
      sharedAudioRef.current.addEventListener('ended', handleEnded);
      
      return () => {
        if (sharedAudioRef.current) {
          sharedAudioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
          sharedAudioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
          sharedAudioRef.current.removeEventListener('play', handlePlay);
          sharedAudioRef.current.removeEventListener('pause', handlePause);
          sharedAudioRef.current.removeEventListener('ended', handleEnded);
          sharedAudioRef.current.pause();
          sharedAudioRef.current.src = '';
          sharedAudioRef.current = null;
        }
      };
    }
  }, []);

  // Update audio source when activePlayer changes
  useEffect(() => {
    if (sharedAudioRef.current && activePlayer?.audioSrc) {
      const currentSrc = sharedAudioRef.current.src;
      const newSrc = activePlayer.audioSrc;
      
      // Normalize URLs for comparison (handle both relative and absolute URLs)
      const normalizeUrl = (url) => {
        if (!url) return '';
        try {
          // If it's already a full URL, return it
          if (url.startsWith('http://') || url.startsWith('https://')) {
            return new URL(url).href;
          }
          // Otherwise, treat it as relative
          return url;
        } catch {
          return url;
        }
      };
      
      const normalizedCurrent = normalizeUrl(currentSrc);
      const normalizedNew = normalizeUrl(newSrc);
      
      // Only update if source changed
      if (normalizedCurrent !== normalizedNew && !normalizedCurrent.includes(normalizedNew)) {
        sharedAudioRef.current.src = newSrc;
        sharedAudioRef.current.load();
        setSharedCurrentTime(0);
      }
    } else if (sharedAudioRef.current && !activePlayer?.audioSrc) {
      // Pause and clear if no active player
      sharedAudioRef.current.pause();
      sharedAudioRef.current.src = '';
      setSharedCurrentTime(0);
      setSharedDuration(0);
    }
  }, [activePlayer?.audioSrc]);

  // Sync play/pause state with shared audio
  useEffect(() => {
    if (!sharedAudioRef.current || !activePlayer?.audioSrc) return;
    
    if (playingPost === activePlayer.id) {
      if (sharedAudioRef.current.paused) {
        sharedAudioRef.current.play().catch(console.error);
      }
    } else {
      if (!sharedAudioRef.current.paused) {
        sharedAudioRef.current.pause();
      }
    }
  }, [playingPost, activePlayer?.id]);

  // Handle seek from either player
  const handleSeek = (newTime) => {
    if (sharedAudioRef.current && sharedDuration > 0) {
      const clampedTime = Math.max(0, Math.min(newTime, sharedDuration));
      sharedAudioRef.current.currentTime = clampedTime;
      setSharedCurrentTime(clampedTime);
    }
  };

  // Load posts automatically on component mount
  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      // Always reset cursor and hasMore on mount to ensure fresh data
      setCursor(null);
      setHasMore(true);
      loadPosts(false); // Load from beginning
    }
    return () => {
      isMounted = false;
    };
  }, []);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!loadMoreTriggerRef.current || !hasMore || loadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loadingMore && cursor) {
          loadMorePosts();
        }
      },
      {
        root: null,
        rootMargin: '200px', // Start loading 200px before reaching the bottom
        threshold: 0.1
      }
    );

    const currentTrigger = loadMoreTriggerRef.current;
    if (currentTrigger) {
      observer.observe(currentTrigger);
    }

    return () => {
      if (currentTrigger) {
        observer.unobserve(currentTrigger);
      }
    };
  }, [hasMore, loadingMore, cursor]);

  // Get current bar page ID from session
  useEffect(() => {
    try {
      const raw = localStorage.getItem("session");
      const session = raw ? JSON.parse(raw) : null;
      if (!session) {
        setCurrentBarPageId(null);
        return;
      }
      
      const activeEntity = session?.activeEntity || session?.account;
      let barPageId = null;
      
      if (activeEntity?.barPageId) {
        barPageId = activeEntity.barPageId;
      } else if (activeEntity?.id) {
        // Could implement API call here to get barPage by entityAccountId if needed
        barPageId = null;
      }
      
      setCurrentBarPageId(barPageId);
    } catch (error) {
      console.warn('[PostFeed] Failed to get barPageId:', error);
      setCurrentBarPageId(null);
    }
  }, []);

  // Load initial posts when component mounts
  useEffect(() => {
    loadPosts(false);
  }, []); // Empty dependency array - only run once on mount

  const loadPosts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        // Reset cursor and hasMore on refresh
        setCursor(null);
        setHasMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Use cursor-based pagination if cursor exists, otherwise use page-based (backward compatibility)
      const params = {
        includeMusic: true,
        includeMedias: true,
        limit: 10,
        // Add timestamp to prevent caching
        _t: Date.now()
      };
      
      // If refreshing or cursor is null, don't send cursor (load from beginning)
      // Only use cursor if not refreshing AND cursor exists
      if (!isRefresh && cursor) {
        params.cursor = cursor;
      }

      const response = await getPosts(params);
      
      // Backend returns: { success: true, data: [...], nextCursor, hasMore, pagination: {...} }
      // Axios wraps it, so response is already response.data
      let postsData = [];
      let nextCursor = null;
      let responseHasMore = false;
      
      // Handle various shapes: array directly or { success, data }
      if (response) {
        if (Array.isArray(response)) {
          postsData = response;
        } else if (response.data && Array.isArray(response.data)) {
          postsData = response.data;
          nextCursor = response.nextCursor || null;
          responseHasMore = response.hasMore !== undefined ? response.hasMore : true;
        } else if (response.success && Array.isArray(response.data)) {
          postsData = response.data;
          nextCursor = response.nextCursor || null;
          responseHasMore = response.hasMore !== undefined ? response.hasMore : true;
        }
      }
      
      // Debug: Log first post to check author info
      if (postsData.length > 0) {
        const firstPost = postsData[0];
        console.log('[PostFeed] First post author info:', {
          authorName: firstPost.authorName,
          entityAccountId: firstPost.entityAccountId,
          accountId: firstPost.accountId
        });
      }
      
      // If we got posts (even if empty), set them; otherwise show error
      if (postsData.length >= 0 || response?.success) {
        setPosts(postsData);

        // Update cursor and hasMore
        setCursor(nextCursor);
        setHasMore(responseHasMore);

        // Fallback to page-based if no cursor in response
        if (!nextCursor && responseHasMore) {
          console.warn('[PostFeed] No cursor in response but hasMore is true, falling back to page-based pagination');
        }
      } else {
        console.error("[FEED] Failed to load posts:", response?.message);
        setError(response?.message || t('feed.loadFail'));
      }
    } catch (err) {
      console.error("[FEED] Error loading posts:", err);
      setError(t('feed.loadFail'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMorePosts = async () => {
    // Don't load more if already loading, no cursor, or no more posts
    if (loadingMore || !cursor || !hasMore) {
      return;
    }

    try {
      setLoadingMore(true);
      setError(null);

      const response = await getPosts({
        includeMusic: true,
        includeMedias: true,
        cursor: cursor,
        limit: 10
      });

      let postsData = [];
      let nextCursor = null;
      let responseHasMore = false;

      if (response) {
        if (Array.isArray(response)) {
          postsData = response;
        } else if (response.data && Array.isArray(response.data)) {
          postsData = response.data;
          nextCursor = response.nextCursor || null;
          responseHasMore = response.hasMore !== undefined ? response.hasMore : false;
        } else if (response.success && Array.isArray(response.data)) {
          postsData = response.data;
          nextCursor = response.nextCursor || null;
          responseHasMore = response.hasMore !== undefined ? response.hasMore : false;
        }
      }

      if (postsData.length > 0) {
        setPosts(prevPosts => [...prevPosts, ...postsData]);
        setCursor(nextCursor);
        setHasMore(responseHasMore);
      } else {
        // No more posts
        setHasMore(false);
      }
    } catch (err) {
      console.error("[FEED] Error loading more posts:", err);
      setError(t('feed.loadFail'));
    } finally {
      setLoadingMore(false);
    }
  };

  const handlePostCreated = (newPost) => {
    // Normalize possible response shapes
    const raw = newPost && newPost.data ? newPost.data : newPost;
    const postObj = raw && raw.post ? raw.post : raw; // in case of {post, music}
    if (!postObj) return;
    // Ensure minimal fields
    const ensured = {
      _id: postObj._id || postObj.id || postObj.postId,
      createdAt: postObj.createdAt || new Date().toISOString(),
      content: postObj.content || postObj.caption || "",
      caption: postObj.caption || "",
      title: postObj.title || "",
      likes: postObj.likes || {},
      comments: postObj.comments || {},
      medias: (raw && raw.medias) || postObj.medias || postObj.mediaIds || [],
      musicId: postObj.musicId || postObj.music || null,
      songId: postObj.songId || null,
      type: postObj.type || "post",
      accountId: postObj.accountId || postObj.authorId || null,
      ...postObj
    };
    // Thêm post mới vào đầu danh sách (optimistic update)
    setPosts(prevPosts => [ensured, ...prevPosts]);
    setShowMediaComposer(false);
    setShowMusicComposer(false);
    
    // Refresh feed sau 1 giây để đảm bảo post mới được load từ server với đầy đủ thông tin
    // và được sắp xếp đúng theo sort order mới (createdAt: -1)
    setTimeout(() => {
      loadPosts(true);
    }, 1000);
  };

  // Helper function to extract medias from Map/Object
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
        
        // Detect từ URL trước (để fix trường hợp type bị sai trong DB)
          const url = originalUrl.toLowerCase();
        const isAudioFromUrl = url.includes('.mp3') || 
                         url.includes('.wav') || 
                         url.includes('.m4a') ||
                         url.includes('.ogg') ||
                         url.includes('.aac') ||
                         url.includes('audio');
          
        const isVideoFromUrl = !isAudioFromUrl && (
                         url.includes('.mp4') || 
                         url.includes('.webm') || 
                         url.includes('.mov') ||
                         url.includes('.avi') ||
                         url.includes('.mkv') ||
                         url.includes('video') ||
                         mediaItem.resource_type === 'video');
          
        // Ưu tiên detect từ URL nếu có, nếu không thì dùng type từ backend
        // Điều này fix trường hợp type bị sai trong database
        if (isAudioFromUrl || mediaItem.type === 'audio') {
            audios.push(mediaData);
        } else if (isVideoFromUrl || mediaItem.type === 'video') {
            videos.push(mediaData);
        } else if (mediaItem.type === 'image' && !isVideoFromUrl && !isAudioFromUrl) {
          images.push(mediaData);
          } else {
          // Fallback: nếu không detect được, default to image
            images.push(mediaData);
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

  // Transform post data to match PostCard component expectations
  const transformPost = (post) => {
    const formatTimeDisplay = (value) => {
      try {
        const d = value ? new Date(value) : new Date();
        if (isNaN(d.getTime())) return new Date().toLocaleString('vi-VN');
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        if (diffMs < 0) return d.toLocaleString('vi-VN');
        const minutes = Math.floor(diffMs / 60000);
        if (minutes < 1) return t('time.justNow');
        if (minutes < 60) return t('time.minutesAgo', { minutes });
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return t('time.hoursAgo', { hours });
        return d.toLocaleDateString('vi-VN');
      } catch {
        return new Date().toLocaleString('vi-VN');
      }
    };
    const countTotalComments = (comments) => {
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
    // Read session for fallback avatar/name
    let session
    try {
      const raw = localStorage.getItem("session")
      session = raw ? JSON.parse(raw) : null
    } catch (e) {
      session = null
    }
    const currentUser = session?.account
    const activeEntity = session?.activeEntity || currentUser

    // Determine if current user liked this post (simplified)
    const isLikedByCurrentUser = (() => {
      const viewerId = activeEntity?.id || currentUser?.id;
      if (!viewerId || !post?.likes) return false;
      const likes = post.likes;
      const isMatch = (likeObj) => likeObj && String(likeObj.accountId) === String(viewerId);
      if (likes instanceof Map) {
        for (const [, likeObj] of likes.entries()) if (isMatch(likeObj)) return true;
        return false;
      }
      if (Array.isArray(likes)) return likes.some(isMatch);
      if (typeof likes === 'object') return Object.values(likes).some(isMatch);
      return false;
    })();

    // So sánh ownership dựa trên entityAccountId
    const ownerEntityAccountId = post.entityAccountId ? String(post.entityAccountId).trim() : null;
    // Lấy EntityAccountId từ activeEntity (ưu tiên EntityAccountId, sau đó entityAccountId, cuối cùng mới là id nếu không có)
    const viewerEntityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id 
      ? String(activeEntity.EntityAccountId || activeEntity.entityAccountId || activeEntity.id).trim() 
      : null;
    
    // Debug log để kiểm tra
    if (!ownerEntityAccountId || !viewerEntityAccountId) {
      console.warn('[PostFeed] Missing entityAccountId for ownership check:', {
        postId: post._id || post.postId,
        ownerEntityAccountId,
        viewerEntityAccountId,
        activeEntityId: activeEntity?.id,
        activeEntityAccountId: activeEntity?.EntityAccountId || activeEntity?.entityAccountId,
        postEntityAccountId: post.entityAccountId
      });
    }
    
    // Chỉ so sánh entityAccountId - phải có cả 2 và phải khác rỗng
    const canManage = ownerEntityAccountId && 
                      viewerEntityAccountId && 
                      ownerEntityAccountId.length > 0 &&
                      viewerEntityAccountId.length > 0 &&
                      ownerEntityAccountId.toLowerCase() === viewerEntityAccountId.toLowerCase();

    // Prefer populated objects if available
    const populatedSong = (post.song && typeof post.song === 'object') ? post.song : null;
    const populatedMusic = (post.music && typeof post.music === 'object') ? post.music : null;

    // Get author name and avatar from post data (backend đã populate đầy đủ)
    const authorName = post.authorName ||
        post.author?.userName ||
        post.account?.userName ||
        post.accountName ||
      post.BarName ||
      post.barName ||
      "Người dùng";
    
    const authorAvatar = post.authorAvatar ||
        post.author?.avatar ||
        post.account?.avatar ||
      null;

    return {
      id: post._id || post.postId,
      user: authorName,
      avatar: authorAvatar || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlNWU3ZWIiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAxMkMxNC4yMDkxIDEyIDE2IDEwLjIwOTEgMTYgOEMxNiA1Ljc5MDg2IDE0LjIwOTEgNCAxMiA0QzkuNzkwODYgNCA4IDUuNzkwODYgOCA4QzggMTAuMjA5MSA5Ljc5MDg2IDEyIDEyIDEyWiIgZmlsbD0iIzljYTNhZiIvPgo8cGF0aCBkPSJNMTIgMTRDMTUuMzEzNyAxNCAxOCAxNi42ODYzIDE4IDIwSDEwQzEwIDE2LjY4NjMgMTIuNjg2MyAxNCAxMiAxNFoiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+Cjwvc3ZnPgo=",
      time: formatTimeDisplay(post.createdAt || post.updatedAt),
      content: post.content || post.caption || post["Tiêu Đề"],
      // Extract medias from post.medias Map/Object
      ...(() => {
        const extractedMedias = extractMedias(post.medias);
        // Determine audio from priority: populated music -> populated song -> medias
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

        const audioFromMusic = (() => {
          if (!populatedMusic) return null;
          const candidates = [
            populatedMusic.audioUrl,
            populatedMusic.streamUrl,
            populatedMusic.fileUrl,
            populatedMusic.url,
            populatedMusic.sourceUrl,
            populatedMusic.downloadUrl,
            populatedMusic.purchaseLink,
          ];
          for (const c of candidates) if (isAudioUrl(c)) return c;
          return null;
        })();

        const audioFromSong = (() => {
          if (!populatedSong) return null;
          const candidates = [
            populatedSong.audioUrl,
            populatedSong.streamUrl,
            populatedSong.fileUrl,
            populatedSong.url,
            populatedSong.sourceUrl,
            populatedSong.downloadUrl,
            populatedSong.purchaseLink,
          ];
          for (const c of candidates) if (isAudioUrl(c)) return c;
          return null;
        })();

        const audioMedia = extractedMedias.audios?.[0];

        // Prefer music fields for display if available
        const displayTitle = (populatedMusic?.title) || (populatedSong?.title) || post.musicTitle || post["Tên Bài Nhạc"] || post.title || null;
        const displayArtist = (populatedMusic?.artist) || (populatedSong?.artist) || post.artistName || post["Tên Nghệ Sĩ"] || post.authorName || post.user || null;
        const displayThumb = (populatedMusic?.coverUrl) || (populatedSong?.coverUrl) || post.musicBackgroundImage || post["Ảnh Nền Bài Nhạc"] || post.thumbnail || null;
        const displayPurchaseLink = (populatedMusic?.purchaseLink) || (populatedSong?.purchaseLink) || post.purchaseLink || post.musicPurchaseLink || null;

        return {
          medias: {
            images: extractedMedias.images,
            videos: extractedMedias.videos
          },
          image: extractedMedias.images?.[0]?.url || displayThumb || null,
          videoSrc: extractedMedias.videos?.[0]?.url || null,
          audioSrc: audioFromMusic || audioFromSong || audioMedia?.url || post.audioSrc || null,
          audioTitle: displayTitle,
          artistName: displayArtist,
          album: post.album || null,
          genre: post.genre || (populatedMusic ? populatedMusic.hashTag : null) || (populatedSong ? populatedSong.hashTag : null) || post.hashTag || post["HashTag"] || null,
          releaseDate: post.releaseDate || post.createdAt || null,
          description: post.description || (populatedMusic ? populatedMusic.details : null) || (populatedSong ? populatedSong.details : null) || post["Chi Tiết"] || post.content || null,
          thumbnail: displayThumb,
          purchaseLink: displayPurchaseLink,
        };
      })(),
      likes: (() => {
        if (!post.likes) return 0;
        // Handle Map (trước khi toObject)
        if (post.likes instanceof Map) {
          return post.likes.size;
        }
        // Handle object (sau khi toObject từ Map)
        if (typeof post.likes === 'object' && !Array.isArray(post.likes)) {
          return Object.keys(post.likes).length;
        }
        // Handle number (nếu đã được count sẵn)
        if (typeof post.likes === 'number') {
          return post.likes;
        }
        return 0;
      })(),
      likedByCurrentUser: isLikedByCurrentUser,
      comments: countTotalComments(post.comments),
      shares: (() => {
        if (typeof post.shares === 'number') return post.shares;
        return Number(post.shares) || 0;
      })(),
      views: post.views || 0,
      hashtags: post.hashtags || [],
      verified: post.verified || false,
      location: post.location || null,
      title: post.title || null,
      canManage,
      ownerEntityAccountId: ownerEntityAccountId || null,
      ownerAccountId:
        post.accountId ||
        post.ownerAccountId ||
        post.owner?.AccountId ||
        post.owner?.id ||
        post.author?.AccountId ||
        post.author?.id ||
        post.account?.AccountId ||
        post.account?.id ||
        null,
      targetType: post.type || "post",
      accountId:
        post.accountId ||
        post.ownerAccountId ||
        post.owner?.AccountId ||
        post.owner?.id ||
        post.author?.AccountId ||
        post.author?.id ||
        post.account?.AccountId ||
        post.account?.id ||
        null,
      // Repost fields - chỉ lưu ID, query lại khi hiển thị
      repostedFromId: post.repostedFromId || null
    };
  };

  // Minimal loader/error using existing layout classes
  if (loading) {
    return (
      <div className="feed-posts">
        <p className="text-gray-400">{t('feed.loadingPosts')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feed-posts">
        <div>
          <p className="text-red-500">❌ {t('feed.loadFail')}</p>
          <button onClick={() => loadPosts(true)} className="btn btn-primary mt-2">{t('common.retry')}</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* CreatePostBox - nhấp vào input để tạo bài viết */}
      <CreatePostBox 
        onCreate={() => {
          setShowMediaComposer(true);
        }}
        onMediaClick={() => {
          setShowMediaComposer(true);
        }}
        onMusicClick={() => {
          setShowMusicComposer(true);
        }}
        onGoLive={onGoLive}
      />

      <div className="feed-posts">
        {posts.length === 0 ? (
          <p key="empty-feed" className="text-gray-400">{t('feed.noPosts')}</p>
        ) : (
          posts.map((post, index) => {
            const postId = post._id || post.postId || post.id || `post-${index}`;
            const transformedPost = transformPost(post);
            return (
              <React.Fragment key={postId}>
                <PostCard
                  post={transformedPost}
                  playingPost={playingPost}
                  setPlayingPost={(playingPostId) => {
                    setPlayingPost(playingPostId);
                    // Set active player when starting playback
                    if (playingPostId === postId) {
                      setActivePlayer(transformedPost);
                    } else if (!playingPostId) {
                      setActivePlayer(null);
                    }
                  }}
                  sharedAudioRef={sharedAudioRef}
                  sharedCurrentTime={sharedCurrentTime}
                  sharedDuration={sharedDuration}
                  sharedIsPlaying={sharedIsPlaying && playingPost === postId}
                  onSeek={handleSeek}
                  onEdit={(p) => setEditingPost(p)}
                  onImageClick={(imageData) => {
                    console.log('[PostFeed] Image clicked:', imageData);
                    setSelectedImage(imageData);
                  }}
                  onDelete={async (p) => {
                    if (!window.confirm(t('feed.confirmTrash'))) return;

                    try {
                      const currentEntityAccountId = getCurrentEntityAccountId();
                      if (!currentEntityAccountId) {
                        alert(t('feed.errorTrash') || 'Cannot trash post: No entityAccountId');
                        return;
                      }

                      // Gọi API trash post
                      const response = await trashPost(p.id || p._id, {
                        entityAccountId: currentEntityAccountId
                      });

                      // axiosClient interceptor đã unwrap response.data, nên response chính là response.data
                      if (response?.success) {
                        // Refresh feed để cập nhật danh sách
                        loadPosts(true);
                      } else {
                        alert(response?.message || t('feed.errorTrash') || 'Failed to trash post');
                      }
                    } catch (error) {
                      console.error('[PostFeed] Error trashing post:', error);
                      alert(t('feed.errorTrash') || 'Failed to trash post');
                    }
                  }}
                  onReport={(p) => setReportingPost(p)}
                />
                
                {/* Hiển thị Revive ad sau mỗi 3 posts */}
                {(index + 1) % 3 === 0 && (
                  <ReviveAdCard 
                    key={`revive-ad-${index}`}
                    zoneId={process.env.REACT_APP_REVIVE_NEWSFEED_ZONE_ID || "1"}
                    barPageId={currentBarPageId}
                  />
                )}
              </React.Fragment>
            );
          })
        )}

        {/* Infinite scroll trigger element */}
        {hasMore && (
          <div 
            ref={loadMoreTriggerRef}
            className="h-4 w-full"
            aria-hidden="true"
          />
        )}

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="flex items-center justify-center py-4">
            <p className="text-muted-foreground text-sm">{t('feed.loadingMore') || 'Đang tải thêm...'}</p>
          </div>
        )}

        {/* No more posts indicator */}
        {!hasMore && posts.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <p className="text-muted-foreground text-sm">{t('feed.noMorePosts') || 'Không còn bài viết nào'}</p>
          </div>
        )}

        {/* Tùy chọn nhỏ: thông báo đang làm mới, không thay đổi giao diện chính */}
        {refreshing && (
          <p key="refreshing" className="text-gray-400">{t('feed.refreshing')}</p>
        )}
      </div>

      {/* Media Post Composer Modal */}
      <PostComposerModal
        open={showMediaComposer}
        onClose={() => setShowMediaComposer(false)}
        onCreated={handlePostCreated}
        postType="media"
      />

      {/* Music Post Composer Modal */}
      <MusicPostModal
        open={showMusicComposer}
        onClose={() => setShowMusicComposer(false)}
        onCreated={handlePostCreated}
      />

      {/* Edit Post Modal */}
      <PostEditModal
        open={!!editingPost}
        post={editingPost}
        onClose={() => setEditingPost(null)}
        onUpdated={(updated) => {
          setPosts((prev) => prev.map((orig) => {
            const origId = orig._id || orig.postId || orig.id;
            const newId = updated?._id || updated?.postId || updated?.id;
            if (String(origId) !== String(newId)) return orig;
            return { ...orig, ...updated };
          }));
          setEditingPost(null);
        }}
      />

      {/* Report Post Modal */}
      <ReportPostModal
        open={!!reportingPost}
        post={reportingPost}
        onClose={() => setReportingPost(null)}
        onSubmitted={() => {
          alert(t('feed.thanksReport'));
          setReportingPost(null);
        }}
      />

      {/* Image Detail Modal - Render bên ngoài PostCard để tránh CSS conflict */}
      {selectedImage && (
        <ImageDetailModal
          open={!!selectedImage}
          onClose={() => {
            console.log('[PostFeed] Closing modal');
            setSelectedImage(null);
          }}
          imageUrl={selectedImage.imageUrl}
          postId={selectedImage.postId}
          mediaId={selectedImage.mediaId}
          allImages={selectedImage.allImages || []}
          currentIndex={selectedImage.currentIndex !== undefined ? selectedImage.currentIndex : -1}
          onNavigateImage={(newIndex) => {
            if (selectedImage.allImages && selectedImage.allImages[newIndex]) {
              const newImage = selectedImage.allImages[newIndex];
              setSelectedImage({
                ...selectedImage,
                imageUrl: newImage.url,
                mediaId: newImage._id || newImage.id || newImage.mediaId || null,
                currentIndex: newIndex
              });
            }
          }}
        />
      )}

      {/* Audio Player Bar - Fixed bottom bar */}
      {activePlayer?.audioSrc && (
        <AudioPlayerBar
          audioSrc={activePlayer.audioSrc}
          audioTitle={activePlayer.audioTitle || activePlayer.title}
          artistName={activePlayer.artistName || activePlayer.user}
          thumbnail={activePlayer.thumbnail}
          isPlaying={playingPost === activePlayer.id}
          onPlayPause={() => {
            setPlayingPost(playingPost === activePlayer.id ? null : activePlayer.id);
          }}
          onClose={() => {
            setPlayingPost(null);
            setActivePlayer(null);
          }}
          sharedAudioRef={sharedAudioRef}
          sharedCurrentTime={sharedCurrentTime}
          sharedDuration={sharedDuration}
          onSeek={handleSeek}
        />
      )}
    </>
  );
}
