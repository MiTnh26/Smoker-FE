// src/components/layout/Sidebar.js
import { useState, useEffect } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { sidebarConfig } from "../../config/sidebarConfig.js";
import barPageApi from "../../api/barPageApi.js";
import { cn } from "../../utils/cn";
import { useTranslation } from "react-i18next"; // i18n
import { X } from "lucide-react";

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation();
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

    // Hide register business account menu if user has all three types (Bar, DJ, Dancer)
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
        menus = menus.filter(
          (menu) => menu.label !== registerBusinessLabel && menu.label !== "Đăng ký tài khoản kinh doanh"
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
      // Guard: must have a valid barPageId (GUID-like) and be on bar routes
      const isGuid = typeof barPageId === "string" && /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(barPageId);
      const onBarRoute = location?.pathname?.startsWith?.("/bar");
      if (!barPageId || !isGuid || !onBarRoute) {
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
        // Swallow API errors to avoid noisy console in non-bar contexts or BE downtime
        console.warn("[Sidebar] Skipped table types fetch or backend error.");
        setTableTypes([]);
      } finally {
        setLoadingTableTypes(false);
      }
    };

    // Only fetch if we're in bar context
    const role = activeEntity?.role?.toLowerCase() || activeEntity?.type?.toLowerCase();
    const onBarRoute = location?.pathname?.startsWith?.("/bar");
    if ((role === "bar" || activeEntity?.type === "BarPage") && onBarRoute) {
      fetchTableTypes();
    } else {
      setTableTypes([]);
    }
  }, [barPageId, activeEntity, location?.pathname]);

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
    // Map Vietnamese labels to stable i18n keys without changing config structure
    const labelKeyMap = {
      "Trang chủ": "home",
      "Sự kiện": "events",
      "Tin nhắn": "messages",
      "Hồ sơ": "profile",
      "Bank info": "bankInfo",
      "Dashboard": "dashboard",
      "Nhân sự (DJ, Dancer)": "staff",
      "Lịch diễn": "schedule",
      "Khách hàng / Bar hợp tác": "partners",
      "Đối tác / Bar": "partners",
      "Đánh giá & sao": "reviewsStars",
      "Bar page": "barPage",
      "Cài đặt quán": "barSettings",
      "Quản lý loại bàn": "tableTypesManage",
      "Quản lý bàn": "tablesManage",
      "Quản lý voucher": "vouchersManage",
      "Quản lý combo": "combosManage",
    };
    const kSub = labelKeyMap[subLabel] || subLabel;
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
            message: t('bar.needTableTypes'),
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
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs transition-colors",
            "text-muted-foreground no-underline block truncate",
            isSubActive 
              ? "bg-border text-foreground" 
              : "hover:bg-muted hover:text-foreground",
            isDisabled && "opacity-50 cursor-not-allowed",
            !isDisabled && "cursor-pointer"
          )}
          style={{
            opacity: isDisabled ? 0.5 : 1,
            cursor: isDisabled ? "not-allowed" : "pointer"
          }}
          title={isDisabled ? t('bar.needTableTypes') : subLabel}
        >
          {t(`sidebar.${kSub}`, { defaultValue: subLabel })}
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

    // Map Vietnamese labels to stable keys
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
    return (
      <div key={label + resolvedPath}>
        {subMenu ? (
          // Menu cha có submenu
          <div
            className={cn(
              "block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              "text-muted-foreground no-underline cursor-pointer",
              "flex items-center gap-2.5",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-muted hover:text-foreground"
            )}
            onClick={() => toggleSubMenu(label)}
          >
            {Icon && <Icon size={18} className="flex-shrink-0" />}
            <span className={cn("flex-1 truncate")}>
              {t(`sidebar.${k}`, { defaultValue: label })}
            </span>
            <span className="text-xs flex-shrink-0">{isOpen ? "▾" : "▸"}</span>
          </div>
        ) : (
          // Menu bình thường
          <Link
            to={resolvedPath}
            onClick={(e) => {
              // Ensure navigation always happens (prevent any interference)
              e.preventDefault();
              navigate(resolvedPath);
            }}
            className={cn(
              "block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              "text-muted-foreground no-underline",
              "flex items-center gap-2.5",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-muted hover:text-foreground"
            )}
          >
            {Icon && <Icon size={18} className="flex-shrink-0" />}
            <span className="truncate">{t(`sidebar.${k}`, { defaultValue: label })}</span>
          </Link>
        )}

        {subMenu && isOpen && (
          <ul className={cn(
            "flex flex-col gap-1 mt-1 ml-5 pl-1 border-l-2",
            "border-border/30"
          )}>
            {subMenu.map((sub) => renderSubMenuItem(sub))}
          </ul>
        )}
      </div>
    );
  };

  // Close sidebar when clicking on a menu item on mobile
  const handleMenuItemClick = () => {
    if (window.innerWidth < 768 && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className={cn(
            "fixed inset-0 bg-black/50 z-40",
            "md:hidden"
          )}
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "sticky p-4 rounded-lg",
        "w-[240px] bg-card",
        "border-[0.5px] border-border/20",
        "top-[4.5rem] max-h-[calc(100vh-5.5rem)]",
        "overflow-y-auto overflow-x-hidden",
        // Mobile styles
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50",
        "max-md:w-[280px] max-md:top-0 max-md:max-h-screen",
        "max-md:shadow-xl max-md:border-r",
        "max-md:transform max-md:transition-transform max-md:duration-300",
        isOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
      )}>
        {/* Mobile Close Button */}
        <div className={cn(
          "flex items-center justify-between mb-4 pb-4",
          "border-b border-border/30",
          "max-md:mb-3"
        )}>
          <div className={cn(
            "flex items-center gap-2.5 flex-1 min-w-0"
          )}>
            <div className={cn(
              "flex items-center justify-center rounded-full p-1.5",
              "bg-gradient-to-br from-primary to-secondary",
              "text-primary-foreground w-10 h-10 flex-shrink-0"
            )}>
              {activeEntity.avatar ? (
                <img
                  src={activeEntity.avatar}
                  alt={activeEntity.name}
                  className="rounded-full w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm">👤</span>
              )}
            </div>
            <div className={cn("min-w-0 flex-1")}>
              <h3 className={cn(
                "m-0 text-sm font-semibold text-foreground",
                "truncate"
              )}>
                {activeEntity.name}
              </h3>
              {activeEntity.email && (
                <p className={cn(
                  "m-0 mt-0.5 text-xs text-muted-foreground",
                  "truncate"
                )}>
                  @{activeEntity.email.split("@")[0]}
                </p>
              )}
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className={cn(
              "md:hidden p-2 rounded-lg",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-muted transition-colors",
              "flex-shrink-0"
            )}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className={cn("flex flex-col gap-0.5")}>
          {menus.map((menu) => (
            <div key={menu.label + menu.path} onClick={handleMenuItemClick}>
              {renderMenuItem(menu)}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
