import { useState, useEffect, useRef } from "react";
import "../../../styles/modules/feeds/AudioWaveform.css";

export default function AudioWaveform({ 
  audioSrc, 
  isPlaying, 
  onTogglePlay, 
  audioTitle, 
  artistName,
  album,
  genre,
  releaseDate,
  description,
  thumbnail,
  sharedAudioRef,
  sharedCurrentTime,
  sharedDuration,
  onSeek
}) {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [waveformData, setWaveformData] = useState([]);
  
  // Use shared audio if provided, otherwise use local audio
  const useSharedAudio = sharedAudioRef && onSeek;
  const actualAudioRef = useSharedAudio ? sharedAudioRef : audioRef;
  const actualCurrentTime = useSharedAudio ? (sharedCurrentTime || 0) : currentTime;
  const actualDuration = useSharedAudio ? (sharedDuration || 0) : duration;

  // Only set up local audio listeners if not using shared audio
  useEffect(() => {
    if (useSharedAudio) {
      setIsLoaded(true);
      if (sharedDuration > 0 && !waveformData.length) {
        generateWaveform();
      }
      return;
    }
    
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
        setIsLoaded(true);
        generateWaveform();
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        drawWaveform();
      };

      const handleEnded = () => {
        setCurrentTime(0);
        onTogglePlay?.();
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [audioSrc, useSharedAudio, sharedDuration]);

  // Only control local audio if not using shared audio (shared audio is controlled by parent)
  useEffect(() => {
    if (useSharedAudio) {
      // Waveform updates when shared audio time changes
      drawWaveform();
      return;
    }
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, useSharedAudio, actualCurrentTime]);

  const generateWaveform = () => {
    // Generate fake waveform data (in real app, would analyze audio file)
    const bars = 100;
    const data = [];
    for (let i = 0; i < bars; i++) {
      data.push(Math.random() * 0.8 + 0.2);
    }
    setWaveformData(data);
  };

  // Always show waveform immediately even before metadata loads
  useEffect(() => {
    if (!waveformData.length) {
      generateWaveform();
    }
    if (!isLoaded) setIsLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawWaveform = () => {
    if (!canvasRef.current || !waveformData.length) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / waveformData.length;
    const progress = actualDuration > 0 ? actualCurrentTime / actualDuration : 0;

    // Use explicit colors to avoid CSS variable issues
    const primaryColor = '#7c3aed';        // purple-600
    const mutedColor = 'rgba(148, 163, 184, 0.3)'; // slate-400 @ 0.3

    ctx.clearRect(0, 0, width, height);

    waveformData.forEach((value, index) => {
      const x = index * barWidth;
      const barHeight = value * height * 0.8;
      const y = (height - barHeight) / 2;
      const isPast = index / waveformData.length < progress;
 
      ctx.fillStyle = isPast ? primaryColor : mutedColor;
       
      ctx.fillRect(x, y, barWidth - 2, barHeight);
    });
  };

  useEffect(() => {
    if (isLoaded && waveformData.length) {
      drawWaveform();
    }
  }, [actualCurrentTime, isLoaded, waveformData, actualDuration]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleWaveformClick = (e) => {
    if (!canvasRef.current || !actualDuration) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const newTime = progress * actualDuration;
    
    if (useSharedAudio && onSeek) {
      // Use shared seek handler
      onSeek(newTime);
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return (
    <div className="audio-waveform-container">
      {!useSharedAudio && <audio ref={audioRef} src={audioSrc} preload="metadata" />}
      
      <div className="audio-info">
        <div className="audio-header">
          {/* Thumbnail/Album Art */}
          {thumbnail && (
            <div className="audio-thumbnail">
              <img src={thumbnail} alt={audioTitle || "Album art"} />
              <div className="thumbnail-overlay">
                <button 
                  className={`play-btn-small ${isPlaying ? 'playing' : ''}`}
                  onClick={onTogglePlay}
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
              </div>
            </div>
          )}
          
          <div className="audio-main-content">
            <div className="audio-header-top">
              <button 
                className={`play-btn ${isPlaying ? 'playing' : ''}`}
                onClick={onTogglePlay}
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
              
              <div className="audio-details">
                {audioTitle && (
                  <div className="audio-title">{audioTitle}</div>
                )}
                <div className="audio-meta">
                  {artistName && (
                    <span className="audio-artist">{artistName}</span>
                  )}
                  {album && artistName && (
                    <span className="meta-separator">•</span>
                  )}
                  {album && (
                    <span className="audio-album">{album}</span>
                  )}
                  {(genre || releaseDate) && (
                    <>
                      {(artistName || album) && <span className="meta-separator">•</span>}
                      {genre && <span className="audio-genre">{genre}</span>}
                      {releaseDate && genre && <span className="meta-separator">•</span>}
                      {releaseDate && (
                        <span className="audio-date">{new Date(releaseDate).getFullYear()}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {description && (
              <div className="audio-description">{description}</div>
            )}
          </div>
        </div>

        <div className="waveform-wrapper">
          <canvas
            ref={canvasRef}
            className="waveform-canvas"
            width={800}
            height={80}
            onClick={handleWaveformClick}
          />
          
          <div className="time-display">
            <span className="current-time">{formatTime(actualCurrentTime)}</span>
            <span className="duration">{formatTime(actualDuration)}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

