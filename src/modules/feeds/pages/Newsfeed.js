"use client"

import { useState } from "react"
import FeedHeader from "../components/FeedHeader"
import StoryBar from "../components/StoryBar"
import StoryViewer from "../components/StoryViewer"
import PostCard from "../components/PostCard"
import "../../../styles/modules/newsfeed.css"

export default function Newsfeed() {
  const [playingPost, setPlayingPost] = useState(null)
  const [activeStory, setActiveStory] = useState(null)

  const posts = [
    { id: 1, user: "Bar Tabung", time: "2 giờ trước", content: "Đêm nay có DJ nổi tiếng!", audioTitle: "Summer Mix 2024", likes: 125, comments: 23 },
    { id: 2, user: "Club Paradise", time: "5 giờ trước", content: "Happy hour 50%!", audioTitle: "Chill Vibes", likes: 89, comments: 15 },
    { id: 3, user: "Cafe Acoustic", time: "1 ngày trước", content: "Đêm nhạc Acoustic miễn phí vé vào cửa.", audioTitle: "Live Acoustic Session", likes: 67, comments: 8 },
  ]

  const stories = [
    { id: 1, user: "Bar Tabung", thumbnail: "/images/story1.jpg", video: "/videos/story1.mp4" },
    { id: 2, user: "Club Paradise", thumbnail: "/images/story2.jpg", video: "/videos/story2.mp4" },
    { id: 3, user: "Sky Lounge", thumbnail: "/images/story3.jpg", video: "/videos/story3.mp4" },
  ]

  return (
    <div className="newsfeed-page">
      <FeedHeader />
      <StoryBar stories={stories} onStoryClick={setActiveStory} />

      <main className="newsfeed-main">
        <div className="feed-posts">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              playingPost={playingPost}
              setPlayingPost={setPlayingPost}
            />
          ))}
        </div>
      </main>

      {activeStory && (
        <StoryViewer
          stories={stories}
          activeStory={activeStory}
          onClose={() => setActiveStory(null)}
        />
      )}
    </div>
  )
}
