import React from "react";
import { cn } from "../../utils/cn";

export default function VideoCard({ title, url }) {
  return (
    <div className={cn("w-full")}>
      <iframe
        width="100%"
        height="250"
        src={url}
        title={title}
        allowFullScreen
        className={cn(
          "rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
          "border-[0.5px] border-border/20"
        )}
      ></iframe>
      <h4 className={cn(
        "mt-2 text-center text-foreground font-semibold"
      )}>
        {title}
      </h4>
    </div>
  );
}
