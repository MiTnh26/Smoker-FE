import React from "react";
import { useTranslation } from "react-i18next";

/**
 * Component for story control buttons (pause, mute, menu)
 */
export default function StoryControls({
  isPaused,
  isMuted,
  showMenu,
  audioUrl,
  isOwnStory,
  onPause,
  onMute,
  onToggleMenu,
  onCopyLink,
  onReport,
  onDelete,
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="story-controls-top">
        <button 
          className="story-control-btn" 
          onClick={onPause}
          aria-label={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          )}
        </button>
        {audioUrl && (
          <button 
            className="story-control-btn" 
            onClick={onMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            )}
          </button>
        )}
        <div className="story-menu-container">
          <button 
            className="story-control-btn" 
            onClick={onToggleMenu}
            aria-label="More options"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
          {showMenu && (
            <>
              <div className="story-menu-dropdown">
                <button 
                  className="story-menu-item" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onCopyLink) onCopyLink();
                  }}
                >
                  {t('story.copyLink') || 'Copy link'}
                </button>
                {isOwnStory ? (
                  <>
                    <button 
                      className="story-menu-item" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onDelete) {
                          onDelete();
                        }
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      style={{ cursor: 'pointer', pointerEvents: 'auto', position: 'relative', zIndex: 35 }}
                    >
                      {t('story.delete') || 'Xóa'}
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className="story-menu-item" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onReport) {
                          onReport();
                        }
                      }}
                      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    >
                      {t('story.report') || 'Báo cáo'}
                    </button>
                  </>
                )}
              </div>
              <div 
                className="story-menu-overlay" 
                onClick={(e) => {
                  // Check if click is on menu dropdown
                  const menuDropdown = e.target.closest('.story-menu-dropdown');
                  if (menuDropdown) {
                    return;
                  }
                  // Only close menu if clicking directly on overlay
                  onToggleMenu();
                }}
                style={{ zIndex: 20 }}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}

