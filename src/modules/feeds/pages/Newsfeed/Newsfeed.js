"use client"

import { useState, useEffect } from "react"

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

import {
  getStories
} from "../../../../api/storyApi";

export default function NewsfeedPage() {
  const [stories, setStories] = useState([])
  const [activeStory, setActiveStory] = useState(null)
  const [shortVideos] = useState(initialShorts)
  const [activeShortVideo, setActiveShortVideo] = useState(null)
  const [showBroadcaster, setShowBroadcaster] = useState(false)
  const [activeLivestream, setActiveLivestream] = useState(null)
  const [activeLivestreams, setActiveLivestreams] = useState([])
  const [showStoryEditor, setShowStoryEditor] = useState(false)
  
  const handleOpenEditor = () => {
    console.log('[Newsfeed] Opening story editor');
    setShowStoryEditor(true);
  }
  
  // Helper function để lấy entityAccountId từ activeEntity (giống PostFeed.js)
  const getEntityAccountId = () => {
    try {
      const raw = localStorage.getItem("session");
      const session = raw ? JSON.parse(raw) : null;
      if (!session) return null;
      
      const activeEntity = session?.activeEntity || session?.account;
      return activeEntity?.EntityAccountId || activeEntity?.entityAccountId || null;
    } catch {
      return null;
    }
  };
  
  // Fetch stories from API on mount
   const fetchStories = async () => {
     try {
       // Lấy entityAccountId từ activeEntity (KHÔNG fallback về accountId)
       const entityAccountId = getEntityAccountId();
       console.log('[Newsfeed] Active entityAccountId:', entityAccountId);
       
       // Gửi entityAccountId trong query params
       const params = entityAccountId ? { entityAccountId } : {};
       const res = await getStories(params);
       
       console.log('[Newsfeed] Stories API response:', res);
       console.log('[Newsfeed] Response structure:', {
         hasData: !!res?.data,
         isArray: Array.isArray(res?.data),
         dataLength: res?.data?.length,
         success: res?.success,
         fullResponse: res
       });
       
       // Backend trả về { success: true, data: [...], pagination: {...} }
       let storiesData = [];
       if (res?.success && Array.isArray(res.data)) {
         storiesData = res.data;
       } else if (Array.isArray(res)) {
         // Fallback: nếu response là array trực tiếp
         storiesData = res;
       } else {
         console.warn('[Newsfeed] Invalid stories response, keeping empty array', res);
         setStories([]);
         return;
       }
       
       // Debug: Kiểm tra xem stories có field viewed không
       // Backend cần trả về field viewed: true/false khi GET /stories
       const viewedStories = storiesData.filter(s => s.viewed === true || s.isViewed === true || s.hasViewed === true);
       const storiesWithViewedField = storiesData.filter(s => s.viewed !== undefined || s.isViewed !== undefined || s.hasViewed !== undefined);
       
       console.log('[Newsfeed] Stories with viewed field:', {
         total: storiesData.length,
         viewed: viewedStories.length,
         viewedIds: viewedStories.map(s => s._id || s.id),
         hasViewedField: storiesWithViewedField.length,
         sampleStory: storiesData[0] ? {
           id: storiesData[0]._id || storiesData[0].id,
           viewed: storiesData[0].viewed,
           isViewed: storiesData[0].isViewed,
           hasViewed: storiesData[0].hasViewed
         } : null
       });
       
       // Cảnh báo nếu backend không trả về field viewed (check xem field có tồn tại không, không quan tâm giá trị)
       if (storiesWithViewedField.length === 0 && storiesData.length > 0) {
         console.warn('[Newsfeed] ⚠️ Backend không trả về field viewed! Cần cập nhật backend để trả về field viewed: true/false cho mỗi story.');
         console.warn('[Newsfeed] Backend cần trả về format:', {
           example: {
             _id: 'story-id',
             viewed: true,  // hoặc false
             // ... other fields
           }
         });
       } else if (storiesWithViewedField.length > 0) {
         console.log('[Newsfeed] ✅ Backend đã trả về field viewed cho', storiesWithViewedField.length, 'stories');
       }
       
       // Sắp xếp stories: story của bản thân luôn ở đầu tiên
       if (entityAccountId && storiesData.length > 0) {
         const sortedStories = [...storiesData].sort((a, b) => {
           // Lấy entityAccountId của từng story
           const aEntityId = a.entityAccountId || a.authorEntityAccountId || a.EntityAccountId;
           const bEntityId = b.entityAccountId || b.authorEntityAccountId || b.EntityAccountId;
           
           // So sánh với entityAccountId hiện tại (case-insensitive)
           const currentId = String(entityAccountId).trim().toLowerCase();
           const aMatch = aEntityId && String(aEntityId).trim().toLowerCase() === currentId;
           const bMatch = bEntityId && String(bEntityId).trim().toLowerCase() === currentId;
           
           // Story của bản thân (match) sẽ ở đầu (return -1)
           if (aMatch && !bMatch) return -1;
           if (!aMatch && bMatch) return 1;
           
           // Nếu cả hai đều match hoặc không match, giữ nguyên thứ tự
           return 0;
         });
         
         console.log('[Newsfeed] Sorted stories - own stories first:', {
           total: sortedStories.length,
           ownStories: sortedStories.filter(s => {
             const sEntityId = s.entityAccountId || s.authorEntityAccountId || s.EntityAccountId;
             return sEntityId && String(sEntityId).trim().toLowerCase() === String(entityAccountId).trim().toLowerCase();
           }).length
         });
         
         setStories(sortedStories);
         console.log('[Newsfeed] Set stories:', sortedStories.length, 'items');
       } else {
         setStories(storiesData);
         console.log('[Newsfeed] Set stories (no sorting):', storiesData.length, 'items');
       }
     } catch (err) {
       console.error('[Newsfeed] Error fetching stories:', err);
       // Set empty array khi có lỗi
       setStories([]);
     }
   };
 
   useEffect(() => {
     fetchStories();
   }, []);

  const handleStoryCreated = async (newStory) => {
    console.log('[Newsfeed] Story created, refreshing stories:', newStory);
    setShowStoryEditor(false); // Đóng editor sau khi tạo thành công
    
    // Đợi một chút để backend kịp lưu story mới vào DB
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Refresh stories từ API để lấy story mới với đầy đủ thông tin (authorName, authorAvatar, etc.)
    // Đợi fetchStories hoàn thành để đảm bảo story mới hiển thị ngay
    await fetchStories();
    console.log('[Newsfeed] Stories refreshed after creation');
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
          onStoryCreated={handleStoryCreated}
          onOpenEditor={handleOpenEditor}
          entityAccountId={getEntityAccountId()}
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
          entityAccountId={getEntityAccountId()}
          onClose={() => {
            setActiveStory(null);
            // KHÔNG fetch lại stories khi đóng StoryViewer
            // Story sẽ chỉ đổi màu border (từ localStorage) và chỉ ẩn khi F5 reload (từ backend viewed: true)
          }}
          onStoryDeleted={() => {
            // Refresh stories after deletion
            fetchStories();
          }}
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
