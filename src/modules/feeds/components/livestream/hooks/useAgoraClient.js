import { useCallback, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

/**
 * Shared hook cho viewer & broadcaster để quản lý client Agora.
 * Trả về helper join/leave và trạng thái kết nối.
 */
export default function useAgoraClient({ mode = "viewer" } = {}) {
  const clientRef = useRef(null);
  const listenersRef = useRef([]);
  const [isConnected, setIsConnected] = useState(false);

  const ensureClient = useCallback(() => {
    if (clientRef.current) return clientRef.current;
    clientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    return clientRef.current;
  }, []);

  const joinChannel = useCallback(
    async ({ appId, channelName, token, uid, eventHandlers = {} }) => {
      const client = ensureClient();

      // Avoid duplicate join calls (React Strict Mode / double effects)
      if (
        client.connectionState === "CONNECTING" ||
        client.connectionState === "CONNECTED"
      ) {
        return client;
      }

      Object.entries(eventHandlers).forEach(([event, handler]) => {
        if (typeof handler === "function") {
          client.on(event, handler);
          listenersRef.current.push({ event, handler });
        }
      });

      await client.join(appId, channelName, token, uid);
      setIsConnected(true);
      return client;
    },
    [ensureClient]
  );

  const leaveChannel = useCallback(async () => {
    if (!clientRef.current) return;
    try {
      await clientRef.current.leave();
    } finally {
      listenersRef.current.forEach(({ event, handler }) => {
        clientRef.current?.off(event, handler);
      });
      listenersRef.current = [];
      clientRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return {
    client: clientRef,
    isConnected,
    joinChannel,
    leaveChannel,
    mode,
  };
}

