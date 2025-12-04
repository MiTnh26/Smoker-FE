import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getFeed, trashPost } from "../../../../api/postApi";
import PostCard from "./PostCard";
import LivestreamCardInline from "../livestream/LivestreamCardInline";
import { useSharedAudioPlayer } from "../../../../hooks/useSharedAudioPlayer";
import ReviveAdCard from "./ReviveAdCard";
import PostComposerModal from "../modals/PostComposerModal";
import MusicPostModal from "../music/MusicPostModal";
import CreatePostBox from "../shared/CreatePostBox";
import AudioPlayerBar from "../audio/AudioPlayerBar";
import PostEditModal from "../modals/PostEditModal";
import ReportPostModal from "../modals/ReportPostModal";
import ImageDetailModal from "../media/mediasOfPost/ImageDetailModal";
import { mapPostForCard } from "../../../../utils/postTransformers";

const normalizeGuid = (value) => {
  if (!value) return null;
  return String(value).trim().toLowerCase();
};

const extractLikeEntityAccountId = (like) => {
  if (!like) return null;
  if (typeof like === "string") return normalizeGuid(like);
  if (typeof like === "object") {
    return normalizeGuid(like.entityAccountId || like.EntityAccountId);
  }
  return null;
};

const extractLikeAccountId = (like) => {
  if (!like || typeof like !== "object") return null;
  return normalizeGuid(like.accountId || like.AccountId);
};

export default function PostFeed({ onGoLive, onLivestreamClick }) {
  const { t } = useTranslation();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const {
    playingPost,
    setPlayingPost,
    activePlayer,
    setActivePlayer,
    sharedAudioRef,
    sharedCurrentTime,
    sharedDuration,
    sharedIsPlaying,
    handleSeek,
  } = useSharedAudioPlayer();
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
  
  // Shared audio state is now managed by useSharedAudioPlayer


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

      // Use cursor-based pagination if cursor exists
      const params = {
        limit: 10,
        // Add timestamp to prevent caching
        _t: Date.now()
      };
      
      // If refreshing or cursor is null, don't send cursor (load from beginning)
      // Only use cursor if not refreshing AND cursor exists
      if (!isRefresh && cursor) {
        params.cursor = cursor;
      }

      const response = await getFeed(params);
      
      // Backend returns: { feed: [...], nextCursor, hasMore }
      // Axios wraps it, so response is already response.data
      let feedData = [];
      let nextCursor = null;
      let responseHasMore = false;
      
      // Handle various shapes: array directly or { feed, nextCursor, hasMore }
      if (response) {
        if (Array.isArray(response)) {
          feedData = response;
        } else if (response.feed && Array.isArray(response.feed)) {
          feedData = response.feed;
          nextCursor = response.nextCursor || null;
          responseHasMore = response.hasMore !== undefined ? response.hasMore : true;
        } else if (response.data && response.data.feed && Array.isArray(response.data.feed)) {
          feedData = response.data.feed;
          nextCursor = response.data.nextCursor || null;
          responseHasMore = response.data.hasMore !== undefined ? response.data.hasMore : true;
        }
      }
      
      // Debug: Log first item to check structure
      if (feedData.length > 0) {
        const firstItem = feedData[0];
        console.log('[PostFeed] First feed item:', {
          type: firstItem.type,
          hasData: !!firstItem.data,
          authorName: firstItem.data?.authorName,
        });
      }
      
      // If we got feed items (even if empty), set them; otherwise show error
      if (feedData.length >= 0 || response?.feed) {
        setFeed(feedData);

        // Update cursor and hasMore
        setCursor(nextCursor);
        setHasMore(responseHasMore);

        // Fallback to page-based if no cursor in response
        if (!nextCursor && responseHasMore) {
          console.warn('[PostFeed] No cursor in response but hasMore is true, falling back to page-based pagination');
        }
      } else {
        console.error("[FEED] Failed to load feed:", response?.message);
        setError(response?.message || t('feed.loadFail'));
      }
    } catch (err) {
      console.error("[FEED] Error loading feed:", err);
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

      const response = await getFeed({
        cursor: cursor,
        limit: 10
      });

      let feedData = [];
      let nextCursor = null;
      let responseHasMore = false;

      if (response) {
        if (Array.isArray(response)) {
          feedData = response;
        } else if (response.feed && Array.isArray(response.feed)) {
          feedData = response.feed;
          nextCursor = response.nextCursor || null;
          responseHasMore = response.hasMore !== undefined ? response.hasMore : false;
        } else if (response.data && response.data.feed && Array.isArray(response.data.feed)) {
          feedData = response.data.feed;
          nextCursor = response.data.nextCursor || null;
          responseHasMore = response.data.hasMore !== undefined ? response.data.hasMore : false;
        }
      }

      if (feedData.length > 0) {
        setFeed(prevFeed => [...prevFeed, ...feedData]);
        setCursor(nextCursor);
        setHasMore(responseHasMore);
      } else {
        // No more items
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
    // Wrap in feed item structure
    const newFeedItem = {
      type: 'post',
      timestamp: new Date(ensured.createdAt || Date.now()).getTime(),
      data: ensured
    };
    setFeed(prevFeed => [newFeedItem, ...prevFeed]);
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

  // Minimal loader/error using existing layout classes
  if (loading) {
    return (
      <div className="feed-posts gap-2">
        <p className="text-gray-400">{t('feed.loadingPosts')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feed-posts gap-2">
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

      <div className="feed-posts gap-2">
        {feed.length === 0 ? (
          <p key="empty-feed" className="text-gray-400">{t('feed.noPosts')}</p>
        ) : (
          feed.map((item, index) => {
            // Handle livestream
            if (item.type === 'livestream') {
              const livestream = item.data;
              return (
                <React.Fragment key={`livestream-${livestream.livestreamId}`}>
                  <LivestreamCardInline
                    livestream={livestream}
                    onClick={() => {
                      if (onLivestreamClick) {
                        onLivestreamClick(livestream);
                      }
                    }}
                  />
                  {/* Hiển thị Revive ad sau mỗi 3 items (posts hoặc livestreams) */}
                  {(index + 1) % 3 === 0 && (
                    <ReviveAdCard 
                      key={`revive-ad-${index}`}
                      zoneId={process.env.REACT_APP_REVIVE_NEWSFEED_ZONE_ID || "1"}
                      barPageId={currentBarPageId}
                    />
                  )}
                </React.Fragment>
              );
            }
            
            // Handle post
            const post = item.data;
            const postId = post._id || post.postId || post.id || `post-${index}`;
            // Get viewerEntityAccountId for like status calculation
            const viewerEntityAccountId = getCurrentEntityAccountId();
            const transformedPost = mapPostForCard(post, t, viewerEntityAccountId);
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
                
                {/* Hiển thị Revive ad sau mỗi 3 items (posts hoặc livestreams) */}
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
        {!hasMore && feed.length > 0 && (
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
          setFeed((prev) => prev.map((item) => {
            // Only update post items, not livestreams
            if (item.type !== 'post') return item;
            const origId = item.data?._id || item.data?.postId || item.data?.id;
            const newId = updated?._id || updated?.postId || updated?.id;
            if (String(origId) !== String(newId)) return item;
            return { ...item, data: { ...item.data, ...updated } };
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
