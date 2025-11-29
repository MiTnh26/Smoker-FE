import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MoreHorizontal, ArrowLeft, Heart, MessageCircle, UserPlus, Mail, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSocket } from "../../../contexts/SocketContext";
import { getSession, getActiveEntity, getEntities } from "../../../utils/sessionManager";
import notificationApi from "../../../api/notificationApi";
import { cn } from "../../../utils/cn";

export default function NotificationsPage({ onOpenModal }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("All"); // "All" or "Unread"
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const { t } = useTranslation();

  // Get entityAccountId from session
  const getEntityAccountId = () => {
    try {
      const activeEntity = getActiveEntity();
      return activeEntity?.EntityAccountId || activeEntity?.entityAccountId || null;
    } catch (error) {
      console.warn("[NotificationsPage] Error getting entityAccountId:", error);
      return null;
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const entityAccountId = getEntityAccountId();
      const response = await notificationApi.getNotifications({ 
        limit: 100, // Get more notifications for full page
        ...(entityAccountId && { entityAccountId })
      });
      if (response.success) {
        const notifs = response.data || [];
        setNotifications(notifs);
        
        const unread = notifs.filter((notif) => notif.status === "Unread").length || 0;
        setUnreadCount(unread);
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
      fetchUnreadCount();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    // Mark as read first
    if (notification.status === "Unread") {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notification._id
            ? { ...notif, status: "Read" }
            : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      handleMarkAsRead(notification._id).catch((error) => {
        console.error("Error marking notification as read:", error);
        fetchUnreadCount();
      });
    }

    // Handle different link formats
    if (notification.link) {
      let targetPath = notification.link;
      
      // Handle post notifications - open post modal
      if (targetPath.startsWith('/posts/')) {
        const urlParts = targetPath.split('?');
        const pathPart = urlParts[0];
        const queryPart = urlParts[1];
        
        const id = pathPart.split('/').pop();
        let commentId = null;
        
        if (queryPart) {
          const params = new URLSearchParams(queryPart);
          commentId = params.get('commentId');
        }
        
        if (onOpenModal) {
          onOpenModal(id, commentId);
        }
        return;
      }
      
      // Handle story notifications
      if (targetPath.startsWith('/stories/')) {
        setTimeout(() => {
          navigate(targetPath);
        }, 100);
        return;
      }
      
      // For other links, navigate normally
      setTimeout(() => {
        navigate(targetPath);
      }, 100);
    }
  };

  // Get notification icon component based on type
  const getNotificationIcon = (type, size = 10) => {
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
  const getNotificationText = (notification) => {
    const { type, content, link, sender } = notification;
    const senderName = sender?.name || "Someone";
    
    const hasPreview = content && content.includes(":");
    
    switch (type) {
      case "Like":
        const isStory = link && link.startsWith("/stories/");
        if (isStory) {
          return t("notifications.likedYourStory", { name: senderName });
        }
        return t("notifications.likedYourPost", { name: senderName });
        
      case "Comment":
        const isReply = link && link.includes("commentId=");
        if (isReply) {
          return t("notifications.repliedToYourComment", { name: senderName });
        }
        return t("notifications.commentedOnYourPost", { name: senderName });
        
      case "Follow":
        return t("notifications.startedFollowingYou", { name: senderName });
        
      case "Messages":
        if (hasPreview) {
          const parts = content.split(":");
          const name = parts[0] || senderName;
          const preview = parts.slice(1).join(":").trim();
          return t("notifications.sentYouAMessageWithPreview", { 
            name, 
            preview: preview.length > 50 ? preview.substring(0, 50) + "..." : preview 
          });
        } else {
          return t("notifications.sentYouAMessage", { name: senderName });
        }
        
      default:
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

  // Filter notifications based on active tab
  const filteredNotifications = activeTab === "Unread" 
    ? notifications.filter(n => n.status === "Unread")
    : notifications;

  // Separate notifications into "New" (unread) and "Earlier" (read)
  const newNotifications = filteredNotifications.filter(n => n.status === "Unread");
  const earlierNotifications = filteredNotifications.filter(n => n.status === "Read");

  // Join socket room and listen for real-time notifications
  useEffect(() => {
    if (!socket || !isConnected) return;

    const session = getSession();
    if (!session) return;

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
    
    if (entityAccountId) {
      socket.emit("join", String(entityAccountId));
    } else {
      const accountId = active.id || session.account?.id || null;
      if (accountId) {
        socket.emit("join", String(accountId));
      }
    }

    const handleNewNotification = (data) => {
      if (data.notification && data.notification.type === "Messages") {
        return;
      }
      
      if (data.notification) {
        setNotifications((prev) => [data.notification, ...prev]);
      }
      
      if (data.unreadCount !== undefined) {
        setUnreadCount(data.unreadCount);
      } else {
        fetchUnreadCount();
      }
    };

    socket.on("new_notification", handleNewNotification);

    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket, isConnected]);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  return (
    <div className={cn("w-full max-w-[680px] mx-auto bg-background min-h-screen flex flex-col")}>
      {/* Header */}
      <div className={cn("sticky top-0 z-10 bg-card border-b border-border px-4 py-3")}>
        <div className={cn("flex items-center justify-between mb-3")}>
          <button
            onClick={() => navigate(-1)}
            className={cn(
              "bg-transparent border-none text-foreground cursor-pointer p-2 rounded-full",
              "flex items-center justify-center transition-colors",
              "hover:bg-muted"
            )}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className={cn("text-xl font-bold text-foreground m-0")}>Notifications</h1>
          <button
            className={cn(
              "bg-transparent border-none text-foreground cursor-pointer p-2 rounded-full",
              "flex items-center justify-center transition-colors",
              "hover:bg-muted"
            )}
            aria-label="More options"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className={cn("flex gap-0 border-b border-border")}>
          <button
            className={cn(
              "flex-1 px-4 py-3 bg-transparent border-none text-muted-foreground",
              "text-[15px] font-semibold cursor-pointer relative transition-colors",
              "hover:text-foreground hover:bg-muted",
              activeTab === "All" && "text-primary",
              activeTab === "All" && "after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[3px] after:bg-primary after:rounded-t-[3px]"
            )}
            onClick={() => setActiveTab("All")}
          >
            All
          </button>
          <button
            className={cn(
              "flex-1 px-4 py-3 bg-transparent border-none text-muted-foreground",
              "text-[15px] font-semibold cursor-pointer relative transition-colors",
              "hover:text-foreground hover:bg-muted",
              activeTab === "Unread" && "text-primary",
              activeTab === "Unread" && "after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[3px] after:bg-primary after:rounded-t-[3px]"
            )}
            onClick={() => setActiveTab("Unread")}
          >
            Unread
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={cn("flex-1 overflow-y-auto py-2")}>
        {loading && (
          <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-muted-foreground")}>
            <p>Loading...</p>
          </div>
        )}

        {!loading && filteredNotifications.length === 0 && (
          <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-muted-foreground")}>
            <Bell size={48} className="opacity-30" />
            <p className="mt-4 text-[15px]">No notifications</p>
          </div>
        )}

        {!loading && filteredNotifications.length > 0 && (
          <>
            {/* New Section */}
            {newNotifications.length > 0 && (
              <div className={cn("mb-6")}>
                <h2 className={cn("text-[13px] font-semibold text-muted-foreground uppercase px-4 py-2 m-0 tracking-wide")}>
                  New
                </h2>
                <div className={cn("flex flex-col")}>
                  {newNotifications.map((notification) => {
                    const senderAvatar = notification.sender?.avatar;
                    return (
                      <button
                        key={notification._id}
                        type="button"
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 bg-transparent border-none w-full text-left cursor-pointer",
                          "transition-colors hover:bg-muted relative",
                          "bg-primary/5 hover:bg-primary/10"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className={cn("relative flex-shrink-0 w-10 h-10")}>
                          {senderAvatar ? (
                            <>
                              <img 
                                src={senderAvatar} 
                                alt="avatar" 
                                className={cn("w-10 h-10 rounded-full object-cover")}
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
                          {/* Type icon overlay */}
                          <div className={cn(
                            "absolute bottom-[-2px] right-[-2px] w-[18px] h-[18px] rounded-full",
                            "bg-card border-2 border-background flex items-center justify-center",
                            "shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                          )}>
                            {getNotificationIcon(notification.type, 10)}
                          </div>
                        </div>
                        <div className={cn("flex-1 min-w-0 flex flex-col gap-1")}>
                          <p className={cn("text-[15px] text-foreground m-0 leading-[1.4] break-words")}>
                            {getNotificationText(notification)}
                          </p>
                          <span className={cn("text-[13px] text-muted-foreground")}>
                            {getTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                        <div className={cn("w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5")}></div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Earlier Section */}
            {earlierNotifications.length > 0 && (
              <div className={cn("mb-6")}>
                <h2 className={cn("text-[13px] font-semibold text-muted-foreground uppercase px-4 py-2 m-0 tracking-wide")}>
                  Earlier
                </h2>
                <div className={cn("flex flex-col")}>
                  {earlierNotifications.map((notification) => {
                    const senderAvatar = notification.sender?.avatar;
                    return (
                      <button
                        key={notification._id}
                        type="button"
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 bg-transparent border-none w-full text-left cursor-pointer",
                          "transition-colors hover:bg-muted"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className={cn("relative flex-shrink-0 w-10 h-10")}>
                          {senderAvatar ? (
                            <>
                              <img 
                                src={senderAvatar} 
                                alt="avatar" 
                                className={cn("w-10 h-10 rounded-full object-cover")}
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
                          {/* Type icon overlay */}
                          <div className={cn(
                            "absolute bottom-[-2px] right-[-2px] w-[18px] h-[18px] rounded-full",
                            "bg-card border-2 border-background flex items-center justify-center",
                            "shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                          )}>
                            {getNotificationIcon(notification.type, 10)}
                          </div>
                        </div>
                        <div className={cn("flex-1 min-w-0 flex flex-col gap-1")}>
                          <p className={cn("text-[15px] text-foreground m-0 leading-[1.4] break-words")}>
                            {getNotificationText(notification)}
                          </p>
                          <span className={cn("text-[13px] text-muted-foreground")}>
                            {getTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer - Mark all as read button */}
      {unreadCount > 0 && (
        <div className={cn("sticky bottom-0 px-4 py-3 bg-card border-t border-border flex justify-center")}>
          <button
            className={cn(
              "px-4 py-2 bg-primary text-primary-foreground border-none rounded-md",
              "text-[15px] font-semibold cursor-pointer transition-opacity",
              "hover:opacity-90"
            )}
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
}

