import React from "react";
import PropTypes from "prop-types";
import VideoPlayer from "../video/VideoPlayer";
import { cn } from "../../../../utils/cn";

// Helper to get grid classes
const getImageGridClasses = (count) => {
  if (count <= 1) return "";
  if (count === 2) return "grid grid-cols-2";
  if (count === 3) return "grid grid-cols-2 grid-rows-2";
  if (count === 4) return "grid grid-cols-2 grid-rows-2";
  if (count >= 5) return "grid grid-cols-6 grid-rows-2";
  return "";
};

// Image Item Component
const ImageItem = ({
  img,
  index,
      imageCount,
  onClick,
  isLastDisplayed,
  shouldShowOverlay,
      remainingCount,
}) => {
  const itemClasses = (() => {
    if (imageCount === 3 && index === 0) return "row-span-2";
    if (imageCount >= 5) {
      if (index <= 1) return "col-span-3";
      if (index >= 2) return "col-span-2";
    }
    return "";
  })();

            return (
              <div
                key={img.id || img._id || index}
      className={cn("relative w-full h-full cursor-pointer", itemClasses)}
      onClick={() => onClick(img.url)}
              >
                <img
                  src={img.url}
                  alt={img.caption || `Post image ${index + 1}`}
                  className={cn(
          "w-full h-full object-cover block",
          shouldShowOverlay && "brightness-50"
                  )}
                  loading="lazy"
                />
                {shouldShowOverlay && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-3xl font-bold text-white drop-shadow-lg">
                      +{remainingCount}
                    </span>
                  </div>
                )}
              </div>
            );
};

export default function PostMediaLayout({ images = [], videos = [], onImageClick }) {
  const hasVideos = videos && videos.length > 0;
  const hasImages = images && images.length > 0;
  const imageCount = images.length;

  const renderImages = () => {
    if (!hasImages) return null;

    const displayedCount = Math.min(imageCount, 5);
    const remainingCount = imageCount > 5 ? imageCount - 5 : 0;

    if (imageCount === 1) {
    return (
            <div className="mt-3" onClick={() => onImageClick(images[0].url)}>
                 <img
                    src={images[0].url}
                    alt={images[0].caption || 'Post image'}
                    className="w-full h-auto max-h-[60vh] object-cover cursor-pointer"
                    loading="lazy"
                />
            </div>
        )
            }
            
            return (
      <div className={cn("mt-3", getImageGridClasses(imageCount))}>
        {images.slice(0, displayedCount).map((img, index) => (
          <ImageItem
            key={img.id || img._id || index}
            img={img}
            index={index}
            imageCount={imageCount}
            onClick={onImageClick}
            isLastDisplayed={index === displayedCount - 1}
            shouldShowOverlay={remainingCount > 0 && index === displayedCount - 1}
            remainingCount={remainingCount}
          />
        ))}
      </div>
    );
  };

  const renderVideos = () => {
    if (!hasVideos) return null;
            return (
      <div className={cn("mt-3 flex flex-col", videos.length > 1 ? "gap-1" : "")}>
        {videos.map((video, index) => (
          <VideoPlayer
            key={video.id || video._id || index}
            src={video?.url || video?.src}
            poster={video.thumbnail || video.poster}
            className="w-full"
          />
        ))}
              </div>
            );
  };

  if (hasVideos && hasImages) {
    return (
        <div className="w-full">
            {renderVideos()}
            {renderImages()}
        </div>
    )
  }

  if (hasVideos) {
    return renderVideos();
  }

  if (hasImages) {
    return renderImages();
  }

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
  onImageClick: () => {},
};
