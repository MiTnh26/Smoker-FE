// src/components/layout/common/ChatDock.js
import React, { useState, useCallback } from "react";
import "../../../styles/layouts/chatdock.css";

function ChatWindow({ chat, onClose }) {
  return (
    <div className="chatwin">
      <div className="chatwin__header">
        <div className="chatwin__avatar">{chat.name.charAt(0)}</div>
        <div className="chatwin__title">{chat.name}</div>
        <button className="chatwin__close" onClick={() => onClose(chat.id)}>✕</button>
      </div>
      <div className="chatwin__body">
        <div className="chatwin__bubble chatwin__bubble--other">Xin chào!</div>
        <div className="chatwin__bubble chatwin__bubble--me">Chào bạn</div>
      </div>
      <div className="chatwin__input">
        <input placeholder="Aa" />
        <button>Gửi</button>
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
  window.__openChat = openChatById;

  return (
    <div className="chatdock">
      {chats.map((c) => (
        <ChatWindow key={c.id} chat={c} onClose={closeChat} />
      ))}
    </div>
  );
}


