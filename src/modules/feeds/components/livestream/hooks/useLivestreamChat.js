import { useCallback, useEffect, useState } from "react";
import { useSocket } from "../../../../../contexts/SocketContext";

export default function useLivestreamChat({ channelName, user, isBroadcaster = false }) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [isEnded, setIsEnded] = useState(false);

  useEffect(() => {
    setMessages([]);
    setViewerCount(0);
    setIsEnded(false);
  }, [channelName]);

  useEffect(() => {
    if (!socket || !channelName || !user?.id) return;
    
    let isMounted = true;
    let hasJoined = false;
    
    // Emit join với isBroadcaster flag và entityAccountId
    const joinLivestream = () => {
      if (hasJoined) {
        console.log("[useLivestreamChat] Already joined, skipping");
        return;
      }
      hasJoined = true;
      socket.emit("join-livestream", { 
        channelName, 
        userId: user.id, 
        isBroadcaster,
        entityAccountId: user?.entityAccountId || null
      });
    };
    
    // Small delay để tránh multiple calls
    const timeoutId = setTimeout(joinLivestream, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (hasJoined) {
        socket.emit("leave-livestream", { 
          channelName, 
          userId: user.id,
          entityAccountId: user?.entityAccountId || null
        });
        hasJoined = false;
      }
    };
  }, [socket, channelName, user?.id, user?.entityAccountId, isBroadcaster]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      if (data.channelName && data.channelName !== channelName) return;
      setMessages((prev) => [...prev, data]);
    };
    const handleReaction = (data) => {
      if (data.channelName && data.channelName !== channelName) return;
    };
    const handleViewerCount = (data) => {
      if (typeof data?.count === "number") {
        setViewerCount(data.count);
      }
    };
    const handleLivestreamEnded = (data) => {
      if (data.channelName && data.channelName === channelName) {
        console.log("[useLivestreamChat] Livestream ended:", data);
        setIsEnded(true);
      }
    };
    // Handle user joined notification - hiển thị trong chat
    const handleUserJoined = (data) => {
      if (data.channelName && data.channelName !== channelName) return;
      // Không hiển thị notification cho chính user đó
      if (data.userId === user?.id || data.userId === user?.entityAccountId) return;
      // Thêm notification message vào chat - thông báo hệ thống
      setMessages((prev) => [...prev, {
        type: 'system-notification',
        message: `${data.userName || 'Người dùng'} đã tham gia`,
        userName: 'Hệ thống',
        timestamp: data.timestamp || new Date().toISOString(),
      }]);
    };
    // Handle user left notification
    const handleUserLeft = (data) => {
      if (data.channelName && data.channelName !== channelName) return;
      // Không hiển thị notification cho chính user đó
      if (data.userId === user?.id || data.userId === user?.entityAccountId) return;
      // Thêm notification message vào chat - thông báo hệ thống
      setMessages((prev) => [...prev, {
        type: 'system-notification',
        message: `${data.userName || 'Người dùng'} đã rời đi`,
        userName: 'Hệ thống',
        timestamp: data.timestamp || new Date().toISOString(),
      }]);
    };
    // Handle batch users joined notification
    const handleBatchUsersJoined = (data) => {
      if (data.channelName && data.channelName !== channelName) return;
      // Thêm batch notification vào chat - thông báo hệ thống
      setMessages((prev) => [...prev, {
        type: 'system-notification',
        message: `${data.count} người đã tham gia`,
        count: data.count,
        userName: 'Hệ thống',
        timestamp: new Date().toISOString(),
      }]);
    };

    socket.on("new-chat-message", handleNewMessage);
    socket.on("new-reaction", handleReaction);
    socket.on("viewer-count-updated", handleViewerCount);
    socket.on("livestream-ended", handleLivestreamEnded);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("batch-users-joined", handleBatchUsersJoined);

    return () => {
      socket.off("new-chat-message", handleNewMessage);
      socket.off("new-reaction", handleReaction);
      socket.off("viewer-count-updated", handleViewerCount);
      socket.off("livestream-ended", handleLivestreamEnded);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("batch-users-joined", handleBatchUsersJoined);
    };
  }, [socket, channelName]);

  const sendMessage = useCallback(
    (message) => {
      if (!socket || !channelName || !message?.trim()) return;
      socket.emit("chat-message", {
        channelName,
        message,
        userId: user?.id,
        entityAccountId: user?.entityAccountId || null, // Gửi entityAccountId để BE lấy đúng activeEntity
        userName: user?.name || "User",
        userAvatar: user?.avatar || "",
      });
    },
    [socket, channelName, user?.id, user?.entityAccountId, user?.name, user?.avatar]
  );

  const sendReaction = useCallback(
    (reaction) => {
      if (!socket || !channelName || !reaction) return;
      socket.emit("reaction", {
        channelName,
        reaction,
        userId: user?.id,
        userName: user?.name || "User",
      });
    },
    [socket, channelName, user?.id, user?.name]
  );

  return {
    messages,
    viewerCount,
    sendMessage,
    sendReaction,
    isEnded,
  };
}