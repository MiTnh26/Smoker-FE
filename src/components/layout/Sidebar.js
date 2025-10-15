// src/components/layout/Sidebar.js
import { Link, useLocation } from "react-router-dom";
import { sidebarConfig } from "../../config/sidebarConfig";
import "../../styles/modules/newsfeed.css";

export default function Sidebar({ role = "customer" }) {
  const location = useLocation();
  const menus = sidebarConfig[role] || [];

  return (
    <aside className="newsfeed-sidebar-left">
      {/* Header người dùng */}
      <div className="sidebar-user-profile">
        <div className="sidebar-user-avatar">
          <span>👤</span>
        </div>
        <div className="sidebar-user-info">
          <h3>Tên người dùng</h3>
          <p>@username</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="sidebar-nav">
        {menus.map(({ label, icon: Icon, path }) => (
          <Link
            key={path}
            to={path}
            className={`sidebar-nav-item ${location.pathname === path ? "active" : ""}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
