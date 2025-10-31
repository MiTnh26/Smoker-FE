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
          (notif) => notif["Trạng Thái"] === "Chưa Đọc"
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
            ? { ...notif, "Trạng Thái": "Đã Đọc" }
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
        prev.map((notif) => ({ ...notif, "Trạng Thái": "Đã Đọc" }))
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
    if (notification["Trạng Thái"] === "Chưa Đọc") {
      handleMarkAsRead(notification._id);
    }

    // Navigate to the link if available
    if (notification["Đường dẫn"]) {
      navigate(notification["Đường dẫn"]);
    }
    onClose?.();
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case "Thích":
        return "❤️";
      case "Bình Luận":
        return "💬";
      case "Theo Dõi":
        return "👤";
      case "Chia Sẻ":
        return "↗️";
      case "Tag":
        return "🏷️";
      case "Mention":
        return "@";
      default:
        return "🔔";
    }
  };

  // Get notification text preview
  const getNotificationText = (notification) => {
    const content = notification["Nội Dung"] || "Bạn có thông báo mới";
    if (content.length > 80) {
      return `${content.substring(0, 80)}...`;
    }
    return content;
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
        <h3>Thông báo</h3>
        {unreadCount > 0 && (
          <button
            className="mark-all-read-btn"
            onClick={handleMarkAllAsRead}
          >
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="notification-list">
        {loading && (
          <div className="notification-loading">
            <p>Đang tải...</p>
          </div>
        )}
        {!loading && notifications.length === 0 && (
          <div className="notification-empty">
            <Bell size={48} style={{ opacity: 0.3 }} />
            <p>Không có thông báo</p>
          </div>
        )}
        {!loading && notifications.length > 0 && (
          notifications.map((notification) => {
            const isUnread = notification["Trạng Thái"] === "Chưa Đọc";
            return (
              <button
                key={notification._id}
                type="button"
                className={`notification-item ${isUnread ? "unread" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-avatar">
                  {getNotificationIcon(notification["Loại Thông Báo"])}
                </div>
                <div className="notification-content">
                  <p className="notification-text">
                    {getNotificationText(notification)}
                  </p>
                  <span className="notification-time">
                    {new Date(notification.createdAt || notification["Gửi Lúc"]).toLocaleString("vi-VN")}
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
          Xem tất cả thông báo
        </button>
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

