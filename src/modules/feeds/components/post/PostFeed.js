import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getPosts, trashPost } from "../../../../api/postApi";
import PostCard from "./PostCard";
import PostComposerModal from "../modals/PostComposerModal";
import MusicPostModal from "../music/MusicPostModal";
import CreatePostBox from "../shared/CreatePostBox";
import LivestreamCard from "../livestream/LivestreamCard";
import AudioPlayerBar from "../audio/AudioPlayerBar";
import PostEditModal from "../modals/PostEditModal";
import ReportPostModal from "../modals/ReportPostModal";
import ImageDetailModal from "../media/mediasOfPost/ImageDetailModal";

export default function PostFeed({ onGoLive, activeLivestreams, onLivestreamClick }) {
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
      loadPosts();
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const loadPosts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await getPosts({ includeMusic: true, includeMedias: true });
      
      // Backend returns: { success: true, data: [...], pagination: {...} }
      // Axios wraps it, so response.data = { success: true, data: [...], pagination: {...} }
      let postsData = [];
      // With axios interceptor, response is already response.data
      // Handle various shapes: array directly or { success, data }
      if (response) {
        if (Array.isArray(response)) {
          postsData = response;
        } else if (response.data && Array.isArray(response.data)) {
          postsData = response.data;
        } else if (response.success && Array.isArray(response.data)) {
          postsData = response.data;
        }
      }
      
      // Debug: Log first post to check author info
      if (postsData.length > 0) {
        const firstPost = postsData[0];
        console.log('[PostFeed] First post author info:', {
          authorName: firstPost.authorName,
          authorEntityName: firstPost.authorEntityName,
          entityAccountId: firstPost.entityAccountId,
          accountId: firstPost.accountId
        });
      }
      
      // If we got posts (even if empty), set them; otherwise show error
      if (postsData.length >= 0 || response?.success) {
        setPosts(postsData);
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
    setPosts(prevPosts => [ensured, ...prevPosts]);
    setShowMediaComposer(false);
    setShowMusicComposer(false);
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

    return {
      id: post._id || post.postId,
      user:
        post.authorName ||
        post.authorEntityName ||
        post.author?.userName ||
        post.account?.userName ||
        post.accountName ||
        "Người dùng", // Không fallback về activeEntity/currentUser để tránh hiển thị sai tên
      avatar:
        post.authorAvatar || post.authorEntityAvatar ||
        post.author?.avatar ||
        post.account?.avatar ||
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlNWU3ZWIiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAxMkMxNC4yMDkxIDEyIDE2IDEwLjIwOTEgMTYgOEMxNiA1Ljc5MDg2IDE0LjIwOTEgNCAxMiA0QzkuNzkwODYgNCA4IDUuNzkwODYgOCA4QzggMTAuMjA5MSA5Ljc5MDg2IDEyIDEyIDEyWiIgZmlsbD0iIzljYTNhZiIvPgo8cGF0aCBkPSJNMTIgMTRDMTUuMzEzNyAxNCAxOCAxNi42ODYzIDE4IDIwSDEwQzEwIDE2LjY4NjMgMTIuNjg2MyAxNCAxMiAxNFoiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+Cjwvc3ZnPgo=", // Không fallback về currentUser avatar
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
        const displayArtist = (populatedMusic?.artist) || (populatedSong?.artist) || post.artistName || post["Tên Nghệ Sĩ"] || post.authorEntityName || post.user || null;
        const displayThumb = (populatedMusic?.coverUrl) || (populatedSong?.coverUrl) || post.musicBackgroundImage || post["Ảnh Nền Bài Nhạc"] || post.thumbnail || null;

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
        null
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
        {/* Active Livestreams */}
        {activeLivestreams && activeLivestreams.length > 0 && (
          <div className="livestreams-section">
            {activeLivestreams.map((livestream) => (
              <LivestreamCard
                key={livestream.livestreamId}
                livestream={livestream}
                onClick={() => onLivestreamClick?.(livestream)}
              />
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <p key="empty-posts" className="text-gray-400">{t('feed.noPosts')}</p>
        ) : (
          posts.map((post, index) => {
            const postId = post._id || post.postId || post.id || `post-${index}`;
            const transformedPost = transformPost(post);
            return (
              <PostCard
                key={postId}
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
                      // Refresh posts để cập nhật danh sách
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
            );
          })
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
