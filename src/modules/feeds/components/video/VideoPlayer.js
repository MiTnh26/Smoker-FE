import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import "../../../../styles/modules/feeds/components/video/VideoPlayer.css";

export default function VideoPlayer({ src, poster, className = "" }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPortrait, setIsPortrait] = useState(false);
  const hideControlsTimeoutRef = useRef(null);
  const isDraggingRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [autoPlayMuted, setAutoPlayMuted] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const observerRef = useRef(null);

  // Validate src - check after hooks
  const isValidSrc = src && typeof src === 'string' && src.trim() !== '';

  // Format time
  const formatTime = (seconds) => {
    if (!seconds || Number.isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else if (!isPlaying) {
        // When user manually plays, allow unmute
        if (autoPlayMuted && videoRef.current.muted) {
          setAutoPlayMuted(false);
          videoRef.current.muted = false;
          setIsMuted(false);
        }
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle volume change
  const handleVolumeChange = (newVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if (videoRef.current) {
      videoRef.current.volume = clampedVolume;
      // If user sets volume > 0, disable auto-mute and unmute
      if (clampedVolume > 0) {
        if (autoPlayMuted) {
          setAutoPlayMuted(false);
        }
        videoRef.current.muted = false;
        setIsMuted(false);
      } else {
        // If volume is set to 0, mute the video
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    }
  };

  // Handle seek
  const handleSeek = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    const newTime = progress * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Handle progress bar drag
  const handleProgressMouseDown = (e) => {
    isDraggingRef.current = true;
    handleSeek(e);
    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
    }
  };

  const handleProgressMouseUp = (e) => {
    isDraggingRef.current = false;
    handleSeek(e);
    if (videoRef.current && isPlaying) {
      videoRef.current.play();
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Auto-hide controls
  const resetControlsTimer = () => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    // Khi không hover thì ẩn controls. Nếu đang phát, cho phép hiện trong thời gian ngắn sau tương tác.
    if (!isPlaying) {
      setShowControls(false);
      return;
    }
    if (isPlaying && !isHovering) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    }
  };

  // Intersection Observer for auto-play on scroll (Facebook-style)
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    // Create Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isIntersecting = entry.isIntersecting;
          setIsVisible(isIntersecting);

          if (isIntersecting) {
            // Video is in viewport - auto play (muted)
            if (autoPlayMuted && video.paused) {
              video.muted = true;
              setIsMuted(true);
              video.play().catch((err) => {
                console.log('[VideoPlayer] Auto-play prevented:', err);
              });
            }
          } else {
            // Video is out of viewport - pause
            if (!video.paused) {
              video.pause();
            }
          }
        });
      },
      {
        threshold: 0.5, // Video must be at least 50% visible
        rootMargin: '0px',
      }
    );

    observer.observe(container);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [autoPlayMuted]);

  // Event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Tối ưu video để tránh jumping frames
    video.setAttribute('playsinline', 'true');
    // Đảm bảo video giữ nguyên kích thước và smooth playback
    // KHÔNG set style trực tiếp - để CSS handle
    // Force hardware acceleration để tránh frame drops
    video.style.transform = 'translateZ(0)';
    video.style.willChange = 'auto';

    const handleTimeUpdate = () => {
      if (!isDraggingRef.current) {
        setCurrentTime(video.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoaded(true);
      // Sync muted state with video element
      setIsMuted(video.muted);
      // Đảm bảo video hiển thị đúng kích thước sau khi load metadata
      if (video.videoWidth && video.videoHeight) {
        // Kiểm tra xem video có phải portrait (dọc) không
        const portrait = video.videoHeight > video.videoWidth;
        
        setIsPortrait(portrait);
        
        // Set aspect-ratio CSS để video giữ nguyên tỷ lệ gốc
        video.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
        
        // Reset và set lại để đảm bảo video render đúng
        video.style.width = '100%';
        video.style.height = 'auto';
        video.style.maxWidth = '100%';
        video.style.maxHeight = 'none';
        video.style.objectFit = 'contain';
        
        // Force reflow để đảm bảo aspect ratio được áp dụng
        void video.offsetHeight;
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      resetControlsTimer();
    };

    const handlePause = () => {
      setIsPlaying(false);
      setShowControls(true);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setShowControls(true);
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
      // If user unmutes, disable auto-mute
      if (!video.muted && autoPlayMuted) {
        setAutoPlayMuted(false);
      }
    };

    const handleError = (e) => {
      console.error('[VideoPlayer] Video error:', e);
      setHasError(true);
      setIsLoaded(false);
      setIsPlaying(false);
      
      if (video.error) {
        let errorMsg = 'Không thể tải video';
        switch (video.error.code) {
          case video.error.MEDIA_ERR_ABORTED:
            errorMsg = 'Video bị hủy tải';
            break;
          case video.error.MEDIA_ERR_NETWORK:
            errorMsg = 'Lỗi kết nối mạng';
            break;
          case video.error.MEDIA_ERR_DECODE:
            errorMsg = 'Lỗi giải mã video';
            break;
          case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMsg = 'Định dạng video không được hỗ trợ';
            break;
          default:
            errorMsg = 'Lỗi không xác định';
        }
        setErrorMessage(errorMsg);
      } else {
        setErrorMessage('Không thể tải video');
      }
    };

    const handleLoadStart = () => {
      setHasError(false);
      setErrorMessage("");
      setIsLoaded(false);
    };

    const handleCanPlay = () => {
      setIsLoaded(true);
      setHasError(false);
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [isPlaying, isHovering]);

  // Reset controls timer when playing
  useEffect(() => {
    resetControlsTimer();
  }, [isPlaying, isHovering]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Early return after all hooks - validate src
  if (!isValidSrc) {
    return (
      <div className={`video-player-container ${className} video-error`}>
        <div className="video-error-message">
          <p>Video không khả dụng</p>
          <p className="video-error-detail">URL video không hợp lệ</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`video-player-container ${className} ${isPortrait ? 'video-portrait' : 'video-landscape'}`}
      style={{
        ...(isPortrait && {
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '100%',
          maxHeight: '80vh',
          margin: '0 auto'
        })
      }}
      onMouseEnter={() => {
        setIsHovering(true);
        setShowControls(true);
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        setShowControls(false);
      }}
      onMouseMove={() => {
        if (isHovering) {
          setShowControls(true);
          resetControlsTimer();
        }
      }}
    >
      {hasError ? (
        <div className="video-error-message">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>{errorMessage || 'Không thể tải video'}</p>
          <button 
            className="video-retry-btn"
            onClick={() => {
              setHasError(false);
              setErrorMessage("");
              if (videoRef.current) {
                videoRef.current.load();
              }
            }}
          >
            Thử lại
          </button>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          preload="metadata"
          className="video-player"
          onClick={togglePlay}
          playsInline
          data-playsinline="true"
          crossOrigin="anonymous"
          muted={autoPlayMuted}
          style={{
            maxWidth: '100%',
            maxHeight: isPortrait ? '80vh' : 'none',
            width: isPortrait ? 'auto' : '100%',
            height: isPortrait ? '100%' : 'auto',
            objectFit: 'contain'
          }}
        >
          <track kind="captions" />
        </video>
      )}

      {/* Overlay with play button */}
      {!isPlaying && (
        <div 
          className="video-overlay" 
          onClick={togglePlay}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              togglePlay();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Play video"
        >
          <button className="video-play-button" aria-label="Play">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </button>
        </div>
      )}

      {/* Controls */}
      <div className={`video-controls ${showControls ? 'visible' : 'hidden'}`}>
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="video-progress-container"
          onMouseDown={handleProgressMouseDown}
          onMouseUp={handleProgressMouseUp}
          onMouseMove={(e) => {
            if (isDraggingRef.current) {
              handleSeek(e);
            }
          }}
          role="slider"
          aria-label="Video progress"
          aria-valuemin="0"
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          tabIndex={0}
        >
          <div className="video-progress-bar">
            <div
              className="video-progress-fill"
              style={{ width: `${progress}%` }}
            />
            <div
              className="video-progress-handle"
              style={{ left: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls bar */}
        <div className="video-controls-bar">
          <div className="video-controls-left">
            <button
              className="video-control-btn"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>

            {/* Volume control */}
            <div className="video-volume-control">
              <button
                className="video-control-btn"
                onClick={() => {
                  if (isMuted || volume === 0) {
                    // Unmute and set to previous volume or 0.5
                    handleVolumeChange(volume > 0 ? volume : 0.5);
                  } else {
                    // Mute
                    handleVolumeChange(0);
                  }
                }}
                aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
              >
                {(() => {
                  // Check muted state first, then volume
                  const displayVolume = isMuted ? 0 : volume;
                  if (displayVolume === 0) {
                    return (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 5L6 9H2v6h4l5 4V5z" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                      </svg>
                    );
                  }
                  if (displayVolume < 0.5) {
                    return (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 5L6 9H2v6h4l5 4V5z" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                    );
                  }
                  return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  );
                })()}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const newVolume = Number.parseFloat(e.target.value);
                  handleVolumeChange(newVolume);
                }}
                className="video-volume-slider"
                aria-label="Volume"
              />
            </div>

            {/* Time display */}
            <div className="video-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="video-controls-right">
            {/* Fullscreen button */}
            <button
              className="video-control-btn"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mute indicator khi auto-play (chỉ hiển thị khi controls ẩn) */}
      {(autoPlayMuted || isMuted) && !showControls && !hasError && (
        <div className="video-muted-indicator" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        </div>
      )}

      {/* Loading indicator */}
      {!isLoaded && (
        <div className="video-loading">
          <div className="video-loading-spinner" />
        </div>
      )}
    </div>
  );
}

VideoPlayer.propTypes = {
  src: PropTypes.string.isRequired,
  poster: PropTypes.string,
  className: PropTypes.string,
};

