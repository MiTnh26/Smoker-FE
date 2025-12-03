// src/layouts/DynamicLayout.js
// Dynamic layout that switches header and menu based on current user role
// Can be used for all routes (Customer, Bar, DJ, Dancer)
// 
// Dependencies:
// - sessionManager: để lấy session và activeEntity
// - CustomerHeader, PageHeader: headers theo role
// - Sidebar, RightSidebar: tự động detect role từ session
// - CSS: customer.css, bar.css cho styling
import React, { useEffect, useState } from "react";
import CustomerHeader from "../components/layout/Customer/CustomerHeader";
import PageHeader from "../components/layout/Bar/PageHeader"; // Shared header for Bar, DJ, Dancer
import Sidebar from "../components/layout/Sidebar";
import RightSidebar from "../components/layout/common/RightSidebar";
import ChatDock from "../components/layout/common/ChatDock";
import MenuContactsPanel from "../components/layout/common/MenuContactsPanel";
import { Menu } from "lucide-react";
import { cn } from "../utils/cn";
import { getSession, getActiveEntity } from "../utils/sessionManager";
import "../styles/modules/customer.css";
import "../styles/modules/bar.css";

const DynamicLayout = ({ children, hideSidebars = false }) => {
  const [currentRole, setCurrentRole] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuContactsOpen, setMenuContactsOpen] = useState(false);

  useEffect(() => {
    // Get current user role from session using sessionManager
    const getCurrentUserRole = () => {
      try {
        const session = getSession();
        if (!session) return null;
        
        const active = getActiveEntity() || session?.activeEntity || {};
        // Only use role, not type. Role can be: customer, bar, dj, dancer
        const role = (active.role || "").toString().toUpperCase();
        return role || null;
      } catch (e) {
        console.warn("[DynamicLayout] Error reading session:", e);
        return null;
      }
    };

    setCurrentRole(getCurrentUserRole());

    // Listen for session changes (e.g., when user switches role)
    const handleStorageChange = (e) => {
      if (e.key === "session") {
        setCurrentRole(getCurrentUserRole());
      }
    };

    // Listen for custom event when session is updated
    const handleSessionUpdate = () => {
      setCurrentRole(getCurrentUserRole());
    };

    // Use globalThis for event listeners
    // eslint-disable-next-line no-undef
    const win = typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : null);
    if (win) {
      win.addEventListener("storage", handleStorageChange);
      win.addEventListener("sessionUpdated", handleSessionUpdate);
      win.addEventListener("profileUpdated", handleSessionUpdate);
    }

    return () => {
      if (win) {
        win.removeEventListener("storage", handleStorageChange);
        win.removeEventListener("sessionUpdated", handleSessionUpdate);
        win.removeEventListener("profileUpdated", handleSessionUpdate);
      }
    };
  }, []);

  // Determine which header to use based on current role
  const renderHeader = () => {
    if (currentRole === "BAR" || currentRole === "BARPAGE") {
      return <PageHeader />;
    }
    // DJ and Dancer also use PageHeader (shared header for Bar, DJ, Dancer)
    if (currentRole === "DJ" || currentRole === "DANCER") {
      return <PageHeader />;
    }
    // Default to CustomerHeader for Customer or unknown roles
    return <CustomerHeader />;
  };

  // Determine layout class based on role
  const layoutClass =
    currentRole === "BAR" || currentRole === "BARPAGE" || currentRole === "DJ" || currentRole === "DANCER"
      ? "bar-layout"
      : "customer-layout";

  // Khi hideSidebars = true (ví dụ trang search), không dùng grid body mặc định để tránh co hẹp nội dung
  const bodyClass = hideSidebars
    ? "w-full min-h-[calc(100vh-64px)] bg-background"
    : currentRole === "BAR" || currentRole === "BARPAGE" || currentRole === "DJ" || currentRole === "DANCER"
      ? "bar-body"
      : "customer-body";

  return (
    <div className={layoutClass}>
      {renderHeader()}
      <div className={bodyClass}>
        {/* Mobile Menu/Contacts Button */}
        <button
          onClick={() => setMenuContactsOpen(true)}
          className={cn(
            "fixed top-16 left-0 z-50 p-2 rounded-r-lg rounded-l-none",
            "bg-card border border-border/20 border-l-0 shadow-lg",
            "text-foreground hover:bg-muted transition-colors",
            "md:hidden"
          )}
          aria-label="Open menu and contacts"
        >
          <Menu size={24} />
        </button>

        {!hideSidebars && (
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />
        )}
        <main>{children}</main>
        {!hideSidebars && <RightSidebar />}
      </div>
      <ChatDock />
      
      {/* Menu & Contacts Panel */}
      <MenuContactsPanel
        isOpen={menuContactsOpen}
        onClose={() => setMenuContactsOpen(false)}
      />
    </div>
  );
};

export default DynamicLayout;

