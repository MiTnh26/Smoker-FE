// src/components/layout/BarHeader.js
import { Link } from "react-router-dom";
import { Home, MessageCircle, User, Search } from "lucide-react";
import { useState, useEffect } from "react";
import UnifiedMenu from "../../common/UnifiedMenu";
import MessagesPanel from "../common/MessagesPanel";
import NotificationDropdown from "../../common/NotificationDropdown";
import DropdownPanel from "../../common/DropdownPanel";
import "../../../styles/layouts/header.css";

export default function BarHeader() {
  const [activePanel, setActivePanel] = useState(null); // 'user' | 'messages' | null
  const [barUser, setBarUser] = useState(null);
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("session"));
    } catch {
      return null;
    }
  });
  
  const conversations = [
    { id: 1, name: "Người dùng A", lastMessage: "Hello!", time: "10 phút", unread: 2 },
    { id: 2, name: "Người dùng B", lastMessage: "Ok nhé!", time: "30 phút", unread: 0 },
  ];

  const togglePanel = (panel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const updateSession = () => {
    try {
      const newSession = JSON.parse(localStorage.getItem("session"));
      setSession(newSession);
      
      if (!newSession) return;

      // Nếu có mảng entities thì tìm trong đó, còn không thì fallback sang account
      // Match by ID first, then by type (BarPage, Business, BusinessAccount, etc.)
      const activeBar =
        newSession?.entities?.find(
          (e) => String(e.id) === String(newSession?.activeEntity?.id)
        ) ||
        {
          id: newSession?.activeEntity?.id,
          name: newSession?.activeEntity?.name || newSession?.account?.userName || newSession?.account?.email || "Trang của bạn",
          avatar: newSession?.activeEntity?.avatar || newSession?.account?.avatar,
          role: newSession?.activeEntity?.role,
          type: newSession?.activeEntity?.type || "BarPage",
        };

      setBarUser(activeBar);
    } catch (e) {
      console.error("[BarHeader] Error parsing session:", e);
    }
  };

  useEffect(() => {
    if (!session) return;
    updateSession();
    
    // Listen for profile updates
    const handleProfileUpdate = () => {
      console.log("[BarHeader] Profile updated event received");
      updateSession();
    };
    
    // eslint-disable-next-line no-undef
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-undef
      window.addEventListener('profileUpdated', handleProfileUpdate);
      // eslint-disable-next-line no-undef
      window.addEventListener('storage', handleProfileUpdate);
      
      return () => {
        // eslint-disable-next-line no-undef
        window.removeEventListener('profileUpdated', handleProfileUpdate);
        // eslint-disable-next-line no-undef
        window.removeEventListener('storage', handleProfileUpdate);
      };
    }
  }, []);

  if (!session || !session.activeEntity) {
    return null; // or a loading state
  }

  const role = (session.activeEntity.role || session.activeEntity.type || "").toLowerCase();
  const activeEntityId = session.activeEntity.id;
  
  // Determine menu config based on role
  const getMenuConfig = () => {
    if (role === "dj") return "dj";
    if (role === "dancer") return "dancer";
    if (role === "bar" || role === "barpage") return "bar";
    if (session.activeEntity.type === "Business" || session.activeEntity.type === "BusinessAccount") return "business";
    return "bar"; // default fallback
  };
  
  const menuConfig = getMenuConfig();
  
  return (
    <>
      <header className="newsfeed-header">
        <div className="newsfeed-header-content">
          <Link to={`/${role}/${activeEntityId}`} className="newsfeed-logo">
            Smoker - Page
          </Link>

          <div className="newsfeed-search">
            <Search className="search-icon" />
            <input type="text" placeholder="Tìm kiếm..." className="search-input" />
          </div>

          <div className="newsfeed-nav">
            <button className="nav-icon active"><Home size={24} /></button>
            <button className="nav-icon" onClick={() => togglePanel("messages")}><MessageCircle size={24} /></button>
            
            {/* Notification Dropdown */}
            <NotificationDropdown />

            <button className="nav-icon" onClick={() => togglePanel("user")}><User size={24} /></button>
          </div>
        </div>
      </header>

      <DropdownPanel
        isOpen={!!activePanel}
        onClose={() => setActivePanel(null)}
        title={(() => {
          if (activePanel === "user") return "Business Menu";
          if (activePanel === "messages") return "Tin nhắn";
          return "";
        })()}
      >
        {activePanel === "user" && barUser && (
          <UnifiedMenu
            onClose={() => setActivePanel(null)}
            userData={barUser}
            menuConfig={menuConfig}
            showBackToAccount={true}
          />
        )}
        {activePanel === "messages" && (
          <MessagesPanel conversations={conversations} onClose={() => setActivePanel(null)} />
        )}
      </DropdownPanel>
    </>
  );
}
