import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, ChevronDown, ChevronUp } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import "../../styles/layouts/usermenu.css";

export default function UserMenu({ onClose }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [entities, setEntities] = useState([]); // riêng để dễ quản lý
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🧠 Load session từ localStorage và fetch entities từ backend
  useEffect(() => {
    const storedSession = JSON.parse(localStorage.getItem("session"));
    if (!storedSession) {
      console.warn("Không tìm thấy session trong localStorage!");
      return;
    }
    setSession(storedSession);

    const accountId = storedSession?.account?.AccountId || storedSession?.account?.id;
    if (!accountId) {
      console.warn("session thiếu account id");
      return;
    }

    async function loadEntities() {
      setLoading(true);
      setError("");
      try {
        const data = await axiosClient.get(`/user/${accountId}/entities`);

        // Data kỳ vọng: [{ type, id, name, avatar, role }, ...]
        // Nhưng nếu backend trả khác (ví dụ: BarPageId...), chuẩn hóa lại
        const normalized = (Array.isArray(data) ? data : []).map((it) => {
          // if already normalized
          if (it.type && it.id) return it;

          // fallback heuristics
          if (it.BarPageId) {
            return {
              type: "BarPage",
              id: it.BarPageId,
              name: it.BarName || it.name || "",
              avatar: it.Avatar || it.avatar || "",
              role: it.Role || "bar",
            };
          }
          if (it.BussinessAccountId || it.BusinessAccountId) {
            return {
              type: "BusinessAccount",
              id: it.BussinessAccountId || it.BusinessAccountId,
              name: it.UserName || it.name || "",
              avatar: it.Avatar || it.avatar || "",
              role: (it.Role || "business"),
            };
          }
          if (it.AccountId || it.id) {
            return {
              type: "Account",
              id: it.AccountId || it.id,
              name: it.UserName || it.name || "",
              avatar: it.Avatar || it.avatar || "",
              role: it.Role || "customer",
            };
          }
          // final fallback: keep as-is
          return {
            type: it.type || "Unknown",
            id: it.id || JSON.stringify(it),
            name: it.name || it.UserName || "",
            avatar: it.avatar || it.Avatar || "",
            role: it.role || it.Role || "",
          };
        });

        // đảm bảo account chính đứng đầu nếu không có trong list
        const accountNormalized = {
          type: "Account",
          id: accountId,
          name: storedSession.account?.UserName || storedSession.account?.userName || "",
          avatar: storedSession.account?.Avatar || storedSession.account?.avatar || "",
          role: storedSession.account?.Role || storedSession.account?.role || "customer",
        };

        // merge: nếu normalized không chứa accountId thì unshift
        const hasAccount = normalized.some((e) => String(e.id) === String(accountId));
        const merged = hasAccount ? normalized : [accountNormalized, ...normalized];

        setEntities(merged);

        // cập nhật session.entities + activeEntity mặc định nếu chưa có
        const newSession = {
          ...storedSession,
          entities: merged,
          activeEntity: storedSession.activeEntity || { type: "Account", id: accountId },
        };
        localStorage.setItem("session", JSON.stringify(newSession));
        setSession(newSession);
      } catch (err) {
        console.error("Load entities error:", err);
        setError(err.message || "Lỗi khi tải entities");

        // Fallback: create a basic entity from session data
        const fallbackEntity = {
          type: "Account",
          id: accountId,
          name: storedSession.account?.UserName || storedSession.account?.userName || "User",
          avatar: storedSession.account?.Avatar || storedSession.account?.avatar || "",
          role: storedSession.account?.Role || storedSession.account?.role || "customer",
        };
        setEntities([fallbackEntity]);
      } finally {
        setLoading(false);
      }
    }

    loadEntities();
  }, []);

  if (!session) return null;

  const { account, activeEntity } = session;
  // Lọc entities: loại bỏ customer và entity đang active
  const filteredEntities = (entities || []).filter(
    (e) => e.type !== "Account" && e.id !== activeEntity?.id
  );

  // Giới hạn số hiển thị mặc định, nếu không showAll = true thì show tất cả
  const visibleEntities = showAll ? filteredEntities : filteredEntities.slice(0, 2);


  // navigate dựa trên entity.type và role (chuẩn hóa)
  const handleSwitchEntity = (entity) => {
    const newSession = { ...session, activeEntity: { type: entity.type, id: entity.id } };
    localStorage.setItem("session", JSON.stringify(newSession));
    setSession(newSession);

    const t = (entity.type || "").toLowerCase();
    if (t === "account") {
      navigate(`/user/${entity.id}`);
    } else if (t === "barpage" || t === "bar") {
      console.log("bar", t)
      console.log("entity.id", entity.id)
      navigate(`/bar/${entity.id}`);
    } else if (t === "businessaccount" || t === "business") {
      const role = (entity.role || "").toLowerCase();
      // mặc định dj nếu không biết
      if (role === "dj" || role === "dancer") {
        navigate(`/${role}/${entity.id}`);
      } else {
        // general business route fallback
        navigate(`/business/${entity.id}`);
      }
    } else {
      alert("Loại tài khoản không hợp lệ!");
    }

    onClose?.();
  };

  const handleLogout = () => {
    localStorage.removeItem("session");
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  const renderAvatar = (src, size = 48) =>
    src ? <img src={src} alt="avatar" /> : <User size={size} />;

  return (
    <aside className="user-menu-sidebar">
      <div className="user-menu">
        {/* HEADER */}
        <div
          className="user-menu-header"
          onClick={() => handleSwitchEntity({ type: "Account", id: account.AccountId || account.id })}
        >
          <div className="user-menu-avatar">{renderAvatar(account.Avatar || account.avatar)}</div>
          <div className="user-menu-info">
            <h3>{account.UserName || account.userName}</h3>
            <p>Xem trang cá nhân của bạn</p>
          </div>
        </div>

        {/* ENTITIES */}
        {loading && <div className="entities-loading">Đang tải...</div>}
        {error && <div className="entities-error" style={{ color: "red" }}>{error}</div>}

        {entities && entities.length > 0 && (
          <div className="user-menu-businesses">
            <h4>Trang / Doanh nghiệp của bạn</h4>
            <ul>
              {visibleEntities.map((entity) => (
                <li
                  key={entity.id}
                  onClick={() => handleSwitchEntity(entity)}
                  className={`entity-item ${activeEntity?.id === entity.id ? "active" : ""}`}
                  style={{ cursor: "pointer" }}
                >
                  <div className="user-menu-avatar">{renderAvatar(entity.avatar, 88)}</div>
                  <span>{entity.name || "(Không tên)"}</span> <small>({entity.role || entity.type})</small>
                  
                </li>
              ))}
            </ul>

            {entities.length > 2 && (
              <button className="toggle-businesses" onClick={() => setShowAll(!showAll)}>
                {showAll ? "Ẩn bớt" : `Xem thêm (${entities.length - 3})`}
                {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        )}

        {/* MENU */}
        <nav className="user-menu-nav">
          <Link to="#" className="user-menu-item">
            <span>Cài đặt và quyền riêng tư</span>
          </Link>
          <Link to="#" className="user-menu-item">
            <span>Chế độ tối</span>
          </Link>
          <Link to="#" className="user-menu-item">
            <span>Ngôn ngữ</span>
          </Link>
          <button onClick={handleLogout} className="user-menu-item logout">
            <span>Đăng xuất</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}
