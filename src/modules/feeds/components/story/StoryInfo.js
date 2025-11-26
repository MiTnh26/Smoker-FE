import React from "react";
import { useNavigate } from "react-router-dom";
import { formatShortTime } from "./utils/storyUtils";

/**
 * Component to display story user info (avatar, name, time, music, caption)
 */
export default function StoryInfo({ story, t, isOwnStory = false }) {
  const navigate = useNavigate();

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    if (!story) return;
    
    const entityAccountId =
      story.authorEntityAccountId || story.entityAccountId;
    const entityId = story.authorEntityId || story.entityId;
    const entityType = story.authorEntityType || story.entityType;
    
    if (entityType === "BarPage") {
      navigate(`/bar/${entityId || entityAccountId}`);
    } else if (entityType === "BusinessAccount") {
      navigate(`/profile/${entityAccountId || entityId}`);
    } else {
      navigate(`/profile/${entityAccountId || entityId}`);
    }
  };


  if (!story) return null;

  const avatarSrc =
    story.authorAvatar ||
    story.authorAvatar ||
    story.avatar ||
    "/default-avatar.png";
  const username =
    story.authorName ||
    story.authorName ||
    story.accountId ||
    story.title ||
    "User";
  const audioUrl = story.songFilename
    ? `http://localhost:9999/api/song/stream/${story.songFilename}`
    : null;
  const displayCaption = story.content || story.caption || "";

  return (
    <div className="absolute left-3 right-3 top-12 z-10 flex items-start gap-3 pr-24 text-white pointer-events-none">
      <img 
        src={avatarSrc} 
        alt={username} 
        className="h-10 w-10 flex-shrink-0 cursor-pointer rounded-full border-[0.5px] border-white/60 object-cover shadow-[0_2px_8px_rgba(0,0,0,0.25)] pointer-events-auto"
        onClick={handleAvatarClick}
      />
      <div className="flex-1 space-y-2 pointer-events-auto">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold leading-tight">{username}</span>
          <span className="text-xs text-white/80">
            {formatShortTime(story.createdAt, t)}
          </span>
        </div>
        {audioUrl && story.songFilename && (
          <div className="flex items-center gap-2 text-xs text-white/90">
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 19V6l12-2v13" opacity="0.9"></path>
                <circle cx="6" cy="19" r="3"></circle>
                <circle cx="18" cy="17" r="3"></circle>
              </svg>
            </span>
            <span className="truncate">
              {story.songName 
                ? story.songArtist
                  ? `${story.songName} - ${story.songArtist}`
                  : story.songName
                : story.songFilename || "Music"}
            </span>
            <span>→</span>
          </div>
        )}
        {displayCaption && (
          <div className="pointer-events-auto">
            <div className="inline-flex max-w-[170px] break-words items-center rounded-md bg-black/35 px-2 py-1.5 text-xs leading-5">
              {displayCaption}
              </div>
          </div>
        )}
      </div>
    </div>
  );
}

