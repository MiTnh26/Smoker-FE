import { Heart, MessageSquare, Share2, Play, Pause, User, Menu } from "lucide-react"

export default function PostCard({ post, playingPost, setPlayingPost }) {
  return (
    <article className="post-card">
      <div className="post-header">
        <div className="post-user">
          <div className="post-avatar"><User size={40} /></div>
          <div>
            <h4 className="post-username">{post.user}</h4>
            <p className="post-time">{post.time}</p>
          </div>
        </div>
        <button className="post-menu"><Menu size={20} /></button>
      </div>

      <div className="post-content"><p>{post.content}</p></div>

      <div className="post-audio">
        <button
          className="audio-play-btn"
          onClick={() => setPlayingPost(playingPost === post.id ? null : post.id)}
        >
          {playingPost === post.id ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <div className="audio-info"><p className="audio-title">{post.audioTitle}</p></div>
      </div>

      <div className="post-stats">
        <span>{post.likes} lượt thích</span>
        <span>{post.comments} bình luận</span>
      </div>

      <div className="post-actions">
        <button className="action-btn"><Heart size={20} /><span>Thích</span></button>
        <button className="action-btn"><MessageSquare size={20} /><span>Bình luận</span></button>
        <button className="action-btn"><Share2 size={20} /><span>Chia sẻ</span></button>
      </div>
    </article>
  )
}
