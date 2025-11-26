"use client";

import { useRef } from "react";
import "../../../../styles/modules/feeds/components/video/VideoShortsBar.css";

export default function VideoShortBar({ videos, onVideoClick }) {
  const barRef = useRef(null);

  const scroll = (direction) => {
    if (!barRef.current) return;
    const scrollAmount = 180 + 16; // thumbnail width + gap
    barRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="shortsBar">
      <button className="shortsBar__scrollButton shortsBar__scrollButton--left" onClick={() => scroll("left")} aria-label="Scroll left">‹</button>
      <div className="shortsBar__list" ref={barRef}>
        {videos.map((video) => (
          <div
            key={video.id}
            className="shortsBar__item"
            onClick={() => onVideoClick(video)}
            style={{ cursor: "pointer" }}
          >
            <div className="shortsBar__thumbnailWrapper">
              <img
                src={video.thumbnail || video.avatar}
                alt={video.user}
                className="shortsBar__thumbnail"
              />
              <div className="shortsBar__captionOverlay">
                <p>{video.caption}</p>
              </div>
              <div className="shortsBar__avatarWrapper">
                <img src={video.avatar} alt={video.user} className="shortsBar__avatar" />
              </div>
            </div>
            <p className="shortsBar__user">{video.user}</p>
          </div>
        ))}
      </div>
      <button className="shortsBar__scrollButton shortsBar__scrollButton--right" onClick={() => scroll("right")} aria-label="Scroll right">›</button>
    </div>
  );
}
