import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import "../../../../styles/modules/feeds/components/audio/AudioPlayerBar.css";

export default function AudioPlayerBar({ 
  audioSrc, 
  audioTitle, 
  artistName, 
  thumbnail,
  isPlaying,
  onPlayPause,
  onClose,
  sharedAudioRef,
  sharedCurrentTime,
  sharedDuration,
  onSeek
}) {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const playAttemptRef = useRef(null);
  const volumeControlRef = useRef(null);
  
  // Use shared audio if provided, otherwise use local audio
  const useSharedAudio = sharedAudioRef && onSeek;
  const actualAudioRef = useSharedAudio ? sharedAudioRef : audioRef;
  const actualCurrentTime = useSharedAudio ? (sharedCurrentTime || 0) : currentTime;
  const actualDuration = useSharedAudio ? (sharedDuration || 0) : duration;

  // Only set up local audio listeners if not using shared audio
  useEffect(() => {
    if (useSharedAudio) {
      // Shared audio is managed by parent, just set volume if needed
      if (actualAudioRef.current) {
        actualAudioRef.current.volume = volume;
      }
      return;
    }
    
    if (audioRef.current) {
      const audio = audioRef.current;
      
      // Reset audio when source changes
      audio.currentTime = 0;
      setCurrentTime(0);
      setDuration(0);
      
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };

      const handleTimeUpdate = () => {
        if (!isDragging) {
          setCurrentTime(audio.currentTime);
        }
      };

      const handleEnded = () => {
        setCurrentTime(0);
        onPlayPause?.();
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);

      // Set volume
      audio.volume = volume;

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [audioSrc, volume, isDragging, useSharedAudio, actualAudioRef]);

  // Only control local audio if not using shared audio (shared audio is controlled by parent)
  useEffect(() => {
    if (useSharedAudio) {
      // Shared audio play/pause is handled by parent, just update volume
      if (actualAudioRef.current) {
        actualAudioRef.current.volume = volume;
      }
      return;
    }
    
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    // Clear any pending play attempts when audioSrc changes
    if (playAttemptRef.current) {
      clearTimeout(playAttemptRef.current);
      playAttemptRef.current = null;
    }
    
    if (isPlaying) {
      // Only play if audio is paused (prevent duplicate)
      if (audio.paused) {
        // Debounce play calls to prevent multiple simultaneous plays
        playAttemptRef.current = setTimeout(() => {
          if (audioRef.current?.paused) {
            audioRef.current.play().catch((err) => {
              console.error("Error playing audio:", err);
            });
          }
          playAttemptRef.current = null;
        }, 10);
      }
    } else if (!audio.paused) {
      // Pause if playing
      audio.pause();
    }
    
    return () => {
      if (playAttemptRef.current) {
        clearTimeout(playAttemptRef.current);
        playAttemptRef.current = null;
      }
    };
  }, [isPlaying, audioSrc, useSharedAudio, actualAudioRef, volume]);

  const formatTime = (seconds) => {
    if (!seconds || Number.isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    if (!actualDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    const newTime = progress * actualDuration;
    
    if (useSharedAudio && onSeek) {
      // Use shared seek handler
      onSeek(newTime);
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSeekMouseDown = () => {
    setIsDragging(true);
    setWasPlayingBeforeDrag(isPlaying);
    if (actualAudioRef.current) {
      actualAudioRef.current.pause();
    }
  };

  const handleSeekMouseUp = (e) => {
    setIsDragging(false);
    if (wasPlayingBeforeDrag) {
      onPlayPause?.();
    }
    handleSeek(e);
  };

  const toggleMute = () => {
    if (volume > 0) {
      setVolume(0);
      if (actualAudioRef.current) {
        actualAudioRef.current.volume = 0;
      }
    } else {
      setVolume(0.5);
      if (actualAudioRef.current) {
        actualAudioRef.current.volume = 0.5;
      }
    }
  };

  const handleVolumeChange = (e) => {
    const sliderElement = volumeControlRef.current?.querySelector('.volume-slider');
    if (!sliderElement) return;
    
    const rect = sliderElement.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const newVolume = Math.max(0, Math.min(1, 1 - (y / height))); // Inverted because we want top = 100%
    
    setVolume(newVolume);
    if (actualAudioRef.current) {
      actualAudioRef.current.volume = newVolume;
    }
  };

  const handleVolumeMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingVolume(true);
    handleVolumeChange(e);
  };

  const handleVolumeMouseUp = () => {
    setIsDraggingVolume(false);
  };

  // Handle volume dragging when mouse moves outside the slider
  useEffect(() => {
    if (isDraggingVolume) {
      const handleMouseMove = (e) => {
        handleVolumeChange(e);
      };

      const handleMouseUp = () => {
        setIsDraggingVolume(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingVolume]);

  // Close volume control when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (volumeControlRef.current && !volumeControlRef.current.contains(event.target) && !isDraggingVolume) {
        setShowVolumeControl(false);
      }
    };

    if (showVolumeControl) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showVolumeControl, isDraggingVolume]);

  const progress = actualDuration > 0 ? (actualCurrentTime / actualDuration) * 100 : 0;

  return (
    <div className="audio-player-bar">
      {!useSharedAudio && <audio ref={audioRef} src={audioSrc} preload="metadata" />}
      
      {/* Left: Track Info & Thumbnail */}
      <div className="player-left">
        {thumbnail ? (
          <img src={thumbnail} alt={audioTitle} className="player-thumbnail" />
        ) : (
          <div className="player-thumbnail player-thumbnail-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}
        <div className="player-track-info">
          <div className="player-track-artist">{artistName || "Unknown Artist"}</div>
          <div className="player-track-title">{audioTitle || "Unknown Track"}</div>
        </div>
      </div>

      {/* Center: Playback Controls */}
      <div className="player-center">
        <div className="player-controls">
          <button 
            className="player-btn player-btn-nav"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Previous track - placeholder
            }}
            aria-label="Previous"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7"></polyline>
              <polyline points="18 17 13 12 18 7"></polyline>
            </svg>
          </button>
          
          <button 
            className="player-btn player-btn-play"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPlayPause?.();
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          <button 
            className="player-btn player-btn-nav"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Next track - placeholder
            }}
            aria-label="Next"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7"></polyline>
              <polyline points="6 17 11 12 6 7"></polyline>
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="player-progress-container">
          <span className="player-time">{formatTime(actualCurrentTime)}</span>
          <div 
            className="player-progress-bar"
            onMouseDown={handleSeekMouseDown}
            onMouseUp={handleSeekMouseUp}
            onMouseMove={(e) => {
              if (isDragging) {
                handleSeek(e);
              }
            }}
            onMouseLeave={() => {
              if (isDragging) {
                setIsDragging(false);
                if (wasPlayingBeforeDrag) {
                  onPlayPause?.();
                }
              }
            }}
          >
            <div 
              className="player-progress-fill"
              style={{ width: `${progress}%` }}
            />
            <div 
              className="player-progress-handle"
              style={{ left: `${progress}%` }}
            />
          </div>
          <span className="player-time">{formatTime(actualDuration)}</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="player-right">
        {/* Volume Control */}
        <div 
          className="volume-control-wrapper" 
          ref={volumeControlRef}
          onMouseEnter={() => setShowVolumeControl(true)}
          onMouseLeave={() => {
            if (!isDraggingVolume) {
              setShowVolumeControl(false);
            }
          }}
        >
          <button 
            className="player-btn player-btn-action"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMute();
            }}
            aria-label={volume > 0 ? 'Mute' : 'Unmute'}
          >
            {volume === 0 ? (
              // Muted icon
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            ) : volume < 0.5 ? (
              // Low volume icon
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
            ) : (
              // High volume icon
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            )}
          </button>
          
          {/* Volume Slider Dropdown */}
          {showVolumeControl && (
            <div 
              className="volume-slider-container"
            >
              <div className="volume-slider-label">{Math.round(volume * 100)}%</div>
              <div 
                className="volume-slider"
                onMouseDown={handleVolumeMouseDown}
                role="slider"
                aria-label="Volume"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={Math.round(volume * 100)}
                tabIndex={0}
              >
                <div 
                  className="volume-slider-track"
                >
                  <div 
                    className="volume-slider-fill"
                    style={{ height: `${volume * 100}%` }}
                  />
                  <div 
                    className="volume-slider-handle"
                    style={{ bottom: `${volume * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Close / Dismiss Player */}
        <button
          className="player-btn player-btn-action player-btn-close"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose?.();
          }}
          aria-label="Close player"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

AudioPlayerBar.propTypes = {
  audioSrc: PropTypes.string.isRequired,
  audioTitle: PropTypes.string,
  artistName: PropTypes.string,
  thumbnail: PropTypes.string,
  isPlaying: PropTypes.bool,
  onPlayPause: PropTypes.func,
  onClose: PropTypes.func,
  sharedAudioRef: PropTypes.object,
  sharedCurrentTime: PropTypes.number,
  sharedDuration: PropTypes.number,
  onSeek: PropTypes.func,
};


