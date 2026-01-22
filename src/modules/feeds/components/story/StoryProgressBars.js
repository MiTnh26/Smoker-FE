import React from "react";
import { cn } from "../../../../utils/cn";

/**
 * Component to display progress indicators for all stories
 */
export default function StoryProgressBars({ stories, currentIndex, progress }) {
  if (!stories || stories.length === 0) return null;

  return (
    <div className="w-full flex gap-1.5 px-1">
      {stories.map((s, idx) => (
        <div
          key={s._id || s.id || idx}
          className="flex-1 overflow-hidden rounded-full bg-white/25 backdrop-blur-sm"
        >
          <div
            className={cn(
              "h-[4px] rounded-full bg-white transition-[width] duration-75 ease-linear",
              idx === currentIndex && "bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
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

