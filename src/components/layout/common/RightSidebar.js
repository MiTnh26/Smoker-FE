// src/components/layout/common/RightSidebar.js
import React from "react";
import { useTranslation } from "react-i18next";
import messageApi from "../../../api/messageApi";
import publicProfileApi from "../../../api/publicProfileApi";
import "../../../styles/layouts/rightSidebar.css";

const MAX_CONTACTS = 6; // Chỉ hiển thị 6 liên hệ gần nhất

export default function RightSidebar() {
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
        console.error("[RightSidebar] Error checking session:", err);
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
          activeEntityId; // Use tracked activeEntityId as fallback
        
        if (!currentUserEntityId) {
          setLoading(false);
          return;
        }
        
        // Pass currentUserEntityId to backend to filter conversations for this specific role
        const res = await messageApi.getConversations(currentUserEntityId);
        
        // Map conversations and fetch user info
        // Response structure: { success: true, data: conversations, ... }
        const conversationsData = res.data?.data || res.data || [];
        const contactsWithTime = await Promise.all(
          conversationsData.map(async (conv) => {
            // Determine the other participant's EntityAccountId
            const otherParticipantId = 
              String(conv["Người 1"]) === String(currentUserEntityId) 
                ? conv["Người 2"] 
                : conv["Người 1"];
            
            // Get last message time for sorting
            const messages = Object.values(conv["Cuộc Trò Chuyện"] || {});
            const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
            const lastMessageTime = lastMsg ? new Date(lastMsg["Gửi Lúc"]).getTime() : 0;
            
            // Fetch user info from EntityAccountId
            let userName = otherParticipantId; // Fallback to ID
            let userAvatar = null;
            let entityId = otherParticipantId;
            
            // First, check if this entityId belongs to the current user's entities (own bar/business)
            try {
              const sessionRaw = localStorage.getItem("session");
              if (sessionRaw) {
                const session = JSON.parse(sessionRaw);
                const entities = session?.entities || [];
                const activeEntity = session?.activeEntity;
                
                // Normalize otherParticipantId for comparison (case-insensitive, trimmed)
                const targetEntityId = String(otherParticipantId).toLowerCase().trim();
                
                // Check activeEntity first (most common case)
                let ownEntity = null;
                if (activeEntity) {
                  const activeEntityId = String(activeEntity.id || activeEntity.EntityAccountId || activeEntity.entityAccountId || "").toLowerCase().trim();
                  if (activeEntityId === targetEntityId) {
                    ownEntity = activeEntity;
                  }
                }
                
                // If not found in activeEntity, check entities array
                if (!ownEntity) {
                  ownEntity = entities.find(e => {
                    const entityAccountId = String(e.EntityAccountId || e.entityAccountId || e.id || "").toLowerCase().trim();
                    return entityAccountId === targetEntityId;
                  });
                }
                
                if (ownEntity) {
                  // Use data from session (own entity)
                  userName = ownEntity.name || otherParticipantId;
                  userAvatar = ownEntity.avatar || null;
                  entityId = otherParticipantId;
                } else {
                  // If not found in session, try API call
                  try {
                    const profileRes = await publicProfileApi.getByEntityId(otherParticipantId);
                    const profile = profileRes?.data?.data || profileRes?.data || {};
                    userName = profile.name || profile.BarName || profile.userName || otherParticipantId;
                    userAvatar = profile.avatar || profile.Avatar || null;
                    entityId = profile.entityId || otherParticipantId;
                  } catch (err) {
                    // Handle 404 and other errors gracefully
                    if (err?.response?.status === 404) {
                      console.warn(`[RightSidebar] Entity not found in API for ${otherParticipantId}, using fallback`);
                    } else {
                      console.warn(`[RightSidebar] Failed to fetch profile for ${otherParticipantId}:`, err);
                    }
                  }
                }
              } else {
                // No session, try API call
                try {
                  const profileRes = await publicProfileApi.getByEntityId(otherParticipantId);
                  const profile = profileRes?.data?.data || profileRes?.data || {};
                  userName = profile.name || profile.BarName || profile.userName || otherParticipantId;
                  userAvatar = profile.avatar || profile.Avatar || null;
                  entityId = profile.entityId || otherParticipantId;
                } catch (err) {
                  if (err?.response?.status === 404) {
                    console.warn(`[RightSidebar] Entity not found in API for ${otherParticipantId}, using fallback`);
                  } else {
                    console.warn(`[RightSidebar] Failed to fetch profile for ${otherParticipantId}:`, err);
                  }
                }
              }
            } catch (sessionErr) {
              console.warn(`[RightSidebar] Error checking session entities:`, sessionErr);
              // Fallback to API call
              try {
                const profileRes = await publicProfileApi.getByEntityId(otherParticipantId);
                const profile = profileRes?.data?.data || profileRes?.data || {};
                userName = profile.name || profile.BarName || profile.userName || otherParticipantId;
                userAvatar = profile.avatar || profile.Avatar || null;
                entityId = profile.entityId || otherParticipantId;
              } catch (err) {
                if (err?.response?.status === 404) {
                  console.warn(`[RightSidebar] Entity not found in API for ${otherParticipantId}, using fallback`);
                } else {
                  console.warn(`[RightSidebar] Failed to fetch profile for ${otherParticipantId}:`, err);
                }
              }
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
        console.error("[RightSidebar] Error fetching contacts:", error);
        setLoading(false);
      }
    };
    
    fetchRecentContacts();
  }, [activeEntityId]); // Re-fetch when activeEntityId changes

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
        avatar: contact.avatar || null, // Pass avatar if available
        entityId: contact.entityId
      });
    }
  };

  return (
    <aside className="right-sidebar">
      <div className="right-sidebar__section">
        <h4 className="right-sidebar__title">{t('layout.contacts')}</h4>
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "rgb(var(--muted-foreground))" }}>
            <p style={{ margin: 0, fontSize: "14px" }}>Đang tải...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "rgb(var(--muted-foreground))" }}>
            <p style={{ margin: 0, fontSize: "14px" }}>Chưa có liên hệ</p>
          </div>
        ) : (
          <ul className="right-sidebar__list">
            {contacts.map((contact) => (
              <li
                key={contact.id}
                className="right-sidebar__item"
                onClick={() => handleContactClick(contact)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleContactClick(contact);
                  }
                }}
                tabIndex={0}
              >
                <div className="right-sidebar__avatar" aria-hidden>
                  {contact.avatar ? (
                    <img 
                      src={contact.avatar} 
                      alt={contact.name}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    getInitial(contact.name)
                  )}
                  {/* Online status - có thể thêm logic check online sau */}
                  {/* {contact.online && <span className="right-sidebar__status" />} */}
                </div>
                <span className="right-sidebar__name">{contact.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}


