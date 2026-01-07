import { useEffect, useRef, useState, useCallback } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import livestreamApi from "../../../../../api/livestreamApi";

/**
 * Hook để subscribe video từ Agora channel cho preview trong feed
 * Tự động phát video khi livestream đang live
 */
export default function useLivestreamPreview(livestream, containerRef) {
  const videoElementRef = useRef(null);
  const clientRef = useRef(null);
  const remoteTrackRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const cleanup = useCallback(() => {
    if (remoteTrackRef.current) {
      remoteTrackRef.current.stop();
      remoteTrackRef.current.close();
      remoteTrackRef.current = null;
    }
    if (videoElementRef.current && videoElementRef.current.parentNode) {
      videoElementRef.current.parentNode.removeChild(videoElementRef.current);
      videoElementRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.leave().catch(console.error);
      clientRef.current = null;
    }
    setHasVideo(false);
  }, []);

  const handleUserPublished = useCallback(
    async (user, mediaType) => {
      try {
        if (mediaType === "video" && clientRef.current && containerRef?.current) {
          const remoteTrack = await clientRef.current.subscribe(user, mediaType);
          remoteTrackRef.current = remoteTrack;
          
          // Create video element if not exists
          if (!videoElementRef.current) {
            const videoElement = document.createElement('video');
            videoElement.className = 'w-full h-full object-cover';
            videoElement.style.objectFit = 'cover';
            videoElement.style.transform = 'scaleX(-1)'; // Flip video để hiển thị đúng chiều camera
            videoElement.autoplay = true;
            videoElement.playsInline = true;
            videoElement.muted = true; // Mute preview
            videoElement.style.backgroundColor = 'rgb(var(--background))';
            videoElement.style.position = 'absolute';
            videoElement.style.inset = '0';
            videoElement.style.zIndex = '1';
            
            containerRef.current.appendChild(videoElement);
            videoElementRef.current = videoElement;
          }
          
          remoteTrack.play(videoElementRef.current);
          setHasVideo(true);
          setError(null);
        }
      } catch (err) {
        console.error("[useLivestreamPreview] Failed to subscribe:", err);
        setHasVideo(false);
      }
    },
    [containerRef]
  );

  const handleUserUnpublished = useCallback((user, mediaType) => {
    if (mediaType === "video" && remoteTrackRef.current) {
      remoteTrackRef.current.stop();
      remoteTrackRef.current.close();
      remoteTrackRef.current = null;
      setHasVideo(false);
    }
  }, []);

  useEffect(() => {
    if (!livestream || !livestream.agoraChannelName || livestream.status !== "live") {
      cleanup();
      return;
    }

    let isMounted = true;

    const connect = async () => {
      try {
        setIsConnecting(true);
        setError(null);

        // Get viewer token
        const payload = await livestreamApi.getStreamByChannel(livestream.agoraChannelName);
        const { agora } = payload;
        
        if (!agora?.token || !agora?.uid || !agora?.appId) {
          throw new Error("Invalid livestream credentials");
        }

        // Create client
        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        // Setup event handlers
        client.on("user-published", handleUserPublished);
        client.on("user-unpublished", handleUserUnpublished);

        // Join channel
        await client.join(agora.appId, livestream.agoraChannelName, agora.token, agora.uid);

        if (isMounted) {
          setIsConnecting(false);
        }
      } catch (err) {
        console.error("[useLivestreamPreview] Connection error:", err);
        if (isMounted) {
          setError(err.message);
          setIsConnecting(false);
          setHasVideo(false);
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [livestream?.livestreamId, livestream?.agoraChannelName, livestream?.status, cleanup, handleUserPublished, handleUserUnpublished]);

  return {
    hasVideo,
    isConnecting,
    error,
  };
}

