import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Video } from "lucide-react";
import { cn } from "../../../../utils/cn";

export default function CreatePostBox({ onCreate, onGoLive, onMediaClick, onMusicClick }) {
  const { t } = useTranslation();
  const [avatar, setAvatar] = useState("https://media.techz.vn/resize_x700x/media2019/source/01TRAMY/2024MY1/mckanhnong.png");
  const [isDJ, setIsDJ] = useState(false);
  
  // Function to get avatar from session (prioritize activeEntity/role avatar)
  const getAvatar = () => {
    try {
      const raw = localStorage.getItem("session")
      const session = raw ? JSON.parse(raw) : null
      if (!session) return avatar
      
      // Prioritize activeEntity (role) avatar, fallback to account avatar
      const activeEntity = session?.activeEntity
      const account = session?.account
      
      return activeEntity?.avatar || account?.avatar || avatar
    } catch (e) {
      return avatar
    }
  }

  const getIsDJ = () => {
    try {
      const raw = localStorage.getItem("session");
      const session = raw ? JSON.parse(raw) : null;
      if (!session) return false;

      const activeEntityRole = session?.activeEntity?.role || session?.account?.role || "";
      return String(activeEntityRole).toLowerCase() === "dj";
    } catch (e) {
      return false;
    }
  };
  
  // Update avatar when component mounts and when localStorage changes
  useEffect(() => {
    setAvatar(getAvatar());
    setIsDJ(getIsDJ());
    
    // Listen for storage changes (when profile is updated)
    const handleStorageChange = () => {
      setAvatar(getAvatar());
      setIsDJ(getIsDJ());
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event when profile is updated in same tab
    window.addEventListener('profileUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileUpdated', handleStorageChange);
    };
  }, []);

  const handleGoLive = () => {
    onGoLive?.();
  };

  const handleMediaClick = () => {
    if (onMediaClick) {
      onMediaClick();
    } else {
      onCreate?.();
    }
  };

  const handleMusicClick = () => {
    if (onMusicClick) {
      onMusicClick();
    }
  };
  
  return (
    <div className={cn(
      "create-post-box",
      "bg-card border-[0.5px] border-border/20 rounded-lg p-4",
      "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
      "relative overflow-hidden",
      "transition-all duration-200 ease-out",
      "hover:shadow-[0_2px_4px_rgba(0,0,0,0.08)]",
      "hover:border-border/30"
    )}>
      <div className="flex items-center gap-4 mb-4 relative z-10">
        <img
          src={avatar}
          alt="User avatar"
          className="w-14 h-14 rounded-2xl object-cover border-2 border-primary/20 ring-2 ring-primary/5 shadow-lg"
        />
        <input
          type="text"
          placeholder={t('feed.createPlaceholderToday')}
          className={cn(
            "flex-1 bg-muted/40",
            "border-[0.5px] border-border/20 rounded-lg",
            "px-4 py-2.5 text-sm outline-none",
            "text-foreground transition-all duration-200",
            "placeholder:text-muted-foreground/60",
            "hover:bg-muted/60 hover:border-border/30",
            "focus:bg-background focus:border-primary/40",
            "focus:ring-1 focus:ring-primary/20"
          )}
          onFocus={() => onCreate?.()}
        />
      </div>

      <div className={cn(
        "flex justify-around border-t border-border/30 pt-3 relative z-10"
      )}>
        <button 
          className={cn(
            "flex items-center gap-2 text-sm font-semibold",
            "text-muted-foreground bg-transparent border-none",
            "rounded-xl px-3 py-2",
            "cursor-pointer transition-all duration-300",
            "hover:text-primary",
            "active:scale-95"
          )}
          onClick={handleGoLive}
        >
          <Video size={18} /> {t('feed.goLive')}
        </button>
        <button 
          className={cn(
            "flex items-center gap-2 text-sm font-semibold",
            "text-muted-foreground bg-transparent border-none",
            "rounded-xl px-3 py-2",
            "cursor-pointer transition-all duration-300",
            "hover:text-primary",
            "active:scale-95"
          )}
          onClick={handleMediaClick}
        >
          <i className="fa-solid fa-image text-base"></i> {t('feed.photoVideo')}
        </button>
        {isDJ && (
          <button 
            className={cn(
              "flex items-center gap-2 text-sm font-semibold",
              "text-muted-foreground bg-transparent border-none",
              "rounded-xl px-3 py-2",
              "cursor-pointer transition-all duration-300",
              "hover:text-primary",
              "active:scale-95"
            )}
            onClick={handleMusicClick}
          >
            <i className="fa-solid fa-music text-base"></i> {t('feed.music')}
          </button>
        )}
      </div>
    </div>
  )
}
