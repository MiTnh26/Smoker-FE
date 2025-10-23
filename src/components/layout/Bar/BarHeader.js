// src/components/layout/BarHeader.js
import { Link } from "react-router-dom";
import { Home, MessageCircle, Bell, User, Search } from "lucide-react";
import { useState, useEffect } from "react";
import BarMenu from "./BarMenu";
import MessagesPanel from "../MessagesPanel";
import "../../../styles/layouts/header.css";

export default function BarHeader() {
  const [activePanel, setActivePanel] = useState(null); // 'user' | 'messages' | null
  const [barUser, setBarUser] = useState(null);
  const [fallbackAvatar, setFallbackAvatar] = useState(null);

  const conversations = [
    { id: 1, name: "Người dùng A", lastMessage: "Hello!", time: "10 phút", unread: 2 },
    { id: 2, name: "Người dùng B", lastMessage: "Ok nhé!", time: "30 phút", unread: 0 },
  ];

  const togglePanel = (panel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("session"));
    if (!session) return;
  
    // Nếu có mảng entities thì tìm trong đó, còn không thì fallback sang account
    const activeBar =
      session?.entities?.find(
        (e) => e.id === session?.activeEntity?.id && e.type === "BarPage"
      ) ||
      {
        id: session?.activeEntity?.id,
        name: session?.account?.userName || session?.account?.email || "Bar của bạn",
        avatar: session?.account?.avatar,
        type: session?.activeEntity?.type || "BarPage",
      };
  
    setBarUser(activeBar);
  
    if (session?.account?.avatar) {
      setFallbackAvatar(session.account.avatar);
    }
  }, []);
  

  return (
    <>
      <header className="newsfeed-header">
        <div className="newsfeed-header-content">
          <Link to="/" className="newsfeed-logo">Smoker - Bar Page</Link>

          <div className="newsfeed-search">
            <Search className="search-icon" />
            <input type="text" placeholder="Tìm kiếm..." className="search-input" />
          </div>

          <div className="newsfeed-nav">
            <button className="nav-icon active"><Home size={24} /></button>
            <button className="nav-icon" onClick={() => togglePanel("messages")}><MessageCircle size={24} /></button>
            <button className="nav-icon"><Bell size={24} /></button>
            <button className="nav-icon" onClick={() => togglePanel("user")}><User size={24} /></button>
          </div>
        </div>
      </header>

      {activePanel && (
        <div className="user-menu-panel">
          <div className="panel-header">
            <h3>{activePanel === "user" ? "Business Menu" : "Tin nhắn"}</h3>
            <button onClick={() => setActivePanel(null)}>✕</button>
          </div>

          <div className="user-menu-content">
            {activePanel === "user" && barUser && (
              <BarMenu
                userData={barUser}
                role="bar"
                fallbackAvatar={fallbackAvatar}
              />
            )}
            {activePanel === "messages" && (
              <MessagesPanel conversations={conversations} onClose={() => setActivePanel(null)} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
