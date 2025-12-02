// src/layouts/DJLayout.js
import { useState } from "react";
import PageHeader from "../components/layout/Bar/PageHeader"; // Shared header for Bar, DJ, Dancer
import Sidebar from "../components/layout/Sidebar";
import RightSidebar from "../components/layout/common/RightSidebar";
import ChatDock from "../components/layout/common/ChatDock";
import MenuContactsPanel from "../components/layout/common/MenuContactsPanel";
import { Menu } from "lucide-react";
import { cn } from "../utils/cn";
import "../styles/modules/bar.css";

const DJLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuContactsOpen, setMenuContactsOpen] = useState(false);

  return (
    <div className="bar-layout">
      <PageHeader />    {/* Shared header for Bar, DJ, Dancer */}
      <div className="bar-body">
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

        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />   {/* Sidebar bên trái */}
        <main>{children}</main>   
        <RightSidebar /> 
      </div>
      <ChatDock />
      
      {/* Menu & Contacts Panel */}
      <MenuContactsPanel
        isOpen={menuContactsOpen}
        onClose={() => setMenuContactsOpen(false)}
      />
      {/* Footer nếu cần */}
    </div>
  );
};

export default DJLayout;
