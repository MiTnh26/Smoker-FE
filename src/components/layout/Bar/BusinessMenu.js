import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { User, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import businessApi from "../../../api/businessApi";
import "../../../styles/layouts/usermenu.css";

export default function BusinessMenu({ onClose }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const storedBusiness = JSON.parse(localStorage.getItem("business"));
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUser(storedUser);
    if (storedBusiness) {
      setBusiness(storedBusiness);
      businessApi.getBusinessesByAccountId(storedBusiness.AccountId || storedBusiness.id)
        .then(res => setBusinesses(res?.data || []))
        .catch(err => {
          console.error(err);
          setBusinesses([]);
        });
    }
  }, []);

  const handleBusinessClick = (b) => {
    // Lưu business mới vào localStorage
    localStorage.setItem("business", JSON.stringify(b));
    setBusiness(b);

    // Điều hướng
    switch (b.Role) {
      case "bar":
        navigate(`/business/bar/${b.BussinessAccountId}`);
        break;
      case "dj":
        navigate(`/business/dj/${b.BussinessAccountId}`);
        break;
      case "dancer":
        navigate(`/business/dancer/${b.BussinessAccountId}`);
        break;
      default:
        alert("Role không hợp lệ, không thể vào profile");
        return;
    }

    // Gọi onClose để đóng menu
    onClose?.();
  };

  const handleBackToUser = () => {
    localStorage.removeItem("business"); // Xóa business
    navigate("/customer/profile"); // Trở về trang cá nhân
    onClose?.();
  };

  if (!business) return null;

  // Lọc bỏ business hiện tại khỏi danh sách
  const otherBusinesses = businesses.filter(b => b.BussinessAccountId !== business.BussinessAccountId);

  return (
    <aside className="user-menu-sidebar">
      <div className="user-menu">
        <div className="user-menu-header">
          <div className="user-menu-avatar">
            {business.Avatar ? <img src={business.Avatar} alt={business.UserName} /> : <User size={48} />}
          </div>
          <div className="user-menu-info">
            <h3>{business.UserName}</h3>
            <p>Xem trang doanh nghiệp của bạn</p>
          </div>
        </div>

        {/* Trở lại trang cá nhân */}
        {user && (
          <button
            className="user-menu-item"
            style={{ margin: "10px 0", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
            onClick={handleBackToUser}
          >
            <div className="user-menu-avatar">
              {user.avatar ? <img src={user.avatar} alt={user.userName} /> : <User size={28} />}
            </div>
            <span>{user.userName}</span>
            <h4>Trở lại trang cá nhân</h4>
          </button>
        )}

        {/* Danh sách business khác */}
        {otherBusinesses.length > 0 && (
          <div className="user-menu-businesses">
            <ul>
              <h4>Doanh nghiệp của bạn</h4>
              {(showAll ? otherBusinesses : otherBusinesses.slice(0, 2)).map(b => (
                <li
                  key={b.BussinessAccountId}
                  onClick={() => handleBusinessClick(b)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="user-menu-avatar">
                    {b.Avatar ? <img src={b.Avatar} alt={b.UserName} /> : <User size={28} />}
                  </div>
                  <span>{b.UserName}</span> ({b.Role})
                </li>
              ))}
            </ul>

            {otherBusinesses.length > 2 && (
              <button className="toggle-businesses" onClick={() => setShowAll(!showAll)}>
                {showAll ? "Ẩn bớt" : `Xem thêm (${otherBusinesses.length - 2})`}
                {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="user-menu-nav">
          <Link to="#" className="user-menu-item"><span>Cài đặt và quyền riêng tư</span></Link>
          <Link to="#" className="user-menu-item"><span>Cài đặt</span></Link>
          <Link to="#" className="user-menu-item"><span>Chế độ tối</span></Link>
          <Link to="#" className="user-menu-item"><span>Ngôn ngữ</span></Link>
          <Link to="/login" className="user-menu-item logout"><span>Đăng xuất</span></Link>
        </nav>
      </div>
    </aside>
  );
}
