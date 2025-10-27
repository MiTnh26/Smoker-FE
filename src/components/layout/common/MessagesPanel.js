import React from "react";
import { Input } from "../../common/Input";
import { Search, User } from "lucide-react";
import "../../../styles/layouts/messagepanel.css";

export default function MessagesPanel({ conversations = [], onClose }) {
  return (
    <div className="panel-container">
      {/* <div className="panel-header">
        <h3>Tin nhắn</h3>
        <button onClick={onClose}>✕</button>
      </div> */}

      <div className="panel-search">
        <Search size={16} />
        <Input
          type="text"
          placeholder="Tìm kiếm..."
          className="panel-search-input"
        />
      </div>

      <div className="panel-list">
        {conversations.map((conv) => (
          <div key={conv.id} className="panel-item">
            <div className="panel-avatar">
              <User size={32} />
            </div>
            <div className="panel-info">
              <h4>{conv.name}</h4>
              <p>{conv.lastMessage}</p>
            </div>
            <div className="panel-meta">
              <span className="panel-time">{conv.time}</span>
              {conv.unread > 0 && (
                <span className="panel-unread">{conv.unread}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
