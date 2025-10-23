import React, { useEffect, useState } from "react";
import VideoCard from "../../../components/common/VideoCard";

export default function BarVideo({ barPageId }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔹 API demo — thay bằng barVideoApi sau này
    setTimeout(() => {
      setVideos([
        { id: 1, title: "Giới thiệu quán", url: "https://www.youtube.com/embed/ysz5S6PUM-U" },
        { id: 2, title: "DJ Night Party", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
      ]);
      setLoading(false);
    }, 500);
  }, [barPageId]);

  if (loading) return <p>Đang tải video...</p>;
  if (videos.length === 0) return <p>Chưa có video nào.</p>;

  return (
    <div className="profile-content">
      <h3 className="section-title mb-4">🎥 Video của quán</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.map((v) => (
          <VideoCard key={v.id} title={v.title} url={v.url} />
        ))}
      </div>
    </div>
  );
}
