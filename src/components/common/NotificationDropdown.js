import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import PropTypes from "prop-types";
import notificationApi from "../../api/notificationApi";
import { getSession, getActiveEntity, getEntities } from "../../utils/sessionManager";
import "../../styles/components/notificationDropdown.css";

const NotificationDropdown = ({ onToggle }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  // Get entityAccountId from session
  const getEntityAccountId = () => {
    try {
      const activeEntity = getActiveEntity();
      return activeEntity?.EntityAccountId || activeEntity?.entityAccountId || null;
    } catch (error) {
      console.warn("[NotificationDropdown] Error getting entityAccountId:", error);
      return null;
    }
  };

  // Fetch unread count on mount and periodically
  useEffect(() => {
    const fetchUnreadCount = async () => {
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
          setUnreadCount(0);
          return;
        }

        const response = await notificationApi.getUnreadCount(entityAccountId);
        if (response.success && response.data) {
          setUnreadCount(response.data.count || 0);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();
    
    // Update unread count every 60 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <button
      className="notification-button"
      onClick={onToggle}
    >
      <Bell size={24} />
      {unreadCount > 0 && (
        <span className="notification-badge">{unreadCount}</span>
      )}
    </button>
  );
};

NotificationDropdown.propTypes = {
  onToggle: PropTypes.func,
};

NotificationDropdown.defaultProps = {
  onToggle: () => {},
};

export default NotificationDropdown;

