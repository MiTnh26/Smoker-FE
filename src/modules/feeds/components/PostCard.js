import { useState } from "react"
import "../../../styles/modules/feeds/PostCard.css"

export default function PostCard({ post, playingPost, setPlayingPost }) {
  const isPlaying = playingPost === post.id
  const [liked, setLiked] = useState(false)

  const togglePlay = () => setPlayingPost(isPlaying ? null : post.id)
  const toggleLike = () => setLiked(!liked)

  return (
    <article className="post-card">
      {/* Header */}
      <div className="post-header">
        <div className="post-user">
          <img src={post.avatar} alt={post.user} className="user-avatar" />
          <div>
            <h4 className="user-name">{post.user}</h4>
            <p className="post-time">{post.time}</p>
          </div>
        </div>
        <button className="more-btn">⋯</button>
      </div>

      {/* Content */}
      <div className="post-content">
        <p className="post-text">{post.content}</p>
        {post.image && (
          <img src={post.image} alt="post" className="post-image" />
        )}
        {post.hashtags && (
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
            className={`action-btn ${liked ? "liked" : ""}`}
          >
            ❤️ {liked ? post.likes + 1 : post.likes}
          </button>
          <button className="action-btn">💬 {post.comments}</button>
          <button className="action-btn">↗️ {post.shares || 0}</button>
        </div>
        {post.audioTitle && (
          <button onClick={togglePlay} className="audio-btn">
            {isPlaying ? "⏸ Dừng" : "▶️ Nghe"} {post.audioTitle}
          </button>
        )}
      </div>
    </article>
  )
}
