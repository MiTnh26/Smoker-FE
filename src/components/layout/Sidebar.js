// src/components/layout/Sidebar.js
import { useState, useEffect } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { sidebarConfig } from "../../config/sidebarConfig.js";
import barPageApi from "../../api/barPageApi.js";
import "../../styles/layouts/sidebarSubmenu.css";

export default function Sidebar() {
  const { barPageId: paramBarPageId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [activeEntity, setActiveEntity] = useState(null);
  const [menus, setMenus] = useState([]);
  const [barPageId, setBarPageId] = useState(null);
  const [openSubMenu, setOpenSubMenu] = useState(null);
  const [tableTypes, setTableTypes] = useState([]); // Track table types
  const [loadingTableTypes, setLoadingTableTypes] = useState(false);

  const loadSession = () => {
    const session = JSON.parse(localStorage.getItem("session")) || {};
    const account = session.account || {};
    
    // Find active entity, if not found use account as fallback
    let entity = session.entities?.find((e) => e.id === session.activeEntity?.id);
    
    // If no entity found, use account data
    if (!entity) {
      entity = {
        ...account,
        type: "Account",
        avatar: account.avatar,
        name: account.userName || account.email,
        email: account.email,
      };
    }
    
    // Ensure entity has avatar from account if entity.avatar is missing
    if (!entity.avatar && account.avatar) {
      entity.avatar = account.avatar;
    }
    
    console.log("[Sidebar] Loading session - entity:", entity);
    
    setUser(account);
    setActiveEntity(entity);

    const role =
      entity.type === "Account"
        ? account.role?.toLowerCase()
        : entity.role?.toLowerCase();

    let menus = sidebarConfig[role] || [];

    // Hide "Đăng ký tài khoản kinh doanh" menu if user has all three types (Bar, DJ, Dancer)
    if (role === "customer" && session.entities) {
      const entities = session.entities || [];
      const hasBar = entities.some(
        (e) => e.type === "BarPage" || (e.type === "Business" && e.role?.toLowerCase() === "bar")
      );
      const hasDJ = entities.some(
        (e) => e.role?.toLowerCase() === "dj" || (e.type === "Business" && e.role?.toLowerCase() === "dj")
      );
      const hasDancer = entities.some(
        (e) => e.role?.toLowerCase() === "dancer" || (e.type === "Business" && e.role?.toLowerCase() === "dancer")
      );

      if (hasBar && hasDJ && hasDancer) {
        menus = menus.filter(
          (menu) => menu.label !== "Đăng ký tài khoản kinh doanh"
        );
      }
    }

    setMenus(menus);

    // Lấy barPageId ưu tiên từ entity
    if (entity?.type === "BarPage" && entity?.id) {
      setBarPageId(entity.id);
    } else if (session?.activeEntity?.id) {
      setBarPageId(session.activeEntity.id);
    }
  };

  useEffect(() => {
    loadSession();
    
    // Listen for profile updates
    const handleProfileUpdate = () => {
      console.log("[Sidebar] Profile updated event received");
      loadSession();
    };
    
    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    if (paramBarPageId) setBarPageId(paramBarPageId);
  }, [paramBarPageId]);

  // Fetch table types when barPageId is available
  useEffect(() => {
    const fetchTableTypes = async () => {
      if (!barPageId) {
        setTableTypes([]);
        return;
      }

      try {
        setLoadingTableTypes(true);
        const res = await barPageApi.getTableTypes(barPageId);
        if (res?.status === "success" || res?.data) {
          setTableTypes(res.data || []);
        } else {
          setTableTypes([]);
        }
      } catch (error) {
        console.error("[Sidebar] Error fetching table types:", error);
        setTableTypes([]);
      } finally {
        setLoadingTableTypes(false);
      }
    };

    // Only fetch if we're in bar context
    const role = activeEntity?.role?.toLowerCase() || activeEntity?.type?.toLowerCase();
    if (role === "bar" || activeEntity?.type === "BarPage") {
      fetchTableTypes();
    } else {
      setTableTypes([]);
    }
  }, [barPageId, activeEntity]);

  // Listen for table types updates
  useEffect(() => {
    const handleTableTypesUpdate = () => {
      if (barPageId) {
        barPageApi.getTableTypes(barPageId)
          .then(res => {
            if (res?.status === "success" || res?.data) {
              setTableTypes(res.data || []);
            }
          })
          .catch(err => console.error("[Sidebar] Error refreshing table types:", err));
      }
    };

    window.addEventListener("tableTypesUpdated", handleTableTypesUpdate);
    return () => {
      window.removeEventListener("tableTypesUpdated", handleTableTypesUpdate);
    };
  }, [barPageId]);

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

    // Check if this menu item should be disabled (requires table types)
    const requiresTableTypes = subLabel !== "Quản lý loại bàn";
    const hasTableTypes = tableTypes && tableTypes.length > 0;
    const isDisabled = requiresTableTypes && !hasTableTypes;

    const handleClick = (e) => {
      if (isDisabled) {
        e.preventDefault();
        // Navigate to table types page with message
        const tableTypesPath = `/bar/settings/${resolvedBarPageId}/table-types`;
        navigate(tableTypesPath, { 
          state: { 
            message: "Vui lòng tạo loại bàn trước.",
            messageType: "warning"
          } 
        });
      }
    };

    return (
      <li key={subLabel + resolvedSubPath}>
        <Link
          to={resolvedSubPath}
          onClick={handleClick}
          className={`sidebar-submenu-item ${isSubActive ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
          style={{
            opacity: isDisabled ? 0.5 : 1,
            cursor: isDisabled ? "not-allowed" : "pointer"
          }}
          title={isDisabled ? "Vui lòng tạo loại bàn trước" : ""}
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
