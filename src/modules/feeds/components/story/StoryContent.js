import React from "react";

/**
 * Component to display story content (image or video)
 */
export default function StoryContent({ story }) {
  if (!story) return null;

  if (story.type === "video" && story.video) {
    return (
      <video
        src={story.video}
        autoPlay
        muted
        className="h-full w-full max-h-[calc(100vh-5rem)] max-w-full bg-black object-contain"
      />
    );
  }

  // Kiểm tra nhiều nguồn ảnh:
  // 1. story.images (trực tiếp)
  // 2. story.mediaIds (nếu có media)
  // Story không có musicId (chỉ post mới có musicId)
  let imageUrl = null;
  
  if (story.images && story.images !== "") {
    imageUrl = story.images;
  } else if (story.mediaIds && story.mediaIds.length > 0) {
    // Nếu có mediaIds, lấy ảnh đầu tiên
    const firstMedia = Array.isArray(story.mediaIds) ? story.mediaIds[0] : story.mediaIds;
    if (firstMedia && firstMedia.url) {
      imageUrl = firstMedia.url;
    } else if (typeof firstMedia === 'string') {
      // Nếu mediaIds là array of strings (IDs), cần populate
      // Tạm thời bỏ qua, cần backend populate
    }
  }

  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={story.title || story.content || "story"} 
        className="h-full w-full max-h-[calc(100vh-5rem)] max-w-full bg-black object-contain" 
      />
    );
  }

  return null;
}

