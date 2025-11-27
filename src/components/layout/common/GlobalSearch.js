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
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

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
      {/* Mobile overlay when search is expanded */}
      {isMobileExpanded && (
        <div
          className={cn(
            "fixed inset-0 bg-black/50 backdrop-blur-sm z-40",
            "md:hidden"
          )}
          onClick={() => {
            setIsMobileExpanded(false);
            setQ("");
          }}
        />
      )}
      <div className={cn(
        "relative flex items-center gap-2 flex-1",
        "sm:flex-initial sm:gap-0"
      )}>
        {/* Mobile: Icon only button */}
        <button
          onClick={() => setIsMobileExpanded(true)}
          className={cn(
            "md:hidden rounded-lg p-2 flex items-center justify-center",
            "transition-all duration-200 cursor-pointer",
            "text-muted-foreground hover:text-primary hover:bg-primary/10",
            "active:scale-95",
            "sm:p-1.5"
          )}
          aria-label="Search"
        >
          <Search size={20} className="sm:w-5 sm:h-5" />
        </button>

        {/* Desktop: Full search bar, Mobile: Expanded search */}
        <div className={cn(
          "relative flex items-center gap-2 flex-1",
          "max-sm:fixed max-sm:top-0 max-sm:left-0 max-sm:right-0 max-sm:z-50",
          "max-sm:bg-card max-sm:border-b max-sm:border-border/20",
          "max-sm:px-3 max-sm:py-2.5 max-sm:shadow-lg",
          !isMobileExpanded && "max-sm:hidden"
        )}>
        <button
          onClick={() => {
            setIsMobileExpanded(false);
            setQ("");
          }}
          className={cn(
            "md:hidden rounded-lg p-1 flex items-center justify-center",
            "transition-all duration-200 cursor-pointer",
            "text-muted-foreground hover:text-foreground",
            "mr-1"
          )}
          aria-label="Close search"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <Search className={cn("text-muted-foreground flex-shrink-0", "sm:w-4 sm:h-4 md:w-5 md:h-5")} size={20} />
        <input
          type="text"
          placeholder="Tìm người, bar, DJ, dancer..."
          className={cn(
            "flex-1 border-none bg-transparent outline-none text-sm",
            "text-foreground placeholder:text-muted-foreground",
            "sm:text-xs md:text-sm"
          )}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim()) {
              navigate(`/search?q=${encodeURIComponent(q.trim())}`);
              setIsMobileExpanded(false);
            }
            if (e.key === "Escape") {
              setIsMobileExpanded(false);
              setQ("");
            }
          }}
          autoFocus={isMobileExpanded}
        />
        {q && (
          <div className={cn(
            "absolute top-[calc(100%+6px)] left-0 right-0 z-[60] w-full",
            "bg-card/95 backdrop-blur-md border-[0.5px] border-border/20 rounded-2xl",
            "max-h-[420px] overflow-auto p-2 hide-scrollbar",
            "shadow-[0_18px_50px_rgba(0,0,0,0.45)]",
            "sm:max-h-[60vh] sm:rounded-t-none sm:border-t-0",
            "sm:w-[380px] sm:left-auto sm:right-0 sm:translate-x-[200px] sm:transform"
          )}>
          <div className={cn("flex gap-2 px-2 py-1", "sm:gap-1 sm:px-1 sm:py-0.5 sm:overflow-x-auto")}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg border-[0.5px] border-border/20",
                  "bg-transparent text-foreground cursor-pointer",
                  "transition-all duration-200 text-sm",
                  "flex-shrink-0",
                  active === t.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted/50",
                  "sm:px-2 sm:py-1 sm:text-xs"
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
            <ul className={cn("list-none m-0 p-0 space-y-1")}>
              {list.map(item => (
                <li 
                  key={`${item.type}-${item.id}`} 
                  className={cn(
                    "flex items-center justify-between gap-4 px-2.5 py-2 rounded-xl",
                    "border border-transparent hover:border-border/40 hover:bg-muted/40",
                    "transition-colors duration-150"
                  )}
                >
                  <div 
                    className={cn("flex items-center gap-2.5 cursor-pointer flex-1")}
                    onClick={() => onOpenItem(navigate, item, setIsMobileExpanded, setQ)}
                  >
                    <img
                      src={item.avatar || "https://via.placeholder.com/36"}
                      alt={item.name}
                      className={cn("w-9 h-9 rounded-full object-cover", "sm:w-8 sm:h-8")}
                    />
                    <div>
                      <div className={cn("font-semibold text-foreground text-sm", "sm:text-xs")}>
                        {item.name}
                      </div>
                      <div className={cn("text-xs text-muted-foreground/80", "sm:text-[0.7rem]")}>
                        {item.type}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <FollowButton
                      followingId={item.id}
                      followingType={mapType(item.type)}
                      onChange={() => setRefreshTick(v => v + 1)}
                      compact
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          </div>
        )}
        </div>
      </div>
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

function onOpenItem(navigate, item, setIsMobileExpanded, setQ) {
  // Check if this is the current user's own profile/entity
  // Logic synchronized with PublicProfile, BarProfile, DJProfile, DancerProfile
  try {
    const sessionRaw = localStorage.getItem("session");
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      const active = session?.activeEntity || {};
      const entities = session?.entities || [];
      const account = session?.account || {};
      
      const itemType = String(item.type || "").toUpperCase();
      const itemId = String(item.id || "");
      
      // Get current user's EntityAccountId (same logic as PublicProfile)
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
      
      // Check if item matches current user's Account (same logic as PublicProfile)
      if (itemType === "USER" || itemType === "ACCOUNT") {
        if (currentUserEntityId && String(currentUserEntityId).toLowerCase() === itemId.toLowerCase()) {
          navigate("/customer/profile");
          setIsMobileExpanded(false);
          setQ("");
          return;
        }
      }
      
      // Check if item matches current user's Bar (same logic as BarProfile)
      if (itemType === "BAR" || itemType === "BARPAGE") {
        const activeBarPageId = active.type === "BarPage" ? active.id : null;
        const barEntity = entities.find(e => 
          (e.type === "BarPage" || e.type === "BAR")
        );
        
        // Compare with BarPageId
        if (activeBarPageId && String(activeBarPageId).toLowerCase() === itemId.toLowerCase()) {
          navigate(`/bar/${activeBarPageId}`);
          setIsMobileExpanded(false);
          setQ("");
          return;
        }
        if (barEntity && String(barEntity.id).toLowerCase() === itemId.toLowerCase()) {
          navigate(`/bar/${barEntity.id}`);
          setIsMobileExpanded(false);
          setQ("");
          return;
        }
        // Also check EntityAccountId (item.id might be EntityAccountId)
        if (barEntity && String(barEntity.EntityAccountId || barEntity.entityAccountId || "").toLowerCase() === itemId.toLowerCase()) {
          navigate(`/bar/${barEntity.id}`);
          setIsMobileExpanded(false);
          setQ("");
          return;
        }
      }
      
      // Check if item matches current user's DJ (same logic as DJProfile)
      if (itemType === "DJ") {
        const activeEntityAccountId = active.type === "Business" && active.role && active.role.toLowerCase() === "dj" 
          ? (active.EntityAccountId || active.entityAccountId) 
          : null;
        const djEntity = entities.find(e => 
          (e.type === "Business" || e.type === "BusinessAccount") && 
          e.role && e.role.toLowerCase() === "dj"
        );
        
        // Compare with EntityAccountId (businessEntityId)
        if (activeEntityAccountId && String(activeEntityAccountId).toLowerCase() === itemId.toLowerCase()) {
          navigate(`/dj/${active.id}`);
          setIsMobileExpanded(false);
          setQ("");
          return;
        }
        if (djEntity && String(djEntity.EntityAccountId || djEntity.entityAccountId || "").toLowerCase() === itemId.toLowerCase()) {
          navigate(`/dj/${djEntity.id}`);
          setIsMobileExpanded(false);
          setQ("");
          return;
        }
      }
      
      // Check if item matches current user's Dancer (same logic as DancerProfile)
      if (itemType === "DANCER") {
        const activeEntityAccountId = active.type === "Business" && active.role && active.role.toLowerCase() === "dancer" 
          ? (active.EntityAccountId || active.entityAccountId) 
          : null;
        const dancerEntity = entities.find(e => 
          (e.type === "Business" || e.type === "BusinessAccount") && 
          e.role && e.role.toLowerCase() === "dancer"
        );
        
        // Compare with EntityAccountId (businessEntityId)
        if (activeEntityAccountId && String(activeEntityAccountId).toLowerCase() === itemId.toLowerCase()) {
          navigate(`/dancer/${active.id}`);
          setIsMobileExpanded(false);
          setQ("");
          return;
        }
        if (dancerEntity && String(dancerEntity.EntityAccountId || dancerEntity.entityAccountId || "").toLowerCase() === itemId.toLowerCase()) {
          navigate(`/dancer/${dancerEntity.id}`);
          setIsMobileExpanded(false);
          setQ("");
          return;
        }
      }
    }
  } catch (error) {
    console.error("[GlobalSearch] Error checking own profile:", error);
  }
  
  // Validate item.id before navigating
  if (!item.id) {
    console.error("[GlobalSearch] Item missing id:", item);
    return;
  }
  
  // All items (BAR, DJ, DANCER, USER) should navigate to /profile/:id
  navigate(`/profile/${item.id}`);
  // Close dropdown and clear search
  setIsMobileExpanded(false);
  setQ("");
}


