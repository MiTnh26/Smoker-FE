import { Link } from "react-router-dom";
import { Home, MessageCircle, Bell, User, Search } from "lucide-react";
import { useState } from "react";
import UserMenu from "./UserMenu";
import MessagesPanel from "./MessagesPanel"; 
import "../../styles/layouts/customerheader.css";

export default function CustomerHeader() {
  const [activePanel, setActivePanel] = useState(null); // 'user' | 'messages' | null

  const conversations = [
    { id: 1, name: "Nguyễn Văn A", lastMessage: "Tối nay đi không?", time: "10 phút", unread: 2 },
    { id: 2, name: "Trần Thị B", lastMessage: "Ok nhé!", time: "30 phút", unread: 0 },
  ];

  const togglePanel = (panel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  return (
    <>
      <header className="newsfeed-header">
        <div className="newsfeed-header-content">
          <Link to="/" className="newsfeed-logo">Smoker</Link>

          <div className="newsfeed-search">
            <Search className="search-icon" />
            <input type="text" placeholder="Tìm kiếm..." className="search-input" />
          </div>

          <div className="newsfeed-nav">
            <button className="nav-icon active"><Home size={24} /></button>

            <button
              className="nav-icon"
              onClick={() => togglePanel("messages")}
            >
              <MessageCircle size={24} />
            </button>

            <button className="nav-icon"><Bell size={24} /></button>

            <button
              className="nav-icon"
              onClick={() => togglePanel("user")}
            >
              <User size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Shared panel container */}
      {activePanel && (
        <div className="user-menu-panel">
          <div className="panel-header">
            <h3>{activePanel === "user" ? "User Menu" : "Tin nhắn"}</h3>
            <button onClick={() => setActivePanel(null)}>✕</button>
          </div>

          <div className="user-menu-content">
            {activePanel === "user" && <UserMenu />}
            {activePanel === "messages" && (
              <MessagesPanel
                conversations={conversations}
                onClose={() => setActivePanel(null)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
