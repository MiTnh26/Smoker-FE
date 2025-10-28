// src/components/layout/Sidebar.js
import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { sidebarConfig } from "../../config/sidebarConfig.js";
import "../../styles/layouts/sidebarSubmenu.css";

export default function Sidebar() {
  const { barPageId: paramBarPageId } = useParams();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [activeEntity, setActiveEntity] = useState(null);
  const [menus, setMenus] = useState([]);
  const [barPageId, setBarPageId] = useState(null);
  const [openSubMenu, setOpenSubMenu] = useState(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("session")) || {};
    const account = session.account || {};
    const entity =
      session.entities?.find((e) => e.id === session.activeEntity?.id) || account;

    setUser(account);
    setActiveEntity(entity);

    const role =
      entity.type === "Account"
        ? account.role?.toLowerCase()
        : entity.role?.toLowerCase();

    setMenus(sidebarConfig[role] || []);

    // Lấy barPageId ưu tiên từ entity
    if (entity?.type === "BarPage" && entity?.id) {
      setBarPageId(entity.id);
    } else if (session?.activeEntity?.id) {
      setBarPageId(session.activeEntity.id);
    }
  }, []);

  useEffect(() => {
    if (paramBarPageId) setBarPageId(paramBarPageId);
  }, [paramBarPageId]);

  if (!activeEntity) return null;

  const resolvedBarPageId = barPageId;

  const toggleSubMenu = (label) => {
    setOpenSubMenu(openSubMenu === label ? null : label);
  };

  // Hàm render submenu item
  const renderSubMenuItem = ({ label: subLabel, path: subPath }) => {
    let resolvedSubPath = subPath;
    if (subPath.includes(":barPageId") && resolvedBarPageId) {
      resolvedSubPath = subPath.replace(":barPageId", resolvedBarPageId);
    }
    const isSubActive = location.pathname === resolvedSubPath;

    return (
      <li key={subLabel + resolvedSubPath}>
        <Link
          to={resolvedSubPath}
          className={`sidebar-submenu-item ${isSubActive ? "active" : ""}`}
        >
          {subLabel}
        </Link>
      </li>
    );
  };

  // Hàm render menu item
  const renderMenuItem = ({ label, icon: Icon, path, subMenu }) => {
    let resolvedPath = path;
    if (path.includes(":barPageId") && resolvedBarPageId) {
      resolvedPath = path.replace(":barPageId", resolvedBarPageId);
    }

    const isActive = location.pathname === resolvedPath;
    const isOpen = openSubMenu === label;

    return (
      <div key={label + resolvedPath} className="sidebar-nav-item-wrapper">
        {subMenu ? (
          // Menu cha có submenu
          <div
            className={`sidebar-nav-item ${isActive ? "active" : ""}`}
            onClick={() => toggleSubMenu(label)}
          >
            {Icon && <Icon size={20} />}
            <span>{label}</span>
            <span className="submenu-arrow">{isOpen ? "▾" : "▸"}</span>
          </div>
        ) : (
          // Menu bình thường
          <Link
            to={resolvedPath}
            className={`sidebar-nav-item ${isActive ? "active" : ""}`}
          >
            {Icon && <Icon size={20} />}
            <span>{label}</span>
          </Link>
        )}

        {subMenu && isOpen && (
          <ul className="sidebar-submenu">
            {subMenu.map((sub) => renderSubMenuItem(sub))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <aside className="newsfeed-sidebar-left">
      <div className="sidebar-user-profile">
        <div className="sidebar-user-avatar">
          {activeEntity.avatar ? (
            <img
              src={activeEntity.avatar}
              alt={activeEntity.name}
              className="rounded-full w-12 h-12 object-cover"
            />
          ) : (
            <span>👤</span>
          )}
        </div>
        <div className="sidebar-user-info">
          <h3>{activeEntity.name}</h3>
          {activeEntity.email && <p>@{activeEntity.email.split("@")[0]}</p>}
        </div>
      </div>

      <nav className="sidebar-nav">
        {menus.map((menu) => renderMenuItem(menu))}
      </nav>
    </aside>
  );
}
