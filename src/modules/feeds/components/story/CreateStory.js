import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getSession, getActiveEntity } from "../../../../utils/sessionManager";

export default function CreateStory({ onOpenEditor }) {
  const { t } = useTranslation();
  const [userAvatar, setUserAvatar] = useState('/default-avatar.png');
  const [userName, setUserName] = useState('User');

  // Lấy thông tin user từ activeEntity (để đồng bộ khi đổi role)
  useEffect(() => {
    const updateUserInfo = () => {
      try {
        const activeEntity = getActiveEntity();
        const session = getSession();
        
        // Ưu tiên activeEntity (role hiện tại), fallback về account
        const user = activeEntity || session?.account;
        
        const avatar = user?.avatar || user?.Avatar || '/default-avatar.png';
        const name = user?.userName || user?.UserName || user?.name || user?.email || 'User';
        
        setUserAvatar(avatar);
        setUserName(name);
      } catch (e) {
        console.error("[CreateStory] Error getting user info:", e);
      }
    };

    // Cập nhật ngay lập tức
    updateUserInfo();

    // Listen to storage changes để cập nhật khi đổi role (cross-tab)
    const handleStorageChange = (e) => {
      if (e.key === 'session') {
        updateUserInfo();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Listen to custom events khi session thay đổi trong cùng tab
    const handleSessionChange = () => {
      updateUserInfo();
    };
    
    window.addEventListener('sessionUpdated', handleSessionChange);
    window.addEventListener('profileUpdated', handleSessionChange); // UnifiedMenu dispatch event này
    
    // Polling để check session mỗi 5 giây (fallback nếu events không hoạt động)
    const interval = setInterval(() => {
      updateUserInfo();
    }, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sessionUpdated', handleSessionChange);
      window.removeEventListener('profileUpdated', handleSessionChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <button
      type="button"
      className="flex w-[112px] shrink-0 cursor-pointer flex-col items-center text-center"
      onClick={(e) => {
        e.stopPropagation();
        if (onOpenEditor) {
          onOpenEditor();
        }
      }}
    >
      <div className="relative h-[200px] w-full overflow-hidden rounded-lg border-[0.5px] border-border/20 bg-muted shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] border-primary/40 bg-card p-[1px] shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-colors duration-200">
            <img
              src={userAvatar}
              alt={userName}
              className="h-full w-full rounded-full object-cover"
            />
          </div>
          <p className="px-2 text-sm font-medium text-foreground">
            {t("story.createStoryButton")}
          </p>
        </div>
      </div>
    </button>
  );
}

