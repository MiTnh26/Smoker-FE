// src/components/layout/UserMenu.js
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, ChevronDown, ChevronUp } from "lucide-react";
import axiosClient from "../../../api/axiosClient"; // nếu bạn có API endpoint để lấy entities
import "../../../styles/layouts/usermenu.css";

export default function UserMenu({ onClose }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [entities, setEntities] = useState([]); // danh sách các entity (pages)
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  // Áp dụng theme khi component mount hoặc theme thay đổi
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Helper: lấy accountId tương thích nhiều tên
  const getAccountId = (acc) => acc?.id || acc?.AccountId || acc?.ID || null;

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("session"));
    if (!stored) {
      console.warn("UserMenu: không tìm thấy session trong localStorage");
      return;
    }

    // Chuẩn hoá account object fields (userName, avatar, role)
    const account = {
      ...stored.account,
      userName: stored.account?.userName || stored.account?.UserName || "",
      avatar: stored.account?.avatar || stored.account?.Avatar || "",
      role: (stored.account?.role || stored.account?.Role || "customer").toLowerCase(),
    };

    // Nếu session.activeEntity là chỉ id, hãy cố gắng tìm object tương ứng trong entities
    let localEntities = Array.isArray(stored.entities) ? stored.entities : [];

    // chuẩn hoá các entity: đảm bảo có id, name, role, avatar
    localEntities = localEntities.map((it) => ({
      ...it,
      id: it.id || it.BarPageId || it.AccountId || it.BussinessAccountId || it.BusinessAccountId || null,
      name: it.name || it.BarName || it.UserName || it.userName || "",
      avatar: it.avatar || it.Avatar || "",
      role: (it.role || it.Role || it.type || "").toLowerCase() || "",
      type: it.type || (it.BarPageId ? "BarPage" : it.AccountId ? "Account" : it.type) || "",
    }));

    // nếu không có entities trong session, fallback gọi API (nếu có endpoint)
    const accountId = getAccountId(stored.account);
    const fetchIfNeeded = async () => {
      if (!localEntities.length && accountId) {
        // gọi API để lấy entities nếu bạn có endpoint; nếu ko muốn gọi, chỉ set fallback
        try {
          setLoading(true);
          const res = await axiosClient.get(`/user/${accountId}/entities`);
          // axiosClient trả data có thể nằm ở res.data: tùy impl
          const data = res?.data?.data ?? res?.data ?? res;
          const normalized = (Array.isArray(data) ? data : []).map((it) => ({
            ...it,
            id: it.id || it.BarPageId || it.AccountId || it.BussinessAccountId || it.BusinessAccountId || null,
            name: it.name || it.BarName || it.UserName || it.userName || "",
            avatar: it.avatar || it.Avatar || "",
            role: (it.role || it.Role || it.type || "").toLowerCase() || "",
            type: it.type || (it.BarPageId ? "BarPage" : it.AccountId ? "Account" : it.type) || "",
          }));
          localEntities = normalized;
        } catch (err) {
          console.error("UserMenu: fetch entities error", err);
          setError("Không tải được danh sách trang. Hiển thị dữ liệu cục bộ nếu có.");
          // fallback: nếu stored.entities rỗng, tạo 1 entity từ account
          if (!localEntities.length && accountId) {
            localEntities = [
              {
                id: accountId,
                name: account.userName,
                avatar: account.avatar,
                role: account.role,
                type: "Account",
              },
            ];
          }
        } finally {
          setLoading(false);
        }
      }

      // ensure account entity exists in list
      const hasAccount = localEntities.some((e) => String(e.id) === String(accountId));
      if (!hasAccount && accountId) {
        localEntities.unshift({
          id: accountId,
          name: account.userName,
          avatar: account.avatar,
          role: account.role,
          type: "Account",
        });
      }

      // determine activeEntity object
      let active = null;
      if (stored.activeEntity && stored.activeEntity.id) {
        active = localEntities.find((e) => String(e.id) === String(stored.activeEntity.id)) || {
          ...stored.activeEntity,
          role: stored.activeEntity.role || (stored.activeEntity.type || "").toLowerCase(),
        };
      } else {
        // default active = first entity (account)
        active = localEntities[0] || null;
      }

      // lưu lại session chuẩn hoá
      const newSession = {
        ...stored,
        account,
        entities: localEntities,
        activeEntity: active,
      };
      localStorage.setItem("session", JSON.stringify(newSession));
      setSession(newSession);
      setEntities(localEntities);
    };

    fetchIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) return null;

  const { account, activeEntity } = session;

  // Hiển thị entities khác (bỏ entity đang active)
  const filteredEntities = (entities || []).filter((e) => String(e.id) !== String(activeEntity?.id));
  const visibleEntities = showAll ? filteredEntities : filteredEntities.slice(0, 2);

  const renderAvatar = (src, size = 48) => (src ? <img src={src} alt="avatar" /> : <User size={size} />);

  const handleSwitchEntity = async (entity) => {
    // cập nhật session.activeEntity mà vẫn giữ entities
    const newActive = {
      ...entity,
      role: (entity.role || entity.type || "").toLowerCase(),
    };
    const newSession = { ...session, activeEntity: newActive, entities: entities };
    localStorage.setItem("session", JSON.stringify(newSession));
    setSession(newSession);
    await new Promise((res) => setTimeout(res, 50));
    // điều hướng theo role (dùng role chứ không dùng type)
    const role = (newActive.role).toLowerCase();
    switch (role) {
      case "bar":

        navigate(`/bar/${newActive.id}`);
        break;
      case "dj":
        navigate(`/${role}/${newActive.id}`);
        console.log("duong dan", `/${role}/${newActive.id}`)
        break;
      case "dancer":
        navigate(`/${role}/${newActive.id}`);
        console.log("dan", `/${role}/${newActive.id}`)
        break;
      case "customer":

      default:
        navigate(`/user/${newActive.id}`);
        break;
    }

    onClose?.();
  };

  const handleLogout = () => {
    localStorage.removeItem("session");
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <aside className="user-menu-sidebar">
      <div className="user-menu">
        {/* HEADER: click -> chuyển về account (profile) */}
        <div
          className="user-menu-header"
          onClick={() =>
            handleSwitchEntity({
              id: account.id || account.AccountId,
              name: account.userName || account.UserName,
              avatar: account.avatar,
              role: account.role,
              type: "Account",
            })
          }
        >
          <div className="user-menu-avatar">{renderAvatar(account.avatar)}</div>
          <div className="user-menu-info">
            <h3>{account.userName || account.UserName || "(User)"}</h3>
            <p>Xem trang cá nhân của bạn</p>
          </div>
        </div>

        {/* ENTITIES */}
        {loading && <div className="entities-loading">Đang tải...</div>}
        {error && <div className="entities-error" style={{ color: "red" }}>{error}</div>}

        {entities && entities.length > 0 ? (
          <div className="user-menu-businesses">
            <h4>Trang / Doanh nghiệp của bạn</h4>
            <ul>
              {visibleEntities.map((e) => (
                <li
                  key={e.id}
                  onClick={() => handleSwitchEntity(e)}
                  className={`entity-item ${String(activeEntity?.id) === String(e.id) ? "active" : ""}`}
                  style={{ cursor: "pointer" }}
                >
                  <div className="user-menu-avatar">{renderAvatar(e.avatar, 48)}</div>
                  <span>{e.name || "(Không tên)"}</span> <small>({e.role})</small>
                </li>
              ))}
            </ul>

            {filteredEntities.length > 2 && (
              <button className="toggle-businesses" onClick={() => setShowAll(!showAll)}>
                {showAll ? "Ẩn bớt" : `Xem thêm (${filteredEntities.length - 2})`}
                {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        ) : (
          <p style={{ padding: "8px 16px", color: "#888" }}>Bạn chưa có Trang / Doanh nghiệp khác.</p>
        )}

        {/* MENU */}
        <nav className="user-menu-nav">
          <Link to="#" className="user-menu-item">
            <span>Cài đặt & quyền riêng tư</span>
          </Link>
          <button
            onClick={() => {
              const next =
                theme === "light"
                  ? "dark"
                  : theme === "dark"
                  ? "bw"
                  : theme === "bw"
                  ? "liquidglass"
                  : "light";
              setTheme(next);
            }}
            className="user-menu-item flex justify-between items-center"
          >
            <span>Chế độ giao diện</span>
            <span className="text-sm opacity-70">
              {theme === "light"
                ? "🌞 Sáng"
                : theme === "dark"
                ? "🌙 Tối"
                : theme === "bw"
                ? "⚫⚪ Đen trắng"
                : "🪟 LiquidGlass"}
            </span>
          </button>

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
