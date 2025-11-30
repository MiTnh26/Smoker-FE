// src/components/layout/common/ContactsPanel.js
import React from "react";
import { useTranslation } from "react-i18next";
import messageApi from "../../../api/messageApi";
import publicProfileApi from "../../../api/publicProfileApi";
import { getEntityMapFromSession } from "../../../utils/sessionHelper";
import { cn } from "../../../utils/cn";

const MAX_CONTACTS = 20; // Hiển thị nhiều hơn trong panel

export default function ContactsPanel({ onClose }) {
  const { t } = useTranslation();
  const [contacts, setContacts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

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
        console.error("[ContactsPanel] Error checking session:", err);
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
    if (!activeEntityId) return;
    
    const fetchRecentContacts = async () => {
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
          activeEntityId;
        
        if (!currentUserEntityId) {
          setLoading(false);
          return;
        }
        
        // Pass currentUserEntityId to backend to filter conversations for this specific role
        const res = await messageApi.getConversations(currentUserEntityId);
        
        // Map conversations and fetch user info
        const conversationsData = res.data?.data || res.data || [];
        const contactsWithTime = await Promise.all(
          conversationsData.map(async (conv) => {
            // Determine the other participant's EntityAccountId from new structure (English fields)
            const participants = conv.participants || [];
            const currentUserIdNormalized = String(currentUserEntityId).toLowerCase().trim();
            const otherParticipantId = participants.find(p => 
              String(p).toLowerCase().trim() !== currentUserIdNormalized
            ) || null;
            
            // Get last message time for sorting from new structure
            const lastMessageTime = conv.last_message_time 
              ? new Date(conv.last_message_time).getTime() 
              : (conv.updatedAt ? new Date(conv.updatedAt).getTime() : 0);
            
            // Fetch user info from EntityAccountId
            let userName = otherParticipantId; // Fallback to ID
            let userAvatar = null;
            let entityId = otherParticipantId;
            
            // Ưu tiên lấy từ session map, tránh gọi API 404 cho BarPage/Business
            try {
              const map = getEntityMapFromSession();
              const targetId = String(otherParticipantId).toLowerCase().trim();
              const cached = map.get(targetId);
              if (cached) {
                userName = cached.name || otherParticipantId;
                userAvatar = cached.avatar || null;
                entityId = otherParticipantId;
              } else {
                // Fallback: vẫn thử API nếu backend có
                try {
                  const profileRes = await publicProfileApi.getByEntityId(otherParticipantId);
                  const profile = profileRes?.data?.data || profileRes?.data || {};
                  userName = profile.name || profile.BarName || profile.userName || otherParticipantId;
                  userAvatar = profile.avatar || profile.Avatar || null;
                  entityId = profile.entityId || otherParticipantId;
                } catch (err) {
                  // Bỏ qua 404, dùng fallback ID
                  if (err?.response?.status !== 404) {
                    console.warn(`[ContactsPanel] Failed to fetch profile for ${otherParticipantId}:`, err?.response?.data || err?.message);
                  }
                }
              }
            } catch (sessionErr) {
              console.warn(`[ContactsPanel] Error resolving profile from session:`, sessionErr);
            }
            
            return {
              id: conv._id,
              name: userName,
              avatar: userAvatar,
              entityId: entityId,
              lastMessageTime: lastMessageTime,
              conversationId: conv._id
            };
          })
        );
        
        // Sort by last message time (most recent first) and limit to MAX_CONTACTS
        const sortedContacts = contactsWithTime
          .sort((a, b) => b.lastMessageTime - a.lastMessageTime)
          .slice(0, MAX_CONTACTS);
        
        setContacts(sortedContacts);
        setLoading(false);
      } catch (error) {
        console.error("[ContactsPanel] Error fetching contacts:", error);
        setLoading(false);
      }
    };
    
    fetchRecentContacts();
  }, [activeEntityId]);

  const getInitial = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const handleContactClick = (contact) => {
    if (window.__openChat) {
      window.__openChat({ 
        id: contact.conversationId, 
        name: contact.name,
        avatar: contact.avatar || null,
        entityId: contact.entityId
      });
      if (onClose) onClose();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">
            {t('layout.loading', { defaultValue: 'Đang tải...' })}
          </p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">
            {t('layout.noContacts', { defaultValue: 'Chưa có liên hệ' })}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {contacts.map((contact) => (
            <li
              key={contact.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                "cursor-pointer transition-colors",
                "hover:bg-muted/50 active:bg-muted"
              )}
              onClick={() => handleContactClick(contact)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleContactClick(contact);
                }
              }}
              tabIndex={0}
            >
              <div className={cn(
                "relative w-10 h-10 rounded-full flex-shrink-0",
                "flex items-center justify-center",
                "bg-gradient-to-br from-primary to-secondary",
                "text-primary-foreground font-semibold text-sm",
                "overflow-hidden"
              )}>
                {contact.avatar ? (
                  <img 
                    src={contact.avatar} 
                    alt={contact.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{getInitial(contact.name)}</span>
                )}
              </div>
              <span className={cn(
                "flex-1 text-sm font-medium text-foreground",
                "truncate"
              )}>
                {contact.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

