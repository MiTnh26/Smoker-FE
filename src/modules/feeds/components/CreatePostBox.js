import { useState, useEffect } from "react";
import "../../../styles/modules/feeds/CreatePostBox.css"

export default function CreatePostBox({ onCreate }) {
  const [avatar, setAvatar] = useState("https://media.techz.vn/resize_x700x/media2019/source/01TRAMY/2024MY1/mckanhnong.png");
  
  // Function to get avatar from session
  const getAvatar = () => {
    try {
      const raw = localStorage.getItem("session")
      const session = raw ? JSON.parse(raw) : null
      return session?.account?.avatar || avatar
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
          placeholder="Bạn muốn đăng gì hôm nay?"
          className="create-input"
          onFocus={() => onCreate?.()}
        />
      </div>

      <div className="create-post-actions">
        <button className="action-btn">
          <i className="fa-solid fa-image"></i> Ảnh/Video
        </button>
        <button className="action-btn">
          <i className="fa-solid fa-music"></i> Âm nhạc
        </button>
        <button className="action-btn">
          <i className="fa-solid fa-face-smile"></i> Cảm xúc
        </button>
      </div>
    </div>
  )
}
