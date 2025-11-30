// src/layouts/BarLayout.js
import { useState } from "react";
import { useLocation } from "react-router-dom";
import BarHeader from "../components/layout/Bar/BarHeader"; // giả sử bạn có header riêng cho bar
import Sidebar from "../components/layout/Sidebar";
import RightSidebar from "../components/layout/common/RightSidebar";
import ChatDock from "../components/layout/common/ChatDock";
import { Menu } from "lucide-react";
import { cn } from "../utils/cn";
import "../styles/modules/bar.css";// có thể tạo CSS riêng cho bar

const BarLayout = ({ children }) => {
  const location = useLocation();
  const isDashboard = location.pathname === "/bar/dashboard";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="bar-layout">
      <BarHeader />    {/* Header trên cùng của Bar */}
      <div className="bar-body">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className={cn(
            "fixed top-4 left-4 z-50 p-2 rounded-lg",
            "bg-card border border-border/20 shadow-lg",
            "text-foreground hover:bg-muted transition-colors",
            "md:hidden"
          )}
          aria-label="Open sidebar"
        >
          <Menu size={24} />
        </button>

        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />   {/* Sidebar bên trái */}
        <main className={isDashboard ? "bar-dashboard-main" : ""}>{children}</main>   
        <RightSidebar /> 
      </div>
      <ChatDock />
      {/* Footer nếu cần */}
    </div>
  );
};

export default BarLayout;
