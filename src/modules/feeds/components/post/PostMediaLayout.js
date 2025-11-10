import React from "react";
import PropTypes from "prop-types";
import VideoPlayer from "../video/VideoPlayer";
import { cn } from "../../../../utils/cn";
import "../../../../styles/modules/feeds/components/post/post-media-layout.css";

/**
 * PostMediaLayout - Component to handle multi-media posts layout
 * Priority: Audio > Video > Images
 * 
 * @param {Object} props
 * @param {Array} props.images - Array of image objects { id, url, caption, ... }
 * @param {Array} props.videos - Array of video objects { id, url, thumbnail, ... }
 * @param {Function} props.onImageClick - Callback when image is clicked (receives imageUrl)
 */
export default function PostMediaLayout({ images = [], videos = [], onImageClick }) {
  const handleImageClick = (imageUrl) => {
    console.log('[PostMediaLayout] Image clicked:', imageUrl, 'onImageClick:', !!onImageClick);
    if (onImageClick) {
      onImageClick(imageUrl);
    } else {
      console.warn('[PostMediaLayout] onImageClick callback not provided');
    }
  };

  // Priority logic: Videos first, then Images
  const hasVideos = videos && videos.length > 0;
  const hasImages = images && images.length > 0;
  const imageCount = images.length;
  const videoCount = videos.length;

  // Case 1: Only videos
  if (hasVideos && !hasImages) {
    return (
      <div className={cn("mt-3 w-full flex flex-col")}>
        <div className={cn(
          "flex flex-col w-full",
          videoCount > 1 ? "gap-3" : "gap-2"
        )}>
          {videos.map((video, index) => {
            const videoUrl = video?.url || video?.src || null;
            if (!videoUrl) {
              console.warn('[PostMediaLayout] Video missing URL:', video);
              return null;
            }
            
            return (
              <VideoPlayer
                key={video.id || video._id || index}
                src={videoUrl}
                poster={video.thumbnail || video.poster || null}
                className="w-full rounded-2xl overflow-hidden"
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Case 2: Only images
  if (hasImages && !hasVideos) {
    const showGrid = imageCount > 1;
    // Only display 5 images max, show remaining count on 5th image
    const displayedCount = Math.min(imageCount, 5);
    const remainingCount = imageCount > 5 ? imageCount - 5 : 0;

    // Debug log
    console.log('[PostMediaLayout] Only images:', {
      imageCount,
      displayedCount,
      remainingCount,
      shouldShowOverlay: remainingCount > 0
    });

    return (
      <div className={cn("mt-3 w-full")}>
        <div
          className={cn(
            showGrid ? "post-images-grid" : "flex flex-col gap-2",
            "w-full",
            showGrid && "rounded-2xl overflow-hidden gap-0.5"
          )}
          data-count={imageCount}
        >
          {images.slice(0, displayedCount).map((img, index) => {
            const isLastDisplayed = index === displayedCount - 1;
            const shouldShowOverlay = remainingCount > 0 && isLastDisplayed;

            return (
              <div
                key={img.id || img._id || index}
                className={cn(
                  "relative w-full h-full cursor-pointer",
                  showGrid && "post-image-wrapper"
                )}
                onClick={() => handleImageClick(img.url)}
              >
                <img
                  src={img.url}
                  alt={img.caption || `Post image ${index + 1}`}
                  className={cn(
                    showGrid 
                      ? "w-full h-full object-cover rounded-none cursor-pointer block transition-all duration-300"
                      : "w-full rounded-2xl object-cover max-h-[600px] cursor-pointer block shadow-lg",
                    shouldShowOverlay && "brightness-[0.6] blur-[1px] opacity-80"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageClick(img.url);
                  }}
                  loading="lazy"
                />
                {shouldShowOverlay && (
                  <div className={cn(
                    "absolute inset-0 bg-black/65 backdrop-blur-sm",
                    "flex items-center justify-center z-10",
                    "pointer-events-none rounded-none"
                  )}>
                    <span className={cn(
                      "text-[2.5rem] font-bold text-primary-foreground",
                      "drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                    )}>
                      +{remainingCount}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Case 3: Mixed - Videos + Images
  if (hasVideos && hasImages) {
    const showGrid = imageCount > 1;
    // Only display 5 images max, show remaining count on 5th image
    const displayedCount = Math.min(imageCount, 5);
    const remainingCount = imageCount > 5 ? imageCount - 5 : 0;

    return (
      <div className={cn("mt-3 w-full flex flex-col gap-3")}>
        {/* Videos section - always on top */}
        <div className={cn(
          "flex flex-col w-full",
          videoCount > 1 ? "gap-3" : "gap-2"
        )}>
          {videos.map((video, index) => {
            const videoUrl = video?.url || video?.src || null;
            if (!videoUrl) {
              console.warn('[PostMediaLayout] Video missing URL:', video);
              return null;
            }
            
            return (
              <VideoPlayer
                key={video.id || video._id || index}
                src={videoUrl}
                poster={video.thumbnail || video.poster || null}
                className="w-full rounded-2xl overflow-hidden"
              />
            );
          })}
        </div>

        {/* Images section - below videos */}
        <div
          className={cn(
            showGrid ? "post-images-grid" : "flex flex-col gap-2",
            "w-full",
            showGrid && "rounded-2xl overflow-hidden gap-0.5"
          )}
          data-count={imageCount}
        >
          {images.slice(0, displayedCount).map((img, index) => {
            const isLastDisplayed = index === displayedCount - 1;
            const shouldShowOverlay = remainingCount > 0 && isLastDisplayed;

            return (
              <div
                key={img.id || img._id || index}
                className={cn(
                  "relative w-full h-full cursor-pointer",
                  showGrid && "post-image-wrapper"
                )}
                onClick={() => handleImageClick(img.url)}
              >
                <img
                  src={img.url}
                  alt={img.caption || `Post image ${index + 1}`}
                  className={cn(
                    showGrid 
                      ? "w-full h-full object-cover rounded-none cursor-pointer block transition-all duration-300"
                      : "w-full rounded-2xl object-cover max-h-[600px] cursor-pointer block shadow-lg",
                    shouldShowOverlay && "brightness-[0.6] blur-[1px] opacity-80"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageClick(img.url);
                  }}
                  loading="lazy"
                />
                {shouldShowOverlay && (
                  <div className={cn(
                    "absolute inset-0 bg-black/65 backdrop-blur-sm",
                    "flex items-center justify-center z-10",
                    "pointer-events-none rounded-none"
                  )}>
                    <span className={cn(
                      "text-[2.5rem] font-bold text-primary-foreground",
                      "drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                    )}>
                      +{remainingCount}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // No media
  return null;
}

PostMediaLayout.propTypes = {
  images: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      url: PropTypes.string.isRequired,
      caption: PropTypes.string,
    })
  ),
  videos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      url: PropTypes.string,
      src: PropTypes.string,
      thumbnail: PropTypes.string,
      poster: PropTypes.string,
    })
  ),
  onImageClick: PropTypes.func,
};

PostMediaLayout.defaultProps = {
  images: [],
  videos: [],
  onImageClick: null,
};

