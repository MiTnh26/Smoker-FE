import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Video } from "lucide-react";
import "../../../styles/modules/feeds/CreatePostBox.css"

export default function CreatePostBox({ onCreate, onGoLive, onMediaClick, onMusicClick }) {
  const { t } = useTranslation();
  const [avatar, setAvatar] = useState("https://media.techz.vn/resize_x700x/media2019/source/01TRAMY/2024MY1/mckanhnong.png");
  
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
  
  // Update avatar when component mounts and when localStorage changes
  useEffect(() => {
    setAvatar(getAvatar());
    
    // Listen for storage changes (when profile is updated)
    const handleStorageChange = () => {
      setAvatar(getAvatar());
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
    <div className="create-post-box">
      <div className="create-post-top">
        <img
          src={avatar}
          alt="User avatar"
          className="create-avatar"
        />
        <input
          type="text"
          placeholder={t('feed.createPlaceholderToday')}
          className="create-input"
          onFocus={() => onCreate?.()}
        />
      </div>

      <div className="create-post-actions">
        <button className="action-btn" onClick={handleGoLive}>
          <Video size={18} style={{ marginRight: '8px' }} /> {t('feed.goLive')}
        </button>
        <button className="action-btn" onClick={handleMediaClick}>
          <i className="fa-solid fa-image"></i> {t('feed.photoVideo')}
        </button>
        <button className="action-btn" onClick={handleMusicClick}>
          <i className="fa-solid fa-music"></i> {t('feed.music')}
        </button>
        <button className="action-btn">
          <i className="fa-solid fa-face-smile"></i> {t('feed.feeling')}
        </button>
      </div>
    </div>
  )
}
