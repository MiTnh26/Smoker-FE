import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
import { cn } from "../../utils/cn";
import { getAvatarUrl } from "../../utils/defaultAvatar";
import { useImageUpload } from "../../hooks/useImageUpload";

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
  children, // Action buttons (top right)
  requestBookingButton, // Request booking button (bottom right)
  defaultBackground = "https://i.imgur.com/6IUbEMn.jpg",
  defaultAvatar = null, // Sẽ dùng getAvatarUrl
  isOwnProfile = false, // Cho phép thay ảnh bìa và avatar
  onAvatarChange, // Callback khi avatar thay đổi
  onBackgroundChange, // Callback khi background thay đổi
}) => {
  const { t } = useTranslation();
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const avatarInputRef = useRef(null);
  const backgroundInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);

  const { upload: uploadAvatar } = useImageUpload({
    endpoint: '/posts/upload',
    maxSize: 5 * 1024 * 1024, // 5MB
    onSuccess: (url) => {
      if (onAvatarChange) {
        onAvatarChange(url);
      }
      setUploadingAvatar(false);
    },
  });

  const { upload: uploadBackground } = useImageUpload({
    endpoint: '/posts/upload',
    maxSize: 5 * 1024 * 1024, // 5MB
    onSuccess: (url) => {
      if (onBackgroundChange) {
        onBackgroundChange(url);
      }
      setUploadingBackground(false);
    },
  });

  const handleAvatarClick = () => {
    if (isOwnProfile && avatarInputRef.current) {
      avatarInputRef.current.click();
    }
  };

  const handleBackgroundClick = () => {
    if (isOwnProfile && backgroundInputRef.current) {
      backgroundInputRef.current.click();
    }
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(t('profile.invalidImage') || 'Vui lòng chọn file ảnh hợp lệ.');
      return;
    }

    setUploadingAvatar(true);
    try {
      await uploadAvatar(file);
    } catch (err) {
      alert(err.message || t('profile.uploadError') || 'Upload ảnh thất bại. Vui lòng thử lại.');
      setUploadingAvatar(false);
    }
    // Reset input
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleBackgroundFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(t('profile.invalidImage') || 'Vui lòng chọn file ảnh hợp lệ.');
      return;
    }

    setUploadingBackground(true);
    try {
      await uploadBackground(file);
    } catch (err) {
      alert(err.message || t('profile.uploadError') || 'Upload ảnh thất bại. Vui lòng thử lại.');
      setUploadingBackground(false);
    }
    // Reset input
    if (backgroundInputRef.current) {
      backgroundInputRef.current.value = '';
    }
  };

  return (
    <section 
      className={cn("relative w-full h-[200px] md:h-[250px] overflow-hidden rounded-b-lg")}
    >
      <div
        className={cn("absolute inset-0 bg-cover bg-center transition-opacity duration-200", uploadingBackground && "opacity-50")}
        style={{
          backgroundImage: `url(${background || defaultBackground})`,
        }}
      />
      {/* Gradient Overlay */}
      <div className={cn("absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60")} />

      {/* Action Buttons - Top Right */}
      {children && (
        <div className={cn("absolute top-4 right-4 z-10 flex items-center gap-2")}>
          {children}
        </div>
      )}
      
      {/* Request Booking Button - Bottom Right */}
      {requestBookingButton && (
        <div className={cn("absolute bottom-4 right-4 z-30")}>
          {requestBookingButton}
        </div>
      )}

      {/* Change Cover Photo Button - Bottom Right (only for own profile) */}
      {isOwnProfile && (
        <div className={cn("absolute bottom-4 right-4 z-20", requestBookingButton && "bottom-16")}>
          <button
            onClick={handleBackgroundClick}
            disabled={uploadingBackground}
            className={cn(
              "px-3 py-2 rounded-lg font-medium text-sm",
              "bg-card/90 backdrop-blur-sm text-foreground border border-border/30",
              "hover:bg-card transition-all duration-200",
              "active:scale-95 flex items-center gap-2",
              "shadow-sm",
              uploadingBackground && "opacity-50 cursor-not-allowed"
            )}
            title={t('profile.changeCoverPhoto') || 'Thay ảnh bìa'}
          >
            <Camera className="w-4 h-4" />
            <span>{t('profile.changeCoverPhoto') || 'Thay ảnh bìa'}</span>
          </button>
          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/*"
            onChange={handleBackgroundFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Profile Info Overlay */}
      <div className={cn("absolute bottom-0 left-0 right-0 p-4 md:p-6")}>
        <div className={cn("flex items-end gap-3 md:gap-4")}>
          {/* Avatar */}
          <div 
            className={cn("relative cursor-pointer", isOwnProfile && "group")}
            onMouseEnter={() => isOwnProfile && setIsHoveringAvatar(true)}
            onMouseLeave={() => setIsHoveringAvatar(false)}
            onClick={handleAvatarClick}
          >
            <img
              src={getAvatarUrl(avatar || defaultAvatar, 150)}
              alt={name || "Profile"}
              className={cn(
                "w-20 h-20 md:w-24 md:h-24 rounded-full object-cover transition-opacity duration-200",
                "border-4 border-card shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
                "bg-card",
                uploadingAvatar && "opacity-50",
                isOwnProfile && isHoveringAvatar && "opacity-70"
              )}
              onError={(e) => {
                e.target.src = getAvatarUrl(null, 150);
              }}
            />
            {/* Camera Icon Overlay on Hover */}
            {isOwnProfile && isHoveringAvatar && (
              <div className={cn(
                "absolute inset-0 rounded-full",
                "bg-black/50 flex items-center justify-center",
                "transition-opacity duration-200"
              )}>
                <Camera className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
            )}
            {/* Uploading Indicator */}
            {uploadingAvatar && (
              <div className={cn(
                "absolute inset-0 rounded-full",
                "bg-black/30 flex items-center justify-center"
              )}>
                <div className={cn("text-white text-xs")}>
                  {t('common.loading') || 'Đang tải...'}
                </div>
              </div>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              className="hidden"
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

