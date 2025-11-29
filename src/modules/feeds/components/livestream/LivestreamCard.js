import { Video, Users, Play } from "lucide-react";
import { cn } from "../../../../utils/cn";

export default function LivestreamCard({ livestream, onClick }) {
  const viewerCount = livestream.viewCount ?? 0;

  return (
    <div 
      className={cn(
        "p-4 rounded-2xl border border-border/30",
        "bg-card text-card-foreground",
        "shadow-[0_10px_30px_rgba(15,23,42,0.05)]",
        "cursor-pointer transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(15,23,42,0.08)] hover:border-border/60"
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
          {/* Broadcaster info */}
          {livestream.broadcasterName && (
            <div className="flex items-center gap-2 mb-2">
              {livestream.broadcasterAvatar ? (
                <img
                  src={livestream.broadcasterAvatar}
                  alt={livestream.broadcasterName}
                  className="h-6 w-6 rounded-full object-cover border border-border/30"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-primary">
                    {livestream.broadcasterName[0]?.toUpperCase() || "U"}
                  </span>
                </div>
              )}
              <span className={cn("text-sm text-muted-foreground font-medium")}>
                {livestream.broadcasterName}
              </span>
            </div>
          )}
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

