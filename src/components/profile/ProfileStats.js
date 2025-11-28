import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";

/**
 * Shared Profile Stats Component
 * Displays followers and following counts
 * Accepts counts (numbers) or arrays for backward compatibility
 * Keep exact same styling as original
 */
export const ProfileStats = ({ followers = 0, following = 0, posts = null }) => {
  const { t } = useTranslation();

  // Handle backward compatibility: if followers/following are arrays, use length
  const followersCount = Array.isArray(followers) ? followers.length : (followers || 0);
  const followingCount = Array.isArray(following) ? following.length : (following || 0);

  return (
    <section className={cn(
      "flex items-center justify-center gap-8 md:gap-12 lg:gap-16",
      "py-6 px-4",
      "border-b border-border/30"
    )}>
      {posts !== null && (
        <>
          <button className={cn(
            "flex flex-col items-center gap-1.5 cursor-pointer",
            "group transition-all duration-200",
            "hover:opacity-90 active:scale-95"
          )}>
            <span className={cn(
              "text-2xl md:text-3xl font-bold text-foreground",
              "tracking-tight leading-none",
              "group-hover:text-primary transition-colors duration-200"
            )}>
              {posts}
            </span>
            <span className={cn(
              "text-[11px] md:text-xs text-muted-foreground",
              "font-medium uppercase tracking-wider",
              "group-hover:text-foreground/80 transition-colors duration-200"
            )}>
              {t("publicProfile.posts")}
            </span>
          </button>

          <div className={cn(
            "h-10 w-px bg-border/20",
            "hidden md:block"
          )} />
        </>
      )}

      <button className={cn(
        "flex flex-col items-center gap-1.5 cursor-pointer",
        "group transition-all duration-200",
        "hover:opacity-90 active:scale-95"
      )}>
        <span className={cn(
          "text-2xl md:text-3xl font-bold text-foreground",
          "tracking-tight leading-none",
          "group-hover:text-primary transition-colors duration-200"
        )}>
          {followersCount}
        </span>
        <span className={cn(
          "text-[11px] md:text-xs text-muted-foreground",
          "font-medium uppercase tracking-wider",
          "group-hover:text-foreground/80 transition-colors duration-200"
        )}>
          {t("publicProfile.followers")}
        </span>
      </button>

      <div className={cn(
        "h-10 w-px bg-border/20",
        "hidden md:block"
      )} />

      <button className={cn(
        "flex flex-col items-center gap-1.5 cursor-pointer",
        "group transition-all duration-200",
        "hover:opacity-90 active:scale-95"
      )}>
        <span className={cn(
          "text-2xl md:text-3xl font-bold text-foreground",
          "tracking-tight leading-none",
          "group-hover:text-primary transition-colors duration-200"
        )}>
          {followingCount}
        </span>
        <span className={cn(
          "text-[11px] md:text-xs text-muted-foreground",
          "font-medium uppercase tracking-wider",
          "group-hover:text-foreground/80 transition-colors duration-200"
        )}>
          {t("publicProfile.following")}
        </span>
      </button>
    </section>
  );
};

