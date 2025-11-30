// src/layouts/CustomerLayout.js
import { useState } from "react";
import CustomerHeader from "../components/layout/Customer/CustomerHeader";

// import Footer from "../components/layout/Footer";
import Sidebar from "../components/layout/Sidebar";
import RightSidebar from "../components/layout/common/RightSidebar";
import ChatDock from "../components/layout/common/ChatDock";
import { Menu } from "lucide-react";
import { cn } from "../utils/cn";
import "../styles/modules/customer.css";



const CustomerLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
  <div className="customer-layout">
    <CustomerHeader />   {/* Header trên cùng */}
    <div className="customer-body">
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
        />   {/* Sidebar trái */}
      <main>{children}</main>   {/* Cột nội dung trung tâm */}
      <RightSidebar /> {/* Sidebar phải: contacts */}
    </div>
    <ChatDock />
    {/* <Footer /> */}
  </div>
);
};

export default CustomerLayout;
