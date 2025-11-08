import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import searchApi from "../../../api/searchApi";
import FollowButton from "../../common/FollowButton";
import { useNavigate } from "react-router-dom";
import "../../../styles/components/globalSearch.css";

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "users", label: "Người dùng" },
  { key: "bars", label: "Bar" },
  { key: "djs", label: "DJ" },
  { key: "dancers", label: "Dancer" },
];

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState("all");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ users: [], bars: [], djs: [], dancers: [] });
  const [refreshTick, setRefreshTick] = useState(0);

  const debouncedQ = useDebounce(q, 300);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!debouncedQ) {
        setData({ users: [], bars: [], djs: [], dancers: [] });
        return;
      }
      setLoading(true);
      try {
        const res = await searchApi.searchAll(debouncedQ);
        if (alive) setData(res);
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => { alive = false; };
  }, [debouncedQ]);

  const all = useMemo(() => {
    return [
      ...data.users.map(x => ({ ...x, _group: "users" })),
      ...data.bars.map(x => ({ ...x, _group: "bars" })),
      ...data.djs.map(x => ({ ...x, _group: "djs" })),
      ...data.dancers.map(x => ({ ...x, _group: "dancers" })),
    ];
  }, [data]);

  const list = active === "all" ? all : (data[active] || []);

  return (
    <>
      <Search className="search-icon" />
      <input
        type="text"
        placeholder="Tìm người, bar, DJ, dancer..."
        className="search-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && q.trim()) {
            navigate(`/search?q=${encodeURIComponent(q.trim())}`);
          }
        }}
      />
      {q && (
        <div className="gs-dropdown">
          <div className="gs-tabs">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={"gs-tab" + (active === t.key ? " active" : "")}
              >
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
                    <img
                      src={item.avatar || "https://via.placeholder.com/36"}
                      alt={item.name}
                      className="gs-avatar"
                    />
                    <div>
                      <div className="gs-name">{item.name}</div>
                      <div className="gs-type">{item.type}</div>
                    </div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <FollowButton
                      followingId={item.id}
                      followingType={mapType(item.type)}
                      onChange={() => setRefreshTick(v => v + 1)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

function mapType(t) {
  const x = String(t || "").toUpperCase();
  if (x === "BAR") return "BAR";
  if (x === "DJ") return "USER";
  if (x === "DANCER") return "USER";
  if (x === "USER") return "USER";
  return "USER";
}

function useDebounce(value, delay) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setV(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return v;
}

function onOpenItem(navigate, item) {
  const t = String(item.type || "").toUpperCase();
  if (t === "BAR") {
    navigate(`/bar/${item.id}`);
    return;
  }
  navigate(`/profile/${item.id}`);
}


