"use client"

import { useState, useEffect } from "react"
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
    setStories,
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
  const handleLivestreamClick = (livestream) => {
    // Validate livestream trước khi mở
    if (!livestream) {
      console.error("[Newsfeed] handleLivestreamClick: livestream is null/undefined");
      return;
    }
    
    if (!livestream.agoraChannelName) {
      console.error("[Newsfeed] handleLivestreamClick: missing agoraChannelName", livestream);
      alert("Livestream không hợp lệ hoặc đã kết thúc");
      return;
    }
    
    if (livestream.status !== "live") {
      console.warn("[Newsfeed] handleLivestreamClick: livestream is not live", livestream.status);
      alert("Livestream này đã kết thúc");
      return;
    }
    
    openViewer(livestream);
  };

  // Lắng nghe event để mở livestream từ NotificationPanel
  useEffect(() => {
    let isHandling = false; // Guard để tránh multiple calls
    
    const handleOpenLivestream = async (event) => {
      // Tránh xử lý đồng thời nhiều events
      if (isHandling) {
        console.warn("[Newsfeed] Already handling openLivestream event, skipping");
        return;
      }
      
      const { livestreamId, livestream } = event.detail || {};
      
      if (livestream) {
        // Validate livestream object trước khi mở
        if (!livestream.agoraChannelName) {
          console.error("[Newsfeed] Invalid livestream object: missing agoraChannelName", livestream);
          alert("Livestream không hợp lệ hoặc đã kết thúc");
          return;
        }
        
        // Kiểm tra status
        if (livestream.status !== "live") {
          console.warn("[Newsfeed] Livestream is not live:", livestream.status);
          alert("Livestream này đã kết thúc");
          return;
        }
        
        isHandling = true;
        try {
          openViewer(livestream);
        } finally {
          // Reset guard sau một delay nhỏ
          setTimeout(() => {
            isHandling = false;
          }, 500);
        }
      } else if (livestreamId) {
        // Fetch livestream data và mở modal
        isHandling = true;
        try {
          const response = await livestreamApi.getLivestream(livestreamId);
          const livestreamData = response?.data || response;
          
          // Validate livestream data trước khi mở
          if (!livestreamData) {
            console.error("[Newsfeed] No livestream data returned from API");
            alert("Không tìm thấy livestream");
            return;
          }
          
          if (!livestreamData.agoraChannelName) {
            console.error("[Newsfeed] Invalid livestream data: missing agoraChannelName", livestreamData);
            alert("Livestream không hợp lệ hoặc đã kết thúc");
            return;
          }
          
          // Kiểm tra status
          if (livestreamData.status !== "live") {
            console.warn("[Newsfeed] Livestream is not live:", livestreamData.status);
            alert("Livestream này đã kết thúc");
            return;
          }
          
          openViewer(livestreamData);
        } catch (error) {
          console.error("[Newsfeed] Error fetching livestream:", error);
          alert("Không thể tải thông tin livestream. Vui lòng thử lại.");
        } finally {
          // Reset guard sau một delay nhỏ
          setTimeout(() => {
            isHandling = false;
          }, 500);
        }
      }
    };

    window.addEventListener("openLivestream", handleOpenLivestream);
    return () => {
      window.removeEventListener("openLivestream", handleOpenLivestream);
    };
  }, [openViewer]);

  // Khi một story được xem trong StoryViewer, cập nhật cờ viewed ở FE để viền đổi màu ngay
  const handleStoryViewed = (storyId) => {
    if (!storyId) return;
    setStories((prev) =>
      Array.isArray(prev)
        ? prev.map((s) =>
            s && (s._id === storyId || s.id === storyId)
              ? { ...s, viewed: true }
              : s
          )
        : prev
    );
  };

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
          onStoryViewed={handleStoryViewed}
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
              // Start live immediately
              setLiveSetupData(setupData);
              setShowLiveSetup(false);
              openBroadcaster();
            } catch (error) {
              console.error("Error starting livestream:", error);
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
