// src/components/layout/Sidebar.js
import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { sidebarConfig } from "../../config/sidebarConfig.js";

export default function Sidebar() {
  const { barPageId: paramBarPageId } = useParams();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [activeEntity, setActiveEntity] = useState(null);
  const [menus, setMenus] = useState([]);
  const [barPageId, setBarPageId] = useState(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("session")) || {};
    const account = session.account || {};
    const entity =
      session.entities?.find((e) => e.id === session.activeEntity?.id) || account;

    console.log("🧠 [Sidebar] Loaded entity:", entity);

    setUser(account);
    setActiveEntity(entity);

    const role =
      entity.type === "Account"
        ? account.role?.toLowerCase()
        : entity.role?.toLowerCase();

    console.log("🧠 [Sidebar] Resolved role:", role);
    setMenus(sidebarConfig[role] || []);

    // ✅ Ưu tiên lấy barPageId từ entity nếu có
    if (entity?.type === "BarPage" && entity?.id) {
      setBarPageId(entity.id);
    } else if (session?.activeEntity?.id) {
      setBarPageId(session.activeEntity.id);
    }
  }, []);

  // ✅ Nếu useParams có giá trị thì override
  useEffect(() => {
    if (paramBarPageId) {
      setBarPageId(paramBarPageId);
    }
  }, [paramBarPageId]);

  if (!activeEntity) return null;

  const resolvedBarPageId = barPageId;

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
        {menus.map(({ label, icon: Icon, path }) => {
          let resolvedPath = path;

          // ✅ Luôn thay khi có ID thật
          if (path.includes(":barPageId") && resolvedBarPageId) {
            resolvedPath = path.replace(":barPageId", resolvedBarPageId);
          }

          console.log("🧭 [Sidebar] Final resolved path:", resolvedPath);

          return (
            <Link
              key={resolvedPath}
              to={resolvedPath}
              className={`sidebar-nav-item ${location.pathname === resolvedPath ? "active" : ""
                }`}
            >
              {Icon && <Icon size={20} />}
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
