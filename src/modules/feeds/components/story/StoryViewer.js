import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { markStoriesAsViewed, markStoryAsViewed, deleteStory, likeStory, unlikeStory } from "../../../../api/storyApi";
import messageApi from "../../../../api/messageApi";
import { useAllUserGroups } from "./hooks/useAllUserGroups";
import { useStoryProgress } from "./hooks/useStoryProgress";
import { useStoryControls } from "./hooks/useStoryControls";
import { getActiveId, getUserIdentifier } from "./utils/storyUtils";
import { cn } from "../../../../utils/cn";
import StoryProgressBars from "./StoryProgressBars";
import StoryControls from "./StoryControls";
import StoryInfo from "./StoryInfo";
import StoryContent from "./StoryContent";
import StoryViewers from "./StoryViewers";
import ReportStoryModal from "./ReportStoryModal";
import Toast from "../../../../components/common/Toast";

export default function StoryViewer({ stories, activeStory, onClose, entityAccountId, onStoryDeleted }) {
  const { t } = useTranslation();
  const viewedStoryIdsRef = useRef(new Set());
  
  // Get all user groups (prioritize own stories)
  const allUserGroups = useAllUserGroups(stories, entityAccountId);
  
  // Find current user group and story index
  const { currentUserIndex, currentStoryIndex } = useMemo(() => {
    if (!activeStory || allUserGroups.length === 0) {
      return { currentUserIndex: 0, currentStoryIndex: 0 };
    }
    
    const activeId = getActiveId(activeStory);
    const activeUserId = getUserIdentifier(activeStory);
    
    // Find user group
    let userIndex = allUserGroups.findIndex(ug => {
      const userId = getUserIdentifier(ug.displayStory);
      return userId === activeUserId;
    });
    
    if (userIndex === -1) userIndex = 0;
    
    // Find story index in user group
    const userGroup = allUserGroups[userIndex];
    const storyIndex = userGroup?.allStories.findIndex(s => (s._id || s.id) === activeId) ?? 0;
    
    return {
      currentUserIndex: userIndex,
      currentStoryIndex: Math.max(0, storyIndex)
    };
  }, [activeStory, allUserGroups]);
  
  const [userIndex, setUserIndex] = useState(currentUserIndex);
  const [storyIndex, setStoryIndex] = useState(currentStoryIndex);
  
  // Get current user group and story
  const currentUserGroup = allUserGroups[userIndex];
  const groupedStories = currentUserGroup?.allStories || [];
  const story = groupedStories[storyIndex];

  // Like state
  const [liked, setLiked] = useState(() => {
    if (!story) return false;
    // Check if current user has liked this story
    const storyLikes = story.likes;
    if (!storyLikes) return false;
    // Get current user's accountId from session
    try {
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const accountId = session?.account?.id || session?.user?.id;
      if (!accountId) return false;
      // Check if accountId exists in likes Map/Object
      if (storyLikes instanceof Map) {
        for (const [likeId, like] of storyLikes.entries()) {
          if (String(like.accountId) === String(accountId)) return true;
        }
      } else if (typeof storyLikes === 'object' && storyLikes !== null) {
        for (const likeId in storyLikes) {
          if (String(storyLikes[likeId]?.accountId) === String(accountId)) return true;
        }
      }
    } catch (e) {
      console.warn('[StoryViewer] Error checking liked state:', e);
    }
    return false;
  });
  const [likeCount, setLikeCount] = useState(() => {
    if (!story) return 0;
    const storyLikes = story.likes;
    if (!storyLikes) return 0;
    if (storyLikes instanceof Map) return storyLikes.size;
    if (typeof storyLikes === 'object' && storyLikes !== null) return Object.keys(storyLikes).length;
    return 0;
  });

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [storyToReport, setStoryToReport] = useState(null);
  
  // Reply state - auto open for non-own stories
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const replyInputRef = useRef(null);
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const openReportModal = useCallback(
    (targetStory) => {
      if (!targetStory) return;
      setStoryToReport(targetStory);
      setReportModalOpen(true);
    },
    []
  );

  const closeReportModal = useCallback(() => {
    setStoryToReport(null);
    setReportModalOpen(false);
  }, []);

  // Update like state when story changes
  useEffect(() => {
    if (!story) {
      setLiked(false);
      setLikeCount(0);
      return;
    }
    const storyLikes = story.likes;
    if (!storyLikes) {
      setLiked(false);
      setLikeCount(0);
      return;
    }
    // Get current user's accountId from session
    try {
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const accountId = session?.account?.id || session?.user?.id;
      let isLiked = false;
      if (storyLikes instanceof Map) {
        for (const [likeId, like] of storyLikes.entries()) {
          if (String(like.accountId) === String(accountId)) {
            isLiked = true;
            break;
          }
        }
        setLikeCount(storyLikes.size);
      } else if (typeof storyLikes === 'object' && storyLikes !== null) {
        for (const likeId in storyLikes) {
          if (String(storyLikes[likeId]?.accountId) === String(accountId)) {
            isLiked = true;
            break;
          }
        }
        setLikeCount(Object.keys(storyLikes).length);
      }
      setLiked(isLiked);
    } catch (e) {
      console.warn('[StoryViewer] Error updating like state:', e);
      setLiked(false);
      setLikeCount(0);
    }
  }, [story?._id || story?.id]);

  // Track viewed stories - mark ngay khi story được hiển thị
  useEffect(() => {
    if (story) {
      const storyId = story._id || story.id;
      if (storyId) {
        // Check if already tracked to avoid duplicate API calls
        if (!viewedStoryIdsRef.current.has(storyId)) {
          viewedStoryIdsRef.current.add(storyId);
          console.log('[StoryViewer] Story viewed - added to tracking:', {
            storyId,
            totalTracked: viewedStoryIdsRef.current.size,
            allTrackedIds: Array.from(viewedStoryIdsRef.current)
          });
          
          // Mark as viewed ngay lập tức (không đợi đến khi đóng)
          // Chỉ mark nếu không phải story của bản thân
          if (entityAccountId) {
            const storyEntityId = story.entityAccountId || story.authorEntityAccountId || story.EntityAccountId;
            const isOwnStory = storyEntityId && String(storyEntityId).trim().toLowerCase() === String(entityAccountId).trim().toLowerCase();
            
            if (!isOwnStory) {
              // Mark single story as viewed immediately
              markStoryAsViewed(storyId, entityAccountId)
                .then(() => {
                  console.log('[StoryViewer] Marked story as viewed immediately:', storyId);
                })
                .catch((error) => {
                  console.error('[StoryViewer] Error marking story as viewed immediately:', error);
                  // Continue - will retry on close with batch API
                });
            }
          }
        }
      }
    }
  }, [story, entityAccountId]);

  // Handle close button - mark stories as viewed via API
  const handleClose = useCallback(async () => {
    const viewedIds = Array.from(viewedStoryIdsRef.current);
    
    // Filter out own stories - không lưu story của bản thân vào localStorage
    // Story của bản thân không cần mark as viewed
    const ownStoryIds = new Set();
    if (entityAccountId && stories) {
      stories.forEach(s => {
        const storyEntityId = s.entityAccountId || s.authorEntityAccountId || s.EntityAccountId;
        if (storyEntityId && String(storyEntityId).trim().toLowerCase() === String(entityAccountId).trim().toLowerCase()) {
          const storyId = s._id || s.id;
          if (storyId) {
            ownStoryIds.add(storyId);
          }
        }
      });
    }
    
    const otherUserStoryIds = viewedIds.filter(id => !ownStoryIds.has(id));
    
    // Save viewed story IDs to localStorage (chỉ story của người khác)
    if (otherUserStoryIds.length > 0) {
      try {
        const existing = localStorage.getItem('viewedStories');
        const existingIds = existing ? JSON.parse(existing) : [];
        const mergedIds = [...new Set([...existingIds, ...otherUserStoryIds])]; // Remove duplicates
        localStorage.setItem('viewedStories', JSON.stringify(mergedIds));
        console.log('[StoryViewer] Saved viewed stories to localStorage (excluding own stories):', {
          saved: otherUserStoryIds,
          ownStoriesExcluded: Array.from(ownStoryIds),
          total: otherUserStoryIds.length
        });
      } catch (error) {
        console.error('[StoryViewer] Error saving to localStorage:', error);
      }
    }
    
    // Call API to mark stories as viewed (chỉ story của người khác)
    if (otherUserStoryIds.length > 0 && entityAccountId) {
      try {
        console.log('[StoryViewer] Calling markStoriesAsViewed API (excluding own stories):', {
          storyIds: otherUserStoryIds,
          entityAccountId,
          count: otherUserStoryIds.length,
          ownStoriesExcluded: Array.from(ownStoryIds)
        });
        const response = await markStoriesAsViewed(otherUserStoryIds, entityAccountId);
        console.log('[StoryViewer] Marked stories as viewed - API response:', {
          success: response?.success,
          data: response?.data,
          fullResponse: response
        });
        
        if (!response?.success) {
          console.warn('[StoryViewer] API returned success: false', response);
        }
      } catch (error) {
        console.error('[StoryViewer] Error marking stories as viewed:', {
          error,
          message: error?.message,
          response: error?.response,
          status: error?.response?.status,
          data: error?.response?.data
        });
        // Continue even if API call fails
      }
    } else {
      console.warn('[StoryViewer] Cannot mark as viewed - missing data:', {
        viewedIdsLength: viewedIds.length,
        hasEntityAccountId: !!entityAccountId
      });
    }
    
    // Call onClose callback
    onClose();
  }, [entityAccountId, onClose]);

  // Update indices when activeStory changes
  useEffect(() => {
    setUserIndex(currentUserIndex);
    setStoryIndex(currentStoryIndex);
    // Reset reply input when story changes
    setReplyText("");
  }, [currentUserIndex, currentStoryIndex]);

  // Check if story belongs to current user
  const isOwnStory = useMemo(() => {
    if (!story || !entityAccountId) {
      return false;
    }
    
    // Check multiple possible fields to match
    const storyAuthorEntityAccountId = story.authorEntityAccountId;
    const storyAuthorAccountId = story.authorAccountId;
    const storyEntityAccountId = story.entityAccountId;
    const storyAccountId = story.accountId;
    
    // Compare with entityAccountId (case-insensitive string comparison)
    const entityAccountIdStr = String(entityAccountId).trim();
    const isOwn = 
      (storyAuthorEntityAccountId && String(storyAuthorEntityAccountId).trim() === entityAccountIdStr) ||
      (storyAuthorAccountId && String(storyAuthorAccountId).trim() === entityAccountIdStr) ||
      (storyEntityAccountId && String(storyEntityAccountId).trim() === entityAccountIdStr) ||
      (storyAccountId && String(storyAccountId).trim() === entityAccountIdStr);
    
    return isOwn;
  }, [story, entityAccountId]);

  // Story controls hook
  const {
    isPaused,
    isMuted,
    showMenu,
    audioRef,
    setIsPaused,
    setShowMenu,
    handlePause,
    handleMute,
    handleCopyLink,
    handleReport,
  } = useStoryControls(story, openReportModal);

  // Auto focus reply input for non-own stories when story changes and auto pause
  useEffect(() => {
    if (!isOwnStory && replyInputRef.current) {
      // Auto pause story when input is shown
      if (!isPaused) {
        setIsPaused(true);
      }
      // Pause audio if exists
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      // Auto focus after a short delay
      const timer = setTimeout(() => {
        replyInputRef.current?.focus();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [story, isOwnStory, isPaused, setIsPaused, audioRef]);

  // Auto pause story and audio when reply input is focused (additional safety)
  useEffect(() => {
    if (!isOwnStory && replyInputRef.current) {
      const handleFocus = () => {
        // Ensure story is paused
        if (!isPaused) {
          setIsPaused(true);
        }
        // Pause audio if exists
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
      };
      
      const input = replyInputRef.current;
      input.addEventListener('focus', handleFocus);
      
      return () => {
        input.removeEventListener('focus', handleFocus);
      };
    }
  }, [isOwnStory, isPaused, setIsPaused, audioRef, story]);

  // Handle delete story
  const handleDelete = useCallback(async () => {
    console.log('[StoryViewer] handleDelete called', {
      hasStory: !!story,
      hasCurrentUserGroup: !!currentUserGroup,
      storyId: story?._id || story?.id
    });
    
    if (!story || !currentUserGroup) {
      console.warn('[StoryViewer] Cannot delete: missing story or currentUserGroup');
      return;
    }
    
    const confirmMessage = t('story.confirmDelete') || 'Bạn có chắc muốn xóa story này?';
    console.log('[StoryViewer] Showing confirm dialog');
    if (!window.confirm(confirmMessage)) {
      console.log('[StoryViewer] Delete cancelled by user');
      return;
    }

    try {
      const storyId = story._id || story.id;
      console.log('[StoryViewer] Calling deleteStory API with storyId:', storyId, 'entityAccountId:', entityAccountId);
      await deleteStory(storyId, entityAccountId);
      console.log('[StoryViewer] Story deleted successfully');
      alert(t('story.deleted') || 'Đã xóa story');
      setShowMenu(false);
      
      // Call callback to refresh stories
      if (onStoryDeleted) {
        console.log('[StoryViewer] Calling onStoryDeleted callback');
        onStoryDeleted();
      }
      
      // Close viewer or move to next story
      const currentStories = currentUserGroup.allStories;
      console.log('[StoryViewer] Navigating after delete:', {
        storyIndex,
        currentStoriesLength: currentStories.length,
        userIndex,
        allUserGroupsLength: allUserGroups.length
      });
      
      if (storyIndex < currentStories.length - 1) {
        setStoryIndex(storyIndex + 1);
      } else if (userIndex < allUserGroups.length - 1) {
        setUserIndex(userIndex + 1);
        setStoryIndex(0);
      } else {
        handleClose();
      }
    } catch (error) {
      console.error('[StoryViewer] Error deleting story:', error);
      alert(t('story.deleteFailed') || 'Không thể xóa story');
    }
  }, [story, storyIndex, userIndex, currentUserGroup, allUserGroups.length, t, setShowMenu, onStoryDeleted, handleClose]);

  // Toggle like story
  const toggleLike = useCallback(async () => {
    if (!story) return;
    
    try {
      let session;
      try {
        const raw = localStorage.getItem("session");
        session = raw ? JSON.parse(raw) : null;
      } catch (e) {
        session = null;
      }
      const currentUser = session?.account;
      const activeEntity = session?.activeEntity || currentUser;
      const normalizeTypeRole = (ae) => {
        const raw = (ae?.role || "").toString().toLowerCase();
        if (raw === "bar") return "BarPage";
        if (raw === "dj" || raw === "dancer") return "BusinessAccount";
        return "Account"; // customer and others
      };
      const typeRole = normalizeTypeRole(activeEntity);

      const storyId = story._id || story.id;
      if (!storyId) return;

      // Optimistic update
      const nextLiked = !liked;
      setLiked(nextLiked);
      setLikeCount((c) => c + (nextLiked ? 1 : -1));

      if (nextLiked) {
        await likeStory(storyId, { typeRole });
      } else {
        await unlikeStory(storyId);
      }
    } catch (error) {
      // Revert optimistic update on error
      setLiked((v) => !v);
      setLikeCount((c) => (liked ? c + 1 : c - 1));
      console.error("Failed to toggle like on story", error);
    }
  }, [story, liked]);


  // Handle story progression
  const handleStoryComplete = useCallback(() => {
    // Nếu còn story trong user hiện tại
    if (storyIndex < groupedStories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else {
      // Hết story của user hiện tại, chuyển sang user tiếp theo
      if (userIndex < allUserGroups.length - 1) {
        setUserIndex(userIndex + 1);
        setStoryIndex(0); // Bắt đầu từ story đầu tiên của user mới
      } else {
        // Không còn user nào nữa, đóng viewer
        handleClose();
      }
    }
  }, [storyIndex, groupedStories.length, userIndex, allUserGroups.length, handleClose]);

  // Progress bar hook
  const progress = useStoryProgress(story, isPaused, handleStoryComplete);

  // Reset progress and pause when story changes
  useEffect(() => {
    setIsPaused(false);
  }, [storyIndex, userIndex, story, setIsPaused]);

  const nextStory = () => {
    // Nếu còn story trong user hiện tại
    if (storyIndex < groupedStories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else {
      // Hết story của user hiện tại, chuyển sang user tiếp theo
      if (userIndex < allUserGroups.length - 1) {
        setUserIndex(userIndex + 1);
        setStoryIndex(0); // Bắt đầu từ story đầu tiên của user mới
      }
    }
  };

  const prevStory = () => {
    // Nếu không phải story đầu tiên của user hiện tại
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
      setIsPaused(false);
    } else {
      // Đang ở story đầu tiên, chuyển về story cuối của user trước
      if (userIndex > 0) {
        const prevUserGroup = allUserGroups[userIndex - 1];
        setUserIndex(userIndex - 1);
        setStoryIndex(prevUserGroup.allStories.length - 1);
        setIsPaused(false);
      }
    }
  };

  // Audio URL if story has music
  // Story chỉ dùng songId (chọn từ danh sách), không dùng musicId (musicId chỉ dành cho post)
  // Phải đặt useMemo trước early return để tuân thủ React Hooks rules
  const audioUrl = useMemo(() => {
    if (!story) return null;
    // Story chỉ dùng songFilename từ songId
    return story.audioUrl || 
           (story.songFilename ? `http://localhost:9999/api/song/stream/${story.songFilename}` : null);
  }, [story?.audioUrl, story?.songFilename]);
  
  const audioKey = useMemo(() => {
    if (!story) return '';
    return (story._id || story.id || storyIndex) + (audioUrl || '');
  }, [story?._id, story?.id, storyIndex, audioUrl]);

  // Reset progress and resume audio when story changes
  useEffect(() => {
    setIsPaused(false);
    // Resume audio khi story thay đổi
    if (audioRef.current && audioUrl) {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio on story change:', error);
      });
    }
  }, [storyIndex, userIndex, story, setIsPaused, audioUrl]);
  
  // Pause/play audio khi isPaused thay đổi
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      if (isPaused) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
        });
      }
    }
  }, [isPaused, audioUrl]);

  if (!story || !currentUserGroup) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60"
      onClick={handleClose}
    >
      <div className="relative flex items-center justify-center">
        {/* Previous button - left side of story */}
        {(storyIndex > 0 || userIndex > 0) && (
          <button
            className="absolute left-[-56px] z-[1001] flex h-12 w-12 items-center justify-center rounded-full bg-black/70 backdrop-blur-sm text-white transition-all duration-200 hover:bg-black/90 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 shadow-xl"
            onClick={(e) => {
              e.stopPropagation();
              prevStory();
            }}
            aria-label="Previous story"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        )}

        <div
          className={cn(
            "relative flex w-[400px] max-w-[92%] flex-col overflow-hidden",
            "bg-card text-card-foreground",
            "rounded-lg border-[0.5px] border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
            "max-h-[98vh]"
          )}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Progress indicators */}
        <StoryProgressBars 
          stories={groupedStories} 
          currentIndex={storyIndex} 
          progress={progress} 
        />
        
        {/* Story content */}
        <StoryContent story={story} />

        {/* Audio player if has music */}
        {audioUrl && (
          <audio 
            ref={audioRef}
            key={audioKey} 
            src={audioUrl} 
            autoPlay 
            muted={isMuted}
            style={{ display: 'none' }}
          >
            Trình duyệt của bạn không hỗ trợ audio.
          </audio>
        )}

        {/* Control buttons */}
        <StoryControls
          isPaused={isPaused}
          isMuted={isMuted}
          showMenu={showMenu}
          audioUrl={audioUrl}
          isOwnStory={isOwnStory}
          onPause={handlePause}
          onMute={handleMute}
          onToggleMenu={() => {
            console.log('[StoryViewer] Toggle menu clicked, isOwnStory:', isOwnStory, 'showMenu:', showMenu);
            setShowMenu(!showMenu);
          }}
          onCopyLink={handleCopyLink}
          onReport={handleReport}
          onDelete={handleDelete}
        />

        {/* Story info */}
        <StoryInfo 
          story={story} 
          t={t} 
          isOwnStory={isOwnStory} 
          onStoryUpdated={() => {
            // Refresh story data after caption update
            // Story object is already updated in StoryInfo component
          }} 
        />

        {/* Like button and Reply input - chỉ hiển thị nếu không phải story của chính chủ */}
        {!isOwnStory && (
          <div
            className="absolute bottom-3 left-3 right-3 z-20 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Like button */}
            <button 
              className={cn(
                "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-black/60 text-white transition-colors duration-200 hover:bg-black/80",
                liked && "text-[#ff3040]"
              )}
              onClick={toggleLike}
              aria-label={liked ? "Unlike story" : "Like story"}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill={liked ? "#ff3040" : "white"}
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              {likeCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#ff3040] px-1 text-xs font-semibold text-white">
                  {likeCount}
                </span>
              )}
            </button>

            {/* Reply input form - auto open */}
            <form
              className="flex flex-1 items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!replyText.trim() || sendingReply) return;
                
                setSendingReply(true);
                try {
                  // Get current user info
                  const session = JSON.parse(localStorage.getItem("session") || "{}");
                  const currentUser = session?.activeEntity || session?.account;
                  const currentEntityAccountId = currentUser?.EntityAccountId || currentUser?.entityAccountId || currentUser?.id;
                  
                  // Get story author info
                  const storyAuthorId = story?.authorEntityAccountId || story?.entityAccountId || story?.accountId;
                  
                  if (!currentEntityAccountId || !storyAuthorId) {
                    alert(t("story.replyError") || "Không thể gửi reply. Vui lòng thử lại.");
                    return;
                  }
                  
                  // Create or get conversation
                  const convResponse = await messageApi.createOrGetConversation(
                    String(currentEntityAccountId),
                    String(storyAuthorId)
                  );
                  
                  // Backend returns: { success: true, data: conversation }
                  // Conversation has _id field (English structure)
                  const conversation = convResponse?.data?.data || convResponse?.data;
                  const conversationId = conversation?._id || conversation?.id || conversation?.conversationId;
                  
                  if (!conversationId) {
                    alert(t("story.replyError") || "Không thể tạo cuộc trò chuyện. Vui lòng thử lại.");
                    return;
                  }
                  
                  // Send message with story reply context
                  // Format: "reply story : {nội dung}"
                  const replyPrefix = t("story.replyYourStory") || "Trả lời story";
                  const messageContent = `${replyPrefix}: ${replyText.trim()}`;
                  
                  await messageApi.sendMessage(
                    conversationId,
                    messageContent,
                    "text",
                    currentEntityAccountId,
                    currentUser?.role || "Account",
                    currentUser?.id || currentUser?._id,
                    {
                      storyId: story?._id || story?.id,
                      storyUrl: story?.images || story?.video,
                      isStoryReply: true
                    }
                  );
                  
                  // Success - Show toast notification
                  const authorName = story?.authorName || story?.userName || "người dùng";
                  const toastMsg = t("story.replySentTo", { name: authorName });
                  setToastMessage(toastMsg || `Đã reply story ${authorName}`);
                  setShowToast(true);
                  
                  setReplyText("");
                  // Auto focus lại input
                  setTimeout(() => {
                    replyInputRef.current?.focus();
                  }, 100);
                } catch (error) {
                  console.error("[StoryViewer] Error sending reply:", error);
                  alert(error?.response?.data?.message || t("story.replyError") || "Không thể gửi reply. Vui lòng thử lại.");
                } finally {
                  setSendingReply(false);
                }
              }}
            >
              <input
                ref={replyInputRef}
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t("story.replyPlaceholder") || "Nhập reply..."}
                className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:bg-white/15 focus:outline-none"
                disabled={sendingReply}
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sendingReply}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingReply ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Story viewers - only for own stories */}
        <StoryViewers 
          storyId={story?._id || story?.id} 
          isOwnStory={isOwnStory}
        />


        {/* Close button */}
        <button
          className="absolute right-3 top-12 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-white transition-colors duration-200 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          onClick={handleClose}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

        {/* Next button - right side of story */}
        {!(storyIndex >= groupedStories.length - 1 && userIndex >= allUserGroups.length - 1) && (
          <button
            className="absolute right-[-56px] z-[1001] flex h-12 w-12 items-center justify-center rounded-full bg-black/70 backdrop-blur-sm text-white transition-all duration-200 hover:bg-black/90 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 shadow-xl"
            onClick={(e) => {
              e.stopPropagation();
              nextStory();
            }}
            aria-label="Next story"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        )}
      </div>
      {reportModalOpen && (
        <ReportStoryModal
          open={reportModalOpen}
          story={storyToReport}
          onClose={closeReportModal}
          onSubmitted={() => {
            closeReportModal();
            alert(t("story.reported") || "Story reported");
          }}
        />
      )}

      {/* Toast notification */}
      <Toast
        show={showToast}
        message={toastMessage}
        type="success"
        duration={3000}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}

