// src/components/layout/Sidebar.js
import { Link, useLocation } from "react-router-dom";
import { sidebarConfig } from "../../config/sidebarConfig";
import "../../styles/modules/newsfeed.css";

export default function Sidebar({ role = "customer" }) {
  const location = useLocation();
  const menus = sidebarConfig[role] || [];

  // Lấy thông tin user từ localStorage
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const { userName, email, avatar } = storedUser;

  return (
    <aside className="newsfeed-sidebar-left">
      {/* Header người dùng */}
      <div className="sidebar-user-profile">
        <div className="sidebar-user-avatar">
          {avatar ? (
            <img
              src={avatar}
              alt="User Avatar"
              className="rounded-full w-12 h-12 object-cover"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  userName || "User"
                )}&background=teal&color=fff&size=64`;
              }}
            />
          ) : (
            <span>👤</span>
          )}
        </div>
        <div className="sidebar-user-info">
          <h3>{userName || "Tên người dùng"}</h3>
          <p>@{email?.split("@")[0] || "username"}</p>
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
