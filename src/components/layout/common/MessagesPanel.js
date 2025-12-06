import React from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { Search } from "lucide-react";
import { cn } from "../../../utils/cn";
import messageApi from "../../../api/messageApi";
import publicProfileApi from "../../../api/publicProfileApi";
import { getEntityMapFromSession } from "../../../utils/sessionHelper";
/**
 * MessagesPanel - Hiển thị danh sách tin nhắn
 * Dùng DropdownPanel component chung từ PageHeader/CustomerHeader
 */
export default function MessagesPanel({ onClose, onUnreadCountChange, selectedId }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [conversations, setConversations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [currentUserAvatar, setCurrentUserAvatar] = React.useState(null);
  const [currentUserName, setCurrentUserName] = React.useState("");
  const entityMapRef = React.useRef(getEntityMapFromSession());
  const themeVars = React.useMemo(() => ({
    background: "rgb(var(--background))",
    backgroundSoft: "rgb(var(--background) / 0.92)",
    card: "rgb(var(--card))",
    cardSoft: "rgb(var(--card) / 0.94)",
    border: "rgb(var(--border))",
    borderSoft: "rgb(var(--border) / 0.45)",
    borderStrong: "rgb(var(--border) / 0.75)",
    primary: "rgb(var(--primary))",
    primarySoft: "rgb(var(--primary) / 0.18)",
    foreground: "rgb(var(--foreground))",
    muted: "rgb(var(--muted))",
    mutedForeground: "rgb(var(--muted-foreground))",
    primaryForeground: "rgb(var(--primary-foreground))",
  }), []);
  const tabs = [
    { id: "all", label: t('messages.tabAll') || "All" },
    { id: "unread", label: t('messages.tabUnread') || "Unread" }
  ];
  const [activeTab, setActiveTab] = React.useState("all");

  // Relative time formatter: phút/giờ/ngày trước; >7 ngày => dd/MM; >1 năm => dd/MM/yyyy
  const formatRelativeTime = (date) => {
    try {
      const d = date instanceof Date ? date : new Date(date);
      const now = new Date();
      const diffMs = now - d;
      const minute = 60 * 1000;
      const hour = 60 * minute;
      const day = 24 * hour;
      const week = 7 * day;
      const year = 365 * day;

      if (diffMs < minute) return t('time.justNow') || 'vừa xong';
      if (diffMs < hour) {
        const m = Math.floor(diffMs / minute);
        return t('time.minutesAgo', { minutes: m }) || `${m} phút trước`;
      }
      if (diffMs < day) {
        const h = Math.floor(diffMs / hour);
        return t('time.hoursAgo', { hours: h }) || `${h} giờ trước`;
      }
      if (diffMs < week) {
        const dcount = Math.floor(diffMs / day);
        return t('time.daysAgo', { days: dcount }) || `${dcount} ngày trước`;
      }
      if (diffMs < year) {
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); // dd/MM
      }
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); // dd/MM/yyyy
    } catch {
      return '';
    }
  };

  // Track activeEntity to re-fetch when it changes
  const [activeEntityId, setActiveEntityId] = React.useState(null);

  // Get current user avatar and name from session
  React.useEffect(() => {
    const loadCurrentUser = () => {
      try {
        const session = JSON.parse(localStorage.getItem("session") || "{}");
        const active = session?.activeEntity || {};
        const account = session?.account || {};
        
        // Get avatar from activeEntity first, fallback to account
        const avatar = active.avatar || active.Avatar || account.avatar || account.Avatar || null;
        const name = active.name || active.BarName || active.BusinessName || account.userName || account.email || "";
        
        setCurrentUserAvatar(avatar);
        setCurrentUserName(name);
      } catch (err) {
        console.error("[MessagesPanel] Error loading current user:", err);
      }
    };

    loadCurrentUser();
    window.addEventListener('profileUpdated', loadCurrentUser);
    return () => window.removeEventListener('profileUpdated', loadCurrentUser);
  }, []);

  // Listen for session changes (when switching entities)
  React.useEffect(() => {
    const checkSessionChange = () => {
      try {
        const session = JSON.parse(localStorage.getItem("session") || "{}");
        const active = session?.activeEntity || {};
        const entities = session?.entities || [];
        
        const currentEntityId =
          active.EntityAccountId ||
          active.entityAccountId ||
          entities.find(e => String(e.id) === String(active.id) && e.type === active.type)?.EntityAccountId ||
          entities[0]?.EntityAccountId ||
          active.id ||
          null;
        
        setActiveEntityId(currentEntityId);
        entityMapRef.current = getEntityMapFromSession();
      } catch (err) {
        console.error("[MessagesPanel] Error checking session:", err);
      }
    };

    // Check immediately
    checkSessionChange();

    // Listen for profileUpdated event (fired when switching entities)
    window.addEventListener('profileUpdated', checkSessionChange);
    
    // Also poll for changes (fallback)
    const interval = setInterval(checkSessionChange, 1000);

    return () => {
      window.removeEventListener('profileUpdated', checkSessionChange);
      clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    if (!activeEntityId) return; // Wait for activeEntityId to be set
    
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const session = JSON.parse(localStorage.getItem("session") || "{}");
        const active = session?.activeEntity || {};
        const entities = session?.entities || [];
        
        // Get current user EntityAccountId FIRST
        const currentUserEntityId =
          active.EntityAccountId ||
          active.entityAccountId ||
          entities.find(e => String(e.id) === String(active.id) && e.type === active.type)?.EntityAccountId ||
          entities[0]?.EntityAccountId ||
          activeEntityId; // Use tracked activeEntityId as fallback
        
        console.log('[MessagesPanel] Resolved currentUserEntityId:', currentUserEntityId, 'from activeEntity:', {
          id: active.id,
          type: active.type,
          EntityAccountId: active.EntityAccountId,
          entityAccountId: active.entityAccountId
        });
        
        if (!currentUserEntityId) {
          console.warn('[MessagesPanel] ⚠️ No currentUserEntityId found, cannot fetch conversations');
          setLoading(false);
          return;
        }
        
        // Pass currentUserEntityId to backend to filter conversations for this specific role
        console.log('[MessagesPanel] Fetching conversations for EntityAccountId:', currentUserEntityId);
        const res = await messageApi.getConversations(currentUserEntityId);
        console.log('[MessagesPanel] Received conversations:', res.data?.data?.length || res.data?.length || 0, 'conversations');
        
        // Map conversations and fetch user info for each
        // Response structure: { success: true, data: conversations, ... }
        const conversationsData = res.data?.data || res.data || [];
        // Use Promise.allSettled instead of Promise.all to handle individual failures
        const resolveProfile = async (entityAccountId) => {
          if (!entityAccountId) return null;

          const key = String(entityAccountId).toLowerCase();
          const cached = entityMapRef.current.get(key);
          if (cached) {
            return {
              name: cached.name || cached.raw?.displayName || entityAccountId,
              avatar: cached.avatar || null,
              entityId: entityAccountId,
            };
          }

          try {
            const res = await publicProfileApi.getByEntityId(entityAccountId);
            const data = res?.data?.data || res?.data || {};
            return {
              name: data.name || data.BarName || data.BusinessName || data.userName || data.UserName || entityAccountId,
              avatar: data.avatar || data.Avatar || null,
              entityId: entityAccountId,
            };
          } catch (err) {
            if (err?.response?.status === 404) {
              return { name: entityAccountId, avatar: null, entityId: entityAccountId };
            }
            throw err;
          }
        };

        const mappedResults = await Promise.allSettled(
          conversationsData.map(async (conv) => {
            // Use English fields only
            const participants = conv.participants || [];
            const currentUserIdNormalized = String(currentUserEntityId || "").toLowerCase().trim();
            
            // Find other participant (not the current user)
            const otherParticipantId = participants.find(p => 
              String(p).toLowerCase().trim() !== currentUserIdNormalized
            ) || null;
            
            if (!otherParticipantId) {
              console.warn('[MessagesPanel] ⚠️ Could not determine other participant for conversation:', conv._id, {
                participants: conv.participants,
                currentUserEntityId
              });
            }
            
            // Fetch user info from EntityAccountId
            let userName = otherParticipantId || "Unknown"; // Fallback to ID or "Unknown"
            let userAvatar = null;
            let entityId = otherParticipantId;
            
            // Skip if otherParticipantId is null
            if (!otherParticipantId) {
              console.warn('[MessagesPanel] Skipping profile fetch for conversation:', conv._id, 'because otherParticipantId is null');
              return {
                id: conv._id,
                name: "Unknown User",
                avatar: null,
                entityId: null,
                lastMessage: "",
                time: "",
                unread: 0
              };
            }

            const profile = await resolveProfile(otherParticipantId);
            if (profile) {
              // Check status from conversation data (new structure: participantStatuses) or profile
              const status = conv.participantStatuses?.[otherParticipantId] || 
                           conv.participant1Status || 
                           conv.participant2Status || 
                           profile.status;
              
              if (status === 'banned') {
                userName = "người dùng Smoker";
                userAvatar = null; // Ẩn avatar
              } else {
                userName = profile.name || userName;
                userAvatar = profile.avatar || null;
              }
              entityId = profile.entityId || otherParticipantId;
            }
            
            // Get last message content and time from new structure (English fields only)
            let lastMessageText = conv.last_message_content || "";
            let timeText = "";
            
            // Format time from last_message_time
            if (conv.last_message_time) {
              timeText = formatRelativeTime(conv.last_message_time);
            } else if (conv.updatedAt) {
              timeText = formatRelativeTime(conv.updatedAt);
            }
            
            // Get unread count from new structure
            let unreadCount = conv.unreadCount || 0;
            
            return {
              id: conv._id,
              name: userName,
              avatar: userAvatar,
              entityId: entityId, // Store entityId for opening chat
              lastMessage: lastMessageText,
              time: timeText,
              unread: unreadCount
            };
          })
        );
        
        // Process Promise.allSettled results - filter out rejected promises and extract values
        const mapped = mappedResults
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value);
        
        // Log any rejected promises for debugging
        const rejected = mappedResults.filter(result => result.status === 'rejected');
        if (rejected.length > 0) {
          console.warn(`[MessagesPanel] ${rejected.length} conversation(s) failed to load:`, rejected.map(r => r.reason));
        }
        
        setConversations(mapped);
        
        // Calculate total unread messages
        const totalUnread = mapped.reduce((sum, conv) => sum + (conv.unread || 0), 0);
        
        // Notify parent of unread count change
        if (onUnreadCountChange) {
          onUnreadCountChange(totalUnread);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("[MessagesPanel] Error fetching conversations:", error);
        setLoading(false);
        // Notify parent that there are no unread messages on error
        if (onUnreadCountChange) {
          onUnreadCountChange(0);
        }
      }
    };
    
    fetchConversations();

    // Listen for the global message refresh event
    const handleRefresh = () => fetchConversations();
    window.addEventListener("messageRefresh", handleRefresh);

    return () => {
      window.removeEventListener("messageRefresh", handleRefresh);
    };
  }, [activeEntityId, onUnreadCountChange]);

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeTab === "unread") return conv.unread > 0;
    // groups & communities not implemented yet -> return all
    return true;
  });

  const getInitial = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <div
      className={cn("flex h-full flex-col min-h-0")}
      style={{ background: themeVars.cardSoft, color: themeVars.foreground }}
    >
      {/* Search bar */}
      <div className="px-4 pt-3">
        <div
          className="flex items-center gap-2 rounded-full px-3 py-2"
          style={{
            border: `1px solid ${themeVars.borderSoft}`,
            background: themeVars.muted,
            color: themeVars.mutedForeground,
          }}
        >
          <Search size={16} className="flex-shrink-0" />
        <input
          type="text"
          placeholder={t('messages.searchPlaceholder')}
            className="flex-1 border-none bg-transparent text-sm outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
            style={{ color: themeVars.foreground }}
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 text-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-full px-4 py-1.5 font-medium transition"
              )}
              style={
                activeTab === tab.id
                  ? {
                      background: themeVars.primarySoft,
                      color: themeVars.primary,
                    }
                  : {
                      background: "transparent",
                      color: themeVars.mutedForeground,
                    }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations list */}
      <div
        className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden px-2 pb-2"
        style={{ background: themeVars.cardSoft }}
      >
        {loading ? (
          <div className={cn(
            "py-10 px-5 text-center text-muted-foreground"
          )}>
            <p className={cn("m-0")}>{t('messages.loading') || 'Đang tải...'}</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className={cn(
            "py-10 px-5 text-center text-muted-foreground"
          )}>
            <p className={cn("m-0")}>{t('messages.empty')}</p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              className={cn(
                "flex items-start gap-3 rounded-2xl px-4 py-3",
                "cursor-pointer text-left w-full transition-all duration-200 shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
                selectedId && String(selectedId) === String(conv.id) && "shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
              )}
              style={{
                background: selectedId && String(selectedId) === String(conv.id) ? themeVars.primarySoft : themeVars.card,
                border: `1px solid ${selectedId && String(selectedId) === String(conv.id) ? themeVars.primary : themeVars.borderSoft}`,
                color: themeVars.foreground,
              }}
              onClick={() => {
                // Optimistically clear unread and mark as read
                setConversations((prev) =>
                  prev.map((c) => (String(c.id) === String(conv.id) ? { ...c, unread: 0 } : c))
                );
                try { if (activeEntityId) messageApi.markMessagesRead(conv.id, activeEntityId).catch(() => {}); } catch {}
                try { window.dispatchEvent(new Event("messageRefresh")); } catch {}
                if (window.__openChat) {
                  window.__openChat({ 
                    id: conv.id, 
                    name: conv.name,
                    avatar: conv.avatar,
                    entityId: conv.entityId
                  });
                }
                onClose?.();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (window.__openChat) {
                    window.__openChat({ 
                      id: conv.id, 
                      name: conv.name,
                      avatar: conv.avatar,
                      entityId: conv.entityId
                    });
                  }
                  onClose?.();
                }
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                style={{
                  background: `linear-gradient(135deg, ${themeVars.primary} 0%, ${themeVars.primarySoft} 100%)`,
                  color: themeVars.primaryForeground,
                }}
              >
                {conv.avatar ? (
                  <img 
                    src={conv.avatar} 
                    alt={conv.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitial(conv.name)
                )}
              </div>
              <div className={cn("flex-1 min-w-0")}>
                <h4 className={cn(
                  "m-0 mb-1 text-[15px] font-semibold",
                  "overflow-hidden text-ellipsis whitespace-nowrap"
                )} style={{ color: themeVars.foreground }}>
                  {conv.name}
                </h4>
                <p className={cn(
                  "m-0 text-muted-foreground text-[13px]",
                  "overflow-hidden text-ellipsis whitespace-nowrap"
                )} style={{ color: themeVars.mutedForeground }}>
                  {conv.lastMessage}
                </p>
              </div>
              <div className={cn(
                "flex flex-col items-end gap-1 flex-shrink-0"
              )}>
                <span className={cn(
                  "text-muted-foreground text-[12px]"
                )} style={{ color: themeVars.mutedForeground }}>
                  {conv.time}
                </span>
                {conv.unread > 0 && (
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-bold min-w-[18px] text-center"
                  )} style={{ background: themeVars.primary, color: themeVars.primaryForeground }}>
                    {conv.unread > 9 ? '9+' : conv.unread}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

MessagesPanel.propTypes = {
  onClose: PropTypes.func,
  onUnreadCountChange: PropTypes.func,
  selectedId: PropTypes.string,
};

MessagesPanel.defaultProps = {
  onClose: () => {},
  onUnreadCountChange: null,
  selectedId: null,
};