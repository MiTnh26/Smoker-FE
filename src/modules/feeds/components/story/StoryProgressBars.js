import React from "react";

/**
 * Component to display progress indicators for all stories
 */
export default function StoryProgressBars({ stories, currentIndex, progress }) {
  if (!stories || stories.length === 0) return null;

  return (
    <div className="story-progress-container">
      {stories.map((s, idx) => (
        <div key={s._id || s.id || idx} className="story-progress-bar">
          <div 
            className={`story-progress-fill ${idx === currentIndex ? 'active' : ''}`}
            style={{
              width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
            }}
          />
        </div>
      ))}
    </div>
  );
}

