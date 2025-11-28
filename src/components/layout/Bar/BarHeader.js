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
import messageApi from "../../../api/messageApi";
import { useSocket } from "../../../contexts/SocketContext";
import { getSession, getActiveEntity, getEntities } from "../../../utils/sessionManager";
import NotificationToPostModal from "../../../modules/feeds/components/modals/NotificationToPostModal";

export default function BarHeader() {
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState(null); // 'user' | 'messages' | 'notifications' | null
  const [barUser, setBarUser] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postModalPostId, setPostModalPostId] = useState(null);
  const [postModalCommentId, setPostModalCommentId] = useState(null);
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

  // Get entityAccountId from session
  const getEntityAccountId = () => {
    try {
      const active = getActiveEntity() || {};
      const entities = getEntities();
      let entityAccountId = active.EntityAccountId || active.entityAccountId || null;
      if (!entityAccountId && active.id && active.type) {
        const found = entities.find(
          e => String(e.id) === String(active.id) && (e.type === active.type || (e.type === "BusinessAccount" && active.type === "Business"))
        );
        entityAccountId = found?.EntityAccountId || found?.entityAccountId || null;
      }
      return entityAccountId;
    } catch (error) {
      console.warn("[BarHeader] Error getting entityAccountId:", error);
      return null;
    }
  };

  // Fetch unread notification count (exclude Messages type)
  const fetchUnreadNotificationCount = async () => {
    try {
      // Get entityAccountId from session
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const active = session?.activeEntity || {};
      const entities = session?.entities || [];
      
      const entityAccountId =
        active.EntityAccountId ||
        active.entityAccountId ||
        entities.find(e => String(e.id) === String(active.id) && e.type === active.type)?.EntityAccountId ||
        entities[0]?.EntityAccountId ||
        null;

      if (!entityAccountId) {
        setUnreadNotificationCount(0);
        return;
      }

      const response = await notificationApi.getUnreadCount(entityAccountId);
      if (response.success && response.data) {
        setUnreadNotificationCount(response.data.count || 0);
      }
    } catch (error) {
      console.error("[BarHeader] Error fetching unread notification count:", error);
    }
  };

  // Fetch unread message count
  const fetchUnreadMessageCount = async () => {
    try {
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const active = session?.activeEntity || {};
      const entities = session?.entities || [];
      
      const currentUserEntityId =
        active.EntityAccountId ||
        active.entityAccountId ||
        entities.find(e => String(e.id) === String(active.id) && e.type === active.type)?.EntityAccountId ||
        entities[0]?.EntityAccountId ||
        null;
      
      if (!currentUserEntityId) {
        setUnreadMessageCount(0);
        return;
      }
      
      const res = await messageApi.getUnreadCount(currentUserEntityId);
      if (res.success && res.data) {
        setUnreadMessageCount(res.data.totalUnreadCount || 0);
      }
    } catch (error) {
      console.error("[BarHeader] Error fetching unread message count:", error);
    }
  };

  useEffect(() => {
    fetchUnreadNotificationCount();
    const interval = setInterval(fetchUnreadNotificationCount, 60000);
    
    // Listen for notification refresh events (e.g., when someone follows)
    const handleNotificationRefresh = () => {
      fetchUnreadNotificationCount();
    };
    
    const win = (typeof window !== "undefined") ? window : null;
    if (win) {
      win.addEventListener("notificationRefresh", handleNotificationRefresh);
    }
    
    return () => {
      clearInterval(interval);
      if (win) {
        win.removeEventListener("notificationRefresh", handleNotificationRefresh);
      }
    };
  }, []);

  // Fetch unread message count on mount and periodically
  useEffect(() => {
    fetchUnreadMessageCount();
    const interval = setInterval(fetchUnreadMessageCount, 60000);
    
    // Listen for message refresh events (e.g., when new messages arrive)
    const handleMessageRefresh = () => {
      fetchUnreadMessageCount();
    };
    
    // eslint-disable-next-line no-undef
    const win = typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : null);
    if (win) {
      win.addEventListener("messageRefresh", handleMessageRefresh);
    }
    
    return () => {
      clearInterval(interval);
      if (win) {
        win.removeEventListener("messageRefresh", handleMessageRefresh);
      }
    };
  }, []);
  
  // Join socket room and realtime updates for bar/dj/dancer headers
  useEffect(() => {
    if (!socket || !isConnected) return;
    try {
      const session = getSession();
      if (!session) return;
      const active = getActiveEntity() || {};
      const entities = getEntities();
      let entityAccountId = active.EntityAccountId || active.entityAccountId || null;
      if (!entityAccountId && active.id && active.type) {
        const found = entities.find(
          e => String(e.id) === String(active.id) && (e.type === active.type || (e.type === "BusinessAccount" && active.type === "Business"))
        );
        entityAccountId = found?.EntityAccountId || found?.entityAccountId || null;
      }
      // Join socket room với EntityAccountId (theo NOTIFICATION_FLOW.md)
      // Backend emit với receiverEntityAccountId, nên frontend phải join với EntityAccountId
      if (entityAccountId) {
        socket.emit("join", String(entityAccountId));
        console.log("[BarHeader] Joined socket room with EntityAccountId:", entityAccountId);
      } else {
        // Fallback: Join với AccountId chỉ khi không có EntityAccountId (backward compatibility)
        const accountId = active.id || session?.account?.id || null;
        if (accountId) {
          socket.emit("join", String(accountId));
          console.log("[BarHeader] Joined socket room with AccountId (fallback):", accountId);
        }
      }
    } catch {}

    const onNewNotification = () => {
      // Recompute from API so we exclude Messages
      fetchUnreadNotificationCount();
    };
    const onNewMessage = () => {
      fetchUnreadMessageCount();
    };

    socket.on("new_notification", onNewNotification);
    socket.on("new_message", onNewMessage);
    return () => {
      socket.off("new_notification", onNewNotification);
      socket.off("new_message", onNewMessage);
    };
  }, [socket, isConnected]);

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
        "backdrop-blur-sm",
        "sm:h-14 sm:px-3 md:h-16 md:px-4 lg:px-8"
      )}>
        <div className={cn(
          "flex items-center w-full justify-between mx-auto",
          "max-w-[1400px]",
          "sm:gap-2 md:gap-4"
        )}>
          <Link 
            to={getNewsfeedPath()} 
            className={cn(
              "text-2xl font-bold no-underline",
              "text-primary",
              "transition-opacity duration-200",
              "hover:opacity-80",
              "sm:text-lg sm:flex-shrink-0 md:text-2xl"
            )}
          >
            {t('layout.brandPage')}
          </Link>

          <div className={cn(
            "flex items-center flex-1 max-w-md mx-4",
            "sm:mx-1 sm:max-w-none sm:flex-initial md:mx-4 md:max-w-md md:flex-1"
          )}>
            <GlobalSearch />
          </div>

          <div className={cn("flex gap-2", "sm:gap-1.5 md:gap-2")}>
            <button 
              className={cn(
                "rounded-lg p-2 flex items-center justify-center",
                "transition-all duration-200 cursor-pointer relative",
                "text-muted-foreground",
                "hover:text-primary hover:bg-primary/10",
                "active:scale-95",
                "sm:p-1.5 md:p-2"
              )}
              onClick={() => navigate(getNewsfeedPath())}
            >
              <Home size={24} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
            <button 
              className={cn(
                "rounded-lg p-2 flex items-center justify-center",
                "transition-all duration-200 cursor-pointer relative",
                "text-muted-foreground",
                activePanel === "messages" 
                  ? "text-primary-foreground bg-primary" 
                  : "hover:text-primary hover:bg-primary/10",
                "active:scale-95",
                "sm:p-1.5 md:p-2"
              )}
              onClick={() => togglePanel("messages")}
            >
              <MessageCircle size={24} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
              {unreadMessageCount > 0 && (
                <span className={cn(
                  "absolute -top-1 -right-1 min-w-[18px] h-[18px]",
                  "px-1 flex items-center justify-center",
                  "bg-danger text-primary-foreground rounded-full",
                  "text-[11px] font-semibold leading-none",
                  "border-2 border-card z-10",
                  "shadow-[0_2px_4px_rgba(0,0,0,0.2)]",
                  "sm:min-w-[16px] sm:h-[16px] sm:text-[10px] sm:-top-0.5 sm:-right-0.5",
                  "md:min-w-[18px] md:h-[18px] md:text-[11px] md:-top-1 md:-right-1"
                )}>
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </span>
              )}
            </button>
            
            <button 
              className={cn(
                "rounded-lg p-2 flex items-center justify-center",
                "transition-all duration-200 cursor-pointer relative",
                "text-muted-foreground",
                activePanel === "notifications" 
                  ? "text-primary-foreground bg-primary" 
                  : "hover:text-primary hover:bg-primary/10",
                "active:scale-95",
                "sm:p-1.5 md:p-2"
              )}
              onClick={() => togglePanel("notifications")}
            >
              <Bell size={24} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
              {unreadNotificationCount > 0 && (
                <span className={cn(
                  "absolute -top-1 -right-1 min-w-[18px] h-[18px]",
                  "px-1 flex items-center justify-center",
                  "bg-danger text-primary-foreground rounded-full",
                  "text-[11px] font-semibold leading-none",
                  "border-2 border-card z-10",
                  "shadow-[0_2px_4px_rgba(0,0,0,0.2)]",
                  "sm:min-w-[16px] sm:h-[16px] sm:text-[10px] sm:-top-0.5 sm:-right-0.5",
                  "md:min-w-[18px] md:h-[18px] md:text-[11px] md:-top-1 md:-right-1"
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
                "active:scale-95",
                "sm:p-1.5 md:p-2"
              )}
              onClick={() => togglePanel("user")}
            >
              <User size={24} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
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
          <MessagesPanel 
            conversations={conversations} 
            onClose={() => setActivePanel(null)}
            onUnreadCountChange={(count) => setUnreadMessageCount(count)}
          />
        )}
        {activePanel === "notifications" && (
          <NotificationPanel
            onClose={() => setActivePanel(null)}
            onUnreadCountChange={(count) => setUnreadNotificationCount(count)}
            onOpenModal={(postId, commentId) => {
              setPostModalPostId(postId);
              setPostModalCommentId(commentId);
              setPostModalOpen(true);
              setActivePanel(null); // Close notification panel when opening modal
            }}
          />
        )}
      </DropdownPanel>

      {/* Post Detail Modal */}
      <NotificationToPostModal
        open={postModalOpen}
        postId={postModalPostId}
        commentId={postModalCommentId}
        onClose={() => {
          setPostModalOpen(false);
          setPostModalPostId(null);
          setPostModalCommentId(null);
        }}
      />
    </>
  );
}
