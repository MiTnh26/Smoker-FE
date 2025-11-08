
import { useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../../styles/modules/feeds/StoryBar.css"

export default function StoryBar({ stories, onStoryClick, onStoryCreated }) {
  const { t } = useTranslation();
  const barRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const navigate = useNavigate();

  const VISIBLE_COUNT = 5
  const ITEM_WIDTH = 112
  const GAP = 8
  const totalItems = (stories?.length || 0) + 1 // include CreateStory
  const maxIndex = Math.max(0, totalItems - VISIBLE_COUNT)

  const offset = useMemo(() => {
    return currentIndex * (ITEM_WIDTH + GAP)
  }, [currentIndex])

  const go = (direction) => {
    setCurrentIndex((prev) => {
      if (direction === "left") return Math.max(0, prev - 1)
      return Math.min(maxIndex, prev + 1)
    })
  }

  return (
    <div className="story-bar-container">
      <button className="story-scroll-btn left" onClick={() => go("left")} aria-label="Previous stories" disabled={currentIndex === 0}>‹</button>

      <div className="story-viewport">
        <div className="story-bar" ref={barRef} style={{ transform: `translateX(-${offset}px)` }}>

          {/* Nút tạo story mới chuyển sang trang editor */}
          <div key="create" className="story-item create-story-item" onClick={() => navigate("/customer/story-editor")}>
            <div className="story-preview">
              <div className="story-create-bg"></div>
              <button className="story-create-btn">
                <span className="create-icon">+</span>
              </button>
              <p className="story-username">{t('story.createStory')}</p>
            </div>
          </div>
          {stories.map((story, idx) => {
            // key: ưu tiên _id, fallback idx
            const key = story._id || `story-${idx}`;
            // avatar src
            const avatarSrc = story.avatar || '/default-avatar.png';
            // preview image: ưu tiên images, sau đó thumbnail
            const previewImage = story.images || story.thumbnail || null;
            // username
            const username = story.accountId || story.user || story.title || 'User';
            return (
              <div
                key={key}
                className="story-item"
                onClick={() => onStoryClick(story)}
              >
                <div className="story-preview">
                  {previewImage ? (
                    <img src={previewImage} alt={username} className="story-preview-img" />
                  ) : (
                    <div className="story-preview-placeholder"></div>
                  )}
                  <div className="story-avatar-small">
                    <img src={avatarSrc} alt={username} />
                  </div>
                  <p className="story-username">{username}</p>
                </div>
              </div>
            );
          })}

        </div>
      </div>

      <button className="story-scroll-btn right" onClick={() => go("right")} aria-label="Next stories" disabled={currentIndex === maxIndex}>›</button>
    </div>
  )
}

