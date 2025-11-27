import { Link, useNavigate } from "react-router-dom";
import { Home, MessageCircle, User, Search, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSocket } from "../../../contexts/SocketContext";
import { getSession, getActiveEntity, getEntities } from "../../../utils/sessionManager";
import UnifiedMenu from "../../common/UnifiedMenu";
import MessagesPanel from "../common/MessagesPanel";
import NotificationPanel from "../common/NotificationPanel";
import NotificationToPostModal from "../../../modules/feeds/components/modals/NotificationToPostModal";
import DropdownPanel from "../../common/DropdownPanel";
import { cn } from "../../../utils/cn";
import GlobalSearch from "../common/GlobalSearch";
import notificationApi from "../../../api/notificationApi";
import messageApi from "../../../api/messageApi";

export default function CustomerHeader() {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState(null); // 'notifications' | 'messages' | 'user' | null
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPostId, setModalPostId] = useState(null);
  const [modalCommentId, setModalCommentId] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const { t } = useTranslation();
  const { socket, isConnected } = useSocket();

  // Fetch unread notification count
  const fetchUnreadNotificationCount = async () => {
    try {
      // Get entityAccountId from session
      const session = getSession();
      if (!session) {
        setUnreadNotificationCount(0);
        return;
      }

      const active = getActiveEntity() || {};
      const entities = getEntities();
      
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
      console.error("[CustomerHeader] Error fetching unread notification count:", error);
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
      
      const res = await messageApi.getConversations(currentUserEntityId);
      const conversationsData = res.data?.data || res.data || [];
      
      // Calculate total unread messages
      let totalUnread = 0;
      conversationsData.forEach((conv) => {
        const messages = Object.values(conv["Cuộc Trò Chuyện"] || {});
        if (messages.length > 0) {
          const unread = messages.filter(msg => {
            const senderId = String(msg["Người Gửi"] || "").toLowerCase().trim();
            const currentUserIdNormalized = String(currentUserEntityId).toLowerCase().trim();
            return senderId !== currentUserIdNormalized && !msg["Đã Đọc"];
          }).length;
          totalUnread += unread;
        }
      });
      
      setUnreadMessageCount(totalUnread);
    } catch (error) {
      console.error("[CustomerHeader] Error fetching unread message count:", error);
    }
  };

  // Join socket room and listen for real-time notifications
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Get current user's entityAccountId to join room
    const session = getSession();
    if (!session) return;

    const active = getActiveEntity() || {};
    const entities = getEntities();
    
    // Get EntityAccountId (priority: activeEntity > matching entity > first entity)
    let entityAccountId = active.EntityAccountId || active.entityAccountId || null;
    
    if (!entityAccountId && active.id && active.type) {
      const foundEntity = entities.find(
        e => String(e.id) === String(active.id) && 
             (e.type === active.type || 
              (e.type === "BusinessAccount" && active.type === "Business"))
      );
      entityAccountId = foundEntity?.EntityAccountId || foundEntity?.entityAccountId || null;
    }
    
    // Fallback to AccountId if no EntityAccountId
    const userId = entityAccountId || active.id || session.account?.id || null;
    
    if (userId) {
      // Join room with userId (entityAccountId or AccountId)
      socket.emit("join", String(userId));
      console.log("[CustomerHeader] Joined socket room:", userId);
    }

    // Listen for new notifications to update unread count
    const handleNewNotification = (data) => {
      console.log("[CustomerHeader] Received new notification:", data);
      
      // Update unread count from socket event
      if (data.unreadCount !== undefined) {
        setUnreadNotificationCount(data.unreadCount);
      } else {
        // Fallback: fetch unread count
        fetchUnreadNotificationCount();
      }
    };

    socket.on("new_notification", handleNewNotification);

    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket, isConnected]);

  // Fetch unread notification count on mount and periodically
  useEffect(() => {
    fetchUnreadNotificationCount();
    
    const interval = setInterval(() => {
      fetchUnreadNotificationCount();
    }, 60000); // Update every 60 seconds
    
    // Listen for notification refresh events (e.g., when someone follows)
    const handleNotificationRefresh = () => {
      fetchUnreadNotificationCount();
    };
    
    // eslint-disable-next-line no-undef
    const win = typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : null);
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
    
    const interval = setInterval(() => {
      fetchUnreadMessageCount();
    }, 60000); // Update every 60 seconds
    
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

  const togglePanel = (panel) => {
    console.log("[CustomerHeader] Toggling panel:", panel, "Current:", activePanel);
    const newPanel = activePanel === panel ? null : panel;
    console.log("[CustomerHeader] New activePanel:", newPanel);
    setActivePanel(newPanel);
  };

  // Debug activePanel
  console.log("[CustomerHeader] Current activePanel:", activePanel);
  console.log("[CustomerHeader] Panel should be open:", !!activePanel);

  return (
    <>
      <header className={cn(
        "h-16 flex items-center px-4 md:px-8 sticky top-0 z-50",
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
            to="/customer/newsfeed" 
            className={cn(
              "text-2xl font-bold no-underline",
              "text-primary",
              "transition-opacity duration-200",
              "hover:opacity-80",
              "sm:text-lg sm:flex-shrink-0 md:text-2xl"
            )}
          >
            {t('layout.brand')}
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
              onClick={() => navigate("/customer/newsfeed")}
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
              onClick={() => {
                console.log("[CustomerHeader] Message button clicked!");
                togglePanel("messages");
              }}
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

            {/* Notification Button */}
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
              onClick={() => {
                console.log("[CustomerHeader] Notification button clicked!");
                togglePanel("notifications");
              }}
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
              onClick={() => {
                console.log("[CustomerHeader] User button clicked!");
                togglePanel("user");
              }}
            >
              <User size={24} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>
      </header>

      <DropdownPanel
        isOpen={!!activePanel}
        onClose={() => {
          console.log("[CustomerHeader] Closing panel");
          setActivePanel(null);
        }}
        title={(() => {
          if (activePanel === "user") return t('layout.userMenu');
          if (activePanel === "messages") return t('layout.messages');
          if (activePanel === "notifications") return t('layout.notifications');
          return "";
        })()}
      >
        {activePanel === "notifications" && (
          <NotificationPanel
            onClose={() => {
              console.log("[CustomerHeader] NotificationPanel onClose");
              setActivePanel(null);
            }}
            onOpenModal={(postId, commentId) => {
              console.log("[CustomerHeader] Opening modal from NotificationPanel:", postId, commentId);
              setModalPostId(postId);
              setModalCommentId(commentId);
              setModalOpen(true);
              setActivePanel(null); // Close notification panel
            }}
            onUnreadCountChange={(count) => {
              setUnreadNotificationCount(count);
            }}
          />
        )}
        {activePanel === "messages" && (
          <MessagesPanel
            onClose={() => {
              console.log("[CustomerHeader] MessagesPanel onClose");
              setActivePanel(null);
            }}
            onUnreadCountChange={(count) => {
              setUnreadMessageCount(count);
            }}
          />
        )}
        {activePanel === "user" && (
          <UnifiedMenu
            onClose={() => {
              console.log("[CustomerHeader] UnifiedMenu onClose");
              setActivePanel(null);
            }}
            menuConfig="customer"
            showBackToAccount={false}
          />
        )}
      </DropdownPanel>

      {/* Notification to Post Modal - rendered at header level to persist */}
      <NotificationToPostModal
        open={modalOpen}
        postId={modalPostId}
        commentId={modalCommentId}
        onClose={() => {
          console.log("[CustomerHeader] Closing modal");
          setModalOpen(false);
          setModalPostId(null);
          setModalCommentId(null);
        }}
      />
    </>
  );
}
