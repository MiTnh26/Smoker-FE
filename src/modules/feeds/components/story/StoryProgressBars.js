import React from "react";
import { cn } from "../../../../utils/cn";

/**
 * Component to display progress indicators for all stories
 */
export default function StoryProgressBars({ stories, currentIndex, progress }) {
  if (!stories || stories.length === 0) return null;

  return (
    <div className="absolute left-2 right-2 top-2 z-10 flex gap-1.5 px-1">
      {stories.map((s, idx) => (
        <div
          key={s._id || s.id || idx}
          className="flex-1 overflow-hidden rounded-sm bg-white/30"
        >
          <div
            className={cn(
              "h-[3px] rounded-sm bg-white/90 transition-[width] duration-75",
              idx === currentIndex && "bg-white"
            )}
            style={{
              width:
                idx < currentIndex
                  ? "100%"
                  : idx === currentIndex
                  ? `${progress}%`
                  : "0%",
            }}
          />
        </div>
      ))}
    </div>
  );
}

