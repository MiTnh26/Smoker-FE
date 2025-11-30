// src/components/layout/common/MenuContactsPanel.js
import React from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { sidebarConfig } from "../../../config/sidebarConfig.js";
import ContactsPanel from "./ContactsPanel";
import { X } from "lucide-react";
import { cn } from "../../../utils/cn";

export default function MenuContactsPanel({ isOpen, onClose }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { barPageId: paramBarPageId } = useParams();
  const [user, setUser] = React.useState(null);
  const [activeEntity, setActiveEntity] = React.useState(null);
  const [menus, setMenus] = React.useState([]);
  const [barPageId, setBarPageId] = React.useState(null);
  const [openSubMenu, setOpenSubMenu] = React.useState(null);
  const [tableTypes, setTableTypes] = React.useState([]);
  const [loadingTableTypes, setLoadingTableTypes] = React.useState(false);
  const panelRef = React.useRef(null);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  const loadSession = () => {
    const session = JSON.parse(localStorage.getItem("session")) || {};
    const account = session.account || {};
    
    let entity = session.entities?.find((e) => e.id === session.activeEntity?.id);
    
    if (!entity) {
      entity = {
        ...account,
        type: "Account",
        avatar: account.avatar,
        name: account.userName || account.email,
        email: account.email,
      };
    }
    
    if (!entity.avatar && account.avatar) {
      entity.avatar = account.avatar;
    }
    
    setUser(account);
    setActiveEntity(entity);

    const role =
      entity.type === "Account"
        ? account.role?.toLowerCase()
        : entity.role?.toLowerCase();

    let menuItems = sidebarConfig[role] || [];

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
        const registerBusinessLabel = t('sidebar.registerBusiness');
        menuItems = menuItems.filter(
          (menu) => menu.label !== registerBusinessLabel && menu.label !== "Đăng ký tài khoản kinh doanh"
        );
      }
    }

    setMenus(menuItems);

    if (entity?.type === "BarPage" && entity?.id) {
      setBarPageId(entity.id);
    } else if (session?.activeEntity?.id) {
      setBarPageId(session.activeEntity.id);
    }
  };

  React.useEffect(() => {
    loadSession();
    
    const handleProfileUpdate = () => {
      loadSession();
    };
    
    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  React.useEffect(() => {
    if (paramBarPageId) setBarPageId(paramBarPageId);
  }, [paramBarPageId]);

  const toggleSubMenu = (label) => {
    setOpenSubMenu(openSubMenu === label ? null : label);
  };

  const getInitial = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const renderMenuItem = ({ label, icon: Icon, path, subMenu }) => {
    let resolvedPath = path;
    if (path.includes(":barPageId") && barPageId) {
      resolvedPath = path.replace(":barPageId", barPageId);
    }

    const isActive = location.pathname === resolvedPath;
    const isOpen = openSubMenu === label;

    const labelKeyMap = {
      "Trang chủ": "home",
      "Newsfeed": "newsfeed",
      "Sự kiện": "events",
      "Tin nhắn": "messages",
      "Đặt bàn của tôi": "myBookings",
      "Hồ sơ": "profile",
      "Bank info": "bankInfo",
      "Dashboard": "dashboard",
      "Nhân sự (DJ, Dancer)": "staff",
      "Bar page": "barPage",
      "Cài đặt quán": "barSettings",
      "Lịch diễn": "schedule",
      "Khách hàng / Bar hợp tác": "partners",
      "Đối tác / Bar": "partners",
      "Đánh giá & sao": "reviewsStars",
      "Quản lý người dùng": "adminUsers",
      "Quản lý quán / Bar": "adminBars",
      "Báo cáo & thống kê": "adminReports",
      "Cài đặt hệ thống": "adminSettings",
      "Đăng ký tài khoản kinh doanh": "registerBusiness",
    };
    const k = labelKeyMap[label] || label;

    const handleClick = () => {
      if (subMenu) {
        toggleSubMenu(label);
      } else {
        navigate(resolvedPath);
        onClose();
      }
    };

    return (
      <div key={label + resolvedPath}>
        {subMenu ? (
          <div
            className={cn(
              "block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              "text-muted-foreground no-underline cursor-pointer",
              "flex items-center gap-2.5",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-muted hover:text-foreground"
            )}
            onClick={handleClick}
          >
            {Icon && <Icon size={18} className="flex-shrink-0" />}
            <span className={cn("flex-1 truncate")}>
              {t(`sidebar.${k}`, { defaultValue: label })}
            </span>
            <span className="text-xs flex-shrink-0">{isOpen ? "▾" : "▸"}</span>
          </div>
        ) : (
          <div
            onClick={handleClick}
            className={cn(
              "block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              "text-muted-foreground no-underline cursor-pointer",
              "flex items-center gap-2.5",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-muted hover:text-foreground"
            )}
          >
            {Icon && <Icon size={18} className="flex-shrink-0" />}
            <span className="truncate">{t(`sidebar.${k}`, { defaultValue: label })}</span>
          </div>
        )}

        {subMenu && isOpen && (
          <ul className={cn(
            "flex flex-col gap-1 mt-1 ml-5 pl-1 border-l-2",
            "border-border/30"
          )}>
            {subMenu.map((sub) => {
              let resolvedSubPath = sub.path;
              if (sub.path.includes(":barPageId") && barPageId) {
                resolvedSubPath = sub.path.replace(":barPageId", barPageId);
              }
              const isSubActive = location.pathname === resolvedSubPath;
              const kSub = labelKeyMap[sub.label] || sub.label;
              
              return (
                <li key={sub.label + resolvedSubPath}>
                  <div
                    onClick={() => {
                      navigate(resolvedSubPath);
                      onClose();
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs transition-colors",
                      "text-muted-foreground no-underline block truncate cursor-pointer",
                      isSubActive 
                        ? "bg-border text-foreground" 
                        : "hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {t(`sidebar.${kSub}`, { defaultValue: sub.label })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40",
          "md:hidden"
        )}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          "flex flex-col bg-card"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between p-4",
          "border-b border-border/30 flex-shrink-0"
        )}>
          <div className={cn("flex items-center gap-2.5 flex-1 min-w-0")}>
            <div className={cn(
              "flex items-center justify-center rounded-full p-1.5",
              "bg-gradient-to-br from-primary to-secondary",
              "text-primary-foreground w-10 h-10 flex-shrink-0"
            )}>
              {activeEntity?.avatar ? (
                <img
                  src={activeEntity.avatar}
                  alt={activeEntity.name}
                  className="rounded-full w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm">{getInitial(activeEntity?.name || "User")}</span>
              )}
            </div>
            <div className={cn("min-w-0 flex-1")}>
              <h3 className={cn(
                "m-0 text-sm font-semibold text-foreground",
                "truncate"
              )}>
                {activeEntity?.name || "User"}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-lg",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-muted transition-colors",
              "flex-shrink-0"
            )}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Split into two halves */}
        <div className={cn(
          "flex-1 overflow-hidden flex flex-col",
          "min-h-0"
        )}>
          {/* Top Half - Menu */}
          <div className={cn(
            "flex-1 overflow-y-auto border-b border-border/30",
            "p-4 min-h-0"
          )}>
            <h4 className={cn(
              "text-sm font-semibold text-foreground mb-3"
            )}>
              {t('layout.menu', { defaultValue: 'Menu' })}
            </h4>
            <nav className={cn("flex flex-col gap-0.5")}>
              {menus.map((menu) => renderMenuItem(menu))}
            </nav>
          </div>

          {/* Bottom Half - Contacts */}
          <div className={cn(
            "flex-1 overflow-y-auto",
            "p-4 min-h-0"
          )}>
            <h4 className={cn(
              "text-sm font-semibold text-foreground mb-3"
            )}>
              {t('layout.contacts', { defaultValue: 'Liên hệ' })}
            </h4>
            <div className="h-full">
              <ContactsPanel onClose={onClose} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

