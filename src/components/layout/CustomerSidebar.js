// src/components/layout/Sidebar.js
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import "../../styles/modules/newsfeed.css";

export default function CustomerSidebar() {
  return (
    <aside className="newsfeed-sidebar-left">
      <div className="sidebar-user-profile">
        <div className="sidebar-user-avatar">
          <User size={40} />
        </div>
        <div className="sidebar-user-info">
          <h3>Tên người dùng</h3>
          <p>@username</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <Link to="#" className="sidebar-nav-item"><span>Tin tức</span></Link>
        <Link to="#" className="sidebar-nav-item"><span>Đăng ký tài khoản kinh doanh</span></Link>
        <Link to="#" className="sidebar-nav-item"><span>Hội nhóm</span></Link>
        <Link to="#" className="sidebar-nav-item"><span>Sự kiện</span></Link>
      </nav>
    </aside>
  );
}
