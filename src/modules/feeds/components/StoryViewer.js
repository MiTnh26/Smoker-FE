import { useState, useEffect } from "react";
import "../../../styles/modules/feeds/StoryViewer.css";

export default function StoryViewer({ stories, activeStory, onClose }) {
  // Hỗ trợ cả id và _id
  const getActiveId = (as) => {
    if (!as) return null;
    if (typeof as === "string") return as;
    return as._id || as.id || null;
  };
  const [currentIndex, setCurrentIndex] = useState(() => {
    const activeId = getActiveId(activeStory);
    return Math.max(0, stories.findIndex((s) => (s._id || s.id) === activeId));
  });

  const story = stories[currentIndex];

  // Cập nhật currentIndex khi activeStory hoặc stories thay đổi
  useEffect(() => {
    const activeId = getActiveId(activeStory);
    const idx = stories.findIndex((s) => (s._id || s.id) === activeId);
    if (idx >= 0) setCurrentIndex(idx);
  }, [activeStory, stories]);

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

  // Nếu có nhạc, tạo url stream
  const audioUrl = story.songFilename ? `http://localhost:9999/api/song/stream/${story.songFilename}` : null;
  // Tạo key duy nhất cho audio để reset khi chuyển story
  const audioKey = (story._id || story.id || currentIndex) + (audioUrl || '');

  return (
    <div className="story-viewer-overlay" onClick={onClose}>
      <div className="story-viewer" onClick={(e) => e.stopPropagation()}>
        {/* Hiển thị ảnh hoặc video nếu có */}
        {story.type === "video" && story.video ? (
          <video src={story.video} autoPlay muted className="story-video" />
        ) : (
          story.images && story.images !== "" ? (
            <img src={story.images} alt={story.title || story.content || "story"} className="story-video" />
          ) : null
        )}

        {/* Audio player nếu có nhạc */}
        {audioUrl && (
          <audio key={audioKey} src={audioUrl} controls autoPlay style={{ width: "100%", marginTop: 12 }}>
            Trình duyệt của bạn không hỗ trợ audio.
          </audio>
        )}

        <div className="story-info">
          {/* Nếu có avatar thì hiển thị, không thì để mặc định */}
          <img src={story.avatar || "/default-avatar.png"} alt={story.accountId || "user"} className="story-avatar-small" />
          <div>
            <p className="story-user">{story.accountId || story.title}</p>
            <p className="story-caption">{story.content}</p>
            <p className="story-time">{story.createdAt ? new Date(story.createdAt).toLocaleString() : ""}</p>
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
