import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { MessageCircle, Send, X, Wrench } from "lucide-react";
import livestreamApi from "../../../../api/livestreamApi";
import { cn } from "../../../../utils/cn";
import useAgoraClient from "./hooks/useAgoraClient";
import useLivestreamChat from "./hooks/useLivestreamChat";
import { getSessionUser } from "./utils";

export default function LiveViewer({ livestream, onClose }) {
  const videoRef = useRef(null);
  const remoteTracksRef = useRef({ video: null, audio: null });
  const messagesEndRef = useRef(null);
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(10);

  const sessionUser = useMemo(() => getSessionUser(), []);
  // Kiểm tra xem user hiện tại có phải là broadcaster không
  const isBroadcaster = useMemo(() => {
    if (!sessionUser || !livestream) return false;
    return livestream.hostAccountId === sessionUser.id || 
           livestream.hostEntityAccountId === sessionUser.entityAccountId;
  }, [sessionUser, livestream]);
  
  const { messages, viewerCount, sendMessage, isEnded } = useLivestreamChat({
    channelName: livestream.agoraChannelName,
    user: sessionUser,
    isBroadcaster: isBroadcaster,
  });

  const { client, joinChannel, leaveChannel } = useAgoraClient({ mode: "viewer" });

  const handleUserPublished = useCallback(
    async (user, mediaType) => {
      try {
        const agoraClient = client.current;
        if (!agoraClient) return;
        const remoteTrack = await agoraClient.subscribe(user, mediaType);
        if (mediaType === "video") {
          remoteTracksRef.current.video = remoteTrack;
          if (videoRef.current) {
            // Đảm bảo video element sẵn sàng
            if (videoRef.current.tagName === 'VIDEO') {
              remoteTrack.play(videoRef.current);
            } else {
              // Nếu là div, tạo video element mới
              const videoElement = document.createElement('video');
              videoElement.className = 'w-full h-full bg-black';
              videoElement.style.objectFit = 'contain';
              videoElement.autoplay = true;
              videoElement.playsInline = true;
              if (videoRef.current.parentNode) {
                videoRef.current.parentNode.replaceChild(videoElement, videoRef.current);
                videoRef.current = videoElement;
              }
              remoteTrack.play(videoElement);
            }
          }
        }
        if (mediaType === "audio") {
          remoteTracksRef.current.audio = remoteTrack;
          remoteTrack.play();
        }
      } catch (err) {
        console.error("[LiveViewer] Failed to subscribe remote track:", err);
      }
    },
    [client]
  );

  const handleUserUnpublished = useCallback((_, mediaType) => {
    if (mediaType === "video" && remoteTracksRef.current.video) {
      remoteTracksRef.current.video.stop();
      remoteTracksRef.current.video.close();
      remoteTracksRef.current.video = null;
    }
    if (mediaType === "audio" && remoteTracksRef.current.audio) {
      remoteTracksRef.current.audio.stop();
      remoteTracksRef.current.audio.close();
      remoteTracksRef.current.audio = null;
    }
  }, []);

  const cleanupTracks = useCallback(() => {
    ["video", "audio"].forEach((type) => {
      const track = remoteTracksRef.current[type];
      if (track) {
        track.stop();
        track.close?.();
        remoteTracksRef.current[type] = null;
      }
    });
  }, []);

  const leaveStream = useCallback(async () => {
    cleanupTracks();
    await leaveChannel();
  }, [cleanupTracks, leaveChannel]);

  const joinStream = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      const payload = await livestreamApi.getStreamByChannel(livestream.agoraChannelName);
      const { agora } = payload;
      if (!agora?.token || !agora?.uid || !agora?.appId) {
        throw new Error("Thông tin livestream không hợp lệ");
      }

      await joinChannel({
        appId: agora.appId,
        channelName: livestream.agoraChannelName,
        token: agora.token,
        uid: agora.uid,
        eventHandlers: {
          "user-published": handleUserPublished,
          "user-unpublished": handleUserUnpublished,
        },
      });
      // Chỉ tăng view count nếu không phải broadcaster
      // Kiểm tra xem user hiện tại có phải là broadcaster không
      const currentUserId = sessionUser?.id;
      const isBroadcaster = livestream.hostAccountId === currentUserId || 
                           livestream.hostEntityAccountId === sessionUser?.entityAccountId;
      if (!isBroadcaster) {
        await livestreamApi.incrementViewCount(livestream.livestreamId);
      }
      setIsConnecting(false);
    } catch (err) {
      console.error("[LiveViewer] join error:", err);
      setError(err.message || "Không thể kết nối tới livestream");
      setIsConnecting(false);
    }
  }, [handleUserPublished, handleUserUnpublished, joinChannel, livestream]);

  useEffect(() => {
    joinStream();
    return () => {
      leaveStream();
    };
  }, [joinStream, leaveStream]);

  // Tự động dừng video và cleanup khi livestream kết thúc
  useEffect(() => {
    if (isEnded) {
      cleanupTracks();
      leaveChannel();
    }
  }, [isEnded, cleanupTracks, leaveChannel]);

  // Đếm ngược và tự động đóng modal sau 10 giây khi livestream kết thúc
  useEffect(() => {
    if (!isEnded) {
      setCountdown(10);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Tự động đóng modal sau 10 giây
          setTimeout(async () => {
            await leaveStream();
            onClose?.();
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isEnded, leaveStream, onClose]);

  // Auto-scroll xuống comment mới nhất
  useEffect(() => {
    if (messagesEndRef.current && showChat) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showChat]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessage(newMessage.trim());
    setNewMessage("");
  };

  const handleClose = async () => {
    await leaveStream();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--background))' }}>
      <div className="relative flex w-full h-full flex-col gap-0 md:flex-row" style={{ backgroundColor: 'rgb(var(--background))' }}>
        <button
          onClick={handleClose}
          className={cn(
            "absolute right-4 top-4 z-50",
            "rounded-full backdrop-blur-md",
            "p-2.5 transition-all duration-200",
            "hover:scale-110 active:scale-95",
            "border border-border/30",
            "bg-card/80 text-foreground/80",
            "hover:bg-card hover:text-foreground",
            "shadow-lg"
          )}
          aria-label="Đóng livestream"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative flex-1 self-start flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--background))' }}>
          <video 
            ref={videoRef} 
            className="w-full h-full min-h-[100vh] md:min-h-[calc(100vh-0px)]" 
            style={{ objectFit: 'contain', backgroundColor: 'rgb(var(--background))' }}
            autoPlay
            playsInline
          />
          {isConnecting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 backdrop-blur-md rounded-lg" style={{ backgroundColor: 'rgba(var(--overlay))' }}>
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-foreground font-medium">Đang kết nối...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 backdrop-blur-md rounded-lg" style={{ backgroundColor: 'rgba(var(--overlay))' }}>
              <p className="text-destructive font-medium">{error}</p>
            </div>
          )}
          {isEnded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 backdrop-blur-md rounded-lg" style={{ backgroundColor: 'rgba(var(--overlay))' }}>
              <div className="rounded-full p-4 mb-2 border border-border/30" style={{ backgroundColor: 'rgb(var(--card))' }}>
                <X className="h-12 w-12 text-foreground" />
              </div>
              <p className="text-xl font-semibold text-foreground">Phiên live đã kết thúc</p>
              <p className="text-sm text-muted-foreground">Người phát đã kết thúc livestream này</p>
              {countdown > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Tự động đóng sau <span className="font-semibold text-foreground">{countdown}</span> giây
                </p>
              )}
            </div>
          )}

          {!isEnded && (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md border border-danger/30" style={{ backgroundColor: 'rgb(var(--danger))' }}>
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            <span>LIVE</span>
          </div>
          )}

          <div className="absolute left-4 bottom-4 rounded-xl px-4 py-2.5 text-sm backdrop-blur-md border border-border/30 shadow-lg" style={{ backgroundColor: 'rgb(var(--card))' }}>
            <p className="text-base font-semibold mb-1 text-foreground">{livestream.title}</p>
            <p className="text-xs text-muted-foreground">
              {viewerCount} người đang xem {livestream.description && `· ${livestream.description}`}
            </p>
          </div>

          <div className="absolute right-4 bottom-4 flex gap-2">
            <button
              className={cn(
                "rounded-full p-3 backdrop-blur-md transition-all duration-200",
                "border border-border/30 shadow-lg",
                "hover:scale-110 active:scale-95",
                showChat 
                  ? "text-white" 
                  : "text-foreground/80 hover:text-foreground"
              )}
              style={{ 
                backgroundColor: showChat ? 'rgb(var(--primary))' : 'rgb(var(--card))'
              }}
              onClick={() => setShowChat((prev) => !prev)}
              aria-label="Toggle chat"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showChat && (
          <div className="flex w-full md:w-96 flex-col md:h-full md:max-h-screen border-l backdrop-blur-md shadow-2xl" style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
            <div className="mb-3 flex items-center justify-between flex-shrink-0 px-4 pt-4 pb-2 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <div className="flex items-center gap-2 text-foreground">
                <MessageCircle className="h-4 w-4" style={{ color: 'rgb(var(--primary))' }} />
                <span className="text-sm font-semibold">Bình luận</span>
              </div>
              <span className="text-xs text-muted-foreground">{viewerCount} người xem</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-2 py-2">
              {messages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Hãy là người đầu tiên bình luận!</p>
              )}
              {messages.map((msg, idx) => {
                // System notification messages (user joined/left) - thông báo hệ thống với icon cờ lê
                if (msg.type === 'system-notification' || msg.type === 'notification' || msg.type === 'batch-notification') {
                  return (
                    <div key={`notification-${idx}`} className="flex items-start gap-2.5 py-1.5">
                      {/* Icon cờ lê cho thông báo hệ thống */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--muted))', borderColor: 'rgb(var(--border))' }}>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground mb-0.5">Hệ thống</p>
                        <p className="text-sm text-muted-foreground break-words">{msg.message}</p>
                      </div>
                    </div>
                  );
                }
                // Regular chat messages
                return (
                  <div key={`${msg.userId}-${idx}`} className="flex items-start gap-2.5 py-1.5 rounded-lg px-2 hover:bg-muted/30 transition-colors">
                    {msg.userAvatar ? (
                      <img
                        src={msg.userAvatar}
                        alt={msg.userName || "User"}
                        className="h-8 w-8 rounded-full object-cover border flex-shrink-0"
                        style={{ borderColor: 'rgb(var(--border))' }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold flex-shrink-0 border",
                        msg.userAvatar && "hidden"
                      )}
                      style={{ backgroundColor: 'rgb(var(--primary))', color: 'rgb(var(--primary-foreground))', borderColor: 'rgb(var(--primary))' }}
                    >
                      {msg.userName?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground mb-0.5">{msg.userName || "User"}</p>
                      <p className="text-sm text-muted-foreground break-words">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
              {/* Invisible element để scroll xuống */}
              <div ref={messagesEndRef} />
            </div>
            <div className="mt-2 flex items-center gap-2 px-4 pb-4 flex-shrink-0 border-t pt-3" style={{ borderColor: 'rgb(var(--border))' }}>
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Nhập bình luận..."
                className="flex-1 text-sm rounded-full px-4 py-2.5 focus:outline-none transition-all duration-200 border"
                style={{ 
                  backgroundColor: 'rgb(var(--muted))',
                  color: 'rgb(var(--foreground))',
                  borderColor: 'rgb(var(--border))',
                  '--tw-placeholder-opacity': '0.5'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgb(var(--primary))';
                  e.target.style.boxShadow = '0 0 0 2px rgba(var(--primary), 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgb(var(--border))';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                onClick={handleSendMessage}
                className="rounded-full p-2.5 text-white transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0 shadow-lg"
                style={{ backgroundColor: 'rgb(var(--primary))' }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

LiveViewer.propTypes = {
  livestream: PropTypes.shape({
    livestreamId: PropTypes.string.isRequired,
    title: PropTypes.string,
    description: PropTypes.string,
    agoraChannelName: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

