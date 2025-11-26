import { useState, useEffect, useRef } from "react";

const DEFAULT_STORY_DURATION = 5000; // 5 seconds (default)
const STORY_DURATION_WITH_AUDIO = 15000; // 15 seconds (nếu có audio)
const UPDATE_INTERVAL = 50; // Update every 50ms for smooth animation

/**
 * Hook to manage story progress bar animation
 */
export const useStoryProgress = (story, isPaused, onComplete) => {
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef(null);

  // Xác định duration dựa trên story có audio hay không
  const getStoryDuration = () => {
    // Story chỉ dùng songId (songFilename), không có musicId
    if (story?.audioUrl || story?.songFilename) {
      // Nếu có audioDuration từ story (nếu có), dùng duration đó
      if (story?.audioDuration) {
        return story.audioDuration * 1000; // Convert seconds to milliseconds
      }
      // Mặc định 15s nếu không có thông tin
      return STORY_DURATION_WITH_AUDIO;
    }
    return DEFAULT_STORY_DURATION;
  };

  useEffect(() => {
    if (!story || isPaused) return;
    
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    const storyDuration = getStoryDuration();
    const increment = (100 / storyDuration) * UPDATE_INTERVAL;
    
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressIntervalRef.current);
          return 100;
        }
        return prev + increment;
      });
    }, UPDATE_INTERVAL);
    
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, storyDuration);
    
    return () => {
      clearTimeout(timer);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [story, isPaused, onComplete]);

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
  }, [story]);

  return progress;
};

