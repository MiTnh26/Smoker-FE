import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

/**
 * Hook to manage story controls (pause, mute, menu)
 */
export const useStoryControls = (story) => {
  const { t } = useTranslation();
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const audioRef = useRef(null);

  const handlePause = useCallback(() => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    // Pause/play audio khi story bị pause/resume
    if (audioRef.current) {
      if (newPausedState) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
        });
      }
    }
  }, [isPaused]);

  const handleMute = useCallback(() => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  }, [isMuted]);

  const handleCopyLink = useCallback(async () => {
    try {
      const storyId = story._id || story.id;
      const storyUrl = `${window.location.origin}/story/${storyId}`;
      await navigator.clipboard.writeText(storyUrl);
      alert(t('story.linkCopied') || 'Link đã được copy');
      setShowMenu(false);
    } catch (error) {
      console.error('Error copying link:', error);
      alert(t('story.copyFailed') || 'Không thể copy link');
    }
  }, [story, t]);

  const handleReport = useCallback(() => {
    if (window.confirm(t('story.confirmReport') || 'Bạn có chắc muốn báo cáo story này?')) {
      // TODO: Implement report functionality
      console.log('Report story:', story._id || story.id);
      alert(t('story.reported') || 'Đã báo cáo story');
      setShowMenu(false);
    }
  }, [story, t]);

  return {
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
  };
};

