import React from "react";

export default function VideoCard({ title, url }) {
  return (
    <div className="video-card">
      <iframe
        width="100%"
        height="250"
        src={url}
        title={title}
        allowFullScreen
        className="rounded-2xl shadow-md"
      ></iframe>
      <h4 className="mt-2 text-center text-white">{title}</h4>
    </div>
  );
}
