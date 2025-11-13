// src/components/layout/BarHeader.js
import { Link, useNavigate } from "react-router-dom";
import { Home, MessageCircle, User, Search, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import UnifiedMenu from "../../common/UnifiedMenu";
import MessagesPanel from "../common/MessagesPanel";
import NotificationPanel from "../common/NotificationPanel";
import DropdownPanel from "../../common/DropdownPanel";
import { cn } from "../../../utils/cn";
import GlobalSearch from "../common/GlobalSearch";
import notificationApi from "../../../api/notificationApi";

export default function BarHeader() {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState(null); // 'user' | 'messages' | 'notifications' | null
  const [barUser, setBarUser] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const { t } = useTranslation();
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("session"));
    } catch {
      return null;
    }
  });
  
  const conversations = [
    { id: 1, name: "Người dùng A", lastMessage: "Hello!", time: "10 phút", unread: 2 },
    { id: 2, name: "Người dùng B", lastMessage: "Ok nhé!", time: "30 phút", unread: 0 },
  ];

  const togglePanel = (panel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const updateSession = () => {
    try {
      const newSession = JSON.parse(localStorage.getItem("session"));
      setSession(newSession);
      
      if (!newSession) return;

      // Nếu có mảng entities thì tìm trong đó, còn không thì fallback sang account
      // Match by ID first, then by type (BarPage, Business, BusinessAccount, etc.)
      const activeBar =
        newSession?.entities?.find(
          (e) => String(e.id) === String(newSession?.activeEntity?.id)
        ) ||
        {
          id: newSession?.activeEntity?.id,
          name: newSession?.activeEntity?.name || newSession?.account?.userName || newSession?.account?.email || "Trang của bạn",
          avatar: newSession?.activeEntity?.avatar || newSession?.account?.avatar,
          role: newSession?.activeEntity?.role,
          type: newSession?.activeEntity?.type || "BarPage",
        };

      setBarUser(activeBar);
    } catch (e) {
      console.error("[BarHeader] Error parsing session:", e);
    }
  };

  useEffect(() => {
    if (!session) return;
    updateSession();
    
    // Listen for profile updates
    const handleProfileUpdate = () => {
      console.log("[BarHeader] Profile updated event received");
      updateSession();
    };
    
    // eslint-disable-next-line no-undef
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-undef
      window.addEventListener('profileUpdated', handleProfileUpdate);
      // eslint-disable-next-line no-undef
      window.addEventListener('storage', handleProfileUpdate);
      
      return () => {
        // eslint-disable-next-line no-undef
        window.removeEventListener('profileUpdated', handleProfileUpdate);
        // eslint-disable-next-line no-undef
        window.removeEventListener('storage', handleProfileUpdate);
      };
    }
  }, []);

  useEffect(() => {
    const fetchUnreadNotificationCount = async () => {
      try {
        const response = await notificationApi.getUnreadCount();
        if (response.success && response.data) {
          setUnreadNotificationCount(response.data.count || 0);
        }
      } catch (error) {
        console.error("[BarHeader] Error fetching unread notification count:", error);
      }
    };

    fetchUnreadNotificationCount();
    const interval = setInterval(fetchUnreadNotificationCount, 60000);
    return () => clearInterval(interval);
  }, []);
  
  if (!session || !session.activeEntity) {
    return null; // or a loading state
  }

  const role = (session.activeEntity.role || session.activeEntity.type || "").toLowerCase();
  const activeEntityId = session.activeEntity.id;
  
  // Determine menu config based on role
  const getMenuConfig = () => {
    if (role === "dj") return "dj";
    if (role === "dancer") return "dancer";
    if (role === "bar" || role === "barpage") return "bar";
    if (session.activeEntity.type === "Business" || session.activeEntity.type === "BusinessAccount") return "business";
    return "bar"; // default fallback
  };
  
  const menuConfig = getMenuConfig();
  
  // Determine newsfeed path based on role
  const getNewsfeedPath = () => {
    if (role === "dj") return "/dj/newsfeed";
    if (role === "dancer") return "/dancer/newsfeed";
    return "/bar/newsfeed"; // default for bar
  };

  return (
    <>
      <header className={cn(
        "h-16 flex items-center px-4 md:px-8 sticky top-0 z-10",
        "bg-card border-b border-[0.5px] border-border/20",
        "backdrop-blur-sm"
      )}>
        <div className={cn(
          "flex items-center w-full justify-between mx-auto",
          "max-w-[1400px]"
        )}>
          <Link 
            to={getNewsfeedPath()} 
            className={cn(
              "text-2xl font-bold no-underline",
              "text-primary",
              "transition-opacity duration-200",
              "hover:opacity-80"
            )}
          >
            {t('layout.brandPage')}
          </Link>

          <div className={cn(
            "flex items-center flex-1 max-w-md mx-4"
          )}>
            <GlobalSearch />
          </div>

          <div className={cn("flex gap-2")}>
            <button 
              className={cn(
                "rounded-lg p-2 flex items-center justify-center",
                "transition-all duration-200 cursor-pointer relative",
                "text-muted-foreground",
                "hover:text-primary hover:bg-primary/10",
                "active:scale-95"
              )}
              onClick={() => navigate(getNewsfeedPath())}
            >
              <Home size={24} />
            </button>
            <button 
              className={cn(
                "rounded-lg p-2 flex items-center justify-center",
                "transition-all duration-200 cursor-pointer relative",
                "text-muted-foreground",
                activePanel === "messages" 
                  ? "text-primary-foreground bg-primary" 
                  : "hover:text-primary hover:bg-primary/10",
                "active:scale-95"
              )}
              onClick={() => togglePanel("messages")}
            >
              <MessageCircle size={24} />
            </button>
            
            <button 
              className={cn(
                "rounded-lg p-2 flex items-center justify-center",
                "transition-all duration-200 cursor-pointer relative",
                "text-muted-foreground",
                activePanel === "notifications" 
                  ? "text-primary-foreground bg-primary" 
                  : "hover:text-primary hover:bg-primary/10",
                "active:scale-95"
              )}
              onClick={() => togglePanel("notifications")}
            >
              <Bell size={24} />
              {unreadNotificationCount > 0 && (
                <span className={cn(
                  "absolute -top-1 -right-1 min-w-[18px] h-[18px]",
                  "px-1 flex items-center justify-center",
                  "bg-danger text-primary-foreground rounded-full",
                  "text-[11px] font-semibold leading-none",
                  "border-2 border-card z-10",
                  "shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                )}>
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            <button 
              className={cn(
                "rounded-lg p-2 flex items-center justify-center",
                "transition-all duration-200 cursor-pointer relative",
                "text-muted-foreground",
                activePanel === "user" 
                  ? "text-primary-foreground bg-primary" 
                  : "hover:text-primary hover:bg-primary/10",
                "active:scale-95"
              )}
              onClick={() => togglePanel("user")}
            >
              <User size={24} />
            </button>
          </div>
        </div>
      </header>

      <DropdownPanel
        isOpen={!!activePanel}
        onClose={() => setActivePanel(null)}
        title={(() => {
          if (activePanel === "user") return t('layout.businessMenu');
          if (activePanel === "messages") return t('layout.messages');
          if (activePanel === "notifications") return t('layout.notifications');
          return "";
        })()}
      >
        {activePanel === "user" && barUser && (
          <UnifiedMenu
            onClose={() => setActivePanel(null)}
            userData={barUser}
            menuConfig={menuConfig}
            showBackToAccount={true}
          />
        )}
        {activePanel === "messages" && (
          <MessagesPanel conversations={conversations} onClose={() => setActivePanel(null)} />
        )}
        {activePanel === "notifications" && (
          <NotificationPanel
            onClose={() => setActivePanel(null)}
            onUnreadCountChange={(count) => setUnreadNotificationCount(count)}
          />
        )}
      </DropdownPanel>
    </>
  );
}
