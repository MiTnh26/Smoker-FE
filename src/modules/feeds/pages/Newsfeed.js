"use client"

import { useState } from "react"
import FeedHeader from "../components/FeedHeader"
import StoryBar from "../components/StoryBar"
import StoryViewer from "../components/StoryViewer"
import PostFeed from "../components/PostFeed"
import { stories as initialStories } from "../data/mockStories"
import "../../../styles/modules/newsfeed.css"
import VideoShortBar from "../components/VideoShortBar";
import VideoShortViewer from "../components/VideoShortViewer";
import { shorts as initialShorts } from "../data/mockShorts"


export default function NewsfeedPage() {
  const [stories, setStories] = useState(initialStories)
  const [activeStory, setActiveStory] = useState(null)
  const [shortVideos] = useState(initialShorts)
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
        {/* Use PostFeed component for automatic loading */}
        <PostFeed />
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
