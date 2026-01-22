import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Globe, Lock } from "lucide-react"
import YouTubeLinkPreview from "../../../../components/common/YouTubeLinkPreview"
import { splitTextWithYouTube } from "../../../../utils/youtube"
import { likePost, unlikePost, trackPostView, updateComment, deleteComment } from "../../../../api/postApi"
import AudioWaveform from "../audio/AudioWaveform"
import PostMediaLayout from "./PostMediaLayout"
import ShareModal from "../modals/ShareModal"
import PostDetailModal from "../modals/PostDetailModal"
import ReadMoreText from "../comment/ReadMoreText"
import ExpandableText from "../../../../components/common/ExpandableText"
import { cn } from "../../../../utils/cn"
import { getAvatarUrl } from "../../../../utils/defaultAvatar"
import { mapPostForCard, formatPostTime } from "../../../../utils/postTransformers"
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
  onShared,
  disableCommentButton = false,
  hideMenu = false,
  isOwnProfile = false
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isPlaying = playingPost === post.id
  const [liked, setLiked] = useState(Boolean(post.likedByCurrentUser))
  const [likeCount, setLikeCount] = useState(Number(post.likes || 0))
  const [postDetailModalOpen, setPostDetailModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  // originalPost: luôn bắt đầu từ null, rồi sync từ backend (post.originalPost) nếu có
  const [originalPost, setOriginalPost] = useState(null)
  const [originalPostModalOpen, setOriginalPostModalOpen] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editCommentText, setEditCommentText] = useState("")
  const [deletingCommentId, setDeletingCommentId] = useState(null)
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
  // Check both likedByCurrentUser and stats.isLikedByMe for compatibility
  useEffect(() => {
    const isLiked = post.stats?.isLikedByMe !== undefined 
      ? post.stats.isLikedByMe 
      : Boolean(post.likedByCurrentUser);
    setLiked(isLiked);
    setLikeCount(Number(post.likes || post.stats?.likeCount || 0));
  }, [post.likedByCurrentUser, post.stats?.isLikedByMe, post.likes, post.stats?.likeCount, post.id])

  // Query original post if this is a repost (chỉ query 1 lần, có cache)
  const originalPostFetched = useRef(false);
  
  // Validate ObjectId format
  const isValidObjectId = (id) => {
    if (!id) return false;
    const idStr = String(id);
    return /^[0-9a-fA-F]{24}$/.test(idStr);
  };

  useEffect(() => {
    // Nếu đã xử lý originalPost từ backend rồi thì không làm lại nữa để tránh loop
    if (originalPostFetched.current === 'fromBackend') {
      return;
    }

    // Nếu backend đã gửi sẵn originalPost thì normalize vào state, không cần fetch thêm
    if (post.originalPost) {
      const op = post.originalPost;
      // Sử dụng cùng transformer với profile/newsfeed để đảm bảo structure đồng nhất
      const transformedOriginal = mapPostForCard(op, t);
      setOriginalPost(transformedOriginal);
      originalPostFetched.current = 'fromBackend';
      return;
    }

    // Reset khi repostedFromId thay đổi (và chưa có originalPost từ backend)
    if (post.repostedFromId && post.repostedFromId.toString() !== originalPostFetched.current) {
      originalPostFetched.current = post.repostedFromId.toString();
      if (!post.originalPost) {
        setOriginalPost(null); // Reset để query lại khi chưa có dữ liệu backend
      }
    }
  }, [post.repostedFromId, post.originalPost, t]);

  // KHÔNG fetch thêm originalPost ở FE nữa.
  // Giả định backend đã populate sẵn originalPost trong post khi là repost.

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

  // Get current user info for comment ownership check
  const getCurrentUserInfo = () => {
    try {
      const raw = localStorage.getItem("session")
      const session = raw ? JSON.parse(raw) : null
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

      return {
        viewerEntityAccountId: resolveViewerEntityAccountId(),
        currentUser
      }
    } catch (e) {
      return { viewerEntityAccountId: null, currentUser: null }
    }
  }

  // Handle edit comment
  const handleEditComment = async (commentId, currentContent) => {
    if (editingCommentId === commentId) {
      // Save edit
      const trimmed = editCommentText.trim()
      if (!trimmed) {
        alert("Vui lòng nhập nội dung bình luận")
        return
      }

      try {
        const { viewerEntityAccountId } = getCurrentUserInfo()
        if (!viewerEntityAccountId) {
          alert("Vui lòng chọn thực thể hoạt động trước khi chỉnh sửa bình luận.")
          return
        }

        await updateComment(post.id, commentId, {
          content: trimmed,
          entityAccountId: viewerEntityAccountId
        })

        // Update local state
        const updatedComments = post.topComments.map(c =>
          c.id === commentId ? { ...c, content: trimmed } : c
        )
        post.topComments = updatedComments

        setEditingCommentId(null)
        setEditCommentText("")
        alert("Đã cập nhật bình luận")
      } catch (error) {
        console.error("Error updating comment:", error)
        alert(error?.response?.data?.message || "Không thể cập nhật bình luận. Vui lòng thử lại.")
      }
    } else {
      // Start editing
      setEditingCommentId(commentId)
      setEditCommentText(currentContent || "")
    }
  }

  // Handle delete comment
  const handleDeleteComment = async (commentId) => {
    const { viewerEntityAccountId } = getCurrentUserInfo()
    if (!viewerEntityAccountId) {
      alert("Vui lòng chọn thực thể hoạt động trước khi xóa bình luận.")
      return
    }

    if (!window.confirm("Bạn có chắc chắn muốn xóa bình luận này?")) {
      return
    }

    try {
      setDeletingCommentId(commentId)
      await deleteComment(post.id, commentId, {
        entityAccountId: viewerEntityAccountId
      })

      // Update local state - remove comment from topComments
      const updatedComments = post.topComments.filter(c => c.id !== commentId)
      post.topComments = updatedComments
      post.comments = Math.max(0, (post.comments || 0) - 1)

      alert("Đã xóa bình luận")
    } catch (error) {
      console.error("Error deleting comment:", error)
      alert(error?.response?.data?.message || "Không thể xóa bình luận. Vui lòng thử lại.")
    } finally {
      setDeletingCommentId(null)
    }
  }

  // Check if current user is comment owner
  const isCommentOwner = (comment) => {
    const { viewerEntityAccountId } = getCurrentUserInfo()
    if (!viewerEntityAccountId) return false
    
    const commentAuthorId = comment.author?.entityAccountId || comment.authorEntityAccountId
    return String(commentAuthorId) === String(viewerEntityAccountId)
  }

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
      setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)))

      // Debug: log entityAccountId và session để kiểm tra phân biệt like giữa các role
      try {
        const rawSession = localStorage.getItem("session")
        console.log("[PostCard] toggleLike", {
          postId: post.id,
          nextLiked,
          viewerEntityAccountId,
          session: rawSession
        })
      } catch {
        console.warn("[PostCard] Failed to read session for debug logging")
      }

      const response = nextLiked
        ? await likePost(post.id, { typeRole, entityAccountId: viewerEntityAccountId })
        : await unlikePost(post.id, { entityAccountId: viewerEntityAccountId })

      // Response từ like/unlike API trả về raw post, không phải DTO
      // Optimistic update đã đúng rồi, không cần sync từ response
      // State sẽ được sync đúng khi reload từ useEffect (đọc từ post.stats.isLikedByMe)
    } catch (error) {
      // Revert optimistic update on error
      setLiked((v) => !v)
      setLikeCount((c) => Math.max(0, liked ? c + 1 : c - 1))
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

  // Helper: loại bỏ dòng tên trùng với tác giả ở cuối content (vd: dòng cuối chỉ là "Smoker fa")
  const stripTrailingAuthorName = (rawContent) => {
    if (!rawContent) return "";
    const authorName = (post.user || "").trim();
    if (!authorName) return String(rawContent).trim();

    const lines = String(rawContent).split(/\r?\n/);
    while (lines.length > 0) {
      const last = lines[lines.length - 1].trim();
      if (!last) {
        lines.pop();
        continue;
      }
      if (last === authorName) {
        lines.pop();
        continue;
      }
      break;
    }
    return lines.join("\n").trim();
  };

  // tránh duplicate nội dung khi là repost:
  // - nếu post là repost và content trùng với content của originalPost => ẩn content bên ngoài
  // - nếu user có caption riêng thì vẫn hiển thị caption đó (sau khi strip tên ở cuối)
  const displayContent = (() => {
    if (!post.content) return "";
    const cleaned = stripTrailingAuthorName(post.content);
    if (!cleaned) return "";

    const isRepost = Boolean(post.repostedFromId || post.originalPost);
    if (!isRepost) return cleaned;

    // Nếu có originalPost và nội dung trùng nhau (bỏ khoảng trắng) thì không render ngoài
    if (originalPost && originalPost.content) {
      const outer = cleaned.trim();
      const inner = String(originalPost.content).trim();
      if (outer === inner) return "";
    }

    return cleaned;
  })();

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

  // Debug / analytics: trending score & view count (from stats or fallback fields)
  const trendingScore =
    typeof post.stats?.trendingScore === "number"
      ? post.stats.trendingScore
      : (typeof post.trendingScore === "number" ? post.trendingScore : 0);
  const viewCount =
    typeof post.stats?.viewCount === "number"
      ? post.stats.viewCount
      : (typeof post.views === "number" ? post.views : 0);

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
      "hover:shadow-[0_2px_4px_rgba(0,0,0,0.08)]"
    )}>
      {/* Header */}
      <div className="flex justify-between items-start mb-1.5 relative">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <img
              src={getAvatarUrl(post.avatar, 32)}
              alt={post.user}
              onClick={handleProfileClick}
              onError={(e) => {
                e.target.src = getAvatarUrl(null, 32);
              }}
              className={cn(
                "w-10 h-10 rounded-2xl object-cover",
                "border-2 border-primary/20 ring-2 ring-primary/5",
                "transition-all duration-500 ease-out",
                "hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)]",
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
              {/* Status icon (public/private) */}
              {post.status && (
                <span className="text-muted-foreground">
                  {post.status === "public" ? (
                    <Globe size={12} className="inline-block" />
                  ) : post.status === "private" ? (
                    <Lock size={12} className="inline-block" />
                  ) : null}
                </span>
              )}
              {post.location && (
                <span className="text-muted-foreground text-[0.75rem] flex items-center gap-1">
                  📍 {post.location}
                </span>
              )}
            </div>
          </div>
          {/* Small badge: trending score & views */}
          {(trendingScore > 0 || viewCount > 0) && (
            <div
              className={cn(
                "ml-2 px-2 py-1 rounded-full",
                "bg-muted/70 text-[0.7rem] text-muted-foreground",
                "flex flex-col items-start justify-center",
                "min-w-[3.5rem]"
              )}
            >
              {trendingScore > 0 && (
                <span className="leading-tight">
                  TS: {Math.round(trendingScore)}
                </span>
              )}
              <span className="leading-tight">
                👁 {viewCount}
              </span>
            </div>
          )}
        </div>
        {!hideMenu && (
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
            {post.canManage || isOwnProfile ? (
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
        )}
      </div>

      <div>
      {/* Repost indicator and original post info */}
      {post.repostedFromId && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-muted-foreground text-[0.8rem]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          {originalPost ? (
            <span>
              <strong className="text-foreground">{post.user || "Người dùng"}</strong>{" "}
              {t('feed.repostedOf', { defaultValue: 'đã đăng lại bài viết của' })}{" "}
              <strong className="text-foreground">{originalPost.user || t('feed.someone', { defaultValue: 'Ai đó' })}</strong>
            </span>
          ) : (
            <span>
              <strong className="text-foreground">{post.user || "Người dùng"}</strong>{" "}
              {t('feed.reposted', { defaultValue: 'đã đăng lại một bài viết' })}
            </span>
          )}
        </div>
      )}

      {/* Content */}
        {displayContent && (
      <div className="mt-3">
            {(() => {
              // Parse content to detect YouTube links
              const segments = splitTextWithYouTube(displayContent);
              
              // If no YouTube links found, render as plain text
              if (segments.length === 1 && segments[0].type === 'text') {
                return (
                  <ReadMoreText 
                    text={displayContent} 
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
            isPlaying={sharedIsPlaying ? (playingPost === post.id) : isPlaying}
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


        {/* Display medias using PostMediaLayout component - full width equal to post card */}
        {!post.repostedFromId && !audioMedia && (medias.images.length > 0 || medias.videos.length > 0) && (
          <div className="w-[calc(100%+1.8rem)] -mx-[0.9rem] mt-3 -mb-4">
            <PostMediaLayout
              images={medias.images}
              videos={medias.videos}
              onImageClick={handleImageClick}
            />
          </div>
        )}

        {/* Fallback: Display single image for backward compatibility - full width equal to post card */}
        {!post.repostedFromId && !audioMedia && !post.medias && post.image && (
          <div className="w-[calc(100%+1.8rem)] -mx-[0.9rem] mt-3 -mb-4">
            <PostMediaLayout
              images={[{ url: post.image, id: 'fallback-image' }]}
              videos={[]}
              onImageClick={handleImageClick}
            />
          </div>
        )}
        
        {/* Fallback: Display single video for backward compatibility - full width equal to post card */}
        {!post.repostedFromId && !audioMedia && !post.medias && post.videoSrc && !post.image && (
          <div className="w-[calc(100%+1.8rem)] -mx-[0.9rem] mt-3 -mb-4">
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
            "mt-3 rounded-lg border-[0.5px] border-border/20",
            "bg-muted/30 p-3",
            "hover:bg-muted/50 transition-colors",
            "cursor-pointer"
          )}>
            {originalPost ? (
              <>
                {/* Original Author Info */}
                {originalPost.user && (
                  <div className="flex items-start gap-2 mb-2">
                    <img
                      src={getAvatarUrl(originalPost.avatar, 32)}
                      alt={originalPost.user}
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        e.target.src = getAvatarUrl(null, 32);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-[0.9rem] text-foreground block">
                        {originalPost.user}
                      </span>
                      {originalPost.createdAt && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                          {formatPostTime(originalPost.createdAt, t)}
                          </span>
                          {/* Status icon (public/private) */}
                          {originalPost.status && (
                            <span className="text-muted-foreground">
                              {originalPost.status === "public" ? (
                                <Globe size={12} className="inline-block" />
                              ) : originalPost.status === "private" ? (
                                <Lock size={12} className="inline-block" />
                              ) : null}
                        </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Original Content */}
                {originalPost.content && (
                  <div className="mt-2">
                    <ReadMoreText 
                      text={originalPost.content} 
                      maxLines={3}
                      className="whitespace-pre-wrap leading-[1.7] text-[0.95rem] text-foreground m-0 break-words font-normal"
                    />
                  </div>
                )}
                
                {/* Original Music Thumbnail / Info (nếu có) */}
                {(originalPost.thumbnail || originalPost.artistName) && (
                  <div className="mt-2 flex items-center gap-3">
                    {originalPost.thumbnail && (
                      <img
                        src={originalPost.thumbnail}
                        alt="Cover"
                        className="w-14 h-14 rounded-md object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      {originalPost.artistName && originalPost.artistName !== originalPost.user && (
                        <p className="text-xs text-muted-foreground truncate">
                          {originalPost.artistName}
                        </p>
                      )}
                    </div>
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
            onClick={disableCommentButton ? undefined : () => setPostDetailModalOpen(true)}
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
          {post.topComments.map((comment, index) => {
            // Anonymous temporarily disabled
            const isAnonymousComment = false;
            const anonymousIndex = comment.anonymousIndex;
            // Read from new DTO schema: author.name or legacy authorName
            const authorName = comment.author?.name || comment.authorName;
            const displayName = authorName || "Người dùng";
            // Read avatar from new DTO schema: author.avatar or legacy authorAvatar
            const authorAvatar = comment.author?.avatar || comment.authorAvatar;
            const displayAvatar = getAvatarUrl(authorAvatar, 32);
            const isOwner = isCommentOwner(comment);
            const isEditing = editingCommentId === comment.id;

            return (
              <div key={comment.id || index} className="mb-2 last:mb-0">
                <div className="flex gap-2 items-start">
                  <img
                    src={displayAvatar}
                    alt={displayName || "User"}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPostDetailModalOpen(true);
                    }}
                    onError={(e) => {
                      e.target.src = getAvatarUrl(null, 32);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted/30 rounded-2xl px-3 py-2">
                      <span className="font-semibold text-sm text-foreground mr-2">
                        {displayName}
                      </span>
                      <ExpandableText
                        text={comment.content || ""}
                        maxLength={100}
                        textClassName="text-sm text-foreground"
                        buttonClassName="text-xs"
                      />
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
            );
          })}
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
      />
    </article>
  )
}

