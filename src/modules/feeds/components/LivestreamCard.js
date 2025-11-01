import { useState, useEffect } from "react";
import { Video, Users, Play } from "lucide-react";
import livestreamApi from "../../../api/livestreamApi";
import "../../../styles/modules/feeds/LivestreamCard.css";

export default function LivestreamCard({ livestream, onClick }) {
  const [viewerCount, setViewerCount] = useState(livestream.viewCount || 0);
  const [hostInfo, setHostInfo] = useState(null);

  useEffect(() => {
    // Fetch host info (you might want to get this from a user API)
    const session = JSON.parse(localStorage.getItem("session") || "{}");
    // For now, we'll just display the host ID
    setHostInfo({ name: "Host" });
  }, []);

  return (
    <div className="livestream-card" onClick={onClick}>
      <div className="livestream-card-content">
        <div className="livestream-card-header">
          <div className="live-badge-small">
            <span className="live-dot-small"></span>
            LIVE
          </div>
          <div className="viewer-count-badge">
            <Users size={14} />
            {viewerCount}
          </div>
        </div>

        <div className="livestream-thumbnail">
          <Video size={48} className="video-icon" />
          <div className="play-overlay">
            <Play size={32} />
          </div>
        </div>

        <div className="livestream-info">
          <h4>{livestream.title}</h4>
          {livestream.description && <p className="livestream-description">{livestream.description}</p>}
        </div>

        <div className="livestream-footer">
          <div className="host-info">
            <div className="host-avatar">
              <Video size={16} />
            </div>
            <span>Đang phát trực tiếp</span>
          </div>
        </div>
      </div>
    </div>
  );
}

