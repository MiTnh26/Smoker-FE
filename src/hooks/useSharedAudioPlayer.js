import { useEffect, useRef, useState } from "react";

/**
 * Shared audio player hook used by feeds and profile pages.
 * - Manages a single HTMLAudioElement (sharedAudioRef)
 * - Exposes playingPost & activePlayer so PostCard + AudioPlayerBar can use it
 */
export const useSharedAudioPlayer = () => {
  const [playingPost, setPlayingPost] = useState(null);
  const [activePlayer, setActivePlayer] = useState(null); // Post info for player bar

  const sharedAudioRef = useRef(null);
  const [sharedCurrentTime, setSharedCurrentTime] = useState(0);
  const [sharedDuration, setSharedDuration] = useState(0);
  const [sharedIsPlaying, setSharedIsPlaying] = useState(false);

  // Initialize shared audio element
  useEffect(() => {
    if (!sharedAudioRef.current) {
      sharedAudioRef.current = new Audio();
      sharedAudioRef.current.preload = "metadata";

      const handleTimeUpdate = () => {
        if (sharedAudioRef.current) {
          setSharedCurrentTime(sharedAudioRef.current.currentTime);
        }
      };

      const handleLoadedMetadata = () => {
        if (sharedAudioRef.current) {
          setSharedDuration(sharedAudioRef.current.duration);
        }
      };

      const handlePlay = () => {
        setSharedIsPlaying(true);
      };

      const handlePause = () => {
        setSharedIsPlaying(false);
      };

      const handleEnded = () => {
        setSharedIsPlaying(false);
        setSharedCurrentTime(0);
        setPlayingPost(null);
      };

      sharedAudioRef.current.addEventListener("timeupdate", handleTimeUpdate);
      sharedAudioRef.current.addEventListener("loadedmetadata", handleLoadedMetadata);
      sharedAudioRef.current.addEventListener("play", handlePlay);
      sharedAudioRef.current.addEventListener("pause", handlePause);
      sharedAudioRef.current.addEventListener("ended", handleEnded);

      return () => {
        if (sharedAudioRef.current) {
          sharedAudioRef.current.removeEventListener("timeupdate", handleTimeUpdate);
          sharedAudioRef.current.removeEventListener("loadedmetadata", handleLoadedMetadata);
          sharedAudioRef.current.removeEventListener("play", handlePlay);
          sharedAudioRef.current.removeEventListener("pause", handlePause);
          sharedAudioRef.current.removeEventListener("ended", handleEnded);
          sharedAudioRef.current.pause();
          sharedAudioRef.current.src = "";
          sharedAudioRef.current = null;
        }
      };
    }
  }, []);

  // Update audio source when activePlayer changes
  useEffect(() => {
    if (sharedAudioRef.current && activePlayer?.audioSrc) {
      const currentSrc = sharedAudioRef.current.src;
      const newSrc = activePlayer.audioSrc;

      const normalizeUrl = (url) => {
        if (!url) return "";
        try {
          if (url.startsWith("http://") || url.startsWith("https://")) {
            return new URL(url).href;
          }
          return url;
        } catch {
          return url;
        }
      };

      const normalizedCurrent = normalizeUrl(currentSrc);
      const normalizedNew = normalizeUrl(newSrc);

      if (normalizedCurrent !== normalizedNew && !normalizedCurrent.includes(normalizedNew)) {
        sharedAudioRef.current.src = newSrc;
        sharedAudioRef.current.load();
        setSharedCurrentTime(0);
      }
    } else if (sharedAudioRef.current && !activePlayer?.audioSrc) {
      sharedAudioRef.current.pause();
      sharedAudioRef.current.src = "";
      setSharedCurrentTime(0);
      setSharedDuration(0);
    }
  }, [activePlayer?.audioSrc]);

  // Sync play/pause state with shared audio
  useEffect(() => {
    if (!sharedAudioRef.current || !activePlayer?.audioSrc) return;

    if (playingPost === activePlayer.id) {
      if (sharedAudioRef.current.paused) {
        sharedAudioRef.current.play().catch(console.error);
      }
    } else {
      if (!sharedAudioRef.current.paused) {
        sharedAudioRef.current.pause();
      }
    }
  }, [playingPost, activePlayer?.id]);

  // Handle seek from player bar or waveform
  const handleSeek = (newTime) => {
    if (sharedAudioRef.current && sharedDuration > 0) {
      const clampedTime = Math.max(0, Math.min(newTime, sharedDuration));
      sharedAudioRef.current.currentTime = clampedTime;
      setSharedCurrentTime(clampedTime);
    }
  };

  return {
    playingPost,
    setPlayingPost,
    activePlayer,
    setActivePlayer,
    sharedAudioRef,
    sharedCurrentTime,
    sharedDuration,
    sharedIsPlaying,
    handleSeek,
  };
};


