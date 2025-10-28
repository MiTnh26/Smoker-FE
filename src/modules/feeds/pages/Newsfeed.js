"use client"

import { useState } from "react"
import FeedHeader from "../components/FeedHeader"
import StoryBar from "../components/StoryBar"
import StoryViewer from "../components/StoryViewer"
import PostCard from "../components/PostCard"
import CreatePostBox from "../components/CreatePostBox"
import CreateStory from "../components/CreateStory"
import { posts as initialPosts } from "../data/mockPosts"
import { stories as initialStories } from "../data/mockStories"
import "../../../styles/modules/newsfeed.css"
import VideoShortBar from "../components/VideoShortBar";
import VideoShortViewer from "../components/VideoShortViewer";
import { shorts as initialShorts } from "../data/mockShorts"


export default function NewsfeedPage() {
  const [posts, setPosts] = useState(initialPosts)
  const [stories, setStories] = useState(initialStories)
  const [playingPost, setPlayingPost] = useState(null)
  const [activeStory, setActiveStory] = useState(null)
  const [shortVideos, setShortVideos] = useState(initialShorts)
  const [activeShortVideo, setActiveShortVideo] = useState(null)

  const handleStoryCreated = (newStory) => {
    // thêm story mới vào đầu mảng
    setStories([newStory, ...stories])
  }

  return (
    <div className="newsfeed-page">
      <FeedHeader />

      {/* Tạo Story + StoryBar */}
      <div className="story-section ">

        <StoryBar stories={stories} onStoryClick={setActiveStory} onStoryCreated={handleStoryCreated} />
      </div>


      <main className="newsfeed-main">
        <CreatePostBox onCreate={() => console.log("Mở modal tạo bài viết")} />

        <div className="feed-posts space-y-4">
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
      {/* Video Shorts */}
      <div className="shorts-section">
        <VideoShortBar
          videos={shortVideos}
          onVideoClick={setActiveShortVideo}
        />
      </div>
      {activeStory && (
        <StoryViewer
          stories={stories}
          activeStory={activeStory}
          onClose={() => setActiveStory(null)}
        />
      )}
      {/* Short Video Viewer */}
      {activeShortVideo && (
        <VideoShortViewer
          videos={shortVideos}
          activeVideo={activeShortVideo}
          onClose={() => setActiveShortVideo(null)}
          visible={!!activeShortVideo} 
        />
      )}



    </div>

  )
}
