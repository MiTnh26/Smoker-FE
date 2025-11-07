import React from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { Search } from "lucide-react";
import "../../../styles/layouts/messagepanel.css";
import messageApi from "../../../api/messageApi";
/**
 * MessagesPanel - Hiển thị danh sách tin nhắn
 * Dùng DropdownPanel component chung từ BarHeader/CustomerHeader
 */
export default function MessagesPanel({ onClose }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [conversations, setConversations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    messageApi.getConversations().then(res => {
      // Map lại dữ liệu cho phù hợp UI
      const userId = localStorage.getItem("userId") || JSON.parse(localStorage.getItem("session"))?.account?.id;
      const mapped = (res.data || []).map(conv => {
        // Lấy tin nhắn cuối cùng
        const messages = Object.values(conv["Cuộc Trò Chuyện"] || {});
        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
        return {
          id: conv._id,
          name: conv["Người 1"] === userId ? conv["Người 2"] : conv["Người 1"],
          lastMessage: lastMsg ? lastMsg["Nội Dung Tin Nhắn"] : "",
          time: lastMsg ? new Date(lastMsg["Gửi Lúc"]).toLocaleString() : "",
          unread: 0 // cần xử lý thêm nếu muốn đếm số chưa đọc
        };
      });
      setConversations(mapped);
      setLoading(false);
    });
  }, []);

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
        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "rgb(var(--muted-foreground))" }}>
            <p style={{ margin: 0 }}>{t('messages.loading') || 'Đang tải...'}</p>
          </div>
        ) : filteredConversations.length === 0 ? (
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
                if (window.__openChat) {
                  window.__openChat({ id: conv.id, name: conv.name });
                }
                onClose?.();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (window.__openChat) {
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