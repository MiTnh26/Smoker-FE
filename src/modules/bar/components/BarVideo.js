import React, { useEffect, useState } from "react";
import VideoCard from "../../../components/common/VideoCard";
import { getPostsByAuthor } from "../../../api/postApi";
import { cn } from "../../../utils/cn";

const normalizeMediaArray = (medias) => {
  const videos = [];
  if (Array.isArray(medias)) {
    for (const mediaItem of medias) {
      if (!mediaItem) continue;
      const url = mediaItem.url || mediaItem.src || mediaItem.path;
      const type = (mediaItem.type || "").toLowerCase();
      if (!url) continue;
      if (type === "video" || url.includes(".mp4") || url.includes(".webm") || url.includes("youtube") || url.includes("youtu.be")) {
        videos.push({ url, id: mediaItem._id || mediaItem.id || url });
      }
    }
  } else if (medias && typeof medias === "object") {
    for (const key of Object.keys(medias)) {
      const mediaItem = medias[key];
      if (!mediaItem) continue;
      const url = mediaItem.url || mediaItem.src || mediaItem.path;
      const type = (mediaItem.type || "").toLowerCase();
      if (!url) continue;
      if (type === "video" || url.includes(".mp4") || url.includes(".webm") || url.includes("youtube") || url.includes("youtu.be")) {
        videos.push({ url, id: mediaItem._id || mediaItem.id || url });
      }
    }
  }
  return videos;
};

export default function BarVideo({ barPageId }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!barPageId) {
      setLoading(false);
      return;
    }

    const fetchVideos = async () => {
      try {
        setLoading(true);
        const resp = await getPostsByAuthor(barPageId, {});
        
        let rawPosts = [];
        if (Array.isArray(resp?.data)) {
          rawPosts = resp.data;
        } else if (Array.isArray(resp?.data?.data)) {
          rawPosts = resp.data.data;
        }

        // Extract videos from posts
        const videoList = [];
        rawPosts.forEach((post) => {
          const mediaFromPost = normalizeMediaArray(post.medias);
          const mediaFromMediaIds = normalizeMediaArray(post.mediaIds);
          const postVideos = [...mediaFromPost, ...mediaFromMediaIds];
          
          postVideos.forEach((video) => {
            videoList.push({
              id: video.id || post._id || post.id,
              title: post.content || post.caption || "Video",
              url: video.url,
              postId: post._id || post.id
            });
          });
        });

        setVideos(videoList);
      } catch (err) {
        console.error("Error loading videos:", err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [barPageId]);

  if (loading) {
    return (
      <div className={cn("w-full py-8 flex items-center justify-center")}>
        <p className={cn("text-muted-foreground")}>Đang tải video...</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className={cn(
        "w-full py-12 flex items-center justify-center",
        "bg-card rounded-lg border-[0.5px] border-border/20",
        "px-4 md:px-0"
      )}>
        <p className={cn("text-muted-foreground")}>Chưa có video nào.</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full")}>
      <h3 className={cn(
        "text-xl md:text-2xl font-bold text-foreground mb-6"
      )}>
        🎥 Video của quán
      </h3>
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4")}>
        {videos.map((v) => (
          <VideoCard key={v.id} title={v.title} url={v.url} />
        ))}
      </div>
    </div>
  );
}
