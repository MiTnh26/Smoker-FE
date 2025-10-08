import React from "react";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import "../../styles/layouts/usermenu.css";

export default function UserMenu({ onClose }) {
  return (
    <aside className="user-menu-sidebar">
      <div className="user-menu">
        <div className="user-menu-header">
          <div className="user-menu-avatar">
            <User size={48} />
          </div>
          <div className="user-menu-info">
            <h3>tên USE</h3>
            <p>Xem trang cá nhân của bạn</p>
          </div>
        </div>

        <nav className="user-menu-nav">
          <Link to="#" className="user-menu-item">
            <span>Cài đặt và quyền riêng tư</span>
          </Link>
          <Link to="#" className="user-menu-item">
            <span>Cài đặt</span>
          </Link>
          <Link to="#" className="user-menu-item">
            <span>Chế độ tối</span>
          </Link>
          <Link to="#" className="user-menu-item">
            <span>Ngôn ngữ</span>
          </Link>
          <Link to="#" className="user-menu-item">
            <span>Trợ giúp và hỗ trợ</span>
          </Link>
          <Link to="#" className="user-menu-item">
            <span>Trợ giúp</span>
          </Link>
          <Link to="#" className="user-menu-item">
            <span>Báo cáo sự cố</span>
          </Link>
          <Link to="#" className="user-menu-item">
            <span>Giới thiệu</span>
          </Link>
          <Link to="/login" className="user-menu-item logout">
            <span>Đăng xuất</span>
          </Link>
        </nav>
      </div>
    </aside>
  );
}
