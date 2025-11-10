import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatShortTime } from "./utils/storyUtils";
import { updateStory } from "../../../../api/storyApi";

/**
 * Component to display story user info (avatar, name, time, music, caption)
 */
export default function StoryInfo({ story, t, isOwnStory = false, onStoryUpdated }) {
  const navigate = useNavigate();
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [caption, setCaption] = useState(story?.content || story?.caption || "");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef(null);

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    if (!story) return;
    
    // Lấy entityAccountId hoặc entityId từ story
    const entityAccountId = story.authorEntityAccountId || story.entityAccountId;
    const entityId = story.authorEntityId || story.entityId;
    const entityType = story.authorEntityType || story.entityType;
    
    // Navigate based on entityType
    if (entityType === 'BarPage') {
      navigate(`/bar/${entityId || entityAccountId}`);
    } else if (entityType === 'BusinessAccount') {
      navigate(`/profile/${entityAccountId || entityId}`);
    } else {
      // Account or default
      navigate(`/profile/${entityAccountId || entityId}`);
    }
  };

  // Update caption when story changes
  useEffect(() => {
    setCaption(story?.content || story?.caption || "");
  }, [story?.content, story?.caption]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingCaption && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingCaption]);

  const handleCaptionClick = (e) => {
    e.stopPropagation();
    if (isOwnStory && !isEditingCaption) {
      setIsEditingCaption(true);
    }
  };

  const handleCaptionChange = (e) => {
    setCaption(e.target.value);
  };

  const handleCaptionBlur = async () => {
    if (!isOwnStory) return;
    
    const newCaption = caption.trim();
    const oldCaption = (story?.content || story?.caption || "").trim();
    
    // Nếu caption không thay đổi, chỉ thoát edit mode
    if (newCaption === oldCaption) {
      setIsEditingCaption(false);
      return;
    }
    
    // Nếu caption rỗng, giữ nguyên caption cũ
    if (newCaption === "") {
      setCaption(oldCaption);
      setIsEditingCaption(false);
      return;
    }
    
    // Save caption
    setIsSaving(true);
    try {
      const storyId = story._id || story.id;
      await updateStory(storyId, { content: newCaption });
      // Update story object
      if (story) {
        story.content = newCaption;
        story.caption = newCaption;
      }
      if (onStoryUpdated) {
        onStoryUpdated();
      }
      setIsEditingCaption(false);
    } catch (error) {
      console.error('Error updating caption:', error);
      // Revert to old caption on error
      setCaption(oldCaption);
      alert(t('story.updateFailed') || 'Không thể cập nhật caption');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCaptionKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setCaption(story?.content || story?.caption || "");
      setIsEditingCaption(false);
    }
  };

  if (!story) return null;

  const avatarSrc = story.authorAvatar || story.authorEntityAvatar || story.avatar || "/default-avatar.png";
  const username = story.authorName || story.authorEntityName || story.accountId || story.title || 'User';
  const audioUrl = story.songFilename ? `http://localhost:9999/api/song/stream/${story.songFilename}` : null;
  const displayCaption = story.content || story.caption || "";

  return (
    <div className="story-info">
      <img 
        src={avatarSrc} 
        alt={username} 
        className="story-avatar-small"
        onClick={handleAvatarClick}
        style={{ cursor: 'pointer' }}
      />
      <div className="story-info-text">
        <div className="story-user-row">
          <span className="story-user">{username}</span>
          <span className="story-time">{formatShortTime(story.createdAt, t)}</span>
        </div>
        {audioUrl && story.songFilename && (
          <div className="story-music-info">
            <span className="story-music-icon">🎵</span>
            <span className="story-music-name">
              {story.songName 
                ? (story.songArtist ? `${story.songName} - ${story.songArtist}` : story.songName)
                : (story.songFilename || 'Music')}
            </span>
            <span className="story-music-arrow">→</span>
          </div>
        )}
        {/* Caption - có thể edit nếu là story của chính chủ */}
        {(displayCaption || isOwnStory) && (
          <div className="story-caption-container" onClick={handleCaptionClick}>
            {isEditingCaption && isOwnStory ? (
              <input
                ref={inputRef}
                type="text"
                value={caption}
                onChange={handleCaptionChange}
                onBlur={handleCaptionBlur}
                onKeyDown={handleCaptionKeyDown}
                disabled={isSaving}
                className="story-caption-input"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '2px solid #6c47ff',
                  borderRadius: 8,
                  fontSize: 14,
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#333',
                  outline: 'none'
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div 
                className="story-caption"
                style={{
                  padding: displayCaption ? '8px 12px' : '8px 0',
                  fontSize: 14,
                  color: displayCaption ? '#fff' : '#999',
                  cursor: isOwnStory ? 'pointer' : 'default',
                  minHeight: displayCaption ? 'auto' : '32px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {displayCaption || (isOwnStory ? 'Nhấn để thêm caption...' : '')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

