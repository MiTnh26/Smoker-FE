
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:9999';

// Global socket instance để tránh tạo nhiều connection
let globalSocket = null;
let socketUserId = null;
let messageHandlers = new Set();

export default function useChatSocket(onNewMessage) {
  const [userId, setUserId] = useState(null);
  const handlerRef = useRef(onNewMessage);
  const handlerIdRef = useRef(null);

  // Update handler ref when callback changes
  useEffect(() => {
    handlerRef.current = onNewMessage;
  }, [onNewMessage]);

  // Get user ID from session (entityAccountId) - same as profile pages
  useEffect(() => {
    const resolveUserId = async () => {
      try {
        const { getSession, getActiveEntity, getEntities, updateSession, updateSessionField } = await import("../utils/sessionManager");
        const session = getSession();
        
        if (!session) {
          console.warn('🔌 useChatSocket - No session found');
          return;
        }
        
        const active = getActiveEntity() || {};
        const entities = getEntities();
        
        // Priority: EntityAccountId from activeEntity > EntityAccountId from matching entity > EntityAccountId from first entity > fetch from API
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
            const { userApi } = await import("../api/userApi");
            
            // For Account type, use getEntityAccountId
            if (active.type === "Account") {
              const entityAccountRes = await userApi.getEntityAccountId(session.account.id);
              resolvedId = entityAccountRes?.data?.data?.EntityAccountId || null;
              
              if (resolvedId) {
                updateSessionField("activeEntity.EntityAccountId", resolvedId);
              }
            } 
            // For BarPage or Business, refresh entities to get EntityAccountId
            else if (active.type === "BarPage" || active.type === "Business") {
              console.log("[useChatSocket] Fetching EntityAccountId for", active.type, active.id);
              const entitiesRes = await userApi.getEntities(session.account.id);
              const refreshedEntities = entitiesRes?.data?.data || entitiesRes?.data || [];
              
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
                console.log("[useChatSocket] Updated session with EntityAccountId:", resolvedId);
              } else {
                console.warn("[useChatSocket] EntityAccountId not found in refreshed entities for", active.type, active.id);
              }
            }
          } catch (err) {
            console.warn("[useChatSocket] Failed to fetch EntityAccountId:", err);
          }
        }
        
        // Final fallback to id (but log warning)
        if (!resolvedId) {
          resolvedId = active.id || entities[0]?.id || null;
          if (resolvedId && active.type !== "Account") {
            console.warn("[useChatSocket] Using id as fallback instead of EntityAccountId:", resolvedId, "for type:", active.type);
          }
        }
        
        console.log('🔌 Socket userId:', resolvedId, 'from activeEntity:', active.type, active.id);
        
        setUserId(resolvedId || null);
      } catch (err) {
        console.error("❌ useChatSocket - Error getting user ID from session:", err);
      }
    };
    
    resolveUserId();
  }, []);

  // Initialize socket connection (only once per user)
  useEffect(() => {
    if (!userId) return;

    // Generate unique handler ID if not exists
    if (!handlerIdRef.current) {
      handlerIdRef.current = `handler_${Date.now()}_${Math.random()}`;
    }

    // Add this handler to the set (only once per component instance)
    const handler = (message) => {
      if (handlerRef.current) {
        handlerRef.current(message);
      }
    };
    
    // Check if handler already exists (by checking if we need to add)
    const existingHandler = Array.from(messageHandlers).find(h => h._id === handlerIdRef.current);
    if (!existingHandler) {
      handler._id = handlerIdRef.current;
      messageHandlers.add(handler);
    }

    // Nếu đã có socket cho user này và đang connected, không cần tạo mới
    if (!globalSocket || socketUserId !== userId || !globalSocket.connected) {
      // Nếu có socket cho user khác hoặc socket chưa connected, disconnect trước
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
        socketUserId = null;
        // Don't clear handlers - they will work with new socket
      }

      // Tạo socket mới
      const token = localStorage.getItem('token');
      globalSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      globalSocket.on('connect', () => {
        const userIdStr = String(userId);
        globalSocket.emit('join', userIdStr);
        socketUserId = userId;
      });

      globalSocket.on('disconnect', () => {
        // Silent disconnect
      });

      globalSocket.on('connect_error', (error) => {
        console.error("❌ Socket error:", error.message);
      });

      globalSocket.on('new_message', (message) => {
        // Call all registered handlers
        messageHandlers.forEach(h => {
          if (h && typeof h === 'function') {
            try {
              h(message);
            } catch (err) {
              console.error("❌ Handler error:", err);
            }
          }
        });
      });
    }

    // Cleanup: remove handler when component unmounts
    return () => {
      const handlerToRemove = Array.from(messageHandlers).find(h => h._id === handlerIdRef.current);
      if (handlerToRemove) {
        messageHandlers.delete(handlerToRemove);
      }
    };
  }, [userId]);

  return { socket: globalSocket, userId };
}
