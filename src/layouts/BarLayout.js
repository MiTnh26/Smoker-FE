// src/layouts/BarLayout.js
import BarHeader from "../components/layout/Bar/BarHeader"; // giả sử bạn có header riêng cho bar
import Sidebar from "../components/layout/Sidebar";
import "../styles/modules/bar.css";// có thể tạo CSS riêng cho bar

const BarLayout = ({ children }) => (
  <div className="bar-layout">
    <BarHeader />    {/* Header trên cùng của Bar */}
    <div className="bar-body">
      <Sidebar/>   {/* Sidebar bên trái */}
      <main>{children}</main>   
    </div>
    {/* Footer nếu cần */}
  </div>
);

export default BarLayout;
