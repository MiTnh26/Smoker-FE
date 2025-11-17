// src/layouts/DynamicLayout.js
// Dynamic layout that switches header and menu based on current user role
import React, { useEffect, useState } from "react";
import CustomerHeader from "../components/layout/Customer/CustomerHeader";
import BarHeader from "../components/layout/Bar/BarHeader";
import Sidebar from "../components/layout/Sidebar";
import RightSidebar from "../components/layout/common/RightSidebar";
import ChatDock from "../components/layout/common/ChatDock";
import "../styles/modules/customer.css";
import "../styles/modules/bar.css";

const DynamicLayout = ({ children }) => {
  const [currentRole, setCurrentRole] = useState(null);

  useEffect(() => {
    // Get current user role from session
    const getCurrentUserRole = () => {
      try {
        const sessionRaw = localStorage.getItem("session");
        if (!sessionRaw) return null;
        const session = JSON.parse(sessionRaw);
        const active = session?.activeEntity || {};
        const role = (active.role || active.Role || "").toString().toUpperCase();
        return role;
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
      return <BarHeader />;
    }
    // DJ and Dancer also use BarHeader (as seen in DJLayout)
    if (currentRole === "DJ" || currentRole === "DANCER") {
      return <BarHeader />;
    }
    // Default to CustomerHeader for Customer or unknown roles
    return <CustomerHeader />;
  };

  // Determine layout class based on role
  const layoutClass = 
    currentRole === "BAR" || currentRole === "BARPAGE" || currentRole === "DJ" || currentRole === "DANCER"
      ? "bar-layout"
      : "customer-layout";

  const bodyClass = 
    currentRole === "BAR" || currentRole === "BARPAGE" || currentRole === "DJ" || currentRole === "DANCER"
      ? "bar-body"
      : "customer-body";

  return (
    <div className={layoutClass}>
      {renderHeader()}
      <div className={bodyClass}>
        <Sidebar />
        <main>{children}</main>
        <RightSidebar />
      </div>
      <ChatDock />
    </div>
  );
};

export default DynamicLayout;

