"use client";

import { useRef, useEffect } from "react";
import "../../../../styles/modules/feeds/components/video/VideoShortViewer.css";

export default function VideoShortViewer({ video, visible, onClose }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (visible) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [visible, video]);

  if (!visible || !video) return null;

  return (
    <div className="shortViewer" onClick={onClose}>
      <div className="shortViewer__wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="shortViewer__label">Short Video</div>

        <video
          ref={videoRef}
          className="shortViewer__video"
          src={video.video}
          muted
          loop
          playsInline
          controls
        />

        <div className="shortViewer__info">
          <p className="shortViewer__user">{video.user}</p>
          <p className="shortViewer__caption">{video.caption}</p>
        </div>
        <button className="shortViewer__closeButton" onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>
  );
}
