import { useState, useEffect } from "react";
import { Video, Users, Play } from "lucide-react";
import livestreamApi from "../../../../api/livestreamApi";
import { cn } from "../../../../utils/cn";

export default function LivestreamCard({ livestream, onClick }) {
  const [viewerCount, setViewerCount] = useState(livestream.viewCount || 0);
  const [hostInfo, setHostInfo] = useState(null);

  useEffect(() => {
    // Fetch host info (you might want to get this from a user API)
    const session = JSON.parse(localStorage.getItem("session") || "{}");
    // For now, we'll just display the host ID
    setHostInfo({ name: "Host" });
  }, []);

  return (
    <div 
      className={cn(
        "livestream-card",
        "p-4 rounded-lg border-[0.5px] border-border/20",
        "bg-card text-card-foreground",
        "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
        "cursor-pointer transition-all duration-200",
        "hover:shadow-[0_2px_4px_rgba(0,0,0,0.08)] hover:border-border/30"
      )}
      onClick={onClick}
    >
      <div className={cn("relative z-10")}>
        <div className={cn("flex justify-between items-center mb-3")}>
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg",
            "bg-gradient-to-r from-danger to-danger/90 text-primary-foreground",
            "font-bold text-xs shadow-lg"
          )}>
            <span className={cn(
              "w-2 h-2 rounded-full bg-primary-foreground",
              "animate-pulse"
            )}></span>
            LIVE
          </div>
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-lg",
            "bg-black/50 backdrop-blur-sm text-primary-foreground text-xs font-semibold"
          )}>
            <Users size={14} />
            {viewerCount}
          </div>
        </div>

        <div className={cn(
          "relative w-full aspect-video rounded-xl overflow-hidden mb-3",
          "bg-gradient-to-br from-muted/40 to-muted/20",
          "flex items-center justify-center"
        )}>
          <Video size={48} className={cn("text-muted-foreground")} />
          <div className={cn(
            "absolute inset-0 bg-black/40 backdrop-blur-sm",
            "flex items-center justify-center",
            "opacity-0 hover:opacity-100 transition-opacity duration-300"
          )}>
            <Play size={32} className={cn("text-primary-foreground")} />
          </div>
        </div>

        <div className={cn("mb-3")}>
          <h4 className={cn("font-semibold text-lg text-foreground mb-1")}>
            {livestream.title}
          </h4>
          {livestream.description && (
            <p className={cn("text-sm text-muted-foreground line-clamp-2")}>
              {livestream.description}
            </p>
          )}
        </div>

        <div className={cn("flex items-center gap-2 pt-3 border-t border-border/30")}>
          <div className={cn(
            "w-8 h-8 rounded-full bg-muted/30",
            "flex items-center justify-center"
          )}>
            <Video size={16} className={cn("text-muted-foreground")} />
          </div>
          <span className={cn("text-sm text-muted-foreground")}>
            Đang phát trực tiếp
          </span>
        </div>
      </div>
    </div>
  );
}

