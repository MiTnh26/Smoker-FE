import React from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { Search } from "lucide-react";
import "../../../styles/layouts/messagepanel.css";

/**
 * MessagesPanel - Hiển thị danh sách tin nhắn
 * Dùng DropdownPanel component chung từ BarHeader/CustomerHeader
 */
export default function MessagesPanel({ conversations = [], onClose }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = React.useState("");

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitial = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <>
      {/* Search bar */}
      <div className="panel-search">
        <Search size={16} />
        <input
          type="text"
          placeholder={t('messages.searchPlaceholder')}
          className="panel-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Conversations list */}
      <div className="panel-list">
        {filteredConversations.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "rgb(var(--muted-foreground))" }}>
            <p style={{ margin: 0 }}>{t('messages.empty')}</p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              className="panel-item"
              onClick={() => {
                // eslint-disable-next-line no-undef
                if (window.__openChat) {
                  // eslint-disable-next-line no-undef
                  window.__openChat({ id: conv.id, name: conv.name });
                }
                onClose?.();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  // eslint-disable-next-line no-undef
                  if (window.__openChat) {
                    // eslint-disable-next-line no-undef
                    window.__openChat({ id: conv.id, name: conv.name });
                  }
                  onClose?.();
                }
              }}
            >
              <div className="panel-avatar">
                {getInitial(conv.name)}
              </div>
              <div className="panel-info">
                <h4>{conv.name}</h4>
                <p>{conv.lastMessage}</p>
              </div>
              <div className="panel-meta">
                <span className="panel-time">{conv.time}</span>
                {conv.unread > 0 && (
                  <span className="panel-unread">{conv.unread > 9 ? '9+' : conv.unread}</span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}

MessagesPanel.propTypes = {
  conversations: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    lastMessage: PropTypes.string.isRequired,
    time: PropTypes.string.isRequired,
    unread: PropTypes.number,
  })),
  onClose: PropTypes.func,
};

MessagesPanel.defaultProps = {
  conversations: [],
  onClose: () => {},
};