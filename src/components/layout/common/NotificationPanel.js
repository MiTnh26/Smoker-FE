import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import PropTypes from "prop-types";
import notificationApi from "../../../api/notificationApi";
import publicProfileApi from "../../../api/publicProfileApi";
import "../../../styles/components/notificationDropdown.css";

export default function NotificationPanel({ onClose, onOpenModal, onUnreadCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [senderAvatars, setSenderAvatars] = useState({}); // Cache avatars by senderEntityAccountId
  const navigate = useNavigate();

  // Fetch avatar for a sender
  const fetchSenderAvatar = async (senderEntityAccountId) => {
    if (!senderEntityAccountId || senderAvatars[senderEntityAccountId]) {
      return; // Already cached or no entityAccountId
    }
    
    try {
      const response = await publicProfileApi.getByEntityId(senderEntityAccountId);
      if (response?.success && response.data) {
        const avatar = response.data.avatar || response.data.Avatar || null;
        if (avatar) {
          setSenderAvatars(prev => ({
            ...prev,
            [senderEntityAccountId]: avatar
          }));
        }
      }
    } catch (error) {
      console.warn(`[NotificationPanel] Failed to fetch avatar for ${senderEntityAccountId}:`, error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationApi.getNotifications({ limit: 20 });
      if (response.success) {
        const notifs = response.data || [];
        setNotifications(notifs);
        
        // Fetch avatars for all unique senders
        const uniqueSenders = [...new Set(notifs.map(n => n.senderEntityAccountId).filter(Boolean))];
        uniqueSenders.forEach(senderId => {
          fetchSenderAvatar(senderId);
        });
        
        // Update unread count from filtered notifications
        const unread = notifs.filter(
          (notif) => notif.status === "Unread"
        ).length || 0;
        setUnreadCount(unread);
        // Notify parent of unread count change
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
      const response = await notificationApi.getUnreadCount();
      if (response.success && response.data) {
        const count = response.data.count || 0;
        setUnreadCount(count);
        // Notify parent of unread count change
        if (onUnreadCountChange) {
          onUnreadCountChange(count);
        }
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationApi.markAsRead(notificationId);
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
      await notificationApi.markAllAsRead();
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
    
    // Mark as read first
    if (notification.status === "Unread") {
      await handleMarkAsRead(notification._id);
    }

    // Close panel first
    onClose?.();

    // Handle different link formats
    if (notification.link) {
      let targetPath = notification.link;
      
      // If link is /posts/:postId or /stories/:storyId, open modal instead of navigating
      if (targetPath.startsWith('/posts/') || targetPath.startsWith('/stories/')) {
        // Extract post/story ID and commentId (if any) from link
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
        
        console.log('[NotificationPanel] Opening modal with postId:', id, 'commentId:', commentId);
        
        // Call parent's onOpenModal if provided
        if (onOpenModal) {
          onOpenModal(id, commentId);
        }
        
        return; // Don't navigate
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

  // Get avatar for notification sender
  const getSenderAvatar = (notification) => {
    const senderId = notification.senderEntityAccountId;
    if (senderId && senderAvatars[senderId]) {
      return senderAvatars[senderId];
    }
    return null;
  };

  // Get notification text preview
  const getNotificationText = (notification) => {
    const content = notification.content || "You have a new notification";
    if (content.length > 80) {
      return `${content.substring(0, 80)}...`;
    }
    return content;
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

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    
    // Update unread count every 60 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 60000);

    return () => clearInterval(interval);
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
            const senderAvatar = getSenderAvatar(notification);
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

