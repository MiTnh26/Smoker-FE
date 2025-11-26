/* global globalThis */
import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";
import messageApi from "../../../api/messageApi";
import publicProfileApi from "../../../api/publicProfileApi";
import { userApi } from "../../../api/userApi";
import useChatSocket from '../../../api/useChatSocket';
import { Reply, X } from "lucide-react";
import Composer from "../../../modules/messages/components/Composer";

function ChatWindow(props) {
  const { chat, onClose } = props;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const bodyRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentEntityType, setCurrentEntityType] = useState(null);
  const [currentEntityId, setCurrentEntityId] = useState(null);
  const [otherUserInfo, setOtherUserInfo] = useState(null);
  const [otherUserId, setOtherUserId] = useState(null); // Store other participant's ID for read status check
  const [activeEntityId, setActiveEntityId] = React.useState(null);

  // Listen for session changes (when switching entities)
  useEffect(() => {
    // eslint-disable-next-line complexity
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
    globalThis.addEventListener('profileUpdated', checkSessionChange);
    
    // Also poll for changes (fallback)
    const interval = setInterval(checkSessionChange, 1000);

    return () => {
      globalThis.removeEventListener('profileUpdated', checkSessionChange);
      clearInterval(interval);
    };
  }, []);

  // Get current user ID from session (entityAccountId) - same as profile pages
  useEffect(() => {
    if (!activeEntityId) return; // Wait for activeEntityId to be set
    
    // eslint-disable-next-line complexity
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
    // Reset otherUserId when chat changes
    setOtherUserId(null);
    
    // eslint-disable-next-line complexity
    const fetchOtherUserInfo = async () => {
      if (!chat.id || !currentUserId) return;
      
      // If avatar and name are already provided in chat object (from MessagesPanel), use them directly
      if (chat.avatar && chat.name && chat.entityId) {
        console.log("[ChatDock] Using avatar and name from chat object:", chat.name);
        // Store otherUserId for read status check
        setOtherUserId(chat.entityId);
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
        } catch (error_) {
          console.warn("[ChatDock] Error checking session entities:", error_);
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
          // Find other participant from new structure (English fields)
          const participants = conversation.participants || [];
          const currentUserIdNormalized = String(currentUserId).toLowerCase().trim();
          
          const foundOtherUserId = participants.find(p => 
            String(p).toLowerCase().trim() !== currentUserIdNormalized
          ) || null;
          
          // Store otherUserId for read status check
          setOtherUserId(foundOtherUserId);
          
          if (foundOtherUserId) {
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
                  entityId: foundOtherUserId
                });
                return;
              } else {
                console.log("[ChatDock] Entity not found in session entities. Target:", targetEntityId, "Available:", entities.map(e => String(e.EntityAccountId || e.entityAccountId || "").toLowerCase().trim()));
              }
        } catch (error_) {
          console.warn("[ChatDock] Error checking session entities:", error_);
        }
            
            // If not found in session, try API call
            try {
              const profileRes = await publicProfileApi.getByEntityId(otherUserId);
              const profile = profileRes?.data?.data || profileRes?.data || {};
              setOtherUserInfo({
                name: profile.name || profile.BarName || profile.BusinessName || chat.name || "User",
                avatar: profile.avatar || profile.Avatar || null,
                entityId: foundOtherUserId
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
                entityId: foundOtherUserId
              });
            }
          } else {
            // Fallback to chat.name
            setOtherUserId(null);
            setOtherUserInfo({
              name: chat.name || "User",
              avatar: null,
              entityId: null
            });
          }
        } else {
          // Fallback to chat.name
          setOtherUserId(null);
          setOtherUserInfo({
            name: chat.name || "User",
            avatar: null,
            entityId: null
          });
        }
      } catch (err) {
        console.error("Error fetching conversation info:", err);
        // Fallback to chat.name
        setOtherUserId(null);
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
    
    globalThis.addEventListener('focus', handleFocus);
    globalThis.addEventListener('blur', handleBlur);
    
    return () => {
      globalThis.removeEventListener('focus', handleFocus);
      globalThis.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioCtx) return;
      const audioContext = new AudioCtx();
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
    const NotificationAPI = globalThis.Notification;
    if (!NotificationAPI) return;

    if (NotificationAPI.permission === 'granted') {
      const notification = new NotificationAPI(`Tin nhắn mới từ ${senderName}`, {
        body: message,
        icon: otherUserInfo?.avatar || '/favicon.ico',
        tag: `chat-${chat.id}`,
        requireInteraction: false
      });
      setTimeout(() => notification.close?.(), 5000);
    } else if (NotificationAPI.permission !== 'denied') {
      NotificationAPI.requestPermission().then(permission => {
        if (permission === 'granted') {
          const notification = new NotificationAPI(`Tin nhắn mới từ ${senderName}`, {
            body: message,
            icon: otherUserInfo?.avatar || '/favicon.ico',
            tag: `chat-${chat.id}`
          });
          setTimeout(() => notification.close?.(), 5000);
        }
      });
    }
  };

  // Get socket instance from useChatSocket
  const { socket } = useChatSocket((message) => {
    if (message.conversationId === chat.id || message.conversationId === String(chat.id)) {
      // Check if message is from other user (not current user)
      // Backend emits: { conversationId, messageId, sender_id, content, message_type, ... } (English fields)
      const messageSenderId = String(message.sender_id || message.senderId || message.senderEntityAccountId || "").toLowerCase().trim();
      const currentUserIdNormalized = currentUserId ? String(currentUserId).toLowerCase().trim() : "";
      const isFromOtherUser = messageSenderId && messageSenderId !== currentUserIdNormalized;
      
      // Get content from English fields
      const messageContent = message.content || "";
      
      
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
      if (currentUserId) {
        messageApi.markMessagesRead(chat.id, currentUserId)
          .then(() => { try { (typeof globalThis !== "undefined" && globalThis.window) && globalThis.window.dispatchEvent(new Event("messageRefresh")); } catch (e) { console.warn("Error dispatching messageRefresh event:", e); } })
          .catch((err) => { console.warn("Error marking messages as read:", err); });
      }
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
  if (currentUserId) {
    messageApi.markMessagesRead(chat.id, currentUserId)
      .then(() => { try { (typeof globalThis !== "undefined" && globalThis.window) && globalThis.window.dispatchEvent(new Event("messageRefresh")); } catch (e) { console.warn("Error dispatching messageRefresh event:", e); } })
      .catch((err) => { console.warn("Error marking messages as read:", err); });
  }
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

  const handleComposerSend = (content) => {
    const text = content?.trim() || "";
    if (!text || !currentUserId) return;
    messageApi
      .sendMessage(chat.id, text, "text", currentUserId, currentEntityType, currentEntityId)
      .then((res) => {
        const responseSenderId = res?.data?.data?.senderId || res?.data?.senderId;
        const senderIdToUse = responseSenderId || currentUserId;
        setMessages((prev) => [
          ...prev,
          {
            content: text,
            sender_id: senderIdToUse,
            createdAt: new Date(),
          },
        ]);
        setTimeout(scrollToBottom, 100);
      })
      .catch((err) => {
        console.error("❌ Error sending message:", err);
        messageApi.getMessages(chat.id).then((res) => {
          const messages = res?.data?.data || res?.data || [];
          setMessages(Array.isArray(messages) ? messages : []);
        });
      });
  };

  const handleComposerTyping = () => {};

  const getInitial = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const formatTimestampLabel = (value) => {
    try {
      const date = new Date(value);
      return date.toLocaleString(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch {
      return "";
    }
  };

  const shouldShowTimestamp = (index, list) => {
    if (index === 0) return true;
    const current = new Date(list[index]?.createdAt || 0).getTime();
    const prev = new Date(list[index - 1]?.createdAt || 0).getTime();
    return current - prev > 30 * 60 * 1000 || new Date(current).getDate() !== new Date(prev).getDate();
  };

  const getSenderKey = (msg) => {
    const raw = msg.sender_id || msg.senderId || msg.senderEntityAccountId || "";
    return String(raw).toLowerCase().trim();
  };

  const displayMessages = useMemo(() => messages, [messages]);

  const messageMap = useMemo(() => {
    const map = new Map();
    for (const msg of messages) {
      const key = String(msg.id || msg._id || msg.messageId || "");
      if (key) map.set(key, msg);
    }
    return map;
  }, [messages]);

  const handleHeaderClick = () => {
    if (otherUserInfo?.entityId) {
      navigate(`/profile/${otherUserInfo.entityId}`);
    }
  };

  const displayName = otherUserInfo?.name || chat.name || "User";
  const displayAvatar = otherUserInfo?.avatar;

  return (
    <div className={cn(
      "w-[360px] h-[500px] bg-card rounded-t-lg",
      "border-[0.5px] border-border/20",
      "shadow-[0_2px_16px_rgba(0,0,0,0.18),0_0.5px_1.5px_rgba(0,0,0,0.08)]",
      "flex flex-col overflow-hidden",
      "animate-[chatSlideUp_0.2s_ease-out]"
    )}>
      <div
        className={cn(
          "border-b border-border/30 bg-gradient-to-r from-card to-card/80 px-4 py-3",
          "flex-shrink-0"
        )}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center overflow-hidden border-none bg-transparent p-0",
              "bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold"
            )}
            onClick={handleHeaderClick}
          >
            {displayAvatar ? (
              <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              getInitial(displayName)
            )}
          </button>
          <div className="flex min-w-0 flex-1 flex-col">
            <button
              type="button"
              className="text-left text-[15px] font-semibold text-foreground border-none bg-transparent p-0"
              onClick={handleHeaderClick}
            >
              {displayName}
            </button>
            <span className="text-xs text-muted-foreground">&nbsp;</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground hover:bg-border/50"
              style={{ borderColor: "rgb(var(--border))" }}
              onClick={() => onClose(chat.id)}
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </div>
        </div>

      </div>
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden bg-background p-4"
        ref={bodyRef}
      >
        {/* eslint-disable-next-line complexity */}
        {loading || !currentUserId ? (
          <div className="py-4 text-center text-muted-foreground">
            {loading ? t("messages.loading") : t("messages.selectConversation")}
          </div>
        ) : (
          displayMessages.map((msg, idx) => {
            const sender = getSenderKey(msg);
            const isMine = currentUserId ? sender === String(currentUserId).toLowerCase().trim() : false;
            const rawContent = msg.content || msg.message || "";
            const storyImgMatch = rawContent.match(/\[STORY_IMAGE:([^\]]+)\]/i);
            const storyImageUrl = storyImgMatch ? storyImgMatch[1] : null;
            const textContent = storyImageUrl ? rawContent.replaceAll(/\[STORY_IMAGE:[^\]]+\]/gi, "").trim() : rawContent;

            const replyPreview = (() => {
              const refId = msg.replyToId;
              if (!refId) return null;
              const ref = messageMap.get(String(refId));
              if (!ref) return null;
              const refText = (ref.content || ref.message || "").toString();
              const refSender = getSenderKey(ref) === sender ? t("messages.you") || "Bạn" : ref.authorName || displayName;
              return (
                <div
                  className="mb-2 rounded-lg border px-3 py-1 text-xs"
                  style={{ borderColor: "rgb(var(--border))", background: isMine ? "rgba(255,255,255,0.15)" : "rgb(var(--card)/0.8)" }}
                >
                  <div className="font-semibold">{refSender}</div>
                  <div className="line-clamp-2 opacity-80">{refText || t("messages.attachment")}</div>
                </div>
              );
            })();

            const actionIcons = [
              { label: t("comment.reply") || "Reply", Icon: Reply }
            ];

            const messageKey = msg.id || msg._id || msg.messageId || `${msg.createdAt || ""}-${idx}`;

            const bubbleTextColor = isMine ? "#ffffff" : "rgb(var(--foreground))";
            const bubbleStyle = isMine
              ? { 
                  color: bubbleTextColor,
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  wordWrap: "break-word"
                }
              : { 
                  background: "rgb(var(--card))", 
                  color: bubbleTextColor, 
                  borderColor: "rgb(var(--border))",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  wordWrap: "break-word"
                };

            const bubble = (
              <div
                key={`modal-bubble-${messageKey}`}
                className={cn(
                  "group relative max-w-[240px] break-words rounded-2xl px-3 py-1.5 text-sm leading-[1.35] shadow-sm sm:max-w-[280px]",
                  isMine ? "rounded-br-md bg-gradient-to-br from-primary to-primary/80 text-primary-foreground" : "rounded-bl-md border",
                )}
                style={bubbleStyle}
              >
                {replyPreview}
                <div className="flex items-start gap-2">
                  {storyImageUrl && (
                    <img src={storyImageUrl} alt="" className="max-h-[150px] rounded-lg object-cover" />
                  )}
                  <span 
                    style={{ 
                      color: bubbleTextColor,
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      wordWrap: "break-word"
                    }}
                  >
                    {textContent}
                  </span>
                </div>

              </div>
            );

            const nextSender = displayMessages[idx + 1] ? getSenderKey(displayMessages[idx + 1]) : null;
            const showAvatar = !isMine && sender !== nextSender;

            return (
              <React.Fragment key={messageKey}>
                {shouldShowTimestamp(idx, displayMessages) && (
                  <div className="mb-3 flex w-full justify-center">
                    <span className="rounded-full px-3 py-0.5 text-[11px] text-muted-foreground" style={{ background: "rgb(var(--card))" }}>
                      {formatTimestampLabel(msg.createdAt || Date.now())}
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    "group/message flex items-end gap-2 py-1",
                    isMine ? "justify-end" : "justify-start"
                  )}
                >
                  {!isMine && showAvatar && (
                    <img
                      src={otherUserInfo?.avatar || displayAvatar || "/avatar.png"}
                      alt={displayName}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  )}
                  {!isMine && !showAvatar && (
                    <div className="h-7 w-7 flex-shrink-0" />
                  )}
                  {isMine && (
                    <div
                      className="hidden items-center gap-1 rounded-full border px-2 py-1 text-xs opacity-0 transition group-hover/message:opacity-100 lg:flex"
                      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))", color: "rgb(var(--muted-foreground))" }}
                    >
                      {actionIcons.map(({ label, Icon }) => (
                        <button key={label} title={label} type="button">
                          <Icon size={14} />
                        </button>
                      ))}
                      <span className="ml-2 text-[11px] whitespace-nowrap text-muted-foreground">
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  {bubble}
                  {!isMine && (
                    <div
                      className="hidden items-center gap-1 rounded-full border px-2 py-1 text-xs opacity-0 transition group-hover/message:opacity-100 lg:flex"
                      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))", color: "rgb(var(--muted-foreground))" }}
                    >
                      {actionIcons.map(({ label, Icon }) => (
                        <button key={label} title={label} type="button">
                          <Icon size={14} />
                        </button>
                      ))}
                      <span className="ml-2 text-[11px] whitespace-nowrap text-muted-foreground">
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>
      <div className="border-t border-border/30 bg-card">
        <Composer
          convId={chat.id}
          placeholder={t("input.messagePlaceholder")}
          onSend={handleComposerSend}
          onTyping={handleComposerTyping}
        />
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
    globalThis.__openChat = openChatById;
    return () => {
      delete globalThis.__openChat;
    };
  }, [openChatById]);

  return (
    <div className={cn(
      "fixed right-3 bottom-0 flex gap-2",
      "flex-row-reverse items-end z-50"
    )}>
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
    entityId: PropTypes.string,
    avatar: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

