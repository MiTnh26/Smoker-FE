
import { useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom";
import "../../../styles/modules/feeds/StoryBar.css"

export default function StoryBar({ stories, onStoryClick, onStoryCreated }) {
  const barRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const navigate = useNavigate();

  const VISIBLE_COUNT = 4
  const ITEM_WIDTH = 140
  const GAP = 16
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
        <div className="story-item create-story-item" onClick={() => navigate("/customer/story-editor")}
          style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
        >
          <div className="story-avatar" style={{ background: "#eee", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 32, color: "#888" }}>+</span>
          </div>
          <div style={{ marginTop: 8, color: "#333", fontWeight: 500 }}>Tạo Story</div>
        </div>
        {stories.map((story) => (
          <div
            key={story.id}
            className="story-item"
            onClick={() => onStoryClick(story)}
          >
            <div className="story-avatar">
              <img src={story.avatar} alt={story.user} />
            </div>
            <img src={story.thumbnail} alt={story.user} />
            <p className="story-user">{story.user}</p>
          </div>
        ))}

        </div>
      </div>

      <button className="story-scroll-btn right" onClick={() => go("right")} aria-label="Next stories" disabled={currentIndex === maxIndex}>›</button>
    </div>
  )
}

