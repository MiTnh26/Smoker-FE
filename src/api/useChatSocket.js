
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from "../hooks/useAuth";
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:9999';

export default function useChatSocket(onNewMessage) {
  const socketRef = useRef();
  const { user } = useAuth();
  console.log("useChatSocket - Auth User:", user);
  useEffect(() => {
    if (!user?.id) return;
    const token = localStorage.getItem('token');
    socketRef.current = io(SOCKET_URL, {
      auth: { token }
    });
    socketRef.current.emit('join', String(user.id));
    socketRef.current.on('new_message', (message) => {
      if (onNewMessage) onNewMessage(message);
    });
    return () => {
      socketRef.current.disconnect();
    };
  }, [onNewMessage, user?.id]);

  return socketRef;
}
