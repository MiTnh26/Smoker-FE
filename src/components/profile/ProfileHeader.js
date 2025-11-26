import React from "react";
import { cn } from "../../utils/cn";

/**
 * Shared Profile Header Component
 * Displays cover photo with gradient overlay and profile info
 * Keep exact same styling as original
 */
export const ProfileHeader = ({
  background,
  avatar,
  name,
  role,
  children, // Action buttons
  defaultBackground = "https://i.imgur.com/6IUbEMn.jpg",
  defaultAvatar = "https://via.placeholder.com/150",
}) => {
  return (
    <section className={cn("relative w-full h-[200px] md:h-[250px] overflow-hidden rounded-b-lg")}>
      <div
        className={cn("absolute inset-0 bg-cover bg-center")}
        style={{
          backgroundImage: `url(${background || defaultBackground})`,
        }}
      />
      {/* Gradient Overlay */}
      <div className={cn("absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60")} />

      {/* Action Buttons */}
      {children && (
        <div className={cn("absolute top-4 right-4 z-10 flex items-center gap-2")}>
          {children}
        </div>
      )}

      {/* Profile Info Overlay */}
      <div className={cn("absolute bottom-0 left-0 right-0 p-4 md:p-6")}>
        <div className={cn("flex items-end gap-3 md:gap-4")}>
          {/* Avatar */}
          <div className={cn("relative")}>
            <img
              src={avatar || defaultAvatar}
              alt={name || "Profile"}
              className={cn(
                "w-20 h-20 md:w-24 md:h-24 rounded-full object-cover",
                "border-4 border-card shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
                "bg-card"
              )}
            />
          </div>
          <div className={cn("flex-1 pb-1")}>
            <h1 className={cn(
              "text-xl md:text-2xl font-bold text-primary-foreground mb-0.5",
              "drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
            )}>
              {name || "Profile"}
            </h1>
            <div className={cn(
              "text-xs md:text-sm text-primary-foreground/90",
              "drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
            )}>
              {role || "USER"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

