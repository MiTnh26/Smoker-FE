/**
 * UnifiedMenu.js
 * A unified menu component for all user types (Customer, Bar, Business)
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next"; // i18n
import { Link, useNavigate } from "react-router-dom";
import { User, ChevronDown, ChevronUp } from "lucide-react";
import {
  normalizeSession,
  normalizeEntity,
} from "../../utils/menuDataNormalizer";
import { menuConfigs, getThemeLabel, getNextTheme, getEntityRoute } from "../../config/menuConfigs";
import "../../styles/components/unifiedMenu.css";

export default function UnifiedMenu({
  onClose,
  userData = null,
  entities = [],
  menuConfig = "customer",
  showBackToAccount = false,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [session, setSession] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  // Get configuration
  const config = menuConfigs[menuConfig] || menuConfigs.customer;

  // Apply theme when it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Load session data
  useEffect(() => {
    try {
      const storedSession = JSON.parse(localStorage.getItem("session"));
      console.log("[UnifiedMenu] Raw session from localStorage:", storedSession);
      if (storedSession) {
        const normalized = normalizeSession(storedSession);
        console.log("[UnifiedMenu] Normalized session:", normalized);
        setSession(normalized);
      } else {
        console.warn("[UnifiedMenu] No session found in localStorage");
      }
    } catch (error) {
      console.error("[UnifiedMenu] Error loading session:", error);
    }
  }, []);

  console.log("[UnifiedMenu] Render - session:", session, "userData:", userData, "entities:", entities);

  // Use provided userData or fallback to session
  const currentUser = userData || session?.account;
  const currentEntities = entities.length > 0 ? entities : session?.entities || [];
  const activeEntity = session?.activeEntity || normalizeEntity(userData);

  console.log("[UnifiedMenu] currentUser:", currentUser, "currentEntities:", currentEntities, "activeEntity:", activeEntity);

  // Check if we have at least some data to display
  const hasData = currentUser || activeEntity || currentEntities.length > 0;
  
  if (!hasData) {
    console.warn("[UnifiedMenu] No data available to display");
    return (
      <div className="unified-menu-loading">
        <p>{t('unifiedMenu.loading')}</p>
      </div>
    );
  }

  // Filter entities based on configuration
  let filteredEntities = [];
  if (activeEntity && currentEntities.length > 0) {
    // Filter out current active entity
    filteredEntities = currentEntities.filter(
      (e) => String(e.id) !== String(activeEntity.id)
    );

    // Filter by entity types if specified in config
    // Also allow DJ/Dancer entities by role if they match Business type
    if (config.entityTypes && config.entityTypes.length > 0) {
      filteredEntities = filteredEntities.filter((e) => {
        // Allow if type matches
        if (config.entityTypes.includes(e.type)) return true;
        // Allow DJ/Dancer if Business is allowed (they are Business type with DJ/Dancer role)
        if (config.entityTypes.includes("Business") && 
            (e.role === "dj" || e.role === "dancer")) return true;
        return false;
      });
    }
  }

  const visibleEntities = showAll
    ? filteredEntities
    : filteredEntities.slice(0, 2);

  const renderAvatar = (src, size = 48) =>
    src ? (
      <img src={src} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    ) : (
      <User size={size} />
    );

  const handleEntitySwitch = (entity) => {
    const normalized = normalizeEntity(entity);
    if (!normalized) return;

    // Update session
    try {
      const currentSession = JSON.parse(localStorage.getItem("session")) || {};
      currentSession.activeEntity = normalized;
      localStorage.setItem("session", JSON.stringify(currentSession));
    } catch (error) {
      console.error("[UnifiedMenu] Error updating session:", error);
    }

    // Navigate to entity
    const route = getEntityRoute(normalized);
    navigate(route);
    onClose?.();
  };

  const handleBackToAccount = () => {
    if (!session?.account) return;

    const accountEntity = {
      id: session.account.id,
      name: session.account.userName,
      avatar: session.account.avatar,
      role: session.account.role,
      type: "Account",
    };

    // Update session
    try {
      const currentSession = JSON.parse(localStorage.getItem("session")) || {};
      currentSession.activeEntity = accountEntity;
      localStorage.setItem("session", JSON.stringify(currentSession));
    } catch (error) {
      console.error("[UnifiedMenu] Error updating session:", error);
    }

    navigate("/customer/profile");
    onClose?.();
  };

  const handleLogout = () => {
    localStorage.removeItem("session");
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  const handleThemeToggle = () => {
    const nextTheme = getNextTheme(theme);
    setTheme(nextTheme);
  };

  const handleMenuItemClick = (item) => {
    if (item.onClick === "handleLogout") {
      handleLogout();
    } else if (item.onClick === "toggleTheme") {
      handleThemeToggle();
    } else if (item.href && !item.href.startsWith("#")) {
      if (item.isLogout) {
        handleLogout();
      } else {
        navigate(item.href);
      }
    }
  };

  return (
    <aside className="user-menu-sidebar">
      <div className="user-menu">
        {/* Header */}
        <div className="user-menu-header">
          <div className="user-menu-avatar">
            {renderAvatar(activeEntity?.avatar || currentUser?.avatar)}
          </div>
          <div className="user-menu-info">
            <h3>{activeEntity?.name || currentUser?.userName || "(User)"}</h3>
            <p>
              {activeEntity?.type === "Account"
                ? t('menu.viewPersonal')
                : t('menu.viewBusiness')}
            </p>
          </div>
        </div>

        {/* Back to Account Button (for Bar/Business menus) */}
        {config.showBackToAccount && session?.account && (
          <button
            className="user-menu-back-to-account"
            onClick={handleBackToAccount}
          >
            <div className="user-menu-avatar user-menu-avatar-small">
              {renderAvatar(session.account.avatar, 28)}
            </div>
            <span>{session.account.userName}</span>
            <h4>{t('menu.backToAccount')}</h4>
          </button>
        )}

        {/* Entities List */}
        {config.showEntities && filteredEntities.length > 0 && (
          <div className="user-menu-businesses">
            <h4>{config.entityLabel || t('unifiedMenu.entityLabel')}</h4>
            <ul>
              {visibleEntities.map((entity) => (
                <li
                  key={entity.id}
                  onClick={() => handleEntitySwitch(entity)}
                  className="entity-item"
                >
                  <div className="user-menu-avatar user-menu-avatar-small">
                    {renderAvatar(entity.avatar, 28)}
                  </div>
                  <span>{entity.name}</span>
                  <small>({entity.role })</small>
                </li>
              ))}
            </ul>

            {filteredEntities.length > 2 && (
              <button
                className="toggle-businesses"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll 
                  ? t('unifiedMenu.showLess') 
                  : t('unifiedMenu.showMore', { count: filteredEntities.length - 2 })}
                {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        )}

        {filteredEntities.length === 0 && config.showEntities && (
          <div className="user-menu-no-entities">
            <p>{t('unifiedMenu.noEntities')}</p>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="user-menu-nav">
          {config.menuItems.map((item) => (
            <React.Fragment key={item.id}>
              {item.onClick === "toggleTheme" ? (
                <button
                  className={`user-menu-item ${item.isLogout ? "logout" : ""}`}
                  onClick={() => handleMenuItemClick(item)}
                >
                  <span>{t(`menu.${item.id}`, { defaultValue: item.label })}</span>
                  <span className="theme-label">{getThemeLabel(theme)}</span>
                </button>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className={`user-menu-item ${item.isLogout ? "logout" : ""}`}
                  onClick={(e) => {
                    if (item.onClick) {
                      e.preventDefault();
                      handleMenuItemClick(item);
                    }
                  }}
                >
                  <span>{t(`menu.${item.id}`, { defaultValue: item.label })}</span>
                </Link>
              ) : (
                <button
                  className={`user-menu-item ${item.isLogout ? "logout" : ""}`}
                  onClick={() => handleMenuItemClick(item)}
                >
                  <span>{t(`menu.${item.id}`, { defaultValue: item.label })}</span>
                </button>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>
    </aside>
  );
}

