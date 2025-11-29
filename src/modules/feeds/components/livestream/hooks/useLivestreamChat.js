import { useCallback, useEffect, useState } from "react";
import { useSocket } from "../../../../../contexts/SocketContext";

export default function useLivestreamChat({ channelName, user, isBroadcaster = false }) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    setMessages([]);
    setViewerCount(0);
  }, [channelName]);

  useEffect(() => {
    if (!socket || !channelName || !user?.id) return;
    // Emit join với isBroadcaster flag
    socket.emit("join-livestream", { channelName, userId: user.id, isBroadcaster });
    return () => {
      socket.emit("leave-livestream", { channelName, userId: user.id });
    };
  }, [socket, channelName, user?.id, isBroadcaster]);

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
    // Bỏ logic tăng/giảm ở FE - chỉ dùng count từ BE để đảm bảo chính xác
    // const handleUserJoined = () => setViewerCount((prev) => prev + 1);
    // const handleUserLeft = () => setViewerCount((prev) => Math.max(0, prev - 1));

    socket.on("new-chat-message", handleNewMessage);
    socket.on("new-reaction", handleReaction);
    socket.on("viewer-count-updated", handleViewerCount);
    // Bỏ các event user-joined/user-left - chỉ dùng viewer-count-updated từ BE
    // socket.on("user-joined", handleUserJoined);
    // socket.on("user-left", handleUserLeft);

    return () => {
      socket.off("new-chat-message", handleNewMessage);
      socket.off("new-reaction", handleReaction);
      socket.off("viewer-count-updated", handleViewerCount);
      // socket.off("user-joined", handleUserJoined);
      // socket.off("user-left", handleUserLeft);
    };
  }, [socket, channelName]);

  const sendMessage = useCallback(
    (message) => {
      if (!socket || !channelName || !message?.trim()) return;
      socket.emit("chat-message", {
        channelName,
        message,
        userId: user?.id,
        userName: user?.name || "User",
        userAvatar: user?.avatar || "",
      });
    },
    [socket, channelName, user?.id, user?.name, user?.avatar]
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
  };
}