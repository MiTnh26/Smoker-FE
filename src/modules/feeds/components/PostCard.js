import { useEffect, useRef, useState } from "react"
import { likePost, unlikePost } from "../../../api/postApi"
import AudioWaveform from "./AudioWaveform"
import VideoPlayer from "./VideoPlayer"
import ImageDetailModal from "./ImageDetailModal"
import CommentSection from "./CommentSection"
import "../../../styles/modules/feeds/PostCard.css"

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
  onReport
}) {
  const isPlaying = playingPost === post.id
  const [liked, setLiked] = useState(Boolean(post.likedByCurrentUser))
  const [likeCount, setLikeCount] = useState(Number(post.likes || 0))
  const [selectedImage, setSelectedImage] = useState(null)
  const [showComments, setShowComments] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

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
        await likePost(post.id, { typeRole })
      } else {
        await unlikePost(post.id)
      }
    } catch (error) {
      // Revert optimistic update on error
      setLiked((v) => !v)
      setLikeCount((c) => (liked ? c + 1 : c - 1))
      // eslint-disable-next-line no-console
      console.error("Failed to toggle like on post", error)
    }
  }

  const handleShare = async () => {
    try {
      const url = typeof window !== "undefined" ? `${window.location.origin}/posts/${post.id}` : `https://smoker.app/posts/${post.id}`
      if (navigator.share) {
        await navigator.share({ title: post.audioTitle || post.title || "Bài viết", text: post.content, url })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        // Optionally, you could show a toast here
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Share failed", e)
    }
  }

  const handleImageClick = (imageUrl) => {
    setSelectedImage({ imageUrl, postId: post.id })
  }

  // Get audio from post data (already extracted in transformPost)
  const audioMedia = post.audioSrc ? { url: post.audioSrc } : null

  // Normalize medias: backend may return an array of media objects with type
  const medias = (() => {
    const m = post.medias
    if (Array.isArray(m)) {
      return {
        images: m.filter((x) => x && x.type === "image"),
        videos: m.filter((x) => x && x.type === "video"),
      }
    }
    if (m && (Array.isArray(m.images) || Array.isArray(m.videos))) {
      return { images: m.images || [], videos: m.videos || [] }
    }
    return { images: [], videos: [] }
  })()

  return (
    <article className="post-card">
      {/* Header */}
      <div className="post-header">
        <div className="post-user">
          <div className="avatar-wrapper">
            <img 
              src={post.avatar || "https://via.placeholder.com/40"} 
              alt={post.user} 
              className="user-avatar" 
            />
            {post.verified && <span className="verified-badge">✓</span>}
          </div>
          <div className="user-info">
            <h4 className="user-name">{post.user || "Người dùng"}</h4>
            <div className="user-meta">
              <p className="post-time">{post.time}</p>
              {post.location && <span className="post-location">📍 {post.location}</span>}
            </div>
          </div>
        </div>
        <button className="more-btn" aria-label="More options" onClick={() => setMenuOpen((v) => !v)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
        {menuOpen && (
          <div ref={menuRef} className="post-menu-dropdown">
            {post.canManage ? (
              <>
                <button className="post-menu-item" onClick={() => { setMenuOpen(false); onEdit?.(post); }}>Chỉnh sửa</button>
                <button className="post-menu-item danger" onClick={() => { setMenuOpen(false); onDelete?.(post); }}>Bỏ vào thùng rác</button>
              </>
            ) : (
              <button className="post-menu-item" onClick={() => { setMenuOpen(false); onReport?.(post); }}>Báo cáo</button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="post-content">
        <p className="post-text">{post.content}</p>
        
        {/* Check if post has both image and audio - show side by side layout */}
        {audioMedia && (
          (medias.images.length > 0 || post.image) ? (
            <div className="post-media-audio-layout">
              {/* Left side: Image */}
              <div className="post-media-left">
                {medias.images.length > 0 ? (
                  <div 
                    className={`post-images ${medias.images.length > 1 ? 'post-images-grid' : ''}`}
                    data-count={medias.images.length}
                  >
                    {medias.images.map((img, index) => {
                      const isLastImage = index === medias.images.length - 1;
                      const remainingCount = medias.images.length - 5;
                      const shouldShowOverlay = medias.images.length > 5 && isLastImage && remainingCount > 0;
                      
                      return (
                        <img 
                          key={img.id || index} 
                          src={img.url} 
                          alt={img.caption || `Post image ${index + 1}`} 
                          className="post-image"
                          onClick={() => handleImageClick(img.url)}
                          data-remaining={shouldShowOverlay ? remainingCount : undefined}
                        />
                      );
                    })}
                  </div>
                ) : post.image ? (
                  <img 
                    src={post.image} 
                    alt="post" 
                    className="post-image"
                    onClick={() => handleImageClick(post.image)}
                  />
                ) : null}
                
                {/* Videos if any */}
                {medias.videos.length > 0 && (
                  <div className="post-videos">
                    {medias.videos.map((video, index) => (
                      <VideoPlayer 
                        key={video.id || index}
                        src={video.url}
                        poster={video.thumbnail || video.poster}
                        className="post-video"
                      />
                    ))}
                  </div>
                )}
                {!post.medias && post.videoSrc && (
                  <VideoPlayer 
                    src={post.videoSrc}
                    className="post-video"
                  />
                )}
              </div>

              {/* Right side: Audio Waveform */}
              <div className="post-audio-right">
                <AudioWaveform
                  audioSrc={audioMedia.url}
                  isPlaying={sharedIsPlaying || isPlaying}
                  onTogglePlay={togglePlay}
                  audioTitle={post.audioTitle || post.title}
                  artistName={post.artistName || post.user}
                  album={post.album}
                  genre={post.genre}
                  releaseDate={post.releaseDate}
                  description={post.description}
                  thumbnail={post.thumbnail}
                  sharedAudioRef={sharedAudioRef}
                  sharedCurrentTime={sharedCurrentTime}
                  sharedDuration={sharedDuration}
                  onSeek={onSeek}
                />
              </div>
            </div>
          ) : (
            /* Only audio, no image - show audio full width */
            <AudioWaveform
              audioSrc={audioMedia.url}
              isPlaying={sharedIsPlaying || isPlaying}
              onTogglePlay={togglePlay}
              audioTitle={post.audioTitle || post.title}
              artistName={post.artistName || post.user}
              album={post.album}
              genre={post.genre}
              releaseDate={post.releaseDate}
              description={post.description}
              thumbnail={post.thumbnail}
              sharedAudioRef={sharedAudioRef}
              sharedCurrentTime={sharedCurrentTime}
              sharedDuration={sharedDuration}
              onSeek={onSeek}
            />
          )
        )}

        {/* Display music info if populated but no audio source */}
        {!audioMedia && (post.audioTitle || post.artistName || post.thumbnail) && (
          <div className="post-music-card">
            {post.thumbnail && (
              <img src={post.thumbnail} alt={post.audioTitle || "Cover"} className="music-cover" />
            )}
            <div className="music-meta">
              {post.audioTitle && <div className="music-title">{post.audioTitle}</div>}
              {post.artistName && <div className="music-artist">{post.artistName}</div>}
              {post.genre && <div className="music-genre">{post.genre}</div>}
            </div>
          </div>
        )}

        {/* Display medias if no audio - normal vertical layout */}
        {!audioMedia && (medias.images.length > 0 || medias.videos.length > 0) && (
          <div className="post-medias">
            {/* Display images */}
            {medias.images.length > 0 && (
              <div 
                className={`post-images ${medias.images.length > 1 ? 'post-images-grid' : ''}`}
                data-count={medias.images.length}
              >
                {medias.images.map((img, index) => {
                  const isLastImage = index === medias.images.length - 1;
                  const remainingCount = medias.images.length - 5;
                  const shouldShowOverlay = medias.images.length > 5 && isLastImage && remainingCount > 0;
                  
                  return (
                    <img 
                      key={img.id || index} 
                      src={img.url} 
                      alt={img.caption || `Post image ${index + 1}`} 
                      className="post-image"
                      onClick={() => handleImageClick(img.url)}
                      data-remaining={shouldShowOverlay ? remainingCount : undefined}
                    />
                  );
                })}
              </div>
            )}
            
            {/* Display videos */}
            {medias.videos.length > 0 && (
              <div className="post-videos">
                {medias.videos.map((video, index) => (
                  <VideoPlayer 
                    key={video.id || index}
                    src={video.url}
                    poster={video.thumbnail || video.poster}
                    className="post-video"
                  />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Fallback: Display single image for backward compatibility */}
        {!audioMedia && !post.medias && post.image && (
          <img 
            src={post.image} 
            alt="post" 
            className="post-image"
            onClick={() => handleImageClick(post.image)}
          />
        )}
        {!audioMedia && !post.medias && post.videoSrc && !post.image && (
          <VideoPlayer 
            src={post.videoSrc}
            className="post-video"
          />
        )}
        
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="post-tags">
            {post.hashtags.map((tag, i) => (
              <span key={i} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="post-footer">
        <div className="actions-left">
          <button
            onClick={toggleLike}
            className={`action-btn like-btn ${liked ? "liked" : ""}`}
            aria-label="Like"
          >
            <svg className="action-icon" width="20" height="20" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="action-count">{likeCount}</span>
          </button>
          <button 
            className="action-btn comment-btn" 
            aria-label="Comment"
            onClick={() => setShowComments(!showComments)}
          >
            <svg className="action-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="action-count">{post.comments || 0}</span>
          </button>
          <button className="action-btn share-btn" aria-label="Share" onClick={handleShare}>
            <svg className="action-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span className="action-count">{post.shares || 0}</span>
          </button>
        </div>
        {post.views && (
          <div className="post-views">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>{post.views}</span>
          </div>
        )}
      </div>

      {/* Image Detail Modal */}
      {selectedImage && (
        <ImageDetailModal
          open={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          imageUrl={selectedImage.imageUrl}
          postId={selectedImage.postId}
          mediaId={selectedImage.mediaId}
        />
      )}

      {/* Comment Section - Inline below post */}
      {showComments && (
        <div className="post-comments-wrapper">
          <CommentSection
            postId={post.id}
            onClose={() => setShowComments(false)}
            inline={true}
          />
        </div>
      )}
    </article>
  )
}
