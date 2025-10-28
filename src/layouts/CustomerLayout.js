// src/layouts/CustomerLayout.js
import CustomerHeader from "../components/layout/Customer/CustomerHeader";

// import Footer from "../components/layout/Footer";
import Sidebar from "../components/layout/Sidebar";
import RightSidebar from "../components/layout/common/RightSidebar";
import ChatDock from "../components/layout/common/ChatDock";
import "../styles/modules/customer.css";



const CustomerLayout = ({ children }) => (
  <div className="customer-layout">
    <CustomerHeader />   {/* Header trên cùng */}
    <div className="customer-body">
      <Sidebar />   {/* Sidebar trái */}
      <main>{children}</main>   {/* Cột nội dung trung tâm */}
      <RightSidebar /> {/* Sidebar phải: contacts */}
    </div>
    <ChatDock />
    {/* <Footer /> */}
  </div>
);

export default CustomerLayout;
