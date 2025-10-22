import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, ChevronDown, ChevronUp } from "lucide-react";
import "../../../styles/layouts/usermenu.css";

export default function BarMenu({ onClose }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeEntity, setActiveEntity] = useState(null);
  const [entities, setEntities] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("session"));
    if (!session) return;

    setUser(session.account);
    setEntities(session.entities || []);
    setActiveEntity(session.entities?.find(e => e.id === session.activeEntity?.id) || null);
  }, []);

  if (!activeEntity) return null;

  const handleEntityClick = (entity) => {
    const session = JSON.parse(localStorage.getItem("session")) || {};
    session.activeEntity = entity;
    localStorage.setItem("session", JSON.stringify(session));
    setActiveEntity(entity);

    // Điều hướng dựa theo type
    switch (entity.type) {
      case "BarPage":
        navigate(`/bar/${entity.id}`);
        break;
      case "DJPage":
        navigate(`/dj/${entity.id}`);
        break;
      case "DancerPage":
        navigate(`/dancer/${entity.id}`);
        break;
      default:
        alert("Loại entity không hợp lệ");
        return;
    }

    onClose?.();
  };

  const handleBackToUser = () => {
    const session = JSON.parse(localStorage.getItem("session")) || {};
    delete session.activeEntity;
    localStorage.setItem("session", JSON.stringify(session));
    setActiveEntity(null);

    navigate("/customer/profile");
    onClose?.();
  };

  // Lọc các entity khác, bỏ loại "Account"
  const otherEntities = entities.filter(
    e => e.id !== activeEntity.id && e.type !== "Account"
  );

  return (
    <aside className="user-menu-sidebar">
      <div className="user-menu">
        <div className="user-menu-header">
          <div className="user-menu-avatar">
            {activeEntity.avatar ? <img src={activeEntity.avatar} alt={activeEntity.name || activeEntity.UserName} /> : <User size={48} />}
          </div>
          <div className="user-menu-info">
            <h3>{activeEntity.name || activeEntity.UserName}</h3>
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

        {/* Danh sách entity khác */}
        {otherEntities.length > 0 && (
          <div className="user-menu-businesses">
            <ul>
              <h4>Doanh nghiệp / Page của bạn</h4>
              {(showAll ? otherEntities : otherEntities.slice(0, 2)).map(e => (
                <li
                  key={e.id}
                  onClick={() => handleEntityClick(e)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="user-menu-avatar">
                    {e.avatar ? <img src={e.avatar} alt={e.name || e.UserName} /> : <User size={28} />}
                  </div>
                  <span>{e.name || e.UserName}</span> ({e.type})
                </li>
              ))}
            </ul>

            {otherEntities.length > 2 && (
              <button className="toggle-businesses" onClick={() => setShowAll(!showAll)}>
                {showAll ? "Ẩn bớt" : `Xem thêm (${otherEntities.length - 2})`}
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
