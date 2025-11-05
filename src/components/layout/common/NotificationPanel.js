import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import PropTypes from "prop-types";
import notificationApi from "../../../api/notificationApi";
import "../../../styles/components/notificationDropdown.css";

export default function NotificationPanel({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationApi.getNotifications({ limit: 20 });
      if (response.success) {
        setNotifications(response.data || []);
        // Update unread count from filtered notifications
        const unread = response.data?.filter(
          (notif) => notif.status === "Unread"
        ).length || 0;
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
      const response = await notificationApi.getUnreadCount();
      if (response.success && response.data) {
        setUnreadCount(response.data.count || 0);
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
  const handleNotificationClick = (notification) => {
    if (notification.status === "Unread") {
      handleMarkAsRead(notification._id);
    }

    // Navigate to the link if available
    if (notification.link) {
      navigate(notification.link);
    }
    onClose?.();
  };

  // Get notification icon based on type
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
            return (
              <button
                key={notification._id}
                type="button"
                className={`notification-item ${isUnread ? "unread" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-avatar">
                  {getNotificationIcon(notification.type)}
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
};

NotificationPanel.defaultProps = {
  onClose: () => {},
};

