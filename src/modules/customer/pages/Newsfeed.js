"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { Home, MessageCircle, Bell, User, Search, Menu, Heart, MessageSquare, Share2, Play, Pause } from "lucide-react"

import "../../../styles/modules/newsfeed.css"


export default function Newsfeed() {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [playingPost, setPlayingPost] = useState(null)

  const posts = [
    {
      id: 1,
      user: "Bar Tabung",
      time: "2 giờ trước",
      content: "Đêm nay có DJ nổi tiếng!",
      audioTitle: "Summer Mix 2024",
      likes: 125,
      comments: 23,
    },
    {
      id: 2,
      user: "Club Paradise",
      time: "5 giờ trước",
      content: "Happy hour 50%!",
      audioTitle: "Chill Vibes",
      likes: 89,
      comments: 15,
    },
    {
      id: 3,
      user: "Cafe Acoustic",
      time: "1 ngày trước",
      content: "Đêm nhạc Acoustic miễn phí vé vào cửa.",
      audioTitle: "Live Acoustic Session",
      likes: 67,
      comments: 8,
    },
    {
      id: 4,
      user: "Beer House",
      time: "3 giờ trước",
      content: "Mua 2 tặng 1 tất cả các loại bia.",
      audioTitle: "Party Night",
      likes: 102,
      comments: 19,
    },
    {
      id: 5,
      user: "Sky Lounge",
      time: "30 phút trước",
      content: "Check-in nhận ngay voucher 100k.",
      audioTitle: "Skyline Beats",
      likes: 54,
      comments: 6,
    },
    {
      id: 6,
      user: "Pub 1989",
      time: "10 phút trước",
      content: "Thứ 6 sôi động cùng ban nhạc sống.",
      audioTitle: "Friday Live",
      likes: 78,
      comments: 12,
    },
    {
      id: 7,
      user: "Rooftop Chill",
      time: "4 giờ trước",
      content: "Cocktail đặc biệt chỉ 99k.",
      audioTitle: "Sunset Chillout",
      likes: 41,
      comments: 3,
    },
  ]

  const conversations = [
    { id: 1, name: "Nguyễn Văn A", lastMessage: "Tối nay đi không?", time: "10 phút", unread: 2 },
    { id: 2, name: "Trần Thị B", lastMessage: "Ok nhé!", time: "30 phút", unread: 0 },
  ]

  return (
    <div className="newsfeed-page">
        {/* Main Feed */}
        <main className="newsfeed-main">
          <div className="feed-posts">
            {posts.map((post) => (
              <article key={post.id} className="post-card">
                <div className="post-header">
                  <div className="post-user">
                    <div className="post-avatar">
                      <User size={40} />
                    </div>
                    <div>
                      <h4 className="post-username">{post.user}</h4>
                      <p className="post-time">{post.time}</p>
                    </div>
                  </div>
                  <button className="post-menu">
                    <Menu size={20} />
                  </button>
                </div>

                <div className="post-content">
                  <p>{post.content}</p>
                </div>

                <div className="post-audio">
                  <button
                    className="audio-play-btn"
                    onClick={() => setPlayingPost(playingPost === post.id ? null : post.id)}
                  >
                    {playingPost === post.id ? <Pause size={24} /> : <Play size={24} />}
                  </button>
                  <div className="audio-info">
                    <p className="audio-title">{post.audioTitle}</p>
                  </div>
                </div>

                <div className="post-stats">
                  <span>{post.likes} lượt thích</span>
                  <span>{post.comments} bình luận</span>
                </div>

                <div className="post-actions">

                  <button className="action-btn">
                    <Heart size={20} />
                    <span>Thích</span>
                  </button>

                  <button className="action-btn">
                    <MessageSquare size={20} />
                    <span>Bình luận</span>
                  </button>

                  <button className="action-btn">
                    <Share2 size={20} />
                    <span>Chia sẻ</span>
                  </button>
                  
                </div>
              </article>
            ))}
          </div>
        </main>
      </div>

  )
}
