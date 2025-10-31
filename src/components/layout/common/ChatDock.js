// src/components/layout/common/ChatDock.js
import React, { useState, useCallback, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import "../../../styles/layouts/chatdock.css";

function ChatWindow(props) {
  const { chat, onClose } = props;
  const [message, setMessage] = useState("");
  const bodyRef = useRef(null);

  // Auto scroll to bottom when new messages come in
  const scrollToBottom = () => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, []);

  const handleSend = () => {
    if (message.trim()) {
      // Send message to backend (implement later)
      setMessage("");
      scrollToBottom();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitial = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="chatwin">
      <div className="chatwin__header">
        <div className="chatwin__avatar">{getInitial(chat.name)}</div>
        <div className="chatwin__title">{chat.name}</div>
        <button className="chatwin__close" onClick={() => onClose(chat.id)} aria-label="Đóng">
          ✕
        </button>
      </div>
      <div className="chatwin__body" ref={bodyRef}>
        <div className="chatwin__bubble chatwin__bubble--other">
          Xin chào! 👋
        </div>
        <div className="chatwin__bubble chatwin__bubble--me">
          Chào bạn, bạn khỏe không?
        </div>
        <div className="chatwin__bubble chatwin__bubble--other">
          Mình khỏe, cảm ơn bạn. Tối nay có đi đâu không?
        </div>
        <div className="chatwin__bubble chatwin__bubble--me">
          Có nè, sẽ ra quán để chill thôi
        </div>
      </div>
      <div className="chatwin__input">
        <input
          placeholder="Aa"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button onClick={handleSend}>Gửi</button>
      </div>
    </div>
  );
}

export default function ChatDock() {
  const [chats, setChats] = useState([]);

  const openChatById = useCallback((contact) => {
    setChats((prev) => (prev.some((c) => c.id === contact.id) ? prev : [...prev, contact]));
  }, []);

  const closeChat = (id) => setChats((prev) => prev.filter((c) => c.id !== id));

  // expose global open function
  useEffect(() => {
    // eslint-disable-next-line no-undef
    window.__openChat = openChatById;
    return () => {
      // eslint-disable-next-line no-undef
      delete window.__openChat;
    };
  }, [openChatById]);

  return (
    <div className="chatdock">
      {chats.map((c) => (
        <ChatWindow key={c.id} chat={c} onClose={closeChat} />
      ))}
    </div>
  );
}

ChatWindow.propTypes = {
  chat: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

