import React from "react";
import { Camera } from "lucide-react";

/**
 * Lightweight preview card that mimics the profile hero:
 * shows background, avatar, name, role badge, and a couple of info rows.
 */
export default function ProfilePreviewCard({
  name,
  roleLabel,
  address,
  bio,
  avatar,
  background,
  phone,
  onSelectAvatar,
  onSelectBackground,
}) {
  const fallbackBg = background || "/preview/2.png";
  const fallbackAvatar = avatar || "/preview/1.png";

  return (
    <div className="register-preview-card">
      <div className="register-preview-cover-wrapper">
        <div
          className="register-preview-cover"
          style={{ backgroundImage: `url(${fallbackBg})` }}
        />
        <div className="register-preview-cover-overlay" />
        {onSelectBackground && (
          <button
            type="button"
            className="preview-cover-action"
            onClick={onSelectBackground}
          >
            <Camera size={16} />
            <span>Thay ảnh bìa</span>
          </button>
        )}
      </div>
      <div className="register-preview-content">
        <div className="register-preview-avatar-wrapper">
          <button
            type="button"
            className="register-preview-avatar"
            onClick={onSelectAvatar}
            aria-label="Chọn ảnh đại diện"
          >
            <img src={fallbackAvatar} alt="avatar" />
            {onSelectAvatar && (
              <span className="preview-avatar-action">
                <Camera size={18} />
              </span>
            )}
          </button>
        </div>
        <div className="register-preview-info">
          <div className="register-preview-header">
            <h2 className="register-preview-name">{name || "Tên hiển thị"}</h2>
            <span className="register-preview-role">{roleLabel || "ROLE"}</span>
          </div>
          {address && (
            <div className="register-preview-detail">
              <span className="register-preview-icon">📍</span>
              <span className="register-preview-text">{address}</span>
            </div>
          )}
          {phone && (
            <div className="register-preview-detail">
              <span className="register-preview-icon">📞</span>
              <span className="register-preview-text">{phone}</span>
            </div>
          )}
          {bio && (
            <div className="register-preview-bio">
              <p className="register-preview-text">{bio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

