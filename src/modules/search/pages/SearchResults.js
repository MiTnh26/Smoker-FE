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
              {item.id && (
                <FollowButton followingId={item.id} followingType={mapType(item.type)} />
              )}
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
  // All items (BAR, DJ, DANCER, USER) should navigate to /profile/:id
  navigate(`/profile/${item.id}`);
}


