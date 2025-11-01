"use client"

import { useState, useEffect } from "react"
import FeedHeader from "../components/FeedHeader"
import StoryBar from "../components/StoryBar"
import StoryViewer from "../components/StoryViewer"
import PostFeed from "../components/PostFeed"
import { stories as initialStories } from "../data/mockStories"
import "../../../styles/modules/newsfeed.css"
import VideoShortBar from "../components/VideoShortBar";
import VideoShortViewer from "../components/VideoShortViewer";
import { shorts as initialShorts } from "../data/mockShorts"
import LiveBroadcaster from "../components/LiveBroadcaster";
import LiveViewer from "../components/LiveViewer";
import livestreamApi from "../../../api/livestreamApi";


export default function NewsfeedPage() {
  const [stories, setStories] = useState(initialStories)
  const [activeStory, setActiveStory] = useState(null)
  const [shortVideos] = useState(initialShorts)
  const [activeShortVideo, setActiveShortVideo] = useState(null)
  const [showBroadcaster, setShowBroadcaster] = useState(false)
  const [activeLivestream, setActiveLivestream] = useState(null)
  const [activeLivestreams, setActiveLivestreams] = useState([])


  const handleStoryCreated = (newStory) => {
    // thêm story mới vào đầu mảng
    setStories([newStory, ...stories])
  }

  // Load active livestreams
  useEffect(() => {
    loadActiveLivestreams();
    // Refresh every 30 seconds
    const interval = setInterval(loadActiveLivestreams, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActiveLivestreams = async () => {
    try {
      const response = await livestreamApi.getActiveLivestreams();
      if (response.success) {
        setActiveLivestreams(response.data || []);
      }
    } catch (error) {
      console.error("Error loading active livestreams:", error);
    }
  };

  const handleGoLive = () => {
    setShowBroadcaster(true);
  };

  const handleLivestreamEnded = () => {
    setShowBroadcaster(false);
    loadActiveLivestreams();
  };

  const handleLivestreamClick = (livestream) => {
    setActiveLivestream(livestream);
  };

  return (
    <div className="newsfeed-page">
      <FeedHeader />

      {/* Tạo Story + StoryBar */}
      <div className="story-section ">

        <StoryBar stories={stories} onStoryClick={setActiveStory} onStoryCreated={handleStoryCreated} />
      </div>


      <main className="newsfeed-main">
        {/* Use PostFeed component for automatic loading */}
        <PostFeed 
          onGoLive={handleGoLive}
          activeLivestreams={activeLivestreams}
          onLivestreamClick={handleLivestreamClick}
        />
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

      {/* Live Broadcaster */}
      {showBroadcaster && (
        <LiveBroadcaster onClose={handleLivestreamEnded} />
      )}

      {/* Live Viewer */}
      {activeLivestream && (
        <LiveViewer 
          livestream={activeLivestream}
          onClose={() => setActiveLivestream(null)} 
        />
      )}

    </div>

  )
}
