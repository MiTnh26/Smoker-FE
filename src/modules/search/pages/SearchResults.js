import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import searchApi from "../../../api/searchApi";
import FollowButton from "../../../components/common/FollowButton";
import "../../../styles/components/globalSearch.css";

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "users", label: "Người dùng" },
  { key: "bars", label: "Bar" },
  { key: "djs", label: "DJ" },
  { key: "dancers", label: "Dancer" },
];

export default function SearchResults() {
  const navigate = useNavigate();
  const query = useQuery();
  const q = query.get("q") || "";
  const [active, setActive] = useState("all");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ users: [], bars: [], djs: [], dancers: [] });

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await searchApi.searchAll(q);
        if (alive) setData(res);
      } finally {
        if (alive) setLoading(false);
      }
    };
    if (q) run();
    return () => { alive = false; };
  }, [q]);

  const all = useMemo(() => (
    [
      ...data.users.map(x => ({ ...x, _group: "users" })),
      ...data.bars.map(x => ({ ...x, _group: "bars" })),
      ...data.djs.map(x => ({ ...x, _group: "djs" })),
      ...data.dancers.map(x => ({ ...x, _group: "dancers" })),
    ]
  ), [data]);

  const list = active === "all" ? all : (data[active] || []);

  return (
    <div className="container" style={{ padding: 16 }}>
      <h2>Kết quả tìm kiếm cho: "{q}"</h2>

      <div className="gs-tabs" style={{ marginTop: 8, marginBottom: 12 }}>
        {TABS.map(t => (
          <button key={t.key} className={"gs-tab" + (active === t.key ? " active" : "")} onClick={() => setActive(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 12 }}>Đang tìm...</div>
      ) : list.length === 0 ? (
        <div style={{ padding: 12 }}>Không có kết quả</div>
      ) : (
        <ul className="gs-list">
          {list.map(item => (
            <li key={`${item.type}-${item.id}`} className="gs-item">
              <div className="gs-left" onClick={() => onOpenItem(navigate, item)}>
                <img className="gs-avatar" src={item.avatar || "https://via.placeholder.com/36"} alt={item.name} />
                <div>
                  <div className="gs-name">{item.name}</div>
                  <div className="gs-type">{item.type}</div>
                </div>
              </div>
              {(() => {
                const itemEntityAccountId = item.raw?.EntityAccountId || item.raw?.entityAccountId || item.id || "";
                return itemEntityAccountId && (
                  <FollowButton followingId={itemEntityAccountId} followingType={mapType(item.type)} />
                );
              })()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function mapType(t) {
  const x = String(t || "").toUpperCase();
  if (x === "BAR") return "BAR";
  return "USER";
}

function onOpenItem(navigate, item) {
  // Check if this is the current user's own profile/entity
  // Logic synchronized with GlobalSearch and ProfilePage
  try {
    const sessionRaw = localStorage.getItem("session");
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      const active = session?.activeEntity || {};
      const entities = session?.entities || [];
      const account = session?.account || {};
      
      const itemType = String(item.type || "").toUpperCase();
      // Use EntityAccountId from raw if available, otherwise use id
      const itemEntityAccountId = item.raw?.EntityAccountId || item.raw?.entityAccountId || item.id || "";
      const itemId = String(itemEntityAccountId).toLowerCase();
      
      // Get current user's EntityAccountId
      const currentUserEntityId = 
        active.EntityAccountId ||
        active.entityAccountId ||
        active.id ||
        account.EntityAccountId ||
        account.entityAccountId ||
        entities.find(e => e.type === "Account")?.EntityAccountId ||
        entities.find(e => e.type === "Account")?.entityAccountId ||
        entities[0]?.EntityAccountId ||
        entities[0]?.entityAccountId ||
        null;
      
      // Check if item matches current user's Account
      if (itemType === "USER" || itemType === "ACCOUNT") {
        if (currentUserEntityId && String(currentUserEntityId).toLowerCase() === itemId) {
          navigate("/customer/profile");
          return;
        }
      }
      
      // Check if item matches current user's activeEntity (only exact match)
      // Different roles (even from same AccountId) are considered different profiles
      const activeEntityAccountId = active.EntityAccountId || active.entityAccountId || null;
      if (activeEntityAccountId && String(activeEntityAccountId).toLowerCase() === itemId) {
        // Navigate to own profile page based on active role
        // Use the entity's id (not EntityAccountId) for route params
        if (active.type === "BarPage" || active.type === "BAR") {
          // Use BarPageId for bar route
          const barPageId = active.id || active.BarPageId || active.barPageId;
          if (barPageId) {
            navigate(`/bar/${barPageId}`);
          } else {
            navigate("/customer/profile");
          }
        } else if (active.type === "Business" || active.type === "BusinessAccount") {
          const businessId = active.id || active.BusinessAccountId || active.businessAccountId;
          if (active.role && active.role.toLowerCase() === "dj") {
            if (businessId) {
              navigate(`/dj/${businessId}`);
            } else {
              navigate("/customer/profile");
            }
          } else if (active.role && active.role.toLowerCase() === "dancer") {
            if (businessId) {
              navigate(`/dancer/${businessId}`);
            } else {
              navigate("/customer/profile");
            }
          } else {
            navigate("/customer/profile");
          }
        } else {
          navigate("/customer/profile");
        }
        return;
      }
    }
  } catch (error) {
    console.error("[SearchResults] Error checking own profile:", error);
  }
  
  // All items (BAR, DJ, DANCER, USER) should navigate to /profile/:id
  // Use EntityAccountId from raw if available, otherwise use id
  const itemEntityAccountId = item.raw?.EntityAccountId || item.raw?.entityAccountId || item.id || "";
  navigate(`/profile/${itemEntityAccountId}`);
}


