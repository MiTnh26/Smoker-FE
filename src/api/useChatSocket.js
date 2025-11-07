import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export default function useChatSocket(onNewMessage) {
  const socketRef = useRef();

  useEffect(() => {
    const token = localStorage.getItem('token');
    let userId = 0;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      userId = user?.userId || 0;
    } catch {
      userId = 0;
    }
    if (!userId) return;
    socketRef.current = io(SOCKET_URL, {
      auth: { token }
    });
    //     socketRef.current.on('connect', () => {
    //   console.log('Socket connected:', socketRef.current.id);
    //   socketRef.current.emit('join', String(userId));
    //   console.log('Emit join', userId);
    // });
    // Join room theo userId để nhận tin nhắn
    socketRef.current.emit('join', String(userId));
    // Lắng nghe sự kiện new_message
    socketRef.current.on('new_message', (message) => {
      if (onNewMessage) onNewMessage(message);
    });
    return () => {
      socketRef.current.disconnect();
    };
  }, [onNewMessage]);

  return socketRef;
}
