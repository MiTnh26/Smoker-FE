import React, { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const rawURL =
      process.env.REACT_APP_SOCKET_URL || "http://localhost:9999";
    // BỎ /api ở cuối để lấy origin
    const socketOrigin = rawURL.replace(/\/api\/?$/, "");

    const newSocket = io(socketOrigin, {
      path: "/api/socket.io",          // 👈 trùng với backend
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("🔌 Socket connected:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("🔌 Socket connection error:", error);
    });

    setSocket(newSocket);

    return () => {
      console.log("🔌 Disconnecting socket");
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
