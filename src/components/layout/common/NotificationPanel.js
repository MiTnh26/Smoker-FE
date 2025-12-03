import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, MessageCircle, UserPlus, Mail, CheckCircle } from "lucide-react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useSocket } from "../../../contexts/SocketContext";
import { getSession, getActiveEntity, getEntities } from "../../../utils/sessionManager";
import notificationApi from "../../../api/notificationApi";
import { cn } from "../../../utils/cn";

export default function NotificationPanel({ onClose, onOpenModal, onUnreadCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const { t } = useTranslation();

  // Get entityAccountId from session
  const getEntityAccountId = () => {
    try {
      const activeEntity = getActiveEntity();
      return activeEntity?.EntityAccountId || activeEntity?.entityAccountId || null;
    } catch (error) {
      console.warn("[NotificationPanel] Error getting entityAccountId:", error);
      return null;
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const entityAccountId = getEntityAccountId();
      const response = await notificationApi.getNotifications({ 
        limit: 50,
        ...(entityAccountId && { entityAccountId })
      });
      if (response.success) {
        const notifs = response.data || [];
        setNotifications(notifs);
        
        const unread = notifs.filter((notif) => notif.status === "Unread").length || 0;
        setUnreadCount(unread);
        if (onUnreadCountChange) {
          onUnreadCountChange(unread);
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count separately
  const fetchUnreadCount = async () => {
    try {
      // Get entityAccountId from session
      const session = getSession();
      if (!session) {
        setUnreadCount(0);
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
        setUnreadCount(0);
        return;
      }

      const response = await notificationApi.getUnreadCount(entityAccountId);
      if (response.success && response.data) {
        const count = response.data.count || 0;
        setUnreadCount(count);
        if (onUnreadCountChange) onUnreadCountChange(count);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      const entityAccountId = getEntityAccountId();
      await notificationApi.markAsRead(notificationId, entityAccountId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId
            ? { ...notif, status: "Read" }
            : notif
        )
      );
      // Update unread count from server
      fetchUnreadCount();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const entityAccountId = getEntityAccountId();
      await notificationApi.markAllAsRead(entityAccountId);
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, status: "Read" }))
      );
      setUnreadCount(0);
      // Update from server to be sure
      fetchUnreadCount();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    console.log('[NotificationPanel] Clicked notification:', notification);
    
    // Mark as read first (optimistically update UI, then sync with server)
    if (notification.status === "Unread") {
      // Optimistically update UI immediately
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notification._id
            ? { ...notif, status: "Read" }
            : notif
        )
      );
      // Update unread count optimistically
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (onUnreadCountChange) {
        onUnreadCountChange(Math.max(0, unreadCount - 1));
      }
      
      // Then sync with server (don't await to avoid blocking navigation)
      handleMarkAsRead(notification._id).catch((error) => {
        console.error("Error marking notification as read:", error);
        // Revert optimistic update on error
        setNotifications((prev) =>
          prev.map((notif) =>
            notif._id === notification._id
              ? { ...notif, status: "Unread" }
              : notif
          )
        );
        fetchUnreadCount(); // Re-fetch to get correct count
      });
    }

    // Close panel first
    onClose?.();

    // If this is a message notification, immediately refresh the message badge
    try {
      if (notification.type === "Messages") {
        const win = (typeof window !== "undefined") ? window : null;
        win?.dispatchEvent(new Event("messageRefresh"));
      }
    } catch {}

    // Handle different link formats (like Facebook)
    if (notification.link) {
      let targetPath = notification.link;
      
      // Handle post notifications
      if (targetPath.startsWith('/posts/')) {
        // Extract post ID and commentId (if any) from link
        const urlParts = targetPath.split('?');
        const pathPart = urlParts[0];
        const queryPart = urlParts[1];
        
        const id = pathPart.split('/').pop();
        let commentId = null;
        
        // Parse commentId from query string if present
        if (queryPart) {
          const params = new URLSearchParams(queryPart);
          commentId = params.get('commentId');
        }
        
        console.log('[NotificationPanel] Opening post modal with postId:', id, 'commentId:', commentId);
        
        // Call parent's onOpenModal if provided
        if (onOpenModal) {
          onOpenModal(id, commentId);
        }
        
        return; // Don't navigate
      }
      
      // Handle story notifications - navigate to story page (not post modal)
      if (targetPath.startsWith('/stories/')) {
        console.log('[NotificationPanel] Navigating to story page:', targetPath);
        // Navigate to story page (like Facebook)
        setTimeout(() => {
          navigate(targetPath);
        }, 100);
        return; // Don't open post modal
      }
      
      // For other links, navigate normally
      setTimeout(() => {
        navigate(targetPath);
      }, 100);
    } else {
      console.warn('[NotificationPanel] Notification has no link:', notification);
    }
  };


  // Get notification icon component based on type
  const getNotificationIcon = (type, size = 20) => {
    switch (type) {
      case "Like":
        return <Heart size={size} className="text-red-500 fill-red-500" />;
      case "Comment":
        return <MessageCircle size={size} className="text-blue-500" />;
      case "Follow":
        return <UserPlus size={size} className="text-primary" />;
      case "Messages":
        return <Mail size={size} className="text-primary" />;
      case "Confirm":
        return <CheckCircle size={size} className="text-success" />;
      default:
        return <Bell size={size} className="text-muted-foreground" />;
    }
  };



  // Format notification content with translation
  // Backend now stores raw data (sender name only), Frontend translates based on type
  const getNotificationText = (notification) => {
    const { type, content, link, sender, isAnonymous } = notification;
    // Use "Ai đó" for anonymous notifications, otherwise use sender name
    const senderName = isAnonymous ? "Ai đó" : (sender?.name || "Someone");
    
    // Check if content contains ":" (old format with message preview)
    const hasPreview = content && content.includes(":");
    
    switch (type) {
      case "Like":
        // Check if it's a story by checking link
        const isStory = link && link.startsWith("/stories/");
        if (isStory) {
          return t("notifications.likedYourStory", { name: senderName });
        }
        return t("notifications.likedYourPost", { name: senderName });
        
      case "Comment":
        // Check if it's a reply (has commentId in link)
        const isReply = link && link.includes("commentId=");
        if (isReply) {
          return t("notifications.repliedToYourComment", { name: senderName });
        }
        return t("notifications.commentedOnYourPost", { name: senderName });
        
      case "Follow":
        return t("notifications.startedFollowingYou", { name: senderName });
        
      case "Messages":
        if (hasPreview) {
          // Old format: "John: Hello..." or new format with preview
          const parts = content.split(":");
          const name = parts[0] || senderName;
          const preview = parts.slice(1).join(":").trim();
          return t("notifications.sentYouAMessageWithPreview", { 
            name, 
            preview: preview.length > 50 ? preview.substring(0, 50) + "..." : preview 
          });
        } else {
          // New format: just sender name
          return t("notifications.sentYouAMessage", { name: senderName });
        }
        
      default:
        // Fallback for old notifications or unknown types
        if (content && content.length > 80) {
      return `${content.substring(0, 80)}...`;
    }
        return content || t("notifications.default");
    }
  };

  // Format time ago
  const getTimeAgo = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now - notificationDate) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return notificationDate.toLocaleDateString();
  };

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Join socket room and listen for real-time notifications
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Get current user's entityAccountId to join room
    const session = getSession();
    if (!session) return;

    const active = getActiveEntity() || {};
    const entities = getEntities();
    
    // Get EntityAccountId (priority: activeEntity > matching entity > first entity)
    // Theo NOTIFICATION_FLOW.md: Socket room phải join với EntityAccountId
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
      console.log("[NotificationPanel] Joined socket room with EntityAccountId:", entityAccountId);
    } else {
      // Fallback: Join với AccountId chỉ khi không có EntityAccountId (backward compatibility)
      const accountId = active.id || session.account?.id || null;
      if (accountId) {
        socket.emit("join", String(accountId));
        console.log("[NotificationPanel] Joined socket room with AccountId (fallback):", accountId);
      }
    }

    // Listen for new notifications
    const handleNewNotification = (data) => {
      console.log("[NotificationPanel] Received new notification:", data);
      
      // Only process non-Messages notifications
      // Messages notifications are handled separately in the messages module
      if (data.notification && data.notification.type === "Messages") {
        console.log("[NotificationPanel] Ignoring Messages notification (handled separately)");
        return;
      }
      
      if (data.notification) {
        // Add new notification to the list (only non-Messages)
        setNotifications((prev) => [data.notification, ...prev]);
        
        // Sender info is now included in the notification object from the socket
      }
      
      // Update unread count (backend already excludes Messages)
      if (data.unreadCount !== undefined) {
        setUnreadCount(data.unreadCount);
        if (onUnreadCountChange) {
          onUnreadCountChange(data.unreadCount);
        }
      } else {
        // Fallback: fetch unread count
        fetchUnreadCount();
      }
    };

    socket.on("new_notification", handleNewNotification);

    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket, isConnected, onUnreadCountChange]);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    
    // Update unread count every 60 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 60000);

    // Listen for notification refresh events (e.g., when someone follows)
    const handleNotificationRefresh = () => {
      fetchUnreadCount();
      fetchNotifications(); // Also refresh the list
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

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("flex flex-col h-full")}>
      {/* Notifications List */}
      <div className={cn(
        "max-h-[500px] overflow-y-auto py-2",
        "scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-muted",
        "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-muted",
        "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar-thumb]:rounded-full",
        "[&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/70"
      )}>
        {loading && (
          <div className={cn("py-10 px-5 text-center text-muted-foreground")}>
            <p className="m-0">Loading...</p>
          </div>
        )}
        {!loading && notifications.length === 0 && (
          <div className={cn("py-10 px-5 text-center text-muted-foreground")}>
            <Bell size={48} className="opacity-30 mb-3 mx-auto" />
            <p className="m-0 text-[15px]">No notifications</p>
          </div>
        )}
        {!loading && notifications.length > 0 && (
          notifications.map((notification) => {
            const isUnread = notification.status === "Unread";
            const isAnonymous = notification.isAnonymous || false;
            // Use anonymous avatar if notification is anonymous, otherwise use sender avatar
            const senderAvatar = isAnonymous ? "/images/an-danh.png" : (notification.sender?.avatar || null);
            return (
              <button
                key={notification._id}
                type="button"
                className={cn(
                  "flex items-start gap-3 px-4 py-3 w-full text-left cursor-pointer transition-colors",
                  "hover:bg-muted relative",
                  isUnread && "bg-primary/5 hover:bg-primary/10"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                {/* Avatar */}
                <div className={cn("relative flex-shrink-0 w-10 h-10 rounded-full overflow-hidden")}>
                  {senderAvatar ? (
                    <>
                      <img 
                        src={senderAvatar} 
                        alt={isAnonymous ? "Ẩn danh" : "avatar"} 
                        className={cn("w-full h-full object-cover rounded-full")}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                      <div className={cn("hidden items-center justify-center w-10 h-10 rounded-full bg-muted")}>
                        {getNotificationIcon(notification.type, 20)}
                      </div>
                    </>
                  ) : (
                    <div className={cn("flex items-center justify-center w-10 h-10 rounded-full bg-muted")}>
                      {getNotificationIcon(notification.type, 20)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className={cn("flex-1 min-w-0")}>
                  <p className={cn("m-0 text-foreground text-[15px] leading-[1.33] break-words")}>
                    {getNotificationText(notification)}
                  </p>
                  <span className={cn("text-muted-foreground text-[13px] mt-1 block")}>
                    {getTimeAgo(notification.createdAt)}
                  </span>
                </div>

                {/* Unread dot */}
                {isUnread && (
                  <div className={cn("absolute right-4 top-4 w-2 h-2 bg-primary rounded-full")}></div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className={cn("px-3 py-3 border-t border-border")}>
        {unreadCount > 0 && (
          <button
            className={cn(
              "w-full bg-transparent border-none text-primary font-semibold cursor-pointer",
              "text-[14px] px-2 py-1 rounded transition-colors hover:bg-muted mb-2"
            )}
            onClick={handleMarkAllAsRead}
          >
            {t("notifications.markAllAsRead", "Đánh dấu tất cả đã đọc")}
          </button>
        )}
        <button
          className={cn(
            "w-full bg-transparent border-none text-primary font-semibold cursor-pointer",
            "text-[15px] px-3 py-3 rounded transition-colors hover:bg-muted"
          )}
          onClick={() => {
            navigate("/notifications");
            onClose?.();
          }}
        >
          {t("notifications.viewAll", "Xem tất cả thông báo")}
        </button>
      </div>
    </div>
  );
}

NotificationPanel.propTypes = {
  onClose: PropTypes.func,
  onOpenModal: PropTypes.func,
  onUnreadCountChange: PropTypes.func,
};

NotificationPanel.defaultProps = {
  onClose: () => {},
  onOpenModal: null,
  onUnreadCountChange: null,
};

