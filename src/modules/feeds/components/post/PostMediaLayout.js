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

// Media Item Component (image/video treated the same in grid)
const MediaItem = ({
  media,
  index,
  totalCount,
  onClick,
  isLastDisplayed,
  shouldShowOverlay,
  remainingCount,
}) => {
  const itemClasses = (() => {
    if (totalCount === 3 && index === 0) return "col-span-2 aspect-[2/1]";
    if (totalCount >= 5) {
      if (index <= 1) return "col-span-3";
      if (index >= 2) return "col-span-2";
    }
    return "aspect-square";
  })();

  const isVideo = (media.type || "").toLowerCase() === "video";

  return (
    <div
      key={media.id || media._id || index}
      className={cn(
        "relative w-full h-full",
        !isVideo && "cursor-pointer",
        itemClasses
      )}
      onClick={() => {
        if (isVideo) return;
        onClick(media.url);
      }}
      role={isVideo ? undefined : "button"}
      tabIndex={isVideo ? -1 : 0}
      onKeyDown={(e) => {
        if (isVideo) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(media.url);
        }
      }}
    >
      {isVideo ? (
        <video
          src={media.url}
          poster={media.thumbnail || media.poster}
          className={cn(
            "w-full h-full object-cover block",
            shouldShowOverlay && "brightness-50"
          )}
          controls
          aria-label="Post video"
        />
      ) : (
        <img
          src={media.url}
          alt={media.caption || `Post media ${index + 1}`}
          className={cn(
            "w-full h-full object-cover block",
            shouldShowOverlay && "brightness-50"
          )}
          loading="lazy"
        />
      )}
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

MediaItem.propTypes = {
  media: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    url: PropTypes.string.isRequired,
    caption: PropTypes.string,
    type: PropTypes.string,
    thumbnail: PropTypes.string,
    poster: PropTypes.string,
  }).isRequired,
  index: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
  onClick: PropTypes.func.isRequired,
  isLastDisplayed: PropTypes.bool,
  shouldShowOverlay: PropTypes.bool,
  remainingCount: PropTypes.number,
};

export default function PostMediaLayout({ images = [], videos = [], onImageClick }) {
  const medias = [
    ...(images || []).map((m) => ({ ...m, type: (m.type || "image").toLowerCase() })),
    ...(videos || []).map((m) => ({ ...m, type: "video" })),
  ];

  if (!medias.length) return null;

  const totalCount = medias.length;
  const displayedCount = Math.min(totalCount, 5);
  const remainingCount = totalCount > 5 ? totalCount - 5 : 0;

  if (totalCount === 1) {
    const media = medias[0];
    const isVideo = (media.type || "").toLowerCase() === "video";
    return (
      <div
        className={cn("mt-3", !isVideo && "cursor-pointer")}
        onClick={() => {
          if (isVideo) return;
          onImageClick(media.url);
        }}
        role={isVideo ? undefined : "button"}
        tabIndex={isVideo ? -1 : 0}
        onKeyDown={(e) => {
          if (isVideo) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onImageClick(media.url);
          }
        }}
      >
        {isVideo ? (
          <VideoPlayer
            src={media?.url || media?.src}
            poster={media.thumbnail || media.poster}
            className="w-full"
          />
        ) : (
          <img
            src={media.url}
            alt={media.caption || "Post media"}
            className="w-full h-auto max-h-[60vh] object-cover cursor-pointer"
            loading="lazy"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "gap-px overflow-hidden w-full",
        "max-h-[70vh]",
        getImageGridClasses(totalCount)
      )}
    >
      {medias.slice(0, displayedCount).map((media, index) => (
        <MediaItem
          key={media.id || media._id || index}
          media={media}
          index={index}
          totalCount={totalCount}
          onClick={onImageClick}
          isLastDisplayed={index === displayedCount - 1}
          shouldShowOverlay={remainingCount > 0 && index === displayedCount - 1}
          remainingCount={remainingCount}
        />
      ))}
    </div>
  );
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
