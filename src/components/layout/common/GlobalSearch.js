import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import searchApi from "../../../api/searchApi";
import FollowButton from "../../common/FollowButton";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../utils/cn";

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
    <div className={cn("relative flex items-center gap-2 flex-1")}>
      <Search className={cn("text-muted-foreground flex-shrink-0")} size={20} />
      <input
        type="text"
        placeholder="Tìm người, bar, DJ, dancer..."
        className={cn(
          "flex-1 border-none bg-transparent outline-none text-sm",
          "text-foreground placeholder:text-muted-foreground"
        )}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && q.trim()) {
            navigate(`/search?q=${encodeURIComponent(q.trim())}`);
          }
        }}
      />
      {q && (
        <div className={cn(
          "absolute top-[calc(100%+6px)] left-0 right-0 z-[60]",
          "bg-card border-[0.5px] border-border/20 rounded-lg",
          "max-h-[420px] overflow-auto p-2",
          "shadow-[0_8px_24px_rgba(0,0,0,0.32)]"
        )}>
          <div className={cn("flex gap-2 px-2 py-1")}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg border-[0.5px] border-border/20",
                  "bg-transparent text-foreground cursor-pointer",
                  "transition-all duration-200 text-sm",
                  active === t.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted/50"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className={cn("p-3 text-muted-foreground text-sm")}>Đang tìm...</div>
          ) : list.length === 0 ? (
            <div className={cn("p-3 text-muted-foreground text-sm")}>Không có kết quả</div>
          ) : (
            <ul className={cn("list-none m-0 p-0")}>
              {list.map(item => (
                <li 
                  key={`${item.type}-${item.id}`} 
                  className={cn(
                    "flex items-center justify-between px-2.5 py-2",
                    "border-b border-border/30 last:border-b-0"
                  )}
                >
                  <div 
                    className={cn("flex items-center gap-2.5 cursor-pointer flex-1")}
                    onClick={() => onOpenItem(navigate, item)}
                  >
                    <img
                      src={item.avatar || "https://via.placeholder.com/36"}
                      alt={item.name}
                      className={cn("w-9 h-9 rounded-full object-cover")}
                    />
                    <div>
                      <div className={cn("font-semibold text-foreground text-sm")}>
                        {item.name}
                      </div>
                      <div className={cn("text-xs text-muted-foreground/80")}>
                        {item.type}
                      </div>
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
    </div>
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


