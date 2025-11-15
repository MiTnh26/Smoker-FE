"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next";

import FeedHeader from "./components/FeedHeader"
import { StoryBar, StoryViewer, StoryEditor } from "../../components/story"
import PostFeed from "../../components/post/PostFeed"
import "../../../../styles/modules/feeds/pages/Newsfeed/Newsfeed.css"
import VideoShortBar from "../../components/video/VideoShortBar";
import VideoShortViewer from "../../components/video/VideoShortViewer";
import { shorts as initialShorts } from "../../data/mockShorts"
import LiveBroadcaster from "../../components/livestream/LiveBroadcaster";
import LiveViewer from "../../components/livestream/LiveViewer";
import livestreamApi from "../../../../api/livestreamApi";

import { useStoryManager } from "../../components/story";

export default function NewsfeedPage() {
  const { t } = useTranslation();
  const [activeStory, setActiveStory] = useState(null)
  const [shortVideos] = useState(initialShorts)
  const [activeShortVideo, setActiveShortVideo] = useState(null)
  const [showBroadcaster, setShowBroadcaster] = useState(false)
  const [activeLivestream, setActiveLivestream] = useState(null)
  const [activeLivestreams, setActiveLivestreams] = useState([])
  const [showStoryEditor, setShowStoryEditor] = useState(false)
  const {
    stories,
    fetchStories,
    handleCreateStory,
    addStoryOptimistic,
    entityAccountId,
  } = useStoryManager();
  
  const handleOpenEditor = () => {
    console.log('[Newsfeed] Opening story editor');
    setShowStoryEditor(true);
  }
  
  // Helper function để lấy entityAccountId từ activeEntity (giống PostFeed.js)
  const handleStoryCreated = async (payload) => {
    setShowStoryEditor(false);
    if (!payload?.file) return;
    try {
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const activeEntity = session?.activeEntity || session?.account || {};
      const objectUrl = URL.createObjectURL(payload.file);
      const isVideo = payload.file.type.startsWith("video");

      const optimisticStory = {
        id: `temp-${Date.now()}`,
        _id: `temp-${Date.now()}`,
        temp: true,
        caption: payload.caption || "",
        createdAt: new Date().toISOString(),
        entityAccountId,
        authorEntityAccountId: entityAccountId,
        authorName:
          activeEntity.name ||
          activeEntity.userName ||
          activeEntity.UserName ||
          t("story.yourStory") ||
          "Your story",
        authorAvatar: activeEntity.avatar || activeEntity.Avatar || null,
        images: isVideo ? undefined : objectUrl,
        thumbnail: isVideo ? undefined : objectUrl,
        video: isVideo ? objectUrl : undefined,
        type: isVideo ? "video" : "image",
        viewed: false,
      };

      addStoryOptimistic(optimisticStory);

      await handleCreateStory(payload);
      await fetchStories();
    } catch (error) {
      console.error("[Newsfeed] Error creating story:", error);
      await fetchStories();
      alert(t("story.createFailed") || "Không thể đăng story, vui lòng thử lại.");
  }
  };

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
      if (response?.success) {
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

 console.log("  stories ", stories)
  return (
    <div className="newsfeed-page">
      <FeedHeader />

      {/* Tạo Story + StoryBar */}
      <div className="story-section ">

        <StoryBar 
          stories={stories} 
          onStoryClick={setActiveStory} 
          onOpenEditor={handleOpenEditor}
          entityAccountId={entityAccountId}
        />
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
          entityAccountId={entityAccountId}
          onClose={() => setActiveStory(null)}
          onStoryDeleted={fetchStories}
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

      {/* Story Editor Modal */}
      {showStoryEditor && (
        <StoryEditor
          onStoryCreated={handleStoryCreated}
          onClose={() => {
            console.log('[Newsfeed] Closing story editor');
            setShowStoryEditor(false);
          }}
        />
      )}

    </div>

  )
}
