import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useSocket } from "../../../contexts/SocketContext";
import { getSession, getActiveEntity, getEntities } from "../../../utils/sessionManager";
import notificationApi from "../../../api/notificationApi";

import "../../../styles/components/notificationDropdown.css";

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
      const entityAccountId = getEntityAccountId();
      // Use dedicated unread count endpoint
      const resp = await notificationApi.getUnreadCount(entityAccountId);
      if (resp.success) {
        const count = resp.data?.count || 0;
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
      
      // Handle post notifications - open post modal
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


  // Get notification icon based on type (fallback if no avatar)
  const getNotificationIcon = (type) => {
    switch (type) {
      case "Like":
        return "❤️";
      case "Comment":
        return "💬";
      case "Follow":
        return "👤";
      case "Messages":
        return "💌";
      case "Confirm":
        return "✅";
      default:
        return "🔔";
    }
  };



  // Format notification content with translation
  // Backend now stores raw data (sender name only), Frontend translates based on type
  const getNotificationText = (notification) => {
    const { type, content, link, sender } = notification;
    const senderName = sender?.name || "Someone";
    
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

  // Test notification handler
  const handleTestNotification = async (type) => {
    try {
      const response = await notificationApi.createTestNotification(type);
      if (response.success) {
        // Refresh notifications after creating test notification
        await fetchNotifications();
        await fetchUnreadCount();
        console.log(`✅ Test ${type} notification created!`);
      }
    } catch (error) {
      console.error("Error creating test notification:", error);
    }
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
    <>
      {/* Header - Notifications List Header */}
      <div className="notification-header">
      
        {unreadCount > 0 && (
          <button
            className="mark-all-read-btn"
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="notification-list">
        {loading && (
          <div className="notification-loading">
            <p>Loading...</p>
          </div>
        )}
        {!loading && notifications.length === 0 && (
          <div className="notification-empty">
            <Bell size={48} style={{ opacity: 0.3 }} />
            <p>No notifications</p>
          </div>
        )}
        {!loading && notifications.length > 0 && (
          notifications.map((notification) => {
            const isUnread = notification.status === "Unread";
                        const senderAvatar = notification.sender?.avatar;
            return (
              <button
                key={notification._id}
                type="button"
                className={`notification-item ${isUnread ? "unread" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-avatar">
                  {senderAvatar ? (
                    <img 
                      src={senderAvatar} 
                      alt="avatar" 
                      className="notification-avatar-img"
                      onError={(e) => {
                        // Fallback to icon if image fails to load
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  {!senderAvatar && (
                    <span className="notification-avatar-icon">
                      {getNotificationIcon(notification.type)}
                    </span>
                  )}
                </div>
                <div className="notification-content">
                  <p className="notification-text">
                    {getNotificationText(notification)}
                  </p>
                  <span className="notification-time">
                    {getTimeAgo(notification.createdAt)}
                  </span>
                </div>
                {isUnread && (
                  <div className="notification-dot"></div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="notification-footer">
        <button
          className="view-all-btn"
          onClick={() => {
            navigate("/notifications");
            onClose?.();
          }}
        >
          View all notifications
        </button>
        
        {/* Test Buttons - Only for development/testing */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            marginTop: '10px', 
            paddingTop: '10px', 
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '5px'
          }}>
            <button
              onClick={() => handleTestNotification('Like')}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Test Like
            </button>
            <button
              onClick={() => handleTestNotification('Comment')}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Test Comment
            </button>
            <button
              onClick={() => handleTestNotification('Follow')}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Test Follow
            </button>
            <button
              onClick={() => handleTestNotification('Messages')}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Test Message
            </button>
            <button
              onClick={() => handleTestNotification('Confirm')}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Test Confirm
            </button>
          </div>
        )}
      </div>
    </>
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

