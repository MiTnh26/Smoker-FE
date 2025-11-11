import React from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { Search } from "lucide-react";
import { cn } from "../../../utils/cn";
import messageApi from "../../../api/messageApi";
import publicProfileApi from "../../../api/publicProfileApi";
/**
 * MessagesPanel - Hiển thị danh sách tin nhắn
 * Dùng DropdownPanel component chung từ BarHeader/CustomerHeader
 */
export default function MessagesPanel({ onClose, onUnreadCountChange }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [conversations, setConversations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

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
        const mappedResults = await Promise.allSettled(
          conversationsData.map(async (conv) => {
            // Determine the other participant's EntityAccountId
            const participant1 = String(conv["Người 1"] || "").toLowerCase().trim();
            const participant2 = String(conv["Người 2"] || "").toLowerCase().trim();
            const currentUserIdNormalized = String(currentUserEntityId || "").toLowerCase().trim();
            
            const otherParticipantId = 
              participant1 === currentUserIdNormalized 
                ? conv["Người 2"] 
                : participant2 === currentUserIdNormalized
                ? conv["Người 1"]
                : null; // Fallback if neither matches
            
            if (!otherParticipantId) {
              console.warn('[MessagesPanel] ⚠️ Could not determine other participant for conversation:', conv._id, {
                participant1: conv["Người 1"],
                participant2: conv["Người 2"],
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
            
            // First, check if this entityId belongs to the current user's entities (own bar/business)
            try {
              const sessionRaw = localStorage.getItem("session");
              if (sessionRaw) {
                const session = JSON.parse(sessionRaw);
                const entities = session?.entities || [];
                
                // Normalize otherParticipantId for comparison (case-insensitive, trimmed)
                const targetEntityId = String(otherParticipantId).toLowerCase().trim();
                
                // Check if otherParticipantId matches any of user's own entities
                const ownEntity = entities.find(e => {
                  const entityAccountId = String(e.EntityAccountId || e.entityAccountId || "").toLowerCase().trim();
                  return entityAccountId === targetEntityId;
                });
                
                if (ownEntity) {
                  // Use data from session (own entity)
                  userName = ownEntity.name || otherParticipantId;
                  userAvatar = ownEntity.avatar || null;
                  entityId = otherParticipantId;
                } else {
                  // If not found in session, try API call
                  try {
                    const profileRes = await publicProfileApi.getByEntityId(otherParticipantId);
                    console.log(`[MessagesPanel] Raw API response for ${otherParticipantId}:`, profileRes);
                    
                    // Backend returns: { success: true, data: { name, avatar, ... } }
                    const profile = profileRes?.data?.data || profileRes?.data || {};
                    console.log(`[MessagesPanel] Extracted profile for ${otherParticipantId}:`, profile);
                    console.log(`[MessagesPanel] Profile fields - name: ${profile.name}, BarName: ${profile.BarName}, userName: ${profile.userName}, UserName: ${profile.UserName}`);
                    
                    // Backend returns: { name, avatar, ... } for all entity types
                    // For BarPage: name = BarName (from SQL AS name)
                    // For BusinessAccount: name = UserName (from SQL AS name)
                    // For Account: name = UserName (from SQL AS name)
                    userName = profile.name || profile.BarName || profile.BusinessName || profile.userName || profile.UserName || otherParticipantId;
                    userAvatar = profile.avatar || profile.Avatar || null;
                    entityId = profile.entityId || otherParticipantId;
                    
                    console.log(`[MessagesPanel] Final userName for ${otherParticipantId}: ${userName}`);
                    
                    if (userName === otherParticipantId) {
                      console.warn(`[MessagesPanel] ⚠️ Could not get name for ${otherParticipantId}, using ID as fallback. Profile data:`, JSON.stringify(profile));
                    }
                  } catch (err) {
                    // Handle 404 and other errors gracefully
                    console.error(`[MessagesPanel] ❌ Error fetching profile for ${otherParticipantId}:`, {
                      status: err?.response?.status,
                      statusText: err?.response?.statusText,
                      data: err?.response?.data,
                      message: err?.message,
                      stack: err?.stack
                    });
                    
                    if (err?.response?.status === 404) {
                      console.warn(`[MessagesPanel] Entity not found in API for ${otherParticipantId} - EntityAccountId may not exist in database`);
                      // Don't show "Người dùng đã xóa" immediately - try to use fallback from conversation or ID
                      // Only show "Người dùng đã xóa" if we truly cannot identify the user
                      // For now, use a generic name or the EntityAccountId as fallback
                      const shortId = otherParticipantId && otherParticipantId.length > 8 
                        ? `${otherParticipantId.substring(0, 8)}...` 
                        : otherParticipantId;
                      userName = shortId ? `User ${shortId}` : "Người dùng";
                    } else {
                      console.warn(`[MessagesPanel] Failed to fetch profile for ${otherParticipantId}:`, err?.response?.data || err?.message);
                      // Keep fallback to ID for other errors
                      userName = otherParticipantId;
                    }
                  }
                }
              } else {
                // No session, try API call
                try {
                  const profileRes = await publicProfileApi.getByEntityId(otherParticipantId);
                  console.log(`[MessagesPanel] Raw API response for ${otherParticipantId}:`, profileRes);
                  
                  const profile = profileRes?.data?.data || profileRes?.data || {};
                  console.log(`[MessagesPanel] Extracted profile for ${otherParticipantId}:`, profile);
                  
                  // Backend returns: { name, avatar, ... } for all entity types
                  userName = profile.name || profile.BarName || profile.BusinessName || profile.userName || profile.UserName || otherParticipantId;
                  userAvatar = profile.avatar || profile.Avatar || null;
                  entityId = profile.entityId || otherParticipantId;
                  
                  console.log(`[MessagesPanel] Final userName for ${otherParticipantId}: ${userName}`);
                  
                  if (userName === otherParticipantId) {
                    console.warn(`[MessagesPanel] ⚠️ Could not get name for ${otherParticipantId}, using ID as fallback. Profile data:`, JSON.stringify(profile));
                  }
                } catch (err) {
                  console.error(`[MessagesPanel] ❌ Error fetching profile for ${otherParticipantId}:`, {
                    status: err?.response?.status,
                    statusText: err?.response?.statusText,
                    data: err?.response?.data,
                    message: err?.message
                  });
                  
                  if (err?.response?.status === 404) {
                    console.warn(`[MessagesPanel] Entity not found in API for ${otherParticipantId}, using fallback`);
                    // Don't show "Người dùng đã xóa" - use generic name or ID
                    const shortId = otherParticipantId && otherParticipantId.length > 8 
                      ? `${otherParticipantId.substring(0, 8)}...` 
                      : otherParticipantId;
                    userName = shortId ? `User ${shortId}` : "Người dùng";
                  } else {
                    console.warn(`[MessagesPanel] Failed to fetch profile for ${otherParticipantId}:`, err?.response?.data || err?.message);
                    // Keep fallback to ID for other errors
                    userName = otherParticipantId;
                  }
                }
              }
            } catch (sessionErr) {
              console.warn(`[MessagesPanel] Error checking session entities:`, sessionErr);
              // Fallback to API call
              try {
                const profileRes = await publicProfileApi.getByEntityId(otherParticipantId);
                console.log(`[MessagesPanel] Raw API response for ${otherParticipantId}:`, profileRes);
                
                const profile = profileRes?.data?.data || profileRes?.data || {};
                console.log(`[MessagesPanel] Extracted profile for ${otherParticipantId}:`, profile);
                
                // Backend returns: { name, avatar, ... } for all entity types
                userName = profile.name || profile.BarName || profile.BusinessName || profile.userName || profile.UserName || otherParticipantId;
                userAvatar = profile.avatar || profile.Avatar || null;
                entityId = profile.entityId || otherParticipantId;
                
                console.log(`[MessagesPanel] Final userName for ${otherParticipantId}: ${userName}`);
                
                if (userName === otherParticipantId) {
                  console.warn(`[MessagesPanel] ⚠️ Could not get name for ${otherParticipantId}, using ID as fallback. Profile data:`, JSON.stringify(profile));
                }
              } catch (err) {
                console.error(`[MessagesPanel] ❌ Error fetching profile for ${otherParticipantId}:`, {
                  status: err?.response?.status,
                  statusText: err?.response?.statusText,
                  data: err?.response?.data,
                  message: err?.message
                });
                
                if (err?.response?.status === 404) {
                  console.warn(`[MessagesPanel] Entity not found in API for ${otherParticipantId}, using fallback`);
                  // Don't show "Người dùng đã xóa" - use generic name or ID
                  userName = `User ${otherParticipantId.substring(0, 8)}...` || "Người dùng";
                } else {
                  console.warn(`[MessagesPanel] Failed to fetch profile for ${otherParticipantId}:`, err?.response?.data || err?.message);
                  // Keep fallback to ID for other errors
                  userName = otherParticipantId;
                }
              }
            }
            
            // Lấy tin nhắn cuối cùng
            const messages = Object.values(conv["Cuộc Trò Chuyện"] || {});
            const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
            const lastTime = lastMsg ? new Date(lastMsg["Gửi Lúc"]) : null;
            
            // Count unread messages
            let unreadCount = 0;
            if (currentUserEntityId && messages.length > 0) {
              unreadCount = messages.filter(msg => {
                const senderId = String(msg["Người Gửi"] || "").toLowerCase().trim();
                const currentUserIdNormalized = String(currentUserEntityId).toLowerCase().trim();
                return senderId !== currentUserIdNormalized && !msg["Đã Đọc"];
              }).length;
            }
            
            return {
              id: conv._id,
              name: userName,
              avatar: userAvatar,
              entityId: entityId, // Store entityId for opening chat
              lastMessage: lastMsg ? lastMsg["Nội Dung Tin Nhắn"] : "",
              time: lastTime ? formatRelativeTime(lastTime) : "",
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
  }, [activeEntityId, onUnreadCountChange]); // Re-fetch when activeEntityId changes

  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitial = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={cn("flex h-full flex-col min-h-0")}>
      {/* Search bar */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-3",
        "border-b border-border/30"
      )}>
        <Search size={16} className="text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder={t('messages.searchPlaceholder')}
          className={cn(
            "flex-1 border-none bg-transparent outline-none text-sm",
            "text-foreground placeholder:text-muted-foreground"
          )}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Conversations list */}
      <div className={cn(
        "flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden"
      )}>
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
                "flex items-start gap-3 px-4 py-3",
                "bg-transparent border-none cursor-pointer",
                "text-left w-full transition-all duration-200",
                "hover:bg-muted/50",
                "active:scale-[0.98]"
              )}
              onClick={() => {
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
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                "bg-gradient-to-br from-primary to-secondary",
                "text-primary-foreground text-sm font-semibold"
              )}>
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
                  "m-0 mb-1 text-foreground text-[15px] font-semibold",
                  "overflow-hidden text-ellipsis whitespace-nowrap"
                )}>
                  {conv.name}
                </h4>
                <p className={cn(
                  "m-0 text-muted-foreground text-[13px]",
                  "overflow-hidden text-ellipsis whitespace-nowrap"
                )}>
                  {conv.lastMessage}
                </p>
              </div>
              <div className={cn(
                "flex flex-col items-end gap-1 flex-shrink-0"
              )}>
                <span className={cn(
                  "text-muted-foreground text-[12px]"
                )}>
                  {conv.time}
                </span>
                {conv.unread > 0 && (
                  <span className={cn(
                    "bg-primary text-primary-foreground rounded-full",
                    "px-1.5 py-0.5 text-[11px] font-bold min-w-[18px]",
                    "text-center"
                  )}>
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
};

MessagesPanel.defaultProps = {
  onClose: () => {},
  onUnreadCountChange: null,
};