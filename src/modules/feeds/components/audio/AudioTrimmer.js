import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import "../../../../styles/modules/feeds/components/audio/AudioTrimmer.css";

const MAX_DURATION = 30; // Tối đa 30 giây

/**
 * Component để cắt nhạc với waveform visualization
 */
export default function AudioTrimmer({ audioFile, onTrimmed, onCancel }) {
  const { t } = useTranslation();
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [startOffset, setStartOffset] = useState(0);
  const [trimDuration, setTrimDuration] = useState(MAX_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformData, setWaveformData] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null); // 'start' or 'end'
  
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const historyRef = useRef([]); // Lưu lịch sử để undo

  // Tạo URL từ file
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioFile]);

  // Load audio và lấy duration
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      const audio = audioRef.current;
      const handleLoadedMetadata = () => {
        const totalDuration = audio.duration;
        setDuration(totalDuration);
        // Nếu file ngắn hơn 30s, dùng toàn bộ file
        if (totalDuration < MAX_DURATION) {
          setTrimDuration(totalDuration);
          setStartOffset(0);
        } else {
          // Mặc định cắt 30 giây đầu
          setTrimDuration(MAX_DURATION);
          setStartOffset(0);
        }
        generateWaveform(totalDuration);
      };
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.load();
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [audioUrl]);

  // Generate waveform data (fake waveform - trong thực tế cần analyze audio)
  const generateWaveform = (totalDuration) => {
    const samples = 200; // Số lượng thanh waveform
    const data = [];
    for (let i = 0; i < samples; i++) {
      // Random height cho waveform (trong thực tế sẽ analyze audio)
      data.push(Math.random() * 0.8 + 0.2);
    }
    setWaveformData(data);
  };

  // Draw waveform
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !waveformData.length || !duration) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const barWidth = width / waveformData.length;
    const startPercent = startOffset / duration;
    const endPercent = (startOffset + trimDuration) / duration;
    
    waveformData.forEach((value, index) => {
      const x = (index / waveformData.length) * width;
      const barHeight = value * height * 0.7; // Slightly smaller bars for better visibility
      const y = (height - barHeight) / 2;
      
      // Xác định màu dựa trên vị trí
      const percent = index / waveformData.length;
      const isSelected = percent >= startPercent && percent <= endPercent;
      const isPlaying = audioRef.current && !audioRef.current.paused && 
                       (currentTime >= startOffset && currentTime <= startOffset + trimDuration) &&
                       (percent >= (currentTime - startOffset) / trimDuration - 0.01 && 
                        percent <= (currentTime - startOffset) / trimDuration + 0.01);
      
      // Color scheme: playing (primary blue), selected (darker gray), unselected (lighter gray)
      if (isPlaying) {
        ctx.fillStyle = '#1877f2'; // Primary blue for playing
      } else if (isSelected) {
        ctx.fillStyle = '#4a5568'; // Darker gray for selected area
      } else {
        ctx.fillStyle = '#6b7280'; // Medium gray for unselected
      }
      
      // Draw bar
      const barW = Math.max(2, barWidth - 2);
      ctx.fillRect(x, y, barW, barHeight);
    });
  }, [waveformData, duration, startOffset, trimDuration, currentTime]);

  // Update waveform khi có thay đổi
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Update current time khi đang play
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      const updateTime = () => {
        if (audioRef.current) {
          const time = audioRef.current.currentTime;
          setCurrentTime(time);
          // Nếu vượt quá end, dừng lại
          if (time >= startOffset + trimDuration) {
            audioRef.current.pause();
            audioRef.current.currentTime = startOffset;
            setIsPlaying(false);
          }
        }
        if (isPlaying) {
          animationFrameRef.current = requestAnimationFrame(updateTime);
        }
      };
      animationFrameRef.current = requestAnimationFrame(updateTime);
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isPlaying, startOffset, trimDuration]);

  // Handle play/pause
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = startOffset;
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
      });
      setIsPlaying(true);
    }
  };

  // Handle click on waveform để set start position
  const handleWaveformClick = (e) => {
    if (!containerRef.current || !duration) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    const newStart = Math.max(0, Math.min(duration - trimDuration, percent * duration));
    
    // Lưu vào history trước khi thay đổi
    saveToHistory();
    setStartOffset(newStart);
    
    if (audioRef.current) {
      audioRef.current.currentTime = newStart;
    }
  };

  // Handle drag để điều chỉnh start hoặc end
  const handleMouseDown = (e, type) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragType(type);
    saveToHistory();
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current || !duration) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const time = percent * duration;
    
    if (dragType === 'start') {
      // Đảm bảo start + duration không vượt quá duration và không vượt quá MAX_DURATION
      const maxStart = Math.min(duration - 1, duration - trimDuration);
      const newStart = Math.max(0, Math.min(maxStart, time));
      setStartOffset(newStart);
      if (audioRef.current) {
        audioRef.current.currentTime = newStart;
      }
    } else if (dragType === 'end') {
      // Đảm bảo duration không vượt quá MAX_DURATION và start + duration không vượt quá duration
      const maxDuration = Math.min(MAX_DURATION, duration - startOffset);
      const newDuration = Math.max(1, Math.min(maxDuration, time - startOffset));
      setTrimDuration(newDuration);
    }
  }, [isDragging, dragType, duration, startOffset, trimDuration]);

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragType(null);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  // Undo function
  const saveToHistory = () => {
    historyRef.current.push({ startOffset, trimDuration });
    if (historyRef.current.length > 10) {
      historyRef.current.shift();
    }
  };

  const handleUndo = () => {
    if (historyRef.current.length > 0) {
      const previous = historyRef.current.pop();
      setStartOffset(previous.startOffset);
      setTrimDuration(previous.trimDuration);
    }
  };

  // Confirm trimming
  const handleConfirm = () => {
    if (trimDuration > MAX_DURATION) {
      alert(`Độ dài tối đa là ${MAX_DURATION} giây. Vui lòng điều chỉnh lại.`);
      return;
    }
    if (onTrimmed) {
      onTrimmed({
        startOffset,
        duration: trimDuration
      });
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    if (onCancel) {
      onCancel();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!audioFile || !audioUrl) return null;

  const startPercent = duration > 0 ? (startOffset / duration) * 100 : 0;
  const endPercent = duration > 0 ? ((startOffset + trimDuration) / duration) * 100 : 100;
  const selectedAreaLeft = `${startPercent}%`;
  const selectedAreaWidth = `${endPercent - startPercent}%`;

  return (
    <div className="audio-trimmer-container">
      <div className="audio-trimmer-controls">
        {/* Play button */}
        <button
          onClick={handlePlayPause}
          className="audio-trimmer-btn audio-trimmer-btn-play"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Waveform container */}
        <div
          ref={containerRef}
          className="audio-trimmer-waveform-container"
          onClick={handleWaveformClick}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={80}
            className="audio-trimmer-waveform-canvas"
          />
          
          {/* Selected area highlight */}
          {duration > 0 && (
            <div
              className="audio-trimmer-selected-area"
              style={{
                left: selectedAreaLeft,
                width: selectedAreaWidth
              }}
            />
          )}
          
          {/* Drag handles */}
          {duration > 0 && (
            <>
              <div
                className="audio-trimmer-drag-handle audio-trimmer-drag-handle-start"
                style={{ left: selectedAreaLeft }}
                onMouseDown={(e) => handleMouseDown(e, 'start')}
              />
              <div
                className="audio-trimmer-drag-handle audio-trimmer-drag-handle-end"
                style={{ left: `${endPercent}%` }}
                onMouseDown={(e) => handleMouseDown(e, 'end')}
              />
            </>
          )}
        </div>

        {/* Undo button */}
        <button
          onClick={handleUndo}
          disabled={historyRef.current.length === 0}
          className="audio-trimmer-btn audio-trimmer-btn-secondary"
          aria-label="Undo"
        >
          ↶
        </button>

        {/* Cancel button */}
        {onCancel && (
          <button
            onClick={handleCancel}
            className="audio-trimmer-btn audio-trimmer-btn-secondary"
            aria-label="Cancel"
          >
            ×
          </button>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          className="audio-trimmer-btn audio-trimmer-btn-confirm"
          aria-label="Confirm"
        >
          ✓
        </button>
      </div>

      {/* Info display */}
      <div className="audio-trimmer-info">
        <div className="audio-trimmer-info-left">
          <span className="audio-trimmer-time audio-trimmer-time-selected">
            {formatTime(startOffset)} - {formatTime(startOffset + trimDuration)}
          </span>
          <span className="audio-trimmer-time">
            ({formatTime(trimDuration)})
          </span>
        </div>
        <div className="audio-trimmer-info-right">
          <span className="audio-trimmer-time">
            Tổng: {formatTime(duration)}
          </span>
          <span className="audio-trimmer-time">
            | Tối đa: {formatTime(MAX_DURATION)}
          </span>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => {
          setIsPlaying(false);
          if (audioRef.current) {
            audioRef.current.currentTime = startOffset;
          }
        }}
        style={{ display: 'none' }}
      />
    </div>
  );
}

