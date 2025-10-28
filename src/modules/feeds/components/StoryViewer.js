import { useState, useEffect } from "react";
import "../../../styles/modules/feeds/StoryViewer.css";

export default function StoryViewer({ stories, activeStory, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(
    stories.findIndex((s) => s.id === activeStory.id)
  );

  const story = stories[currentIndex];

  useEffect(() => {
    if (!story) return;
    const timer = setTimeout(() => {
      if (currentIndex < stories.length - 1) setCurrentIndex(currentIndex + 1);
      else onClose();
    }, 5000); // mỗi story 5s
    return () => clearTimeout(timer);
  }, [currentIndex, story, stories.length, onClose]);

  const nextStory = () => {
    if (currentIndex < stories.length - 1) setCurrentIndex(currentIndex + 1)
  }

  const prevStory = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  if (!story) return null;

  return (
    <div className="story-viewer-overlay" onClick={onClose}>
      <div className="story-viewer" onClick={(e) => e.stopPropagation()}>
        {story.type === "video" ? (
          <video src={story.video} autoPlay muted className="story-video" />
        ) : (
          <img src={story.thumbnail} alt={story.user} className="story-video" />
        )}

        <div className="story-info">
          <img src={story.avatar} alt={story.user} className="story-avatar-small" />
          <div>
            <p className="story-user">{story.user}</p>
            <p className="story-caption">{story.caption}</p>
            <p className="story-time">{story.time}</p>
          </div>
        </div>

        <div className="story-controls">
          <button onClick={prevStory}>←</button>
          <button onClick={nextStory}>→</button>
        </div>

        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}
