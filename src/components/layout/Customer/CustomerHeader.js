import { Link } from "react-router-dom";
import { Home, MessageCircle, User, Search, Bell } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import UnifiedMenu from "../../common/UnifiedMenu";
import MessagesPanel from "../common/MessagesPanel";
import NotificationPanel from "../common/NotificationPanel";
import DropdownPanel from "../../common/DropdownPanel";
import "../../../styles/layouts/customerheader.css";

export default function CustomerHeader() {
  const [activePanel, setActivePanel] = useState(null); // 'notifications' | 'messages' | 'user' | null
  const { t } = useTranslation();

  const conversations = [
    { id: 1, name: "Nguyễn Văn A", lastMessage: "Tối nay đi không?", time: "10 phút", unread: 2 },
    { id: 2, name: "Trần Thị B", lastMessage: "Ok nhé!", time: "30 phút", unread: 0 },
  ];

  const togglePanel = (panel) => {
    console.log("[CustomerHeader] Toggling panel:", panel, "Current:", activePanel);
    const newPanel = activePanel === panel ? null : panel;
    console.log("[CustomerHeader] New activePanel:", newPanel);
    setActivePanel(newPanel);
  };

  // Debug activePanel
  console.log("[CustomerHeader] Current activePanel:", activePanel);
  console.log("[CustomerHeader] Panel should be open:", !!activePanel);

  return (
    <>
      <header className="newsfeed-header">
        <div className="newsfeed-header-content">
          <Link to="/customer/newsfeed" className="newsfeed-logo">{t('layout.brand')}</Link>

          <div className="newsfeed-search">
            <Search className="search-icon" />
            <input type="text" placeholder={t('layout.searchPlaceholder')} className="search-input" />
          </div>

          <div className="newsfeed-nav">
            <button className="nav-icon active"><Home size={24} /></button>

            <button
              className={`nav-icon ${activePanel === "messages" ? "active" : ""}`}
              onClick={() => {
                console.log("[CustomerHeader] Message button clicked!");
                togglePanel("messages");
              }}
            >
              <MessageCircle size={24} />
            </button>

            {/* Notification Button */}
            <button
              className={`nav-icon ${activePanel === "notifications" ? "active" : ""}`}
              onClick={() => {
                console.log("[CustomerHeader] Notification button clicked!");
                togglePanel("notifications");
              }}
            >
              <Bell size={24} />
            </button>

            <button
              className={`nav-icon ${activePanel === "user" ? "active" : ""}`}
              onClick={() => {
                console.log("[CustomerHeader] User button clicked!");
                togglePanel("user");
              }}
            >
              <User size={24} />
            </button>
          </div>
        </div>
      </header>

      <DropdownPanel
        isOpen={!!activePanel}
        onClose={() => {
          console.log("[CustomerHeader] Closing panel");
          setActivePanel(null);
        }}
        title={(() => {
          if (activePanel === "user") return t('layout.userMenu');
          if (activePanel === "messages") return t('layout.messages');
          if (activePanel === "notifications") return t('layout.notifications');
          return "";
        })()}
      >
        {activePanel === "notifications" && (
          <NotificationPanel
            onClose={() => {
              console.log("[CustomerHeader] NotificationPanel onClose");
              setActivePanel(null);
            }}
          />
        )}
        {activePanel === "messages" && (
          <MessagesPanel
            conversations={conversations}
            onClose={() => {
              console.log("[CustomerHeader] MessagesPanel onClose");
              setActivePanel(null);
            }}
          />
        )}
        {activePanel === "user" && (
          <UnifiedMenu
            onClose={() => {
              console.log("[CustomerHeader] UnifiedMenu onClose");
              setActivePanel(null);
            }}
            menuConfig="customer"
            showBackToAccount={false}
          />
        )}
      </DropdownPanel>
    </>
  );
}
