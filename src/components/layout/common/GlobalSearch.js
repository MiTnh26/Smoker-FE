import React, { useEffect, useMemo, useState, useRef } from "react";
import { Search } from "lucide-react";
import searchApi from "../../../api/searchApi";
import FollowButton from "../../common/FollowButton";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "../../../utils/cn";
import { getAvatarUrl } from "../../../utils/defaultAvatar";
import { getSession } from "../../../utils/sessionManager";

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "users", label: "Người dùng" },
  { key: "bars", label: "Bar" },
  { key: "djs", label: "DJ" },
  { key: "dancers", label: "Dancer" },
];

export default function GlobalSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");
  const [active, setActive] = useState("all");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ users: [], bars: [], djs: [], dancers: [], posts: [] });
  const [refreshTick, setRefreshTick] = useState(0);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(false);

  const debouncedQ = useDebounce(q, 300);
  const searchRef = useRef(null);

  // Đọc query từ URL và set vào input khi vào search page
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlQuery = searchParams.get('q') || '';
    
    // Chỉ sync từ URL khi đang ở search page
    if (location.pathname === '/search') {
      if (urlQuery && urlQuery !== q) {
        setQ(urlQuery);
      } else if (!urlQuery && q) {
        // Nếu URL không có query nhưng input có, giữ nguyên input
        // (user có thể đang nhập)
      }
    }
  }, [location.search, location.pathname]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && searchRef.current && !searchRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Load trending searches khi dropdown mở và chưa có query
  useEffect(() => {
    if (dropdownOpen && !q) {
      const loadTrendingSearches = async () => {
        // Chỉ load nếu chưa có data hoặc đang loading
        if (trendingSearches.length === 0 && !loadingTrending) {
          setLoadingTrending(true);
          try {
            const trends = await searchApi.getTrendingSearches(6);
            setTrendingSearches(trends || []);
          } catch (error) {
            console.error('[GlobalSearch] Error loading trending searches:', error);
            setTrendingSearches([]);
          } finally {
            setLoadingTrending(false);
          }
        }
      };
      loadTrendingSearches();
    }
  }, [dropdownOpen, q]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
        if (!debouncedQ || !String(debouncedQ).trim()) {
        console.log('[GlobalSearch] Empty debounced query, clearing data');
        setData({ users: [], bars: [], djs: [], dancers: [], posts: [] });
        return;
      }
      console.log('[GlobalSearch] Starting search with debounced query:', debouncedQ);
      setLoading(true);
      try {
        const res = await searchApi.searchAll(debouncedQ);
        console.log('[GlobalSearch] Search result received:', {
          resType: typeof res,
          resKeys: res ? Object.keys(res) : [],
          usersCount: res?.users?.length || 0,
          barsCount: res?.bars?.length || 0,
          djsCount: res?.djs?.length || 0,
          dancersCount: res?.dancers?.length || 0,
          fullRes: res
        });
        if (alive) {
          // Ensure all properties exist, default to empty arrays if undefined
          // Đảm bảo posts là array, không phải object
          let postsArray = [];
          if (Array.isArray(res?.posts)) {
            postsArray = res.posts;
          } else if (res?.posts && typeof res.posts === 'object') {
            postsArray = Object.values(res.posts);
            console.warn('[GlobalSearch] Posts was an object, converted to array');
          }
          
          const newData = {
            users: Array.isArray(res?.users) ? res.users : [],
            bars: Array.isArray(res?.bars) ? res.bars : [],
            djs: Array.isArray(res?.djs) ? res.djs : [],
            dancers: Array.isArray(res?.dancers) ? res.dancers : [],
            posts: postsArray, // Đảm bảo luôn là array
          };
          console.log('[GlobalSearch] Setting data:', {
            usersCount: newData.users.length,
            barsCount: newData.bars.length,
            djsCount: newData.djs.length,
            dancersCount: newData.dancers.length
          });
          setData(newData);
        }
      } catch (error) {
        console.error('[GlobalSearch] Error in search:', error);
        if (alive) {
          setData({ users: [], bars: [], djs: [], dancers: [], posts: [] });
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => { alive = false; };
  }, [debouncedQ]);

  const all = useMemo(() => {
    return [
      ...(data.users || []).map(x => ({ ...x, _group: "users" })),
      ...(data.bars || []).map(x => ({ ...x, _group: "bars" })),
      ...(data.djs || []).map(x => ({ ...x, _group: "djs" })),
      ...(data.dancers || []).map(x => ({ ...x, _group: "dancers" })),
    ];
  }, [data]);

  const list = useMemo(() => {
    if (active === "all") return all;
    // Khi ở tab "Người dùng", gộp cả users, djs, và dancers
    if (active === "users") {
      return [
        ...(data.users || []),
        ...(data.djs || []),
        ...(data.dancers || []),
      ];
    }
    // Đối với các tab khác (bars, djs, dancers), chỉ hiển thị dữ liệu tương ứng
    return data[active] || [];
  }, [active, data, all]);

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
            setDropdownOpen(false);
            setQ("");
          }}
        />
      )}
      <div 
        ref={searchRef}
        className={cn(
          "relative flex items-center gap-2 flex-1",
          "sm:flex-initial sm:gap-0"
        )}
      >
        {/* Mobile: Icon only button */}
        <button
          onClick={() => {
            setIsMobileExpanded(true);
            setDropdownOpen(true);
          }}
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
            setDropdownOpen(false);
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
          onChange={(e) => {
            setQ(e.target.value);
            setDropdownOpen(true);
          }}
          onFocus={() => {
            setDropdownOpen(true);
          }}
          onClick={() => {
            setDropdownOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim()) {
              const value = q.trim();
              navigate(`/search?q=${encodeURIComponent(value)}`);
              setIsMobileExpanded(false);
              setDropdownOpen(false);
            }
            if (e.key === "Escape") {
              setIsMobileExpanded(false);
              setDropdownOpen(false);
              setQ("");
            }
          }}
          autoFocus={isMobileExpanded}
        />
        {dropdownOpen && (
          <div className={cn(
            "absolute top-[calc(100%+6px)] left-0 right-0 z-[60] w-full",
            "bg-card/95 backdrop-blur-md border-[0.5px] border-border/20 rounded-2xl",
            "max-h-[420px] overflow-auto p-2 hide-scrollbar",
            "shadow-[0_18px_50px_rgba(0,0,0,0.45)]",
            "sm:max-h-[60vh] sm:rounded-t-none sm:border-t-0",
            "sm:w-[380px] sm:left-auto sm:right-0 sm:translate-x-[200px] sm:transform"
          )}>
          {/* Trending Searches - Hiển thị khi chưa có query */}
          {!q && (
            <div className="space-y-3 px-2 py-3">
              <p className="text-xs font-bold uppercase opacity-50 tracking-wider text-foreground">
                Xu hướng tìm kiếm
              </p>
              {loadingTrending ? (
                <div className="flex items-center justify-center py-2">
                  <div className="text-xs opacity-50 text-muted-foreground">Đang tải...</div>
                </div>
              ) : trendingSearches.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((tag, index) => (
                    <button
                      key={`trending-${index}`}
                      type="button"
                      onClick={() => {
                        setQ(tag);
                        navigate(`/search?q=${encodeURIComponent(tag)}`);
                        setIsMobileExpanded(false);
                        setDropdownOpen(false);
                      }}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-md border transition-all",
                        "hover:brightness-95 hover:border-primary/40",
                        "sm:px-2 sm:py-1 sm:text-xs"
                      )}
                      style={{ 
                        background: "rgb(var(--background))", 
                        borderColor: "rgb(var(--border))",
                        color: "rgb(var(--foreground))"
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs opacity-50 py-2 text-muted-foreground">
                  Chưa có xu hướng tìm kiếm
                </div>
              )}
            </div>
          )}

          {/* Search Results - Hiển thị khi có query */}
          {q && (
            <>
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
                          src={getAvatarUrl(item.avatar, 36)}
                          alt={item.name}
                          className={cn("w-9 h-9 rounded-full object-cover", "sm:w-8 sm:h-8")}
                          onError={(e) => {
                            // Fallback to default avatar if image fails to load
                            e.target.src = getAvatarUrl(null, 36);
                          }}
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
            </>
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
  // Check if this is the current user's own profile (same role)
  try {
    const session = getSession();
    if (session?.activeEntity) {
      const activeEntityAccountId = 
        session.activeEntity.EntityAccountId ||
        session.activeEntity.entityAccountId ||
        null;
      
      // Use EntityAccountId from raw if available, otherwise use id
      const itemEntityAccountId = item.raw?.EntityAccountId || item.raw?.entityAccountId || item.id || "";
      
      // If EntityAccountId matches, redirect to own profile page
      if (activeEntityAccountId && 
          String(activeEntityAccountId).toLowerCase() === String(itemEntityAccountId).toLowerCase()) {
        navigate("/own/profile");
        setIsMobileExpanded(false);
        setQ("");
        return;
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
  // Use EntityAccountId from raw if available, otherwise use id
  const itemEntityAccountId = item.raw?.EntityAccountId || item.raw?.entityAccountId || item.id || "";
  navigate(`/profile/${itemEntityAccountId}`);
  // Close dropdown and clear search
  setIsMobileExpanded(false);
  setQ("");
}


