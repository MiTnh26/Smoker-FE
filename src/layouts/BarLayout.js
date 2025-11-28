// src/layouts/BarLayout.js
import { useLocation } from "react-router-dom";
import BarHeader from "../components/layout/Bar/BarHeader"; // giả sử bạn có header riêng cho bar
import Sidebar from "../components/layout/Sidebar";
import RightSidebar from "../components/layout/common/RightSidebar";
import ChatDock from "../components/layout/common/ChatDock";
import "../styles/modules/bar.css";// có thể tạo CSS riêng cho bar

const BarLayout = ({ children }) => {
  const location = useLocation();
  const isDashboard = location.pathname === "/bar/dashboard";
  
  return (
    <div className="bar-layout">
      <BarHeader />    {/* Header trên cùng của Bar */}
      <div className="bar-body">
        <Sidebar/>   {/* Sidebar bên trái */}
        <main className={isDashboard ? "bar-dashboard-main" : ""}>{children}</main>   
        <RightSidebar /> 
      </div>
      <ChatDock />
      {/* Footer nếu cần */}
    </div>
  );
};

export default BarLayout;
