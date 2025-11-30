import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import YouTubeLinkPreview from "../../../../components/common/YouTubeLinkPreview"
import { splitTextWithYouTube } from "../../../../utils/youtube"
import { likePost, unlikePost, trackPostView, getPostById } from "../../../../api/postApi"
import AudioWaveform from "../audio/AudioWaveform"
import PostMediaLayout from "./PostMediaLayout"
import ShareModal from "../modals/ShareModal"
import PostDetailModal from "../modals/PostDetailModal"
import ReadMoreText from "../comment/ReadMoreText"
import { cn } from "../../../../utils/cn"
import { getAvatarUrl } from "../../../../utils/defaultAvatar"
import "../../../../styles/modules/feeds/components/post/post-card.css"

export default function PostCard({
  post,
  playingPost,
  setPlayingPost,
  sharedAudioRef,
  sharedCurrentTime,
  sharedDuration,
  sharedIsPlaying,
  onSeek,
  onEdit,
  onDelete,
  onReport,
  onImageClick,
  onShared
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isPlaying = playingPost === post.id
  const [liked, setLiked] = useState(Boolean(post.likedByCurrentUser))
  const [likeCount, setLikeCount] = useState(Number(post.likes || 0))
  const [postDetailModalOpen, setPostDetailModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [originalPost, setOriginalPost] = useState(null)
  const [loadingOriginalPost, setLoadingOriginalPost] = useState(false)
  const [originalPostModalOpen, setOriginalPostModalOpen] = useState(false)
  const menuRef = useRef(null)
  const shareButtonRef = useRef(null)
  const hasTrackedView = useRef(false) // Track xem đã gọi API view chưa

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Update liked state when post prop changes
  useEffect(() => {
    setLiked(Boolean(post.likedByCurrentUser));
    setLikeCount(Number(post.likes || 0));
  }, [post.likedByCurrentUser, post.likes, post.id])

  // Query original post if this is a repost (chỉ query 1 lần, có cache)
  const originalPostFetched = useRef(false);
  
  // Validate ObjectId format
  const isValidObjectId = (id) => {
    if (!id) return false;
    const idStr = String(id);
    return /^[0-9a-fA-F]{24}$/.test(idStr);
  };

  useEffect(() => {
    // Reset khi repostedFromId thay đổi
    if (post.repostedFromId && post.repostedFromId.toString() !== originalPostFetched.current) {
      originalPostFetched.current = post.repostedFromId.toString();
      setOriginalPost(null); // Reset để query lại
    }
  }, [post.repostedFromId]);

  useEffect(() => {
    // Validate ObjectId trước khi query
    if (!post.repostedFromId || !isValidObjectId(post.repostedFromId) || 
        originalPost || loadingOriginalPost || originalPostFetched.current === 'failed') {
      return; // Đã có data, đang loading, đã fail, hoặc ID không hợp lệ thì không query
    }

    setLoadingOriginalPost(true);
    getPostById(post.repostedFromId, { includeMedias: true, includeMusic: true })
      .then(response => {
        const postData = response?.data?.post || response?.data || response;
        if (postData && (postData._id || postData.id)) {
          // Transform post data similar to transformPost in PostFeed
          const transformed = {
            id: postData._id || postData.id,
            user: postData.authorName || postData.author?.userName || postData.account?.userName || "Người dùng",
            avatar: postData.authorAvatar || postData.author?.avatar || postData.account?.avatar || null,
            content: postData.content || postData.caption || "",
            caption: postData.caption || "",
            // Extract medias
            medias: (() => {
              const medias = postData.medias;
              if (!medias) return { images: [], videos: [], audios: [] };
              
              if (Array.isArray(medias)) {
                return {
                  images: medias.filter(m => m.type === 'image').map(m => ({ id: m._id || m.id, url: m.url || m.src, caption: m.caption })),
                  videos: medias.filter(m => m.type === 'video').map(m => ({ id: m._id || m.id, url: m.url || m.src, poster: m.poster || m.thumbnail })),
                  audios: medias.filter(m => m.type === 'audio').map(m => ({ id: m._id || m.id, url: m.url || m.src }))
                };
              }
              
              if (typeof medias === 'object') {
                return {
                  images: (medias.images || []).map(m => ({ id: m._id || m.id, url: m.url || m.src, caption: m.caption })),
                  videos: (medias.videos || []).map(m => ({ id: m._id || m.id, url: m.url || m.src, poster: m.poster || m.thumbnail })),
                  audios: (medias.audios || []).map(m => ({ id: m._id || m.id, url: m.url || m.src }))
                };
              }
              
              return { images: [], videos: [], audios: [] };
            })(),
            hashtags: postData.hashtags || [],
            time: postData.createdAt ? new Date(postData.createdAt).toLocaleDateString('vi-VN') : null
          };
          setOriginalPost(transformed);
        } else {
          // Post not found - mark as failed để không query lại
          originalPostFetched.current = 'failed';
          console.warn('[PostCard] Original post not found:', post.repostedFromId);
        }
      })
      .catch(err => {
        console.error('[PostCard] Failed to load original post:', err);
        // Mark as failed để không query lại liên tục
        originalPostFetched.current = 'failed';
      })
      .finally(() => {
        setLoadingOriginalPost(false);
      });
  }, [post.repostedFromId, originalPost, loadingOriginalPost])

  // Track view khi post được render (chỉ track 1 lần, chỉ cho post hợp lệ)
  useEffect(() => {
    // Validate post.id là ObjectId hợp lệ (24 hex characters)
    const isValidObjectId = (id) => {
      if (!id) return false;
      const idStr = String(id);
      return /^[0-9a-fA-F]{24}$/.test(idStr);
    };

    if (!hasTrackedView.current && post.id && isValidObjectId(post.id)) {
      hasTrackedView.current = true;
      // Track view async, không cần đợi response
      trackPostView(post.id).catch(err => {
        // Chỉ log warning, không throw error để không ảnh hưởng UI
        if (err?.response?.status !== 400 && err?.response?.status !== 404) {
          console.warn('[PostCard] Failed to track view:', err);
        }
      });
    } else if (post.id && !isValidObjectId(post.id)) {
      // Mark as tracked để không thử lại
      hasTrackedView.current = true;
      console.warn('[PostCard] Invalid post ID format, skipping view tracking:', post.id);
    }
  }, [post.id])

  const togglePlay = () => setPlayingPost(isPlaying ? null : post.id)
  const toggleLike = async () => {
    try {
      let session
      try {
        const raw = localStorage.getItem("session")
        session = raw ? JSON.parse(raw) : null
      } catch (e) {
        session = null
      }
      const currentUser = session?.account
      const activeEntity = session?.activeEntity || currentUser
      const entities = Array.isArray(session?.entities) ? session.entities : []

      const tryNormalizeEntityId = (entity) => (
        entity?.EntityAccountId ||
        entity?.entityAccountId ||
        entity?.entity_account_id ||
        null
      )

      const resolveViewerEntityAccountId = () => {
        let resolved =
          tryNormalizeEntityId(activeEntity) ||
          tryNormalizeEntityId(currentUser)

        if (!resolved && activeEntity?.id && entities.length > 0) {
          const match = entities.find((entity) => {
            if (!entity?.id) return false
            return String(entity.id).toLowerCase() === String(activeEntity.id).toLowerCase()
          })
          resolved = tryNormalizeEntityId(match)
        }
        return resolved || null
      }

      const viewerEntityAccountId = resolveViewerEntityAccountId()
      const normalizeTypeRole = (ae) => {
        const raw = (ae?.role || "").toString().toLowerCase()
        if (raw === "bar") return "BarPage"
        if (raw === "dj" || raw === "dancer") return "BusinessAccount"
        return "Account" // customer and others
      }
      const typeRole = normalizeTypeRole(activeEntity)

      // Optimistic update
      const nextLiked = !liked
      setLiked(nextLiked)
      setLikeCount((c) => c + (nextLiked ? 1 : -1))

      if (nextLiked) {
        await likePost(post.id, { typeRole, entityAccountId: viewerEntityAccountId })
      } else {
        await unlikePost(post.id, { entityAccountId: viewerEntityAccountId })
      }
    } catch (error) {
      // Revert optimistic update on error
      setLiked((v) => !v)
      setLikeCount((c) => (liked ? c + 1 : c - 1))
      // eslint-disable-next-line no-console
      console.error("Failed to toggle like on post", error)
    }
  }

  const handleShare = () => {
    setShareModalOpen(true);
  }

  const handleShared = ({ type }) => {
    console.log(`[PostCard] Post shared to ${type}`);
    // Gọi callback để reload feed nếu share về tường
    if (type === 'wall' && onShared) {
      onShared();
    }
    // Có thể thêm toast notification ở đây
  }

  // Extract music info if post has populated musicId
  const music = post.musicId || {};

  // Normalize music fields into post
  const audioTitle = music.title || post.audioTitle || post.title;
  const artistName = music.artist || post.artistName || post.user;
  const thumbnail = music.coverUrl || post.thumbnail;
  const audioUrl = music.audioUrl || post.audioSrc;
  const genre = music.hashTag || post.genre;
  const description = music.details || post.description;
  const purchaseLink = music.purchaseLink || post.purchaseLink || null;

  // Get audio from post data (already extracted in transformPost)
  const audioMedia = audioUrl ? { url: audioUrl } : null;


  // Normalize medias: đã được extractMedias trong PostFeed.js transformPost
  // post.medias có thể là object { images: [], videos: [] } hoặc array từ backend
  const medias = (() => {
    const m = post.medias
    
    // Nếu đã là object với images/videos arrays (từ transformPost)
    if (m && typeof m === 'object' && !Array.isArray(m)) {
      return { 
        images: m.images || [], 
        videos: m.videos || [],
        audios: m.audios || []
      }
    }
    
    // Nếu là array (từ backend, chưa qua transformPost) - filter theo type
    if (Array.isArray(m)) {
      return {
        images: m.filter((x) => x && x.type === "image"),
        videos: m.filter((x) => x && x.type === "video"),
        audios: m.filter((x) => x && x.type === "audio")
      }
    }
    
    return { images: [], videos: [], audios: [] }
  })()

  const handleImageClick = (imageUrl) => {
    if (onImageClick) {
      // Tìm media object từ images array
      const foundMedia = medias.images.find(img => img.url === imageUrl);
      const mediaId = foundMedia?._id || foundMedia?.id || foundMedia?.mediaId || null;
      const currentIndex = medias.images.findIndex(img => img.url === imageUrl);
      onImageClick({ 
        imageUrl, 
        postId: post.id, 
        mediaId,
        allImages: medias.images,
        currentIndex
      });
    } else {
      console.warn('[PostCard] onImageClick callback not provided');
    }
  }

  // Navigate to profile based on entityType
  const handleProfileClick = () => {
    // Get entityAccountId and entityType from post
    const entityAccountId = post.entityAccountId || post.authorEntityAccountId || post.ownerEntityAccountId || null;
    const entityId = post.authorEntityId || post.entityId || post.accountId || null;
    const entityType = post.authorEntityType || post.entityType || post.type || null;
    
    if (!entityAccountId && !entityId) return;
    
    if (entityType === 'BarPage') {
      navigate(`/bar/${entityId || entityAccountId}`);
    } else if (entityType === 'BusinessAccount' || entityType === 'Business') {
      navigate(`/profile/${entityAccountId || entityId}`);
    } else {
      // Account or default
      navigate(`/profile/${entityAccountId || entityId}`);
    }
  }

  return (
    <article className={cn(
      "post-card",
      /* Base Styles - Instagram-inspired Minimalist Design */
      "bg-card text-card-foreground rounded-lg",
      "shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4 mb-0",
      "border-[0.5px] border-border/20 relative",
      /* Transitions */
      "transition-all duration-200 ease-out",
      /* Hover States - Subtle, no movement */
      "hover:shadow-[0_2px_4px_rgba(0,0,0,0.08)]",
      "hover:border-border/30"
    )}>
      {/* Header */}
      <div className="flex justify-between items-start mb-1.5 relative">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <img
              src={getAvatarUrl(post.avatar, 40)}
              alt={post.user}
              onClick={handleProfileClick}
              onError={(e) => {
                e.target.src = getAvatarUrl(null, 40);
              }}
              className={cn(
                "w-14 h-14 rounded-2xl object-cover",
                "border-2 border-primary/20 ring-2 ring-primary/5",
                "transition-all duration-500 ease-out",
                "hover:border-primary/50 hover:ring-primary/20",
                "hover:shadow-[0_8px_24px_rgba(var(--primary),0.25)]",
                "hover:scale-110 hover:rotate-3",
                "shadow-[0_4px_12px_rgba(0,0,0,0.12)]",
                "cursor-pointer"
              )}
            />
            {post.verified && (
              <span className={cn(
                "absolute -bottom-0.5 -right-0.5",
                "w-[18px] h-[18px] bg-success rounded-full",
                "flex items-center justify-center text-primary-foreground",
                "text-[10px] font-bold border-2 border-card",
                "shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
              )}>
                ✓
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 
              onClick={handleProfileClick}
              className={cn(
                "font-semibold text-[0.95rem] mb-1",
                "text-foreground whitespace-nowrap",
                "overflow-hidden text-ellipsis",
                "cursor-pointer hover:text-primary transition-colors"
              )}
            >
              {post.user || "Người dùng"}
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-muted-foreground text-[0.8rem] m-0">
                {post.time}
              </p>
              {post.location && (
                <span className="text-muted-foreground text-[0.75rem] flex items-center gap-1">
                  📍 {post.location}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="relative flex-shrink-0">
          <button
            className={cn(
              "bg-transparent border-none text-muted-foreground",
              "w-9 h-9 rounded-full cursor-pointer",
              "flex items-center justify-center",
              "transition-all duration-200",
              "hover:bg-muted/50 hover:text-foreground"
            )}
            aria-label="More options"
            onClick={() => setMenuOpen((v) => !v)}
          >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
        {menuOpen && (
            <div
              ref={menuRef}
              className={cn(
                "absolute top-[42px] right-0",
                "bg-card/95 backdrop-blur-sm text-foreground",
                "border-[0.5px] border-border/20 rounded-lg",
                "shadow-[0_2px_8px_rgba(0,0,0,0.12)] p-2",
                "min-w-[180px] z-[100]",
                "backdrop-saturate-180"
              )}
            >
            {post.canManage ? (
              <>
                <button
                  className={cn(
                    "w-full text-left bg-transparent border-none",
                    "text-foreground py-2 px-3 rounded-lg",
                    "cursor-pointer text-sm",
                    "transition-[background,transform] duration-200",
                    "hover:bg-muted/50"
                  )}
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit?.(post);
                  }}
                >
                  {t('feed.edit')}
                </button>
                <button
                  className={cn(
                    "w-full text-left bg-transparent border-none",
                    "text-danger py-2 px-3 rounded-lg",
                    "cursor-pointer text-sm",
                    "transition-[background,transform] duration-200",
                    "hover:bg-danger/10"
                  )}
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete?.(post);
                  }}
                >
                  {t('feed.trash')}
                </button>
              </>
            ) : (
              <button
                className={cn(
                  "w-full text-left bg-transparent border-none",
                  "text-foreground py-2 px-3 rounded-lg",
                  "cursor-pointer text-sm",
                  "transition-[background,transform] duration-200",
                  "hover:bg-muted/50"
                )}
                onClick={() => {
                  setMenuOpen(false);
                  onReport?.(post);
                }}
              >
                {t('feed.report')}
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      <div>
      {/* Repost indicator and original post info */}
      {post.repostedFromId && (
        <div className="mb-3 flex items-center gap-2 text-muted-foreground text-[0.8rem]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <span>{post.user || "Người dùng"} {t('feed.reposted') || 'đã đăng lại'}</span>
        </div>
      )}

      {/* Content */}
        {post.content && (
      <div className="mt-3">
            {(() => {
              // Parse content to detect YouTube links
              const segments = splitTextWithYouTube(post.content);
              
              // If no YouTube links found, render as plain text
              if (segments.length === 1 && segments[0].type === 'text') {
                return (
                  <ReadMoreText 
                    text={post.content} 
                    maxLines={3}
                    className="whitespace-pre-wrap leading-[1.7] text-[0.95rem] text-foreground m-0 break-words"
                  />
                );
              }
              
              // Render segments: text segments as text, YouTube segments as previews
              return (
                <div className="space-y-3">
                  {segments.map((segment, idx) => {
                    if (segment.type === 'youtube') {
                      return (
                        <div key={`youtube-${idx}`} className="my-3">
                          <YouTubeLinkPreview 
                            url={segment.url} 
                            videoId={segment.videoId} 
                          />
                        </div>
                      );
                    }
                    // Text segment
                    if (segment.text && segment.text.trim()) {
                      return (
                        <ReadMoreText 
                          key={`text-${idx}`}
                          text={segment.text} 
                          maxLines={3}
                          className="whitespace-pre-wrap leading-[1.7] text-[0.95rem] text-foreground m-0 break-words"
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              );
            })()}
        </div>
        )}

        {/* Check if post has both image and audio - show side by side layout */}
        {audioMedia && (
          <AudioWaveform
            audioSrc={audioMedia.url}
            isPlaying={sharedIsPlaying || isPlaying}
            onTogglePlay={togglePlay}
            audioTitle={audioTitle}
            artistName={artistName}
            album={post.album}
            genre={genre}
            releaseDate={post.releaseDate}
            description={description}
            thumbnail={thumbnail}
            purchaseLink={purchaseLink}
            sharedAudioRef={sharedAudioRef}
            sharedCurrentTime={sharedCurrentTime}
            sharedDuration={sharedDuration}
            onSeek={onSeek}
          />
        )}

        {/* Display music info if populated but no audio source */}
        {!audioMedia && (audioTitle || artistName || thumbnail) && (
          <div className="mt-3">
            {thumbnail && (
              <img
                src={thumbnail}
                alt={audioTitle || "Cover"}
                className="w-full max-w-[300px] rounded-lg object-cover"
              />
            )}
            {/* <div className="music-meta">
              {audioTitle && <div className="music-title">{audioTitle}</div>}
              {artistName && <div className="music-artist">{artistName}</div>}
              {genre && <div className="music-genre">{genre}</div>}
            </div> */}
          </div>
        )}


        {/* Display medias using PostMediaLayout component */}
        {!post.repostedFromId && !audioMedia && (medias.images.length > 0 || medias.videos.length > 0) && (
          <div className="-mx-4">
          <PostMediaLayout
            images={medias.images}
            videos={medias.videos}
            onImageClick={handleImageClick}
          />
          </div>
        )}

        {/* Fallback: Display single image for backward compatibility */}
        {!post.repostedFromId && !audioMedia && !post.medias && post.image && (
          <div className="-mx-4">
          <PostMediaLayout
            images={[{ url: post.image, id: 'fallback-image' }]}
            videos={[]}
            onImageClick={handleImageClick}
          />
          </div>
        )}
        
        {/* Fallback: Display single video for backward compatibility */}
        {!post.repostedFromId && !audioMedia && !post.medias && post.videoSrc && !post.image && (
          <div className="-mx-4">
          <PostMediaLayout
            images={[]}
            videos={[{ url: post.videoSrc, id: 'fallback-video', poster: post.poster }]}
            onImageClick={handleImageClick}
          />
          </div>
        )}

        {/* Original Post Preview (for reposts) - Query từ repostedFromId */}
        {post.repostedFromId && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setOriginalPostModalOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                setOriginalPostModalOpen(true)
              }
            }}
            className={cn(
            "mt-3 rounded-lg border border-border/30",
            "bg-muted/30 p-3",
            "hover:bg-muted/50 transition-colors",
            "cursor-pointer"
          )}>
            {loadingOriginalPost ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {t('common.loading') || 'Đang tải...'}
              </div>
            ) : originalPost ? (
              <>
                {/* Original Author Info */}
                {originalPost.user && (
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={getAvatarUrl(originalPost.avatar, 32)}
                      alt={originalPost.user}
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        e.target.src = getAvatarUrl(null, 32);
                      }}
                    />
                    <span className="font-semibold text-[0.9rem] text-foreground">
                      {originalPost.user}
                    </span>
                  </div>
                )}
                
                {/* Original Content */}
                {originalPost.content && (
                  <div className="mb-2">
                    <ReadMoreText 
                      text={originalPost.content} 
                      maxLines={3}
                      className="whitespace-pre-wrap leading-[1.6] text-[0.9rem] text-foreground/90 m-0 break-words"
                    />
                  </div>
                )}

                {/* Original Media - sử dụng PostMediaLayout để đồng bộ với cách hiển thị ở newsfeed */}
                {originalPost.medias && (originalPost.medias.images?.length > 0 || originalPost.medias.videos?.length > 0) && (
                  <div className="mt-2">
                    <PostMediaLayout
                      images={originalPost.medias.images || []}
                      videos={originalPost.medias.videos || []}
                      onImageClick={(imageUrl) => {
                        // Optional: có thể mở ImageDetailModal nếu cần
                        console.log('[PostCard] Original post image clicked:', imageUrl);
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {t('feed.postNotFound') || 'Không tìm thấy bài viết gốc'}
              </div>
            )}
          </div>
        )}

        {post.hashtags && post.hashtags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {post.hashtags.map((tag, i) => (
              <span
                key={i}
                className={cn(
                  "bg-gradient-to-br from-primary/10 to-primary/5",
                  "text-primary text-[0.8rem]",
                  "px-3 py-1.5 rounded-full font-medium",
                  "transition-all duration-200",
                  "border-[0.5px] border-primary/20",
                  "cursor-pointer",
                  "hover:from-primary/20 hover:to-primary/10",
                  "hover:border-primary/40 hover:-translate-y-0.5"
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
          <div className="mt-5 border-t border-border/30 pt-4">
            <div className="grid grid-cols-3 items-center w-full">
          <button
            onClick={toggleLike}
                className={cn(
                  "bg-transparent border-none cursor-pointer",
                  "text-muted-foreground text-sm",
                  "px-2 py-2 rounded-xl",
                  "flex items-center justify-center gap-2.5 w-full",
                  "transition-all duration-300 font-semibold",
                  "relative overflow-hidden group",
                  "hover:text-foreground",
                  "active:scale-95",
                  liked && "text-danger",
                  liked && "hover:text-danger"
                )}
            aria-label="Like"
          >
            <svg
              className="w-5 h-5 flex-shrink-0 transition-transform duration-200 hover:scale-110"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={liked ? "currentColor" : "none"}
              stroke="currentColor"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="font-semibold min-w-[1.5rem] text-center">{likeCount}</span>
          </button>
          <button
                className={cn(
                  "bg-transparent border-none cursor-pointer",
                  "text-muted-foreground text-sm",
                  "px-2 py-2 rounded-xl",
                  "flex items-center justify-center gap-2.5 w-full",
                  "transition-all duration-300 font-semibold",
                  "relative overflow-hidden group",
                  "hover:text-primary",
                  "active:scale-95"
                )}
            aria-label="Comment"
            onClick={() => setPostDetailModalOpen(true)}
          >
            <svg
              className="w-5 h-5 flex-shrink-0 transition-transform duration-200 hover:scale-110"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="font-semibold min-w-[1.5rem] text-center">{post.comments || 0}</span>
          </button>
          <button 
            ref={shareButtonRef}
                className={cn(
                  "bg-transparent border-none cursor-pointer",
                  "text-muted-foreground text-sm",
                  "px-2 py-2 rounded-xl",
                  "flex items-center justify-center gap-2.5 w-full",
                  "transition-all duration-300 font-semibold",
                  "relative overflow-hidden group",
                  "hover:text-secondary",
                  "active:scale-95"
                )}
            aria-label="Share" 
            onClick={handleShare}
          >
            <svg
              className="w-5 h-5 flex-shrink-0 transition-transform duration-200 hover:scale-110"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span className="font-semibold min-w-[1.5rem] text-center">{post.shares || 0}</span>
          </button>
        </div>
        {/* {post.views && (
          <div className="post-views">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>{post.views}</span>
          </div>
        )} */}
      </div>

      {/* Top 2 Comments Preview */}
      {post.topComments && post.topComments.length > 0 && (
        <div className="mt-3 border-t border-border/20 pt-3 top-comments-preview">
          <button
            onClick={() => setPostDetailModalOpen(true)}
            className="w-full text-left"
          >
            {post.topComments.map((comment, index) => (
              <div key={comment.id || index} className="mb-2 last:mb-0">
                <div className="flex gap-2 items-start">
                  <img
                    src={getAvatarUrl(comment.authorAvatar, 32)}
                    alt={comment.authorName || "User"}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    onError={(e) => {
                      e.target.src = getAvatarUrl(null, 32);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted/30 rounded-2xl px-3 py-2">
                      <span className="font-semibold text-sm text-foreground mr-2">
                        {comment.authorName || "Người dùng"}
                      </span>
                      <span className="text-sm text-foreground break-words">
                        {comment.content}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-2">
                      <span className="text-xs text-muted-foreground">
                        {comment.likeCount || 0} lượt thích
                      </span>
                      {index === post.topComments.length - 1 && post.comments > post.topComments.length && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPostDetailModalOpen(true);
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Xem tất cả {post.comments} bình luận
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </button>
        </div>
      )}

      {/* Show "View all comments" if there are more than 2 comments */}
      {post.comments > 0 && (!post.topComments || post.topComments.length === 0) && (
        <div className="mt-3 border-t border-border/20 pt-3 view-all-comments-link">
          <button
            onClick={() => setPostDetailModalOpen(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Xem tất cả {post.comments} bình luận
          </button>
        </div>
      )}

      {post.repostedFromId && (
        <PostDetailModal
          open={originalPostModalOpen}
          postId={post.repostedFromId}
          onClose={() => setOriginalPostModalOpen(false)}
          alwaysShowComments={false}
          showInputForm={false}
        />
      )}
      <ShareModal
        open={shareModalOpen}
        post={post}
        onClose={() => setShareModalOpen(false)}
        onShared={handleShared}
        triggerRef={shareButtonRef}
      />
      <PostDetailModal
        open={postDetailModalOpen}
        post={post}
        postId={post.id}
        onClose={() => setPostDetailModalOpen(false)}
        alwaysShowComments={true}
        showInputForm={true}
      />
    </article>
  )
}

