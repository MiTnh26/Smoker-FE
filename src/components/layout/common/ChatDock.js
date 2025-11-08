import React, { useState, useCallback, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import "../../../styles/layouts/chatdock.css";
import messageApi from "../../../api/messageApi";
import publicProfileApi from "../../../api/publicProfileApi";
import { userApi } from "../../../api/userApi";
import useChatSocket from '../../../api/useChatSocket';

function ChatWindow(props) {
  const { chat, onClose } = props;
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const bodyRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentEntityType, setCurrentEntityType] = useState(null); // EntityType (Account, BarPage, Business)
  const [currentEntityId, setCurrentEntityId] = useState(null); // EntityId (id of the entity, not EntityAccountId)
  const [otherUserInfo, setOtherUserInfo] = useState(null); // { name, avatar, entityId }

  // Track activeEntity to re-fetch when it changes
  const [activeEntityId, setActiveEntityId] = React.useState(null);

  // Listen for session changes (when switching entities)
  useEffect(() => {
    const checkSessionChange = async () => {
      try {
        const { getActiveEntity, getEntities } = await import("../../../utils/sessionManager");
        const active = getActiveEntity() || {};
        const entities = getEntities();
        
        // Priority: EntityAccountId from activeEntity > EntityAccountId from matching entity > id
        const currentEntityId =
          active.EntityAccountId ||
          active.entityAccountId ||
          entities.find(e => String(e.id) === String(active.id) && e.type === active.type)?.EntityAccountId ||
          entities.find(e => String(e.id) === String(active.id) && e.type === active.type)?.entityAccountId ||
          entities[0]?.EntityAccountId ||
          active.id ||
          null;
        
        setActiveEntityId(currentEntityId);
      } catch (err) {
        console.error("[ChatDock] Error checking session:", err);
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

  // Get current user ID from session (entityAccountId) - same as profile pages
  useEffect(() => {
    if (!activeEntityId) return; // Wait for activeEntityId to be set
    
    const resolveCurrentUserId = async () => {
      try {
        const { getSession, getActiveEntity, getEntities, updateSession } = await import("../../../utils/sessionManager");
        const session = getSession();
        
        if (!session) {
          console.warn('⚠️ No session found');
          return;
        }
        
        const active = getActiveEntity() || {};
        const entities = getEntities();
        
        // Priority: EntityAccountId from activeEntity > EntityAccountId from matching entity > fetch from API
        let resolvedId =
          active.EntityAccountId ||
          active.entityAccountId ||
          null;
        
        // If not found in activeEntity, try to find in entities list
        if (!resolvedId && active.id && active.type) {
          const foundEntity = entities.find(
            e => String(e.id) === String(active.id) && 
                 (e.type === active.type || 
                  (e.type === "BusinessAccount" && active.type === "Business"))
          );
          resolvedId = foundEntity?.EntityAccountId || foundEntity?.entityAccountId || null;
        }
        
        // If still not found, try to fetch from API
        if (!resolvedId && active.id && active.type && session?.account?.id) {
          try {
            console.log("[ChatDock] EntityAccountId missing, fetching from API for", active.type, active.id);
            
            // For Account type, use getEntityAccountId
            if (active.type === "Account") {
              const entityAccountRes = await userApi.getEntityAccountId(session.account.id);
              resolvedId = entityAccountRes?.data?.data?.EntityAccountId || null;
              
              if (resolvedId) {
                updateSession({ activeEntity: { ...active, EntityAccountId: resolvedId } });
                console.log("[ChatDock] Updated session with EntityAccountId:", resolvedId);
              }
            } 
            // For BarPage or Business, refresh entities to get EntityAccountId
            else if (active.type === "BarPage" || active.type === "Business") {
              const entitiesRes = await userApi.getEntities(session.account.id);
              const refreshedEntities = entitiesRes?.data?.data || entitiesRes?.data || [];
              
              if (Array.isArray(refreshedEntities) && refreshedEntities.length > 0) {
                const foundEntity = refreshedEntities.find(
                  e => String(e.id) === String(active.id) && 
                       (e.type === active.type || 
                        (e.type === "BusinessAccount" && active.type === "Business"))
                );
                resolvedId = foundEntity?.EntityAccountId || foundEntity?.entityAccountId || null;
                
                // Update session with refreshed entities and activeEntity EntityAccountId
                if (resolvedId) {
                  updateSession({
                    entities: refreshedEntities,
                    activeEntity: {
                      ...active,
                      EntityAccountId: resolvedId
                    }
                  });
                  console.log("[ChatDock] Updated session with EntityAccountId:", resolvedId);
                } else {
                  console.warn("[ChatDock] EntityAccountId not found in refreshed entities for", active.type, active.id);
                }
              }
            }
          } catch (err) {
            console.error("[ChatDock] Failed to fetch EntityAccountId:", err);
            console.error("[ChatDock] Error details:", err?.response?.data || err?.message);
          }
        }
        
        // Final fallback to activeEntityId (tracked value) or id
        if (!resolvedId) {
          resolvedId = activeEntityId || active.id || entities[0]?.id || null;
          if (resolvedId && active.type !== "Account") {
            console.warn("[ChatDock] Using id as fallback instead of EntityAccountId:", resolvedId, "for type:", active.type);
          } else if (!resolvedId) {
            console.error("[ChatDock] ❌ Could not resolve any user ID - EntityAccountId is null");
          }
        }
        
        console.log("[ChatDock] Resolved currentUserId:", resolvedId, "from activeEntity:", active.type, active.id);
        setCurrentUserId(resolvedId || null);
        setCurrentEntityType(active.type || null);
        setCurrentEntityId(active.id || null);
      } catch (err) {
        console.error("❌ Error getting user ID from session:", err);
        setCurrentUserId(null);
      }
    };
    
    resolveCurrentUserId();
  }, [activeEntityId]); // Re-resolve when activeEntityId changes

  // Fetch other user info from conversation
  useEffect(() => {
    const fetchOtherUserInfo = async () => {
      if (!chat.id || !currentUserId) return;
      
      // If avatar and name are already provided in chat object (from MessagesPanel), use them directly
      if (chat.avatar && chat.name && chat.entityId) {
        console.log("[ChatDock] Using avatar and name from chat object:", chat.name);
        setOtherUserInfo({
          name: chat.name,
          avatar: chat.avatar,
          entityId: chat.entityId
        });
        return;
      }
      
      // If entityId is already provided in chat object, use it directly
      if (chat.entityId) {
        // First, check if this entityId belongs to the current user's entities (own bar/business)
        try {
          const { getEntities } = await import("../../../utils/sessionManager");
          const entities = getEntities();
          
          // Normalize entityId for comparison (case-insensitive, trimmed)
          const targetEntityId = String(chat.entityId).toLowerCase().trim();
          
          // Check if entityId matches any of user's own entities
          const ownEntity = entities.find(e => {
            const entityAccountId = String(e.EntityAccountId || e.entityAccountId || "").toLowerCase().trim();
            return entityAccountId === targetEntityId;
          });
          
          if (ownEntity) {
            // Use data from session (own entity)
            console.log("[ChatDock] Found entity in session, using session data:", ownEntity.name);
            setOtherUserInfo({
              name: ownEntity.name || chat.name || "User",
              avatar: ownEntity.avatar || chat.avatar || null,
              entityId: chat.entityId
            });
            return;
          } else {
            console.log("[ChatDock] Entity not found in session entities. Target:", targetEntityId, "Available:", entities.map(e => String(e.EntityAccountId || e.entityAccountId || "").toLowerCase().trim()));
          }
        } catch (sessionErr) {
          console.warn("[ChatDock] Error checking session entities:", sessionErr);
        }
        
        // If not found in session, try API call
        try {
          console.log("[ChatDock] Fetching entity profile from API for:", chat.entityId);
          const profileRes = await publicProfileApi.getByEntityId(chat.entityId);
          const profile = profileRes?.data?.data || profileRes?.data || {};
          console.log("[ChatDock] Successfully fetched entity profile:", profile.name || profile.BarName || profile.BusinessName);
          setOtherUserInfo({
            name: profile.name || profile.BarName || profile.BusinessName || chat.name || "User",
            avatar: profile.avatar || profile.Avatar || chat.avatar || null,
            entityId: chat.entityId
          });
        } catch (err) {
          // Handle 404 and other errors gracefully - don't show as error for 404
          if (err?.response?.status === 404) {
            // Silently use fallback data for 404 - entity might not exist in backend but that's okay
            // This can happen if EntityAccountId was not created properly or was deleted
            console.log("[ChatDock] Entity not found in API (404) for EntityAccountId:", chat.entityId, "- Using fallback data from chat.name:", chat.name);
          } else {
            // Only log as warning for non-404 errors
            console.warn("[ChatDock] Error fetching other user profile:", err?.response?.status || err?.message);
          }
          setOtherUserInfo({
            name: chat.name || "User",
            avatar: chat.avatar || null,
            entityId: chat.entityId
          });
        }
        return;
      }
      
      // Otherwise, fetch from conversation
      try {
        // Get conversations to find the other participant
        const conversationsRes = await messageApi.getConversations();
        const conversations = conversationsRes?.data?.data || conversationsRes?.data || [];
        const conversation = conversations.find(c => 
          String(c._id) === String(chat.id) || 
          String(c.conversationId) === String(chat.id) ||
          String(c.id) === String(chat.id)
        );
        
        if (conversation) {
          // Find other participant
          const participant1 = String(conversation["Người 1"] || conversation.participant1 || "").toLowerCase().trim();
          const participant2 = String(conversation["Người 2"] || conversation.participant2 || "").toLowerCase().trim();
          const currentUserIdNormalized = String(currentUserId).toLowerCase().trim();
          
          let otherUserId = null;
          if (participant1 === currentUserIdNormalized) {
            otherUserId = conversation["Người 2"] || conversation.participant2;
          } else if (participant2 === currentUserIdNormalized) {
            otherUserId = conversation["Người 1"] || conversation.participant1;
          }
          
          if (otherUserId) {
            // First, check if this entityId belongs to the current user's entities (own bar/business)
            try {
              const { getEntities } = await import("../../../utils/sessionManager");
              const entities = getEntities();
              
              // Normalize otherUserId for comparison (case-insensitive, trimmed)
              const targetEntityId = String(otherUserId).toLowerCase().trim();
              
              // Check if otherUserId matches any of user's own entities
              const ownEntity = entities.find(e => {
                const entityAccountId = String(e.EntityAccountId || e.entityAccountId || "").toLowerCase().trim();
                return entityAccountId === targetEntityId;
              });
              
              if (ownEntity) {
                // Use data from session (own entity)
                console.log("[ChatDock] Found entity in session, using session data:", ownEntity.name);
                setOtherUserInfo({
                  name: ownEntity.name || chat.name || "User",
                  avatar: ownEntity.avatar || null,
                  entityId: otherUserId
                });
                return;
              } else {
                console.log("[ChatDock] Entity not found in session entities. Target:", targetEntityId, "Available:", entities.map(e => String(e.EntityAccountId || e.entityAccountId || "").toLowerCase().trim()));
              }
            } catch (sessionErr) {
              console.warn("[ChatDock] Error checking session entities:", sessionErr);
            }
            
            // If not found in session, try API call
            try {
              const profileRes = await publicProfileApi.getByEntityId(otherUserId);
              const profile = profileRes?.data?.data || profileRes?.data || {};
              setOtherUserInfo({
                name: profile.name || profile.BarName || profile.BusinessName || chat.name || "User",
                avatar: profile.avatar || profile.Avatar || null,
                entityId: otherUserId
              });
            } catch (err) {
              // Handle 404 and other errors gracefully - don't show as error for 404
              if (err?.response?.status === 404) {
                // Silently use fallback data for 404 - entity might not exist in backend but that's okay
                console.log("[ChatDock] Entity not found in API (404), using fallback data from chat.name");
              } else {
                // Only log as warning for non-404 errors
                console.warn("[ChatDock] Error fetching other user profile:", err?.response?.status || err?.message);
              }
              // Fallback to chat.name
              setOtherUserInfo({
                name: chat.name || "User",
                avatar: null,
                entityId: otherUserId
              });
            }
          } else {
            // Fallback to chat.name
            setOtherUserInfo({
              name: chat.name || "User",
              avatar: null,
              entityId: null
            });
          }
        } else {
          // Fallback to chat.name
          setOtherUserInfo({
            name: chat.name || "User",
            avatar: null,
            entityId: null
          });
        }
      } catch (err) {
        console.error("Error fetching conversation info:", err);
        // Fallback to chat.name
        setOtherUserInfo({
          name: chat.name || "User",
          avatar: null,
          entityId: null
        });
      }
    };
    
    fetchOtherUserInfo();
  }, [chat.id, chat.name, chat.entityId, currentUserId]);
  // Check if window is focused
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  
  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Higher pitch
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (err) {
      console.warn('[ChatDock] Could not play notification sound:', err);
    }
  };

  // Show browser notification
  const showBrowserNotification = (message, senderName) => {
    if (!('Notification' in window)) {
      return;
    }
    
    if (Notification.permission === 'granted') {
      new Notification(`Tin nhắn mới từ ${senderName}`, {
        body: message,
        icon: otherUserInfo?.avatar || '/favicon.ico',
        tag: `chat-${chat.id}`,
        requireInteraction: false
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(`Tin nhắn mới từ ${senderName}`, {
            body: message,
            icon: otherUserInfo?.avatar || '/favicon.ico',
            tag: `chat-${chat.id}`
          });
        }
      });
    }
  };

  // Get socket instance from useChatSocket
  const { socket } = useChatSocket((message) => {
    if (message.conversationId === chat.id || message.conversationId === String(chat.id)) {
      // Check if message is from other user (not current user)
      // Backend emits: { conversationId, messageId, "Nội Dung Tin Nhắn", "Gửi Lúc", "Người Gửi", "Loại" }
      const messageSenderId = String(message["Người Gửi"] || message.senderId || message.senderEntityAccountId || "").toLowerCase().trim();
      const currentUserIdNormalized = currentUserId ? String(currentUserId).toLowerCase().trim() : "";
      const isFromOtherUser = messageSenderId && messageSenderId !== currentUserIdNormalized;
      
      // Get content from Vietnamese field name or English fallback
      const messageContent = message["Nội Dung Tin Nhắn"] || message.content || "";
      
      
      // Fetch lại toàn bộ messages để đồng bộ trạng thái
      messageApi.getMessages(chat.id).then(res => {
        // Handle response format: { success: true, data: messages } or direct array
        const messages = res?.data?.data || res?.data || [];
        setMessages(Array.isArray(messages) ? messages : []);
        setTimeout(scrollToBottom, 100);
        
        // Show notifications if message is from other user
        if (isFromOtherUser && messageContent) {
          // Play sound notification
          playNotificationSound();
          
          // Show browser notification if window is not focused
          if (!isWindowFocused) {
            showBrowserNotification(messageContent, otherUserInfo?.name || chat.name || "Người dùng");
          }
        }
      }).catch(err => {
        console.error("❌ Error reloading messages after socket event:", err);
      });
      // Đánh dấu đã đọc luôn nếu đang mở
      messageApi.markMessagesRead(chat.id);
    }
  });

  // Join conversation room when chat opens (like Messenger)
  useEffect(() => {
    if (!chat.id || !socket) return;
    
    const joinConversation = () => {
      if (socket.connected) {
        socket.emit('join_conversation', chat.id);
      }
    };
    
    // Join immediately if connected
    joinConversation();
    
    // Also join when socket connects/reconnects
    socket.on('connect', joinConversation);
    
    return () => {
      // Leave conversation room when chat closes
      socket.off('connect', joinConversation);
      if (socket.connected) {
        socket.emit('leave_conversation', chat.id);
      }
    };
  }, [chat.id, socket]);

  // Lấy tin nhắn khi mở chat hoặc khi currentUserId thay đổi (khi switch role)
  useEffect(() => {
    if (!currentUserId || !chat.id) {
      return;
    }
    
    setLoading(true);
    
    messageApi.getMessages(chat.id).then(res => {
      // Handle response format: { success: true, data: messages } or direct array
      const messages = res?.data?.data || res?.data || [];
      setMessages(Array.isArray(messages) ? messages : []);
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }).catch(err => {
      console.error("❌ Error loading messages:", err);
      setMessages([]);
      setLoading(false);
    });
  // Đánh dấu đã đọc (gửi conversationId qua body)
  messageApi.markMessagesRead(chat.id);
    // eslint-disable-next-line
  }, [chat.id, currentUserId]);

  // Auto scroll to bottom when new messages come in
  const scrollToBottom = () => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle typing indicator (for other user typing)
  // Note: Backend doesn't support typing events yet, so this is placeholder
  const handleInputChange = (e) => {
    setMessage(e.target.value);
  };

  const handleSend = () => {
    if (message.trim() && currentUserId) {
      // Send currentUserId (EntityAccountId), entityType, and entityId to backend
      // This ensures backend uses the correct role when sending message
      messageApi.sendMessage(chat.id, message, "text", currentUserId, currentEntityType, currentEntityId).then(res => {
        const responseSenderId = res?.data?.data?.senderId || res?.data?.senderId;
        
        // Use senderId from response if available, otherwise use currentUserId
        const senderIdToUse = responseSenderId || currentUserId;
        
        // Optimistically add message to UI
        setMessages(prev => [...prev, {
          "Nội Dung Tin Nhắn": message,
          "Người Gửi": senderIdToUse, // Use senderId from response or currentUserId
          "Gửi Lúc": new Date(),
        }]);
        setMessage("");
        setTimeout(scrollToBottom, 100);
      }).catch(err => {
        console.error("❌ Error sending message:", err);
        // Reload messages on error
        messageApi.getMessages(chat.id).then(res => {
          const messages = res?.data?.data || res?.data || [];
          setMessages(Array.isArray(messages) ? messages : []);
        });
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitial = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const handleHeaderClick = () => {
    if (otherUserInfo?.entityId) {
      navigate(`/profile/${otherUserInfo.entityId}`);
    }
  };

  const displayName = otherUserInfo?.name || chat.name || "User";
  const displayAvatar = otherUserInfo?.avatar;

  return (
    <div className="chatwin">
      <div className="chatwin__header">
        <div 
          className="chatwin__avatar" 
          onClick={handleHeaderClick}
          style={{ cursor: otherUserInfo?.entityId ? 'pointer' : 'default' }}
        >
          {displayAvatar ? (
            <img 
              src={displayAvatar} 
              alt={displayName}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            getInitial(displayName)
          )}
        </div>
        <div 
          className="chatwin__title" 
          onClick={handleHeaderClick}
          style={{ cursor: otherUserInfo?.entityId ? 'pointer' : 'default' }}
        >
          {displayName}
        </div>
        <button className="chatwin__close" onClick={() => onClose(chat.id)} aria-label="Đóng">
          ✕
        </button>
      </div>
      <div className="chatwin__body" ref={bodyRef}>
        {loading || !currentUserId ? (
          <div style={{ textAlign: 'center', color: '#888', padding: 16 }}>
            {loading ? 'Đang tải...' : 'Đang xác định người dùng...'}
          </div>
        ) : (
          messages.map((msg, idx) => {
            // Normalize sender ID for comparison
            // Backend stores "Người Gửi" as EntityAccountId (from messageController.js line 125)
            const rawSenderId = msg["Người Gửi"] || msg.senderId || msg.senderEntityAccountId || "";
            const senderId = String(rawSenderId).toLowerCase().trim();
            const currentUserIdNormalized = currentUserId ? String(currentUserId).toLowerCase().trim() : "";
            
            // Check if message is from current user
            // IMPORTANT: Only compare with currentUserId (EntityAccountId of current active role)
            // This ensures messages are displayed correctly based on the current role context
            // If user switches roles, messages from other roles should appear as "other" messages
            let isMyMessage = false;
            
            if (currentUserIdNormalized && senderId) {
              // Only check if senderId matches currentUserId (current active role's EntityAccountId)
              // This ensures proper message alignment: messages from current role = right side, others = left side
              isMyMessage = senderId === currentUserIdNormalized;
              
              // Debug logging for first 3 messages
              if (idx < 3) {
                console.log(`🔍 Message ${idx + 1} comparison:`, {
                  rawSenderId,
                  senderId,
                  currentUserId,
                  currentUserIdNormalized,
                  isMyMessage,
                  messageContent: (msg["Nội Dung Tin Nhắn"] || msg.content || msg.message)?.substring(0, 20)
                });
              }
            }
            
            return (
              <div
                key={idx}
                className={
                  "chatwin__bubble " +
                  (isMyMessage ? "chatwin__bubble--me" : "chatwin__bubble--other")
                }
              >
                {msg["Nội Dung Tin Nhắn"] || msg.content || msg.message}
              </div>
            );
          })
        )}
        {/* Typing indicator - placeholder for when backend supports typing events */}
        {/* {isTyping && (
          <div className="chatwin__typing">
            <span className="chatwin__typing-dot"></span>
            <span className="chatwin__typing-dot"></span>
            <span className="chatwin__typing-dot"></span>
          </div>
        )} */}
      </div>
      <div className="chatwin__input">
        <input
          placeholder="Aa"
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
        />
        <button onClick={handleSend}>Gửi</button>
      </div>
    </div>
  );
}

export default function ChatDock() {
  const [chats, setChats] = useState([]);

  const openChatById = useCallback((contact) => {
    setChats((prev) => (prev.some((c) => c.id === contact.id) ? prev : [...prev, contact]));
  }, []);

  const closeChat = (id) => setChats((prev) => prev.filter((c) => c.id !== id));

  // expose global open function
  useEffect(() => {
    // eslint-disable-next-line no-undef
    window.__openChat = openChatById;
    return () => {
      // eslint-disable-next-line no-undef
      delete window.__openChat;
    };
  }, [openChatById]);

  return (
    <div className="chatdock">
      {chats.map((c) => (
        <ChatWindow key={c.id} chat={c} onClose={closeChat} />
      ))}
    </div>
  );
}

ChatWindow.propTypes = {
  chat: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    entityId: PropTypes.string, // Optional: EntityAccountId for profile navigation
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

