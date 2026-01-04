"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next";

import { StoryBar, StoryViewer, StoryEditor } from "../../components/story"
import PostFeed from "../../components/post/PostFeed"
import "../../../../styles/modules/feeds/pages/Newsfeed/Newsfeed.css"
import LiveSetup from "../../components/livestream/LiveSetup";
import LiveBroadcaster from "../../components/livestream/LiveBroadcaster";
import LiveViewer from "../../components/livestream/LiveViewer";
import useLivestreamManager from "../../components/livestream/useLivestreamManager";
import livestreamApi from "../../../../api/livestreamApi";

import { useStoryManager } from "../../components/story";

export default function NewsfeedPage() {
  const { t } = useTranslation();
  const [activeStory, setActiveStory] = useState(null)
  const {
    activeLivestream,
    openViewer,
    closeViewer,
    isBroadcasterOpen,
    openBroadcaster,
    closeBroadcaster,
  } = useLivestreamManager()
  const [showStoryEditor, setShowStoryEditor] = useState(false)
  const [showLiveSetup, setShowLiveSetup] = useState(false)
  const [liveSetupData, setLiveSetupData] = useState(null)
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

  const handleGoLive = () => setShowLiveSetup(true);
  const handleLivestreamEnded = () => closeBroadcaster({ refresh: true });
  const handleLivestreamClick = (livestream) => openViewer(livestream);

  return (
    <div className="newsfeed-page">
      {/* Tạo Story + StoryBar */}
      <div className="story-section">
        <StoryBar 
          stories={stories} 
          onStoryClick={setActiveStory} 
          onOpenEditor={handleOpenEditor}
          entityAccountId={entityAccountId}
        />
      </div>

      <main className="newsfeed-main">
        {/* PostFeed now includes livestreams merged with posts */}
        <PostFeed 
          onGoLive={handleGoLive} 
          onLivestreamClick={handleLivestreamClick}
        />
      </main>
      {activeStory && (
        <StoryViewer
          stories={stories}
          activeStory={activeStory}
          entityAccountId={entityAccountId}
          onClose={() => setActiveStory(null)}
          onStoryDeleted={fetchStories}
        />
      )}

      {/* Live Setup */}
      {showLiveSetup && (
        <LiveSetup
          onClose={() => {
            setShowLiveSetup(false);
            closeBroadcaster({ refresh: false });
          }}
          onStartLive={async (setupData) => {
            try {
              if (setupData.isScheduled && setupData.scheduledDateTime) {
                // Create scheduled livestream
                const settings = {
                  privacy: setupData.privacy,
                  shareToStory: setupData.shareToStory,
                  pinnedComment: setupData.pinnedComment,
                  background: setupData.background,
                  webcamPosition: setupData.webcamPosition,
                  screenShareEnabled: setupData.screenShareEnabled,
                  screenShareType: setupData.screenShareType,
                };
                await livestreamApi.createScheduledLivestream(
                  setupData.title,
                  setupData.description,
                  setupData.scheduledDateTime,
                  settings
                );
                setShowLiveSetup(false);
                // Show success message or notification
                alert("Đã lên lịch phát trực tiếp thành công!");
              } else {
                // Start live immediately
                setLiveSetupData(setupData);
                setShowLiveSetup(false);
                openBroadcaster();
              }
            } catch (error) {
              console.error("Error starting/scheduling livestream:", error);
              alert(error.message || "Có lỗi xảy ra khi tạo livestream");
            }
          }}
        />
      )}

      {/* Live Broadcaster */}
      {isBroadcasterOpen && (
        <LiveBroadcaster
          onClose={() => {
            closeBroadcaster({ refresh: false });
            setLiveSetupData(null);
          }}
          onEnded={handleLivestreamEnded}
          setupData={liveSetupData}
        />
      )}

      {/* Live Viewer */}
      {activeLivestream && (
        <LiveViewer livestream={activeLivestream} onClose={closeViewer} />
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
