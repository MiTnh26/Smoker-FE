import React, { useState, useCallback, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import "../../../styles/layouts/chatdock.css";
import messageApi from "../../../api/messageApi";
import { useAuth } from "../../../hooks/useAuth"; 
import useChatSocket from '../../../api/useChatSocket';
function ChatWindow(props) {
  const { chat, onClose } = props;
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const bodyRef = useRef(null);
  const { user } = useAuth();
    // Realtime: nhận tin nhắn mới qua socket
  useChatSocket((message) => {
    if (message.conversationId === chat.id) {
      // Fetch lại toàn bộ messages để đồng bộ trạng thái
      messageApi.getMessages(chat.id).then(res => {
        setMessages(res.data || []);
        setTimeout(scrollToBottom, 100);
      });
      // Đánh dấu đã đọc luôn nếu đang mở
      messageApi.markMessagesRead(chat.id);
    }
  });
  // Lấy tin nhắn khi mở chat
  useEffect(() => {
    setLoading(true);
    messageApi.getMessages(chat.id).then(res => {
      setMessages(res.data || []);
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    });
  // Đánh dấu đã đọc (gửi conversationId qua body)
  messageApi.markMessagesRead(chat.id);
    // eslint-disable-next-line
  }, [chat.id]);

  // Auto scroll to bottom when new messages come in
  const scrollToBottom = () => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
     
      messageApi.sendMessage(chat.id, message).then(res => {
        setMessages(prev => [...prev, {
          "Nội Dung Tin Nhắn": message,
          "Người Gửi": user.id,
          "Gửi Lúc": new Date(),
        }]);
        setMessage("");
        setTimeout(scrollToBottom, 100);
      });
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
        {loading ? (
          <div style={{ textAlign: 'center', color: '#888', padding: 16 }}>Đang tải...</div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={
                "chatwin__bubble " +
                (msg["Người Gửi"] === (localStorage.getItem("userId") || (JSON.parse(localStorage.getItem("session"))?.account?.id))
                  ? "chatwin__bubble--me"
                  : "chatwin__bubble--other")
              }
            >
              {msg["Nội Dung Tin Nhắn"]}
            </div>
          ))
        )}
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

