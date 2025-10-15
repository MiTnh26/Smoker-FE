// src/layouts/CustomerLayout.js
import CustomerHeader from "../components/layout/CustomerHeader";

// import Footer from "../components/layout/Footer";
import Sidebar from "../components/layout/Sidebar";
import "../styles/modules/customer.css";



const CustomerLayout = ({ children }) => (
  <div className="customer-layout">
    <CustomerHeader />   {/* Header trên cùng */}
    <div className="customer-body">
      <Sidebar />   {/* Sidebar bên trái */}
      <main>{children}</main>   {/* Content bên phải */}
    </div>
    {/* <Footer /> */}
  </div>
);

export default CustomerLayout;
