import { Link, useNavigate } from "react-router-dom";
import { Home, MessageCircle, User, Search, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSocket } from "../../../contexts/SocketContext";
import { getSession, getActiveEntity, getEntities } from "../../../utils/sessionManager";
import UnifiedMenu from "../../common/UnifiedMenu";
import MessagesPanel from "../common/MessagesPanel";
import NotificationPanel from "../common/NotificationPanel";
import PostDetailModal from "../../../modules/feeds/components/modals/PostDetailModal";
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

  // Get entityAccountId from session
  const getEntityAccountId = () => {
    try {
      const active = getActiveEntity() || {};
      const entities = getEntities();
      let entityAccountId = active.EntityAccountId || active.entityAccountId || null;
      if (!entityAccountId && active.id && active.type) {
        const foundEntity = entities.find(
          e => String(e.id) === String(active.id) &&
            (e.type === active.type ||
              (e.type === "BusinessAccount" && active.type === "Business"))
        );
        entityAccountId = foundEntity?.EntityAccountId || foundEntity?.entityAccountId || null;
      }
      return entityAccountId;
    } catch (error) {
      console.warn("[CustomerHeader] Error getting entityAccountId:", error);
      return null;
    }
  };

  // Fetch unread notification count (exclude Messages type)
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

      const res = await messageApi.getUnreadCount(currentUserEntityId);
      if (res.success && res.data) {
        setUnreadMessageCount(res.data.totalUnreadCount || 0);
      } else {
        setUnreadMessageCount(0);
      }
    } catch (error) {
      console.error("[CustomerHeader] Error fetching unread message count:", error);
      setUnreadMessageCount(0);
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

    // Join socket room với EntityAccountId (theo NOTIFICATION_FLOW.md)
    // Backend emit với receiverEntityAccountId, nên frontend phải join với EntityAccountId
    if (entityAccountId) {
      socket.emit("join", String(entityAccountId));
    } else {
      // Fallback: Join với AccountId chỉ khi không có EntityAccountId (backward compatibility)
      const accountId = active.id || session.account?.id || null;
      if (accountId) {
        socket.emit("join", String(accountId));
      }
    }

    // Listen for new notifications to update unread notification count ONLY (exclude Messages)
    const handleNewNotification = () => {
      // Always recalc from API to ensure we exclude type === "Messages"
      fetchUnreadNotificationCount();
    };

    socket.on("new_notification", handleNewNotification);

    // Also set up an interval as a fallback
    const interval = setInterval(fetchUnreadNotificationCount, 60000);

    // Initial fetch
    fetchUnreadNotificationCount();

    return () => {
      socket.off("new_notification", handleNewNotification);
      clearInterval(interval);
    };
  }, [socket, isConnected]);

  // Fetch unread message count on mount and periodically
  useEffect(() => {
    if (!socket || !isConnected) return;

    fetchUnreadMessageCount();

    const interval = setInterval(() => {
      fetchUnreadMessageCount();
    }, 60000); // Update every 60 seconds

    // Listen for message refresh events (e.g., when new messages arrive)
    const handleMessageRefresh = () => {
      fetchUnreadMessageCount();
    };

    // Listen for new_message socket event to update message count in real-time
    const handleNewMessage = () => {
      fetchUnreadMessageCount();
    };

    // Listen for message_notification_created event
    const handleMessageNotificationCreated = () => {
      fetchUnreadMessageCount();
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_notification_created", handleMessageNotificationCreated);

    // eslint-disable-next-line no-undef
    const win = typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : null);
    if (win) {
      win.addEventListener("messageRefresh", handleMessageRefresh);
    }

    return () => {
      clearInterval(interval);
      socket.off("new_message", handleNewMessage);
      socket.off("message_notification_created", handleMessageNotificationCreated);
      if (win) {
        win.removeEventListener("messageRefresh", handleMessageRefresh);
      }
    };
  }, [socket, isConnected]);

  const togglePanel = (panel) => {
    const newPanel = activePanel === panel ? null : panel;
    setActivePanel(newPanel);
  };

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
              "no-underline",
              "transition-opacity duration-200",
              "hover:opacity-80",
              "flex-shrink-0"
            )}
          >

            <img
              src="/13.png"
              alt="Smoker Page"
              className="h-12 w-auto sm:h-6 md:h-12"
            />
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
              setActivePanel(null);
            }}
            onOpenModal={(postId, commentId) => {
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
              setActivePanel(null);
            }}
            menuConfig="customer"
            showBackToAccount={false}
          />
        )}
      </DropdownPanel>

      <PostDetailModal
        open={modalOpen}
        postId={modalPostId}
        commentId={modalCommentId}
        onClose={() => {
          setModalOpen(false);
          setModalPostId(null);
          setModalCommentId(null);
        }}
      />
    </>
  );
}
