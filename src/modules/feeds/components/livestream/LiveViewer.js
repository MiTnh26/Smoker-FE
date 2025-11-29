import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { MessageCircle, Send, X } from "lucide-react";
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
  const { messages, viewerCount, sendMessage, isEnded } = useLivestreamChat({
    channelName: livestream.agoraChannelName,
    user: sessionUser,
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
            remoteTrack.play(videoRef.current);
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
      await livestreamApi.incrementViewCount(livestream.livestreamId);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/90 px-4 py-8">
      <div className="relative flex w-full max-w-6xl flex-col gap-4 rounded-3xl border border-border/40 bg-card/95 p-4 shadow-2xl md:flex-row">
        <button
          onClick={handleClose}
          className={cn(
            "absolute right-4 top-4 z-50",
            "rounded-full bg-card/90 backdrop-blur-sm",
            "border-2 border-border/60",
            "p-2.5 text-foreground",
            "shadow-lg shadow-black/20",
            "transition-all duration-200",
            "hover:bg-card hover:border-border",
            "hover:scale-110 hover:shadow-xl",
            "active:scale-95"
          )}
          aria-label="Đóng livestream"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative flex-1 rounded-2xl bg-black/80 self-start">
          <div ref={videoRef} className="aspect-video w-full rounded-2xl bg-black/80" />
          {isConnecting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/70 text-primary-foreground">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p>Đang kết nối...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-danger/20 text-danger">
              <p>{error}</p>
            </div>
          )}
          {isEnded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/80 backdrop-blur-sm">
              <div className="rounded-full bg-muted/90 p-4 mb-2">
                <X className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-xl font-semibold text-primary-foreground">Phiên live đã kết thúc</p>
              <p className="text-sm text-muted-foreground">Người phát đã kết thúc livestream này</p>
              {countdown > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Tự động đóng sau <span className="font-semibold text-primary-foreground">{countdown}</span> giây
                </p>
              )}
            </div>
          )}

          {!isEnded && (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-danger px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg shadow-danger/40">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" />
            <span>LIVE</span>
          </div>
          )}

          <div className="absolute left-4 bottom-4 rounded-xl bg-black/60 px-4 py-2 text-sm text-white backdrop-blur">
            <p className="text-base font-semibold">{livestream.title}</p>
            <p className="text-xs text-white/80">
              {viewerCount} người đang xem · {livestream.description}
            </p>
          </div>

          <div className="absolute right-4 bottom-4 flex gap-2">
            <button
              className={cn(
                "rounded-full bg-white/20 p-2 text-white backdrop-blur transition hover:bg-white/40",
                showChat && "bg-white/40"
              )}
              onClick={() => setShowChat((prev) => !prev)}
              aria-label="Toggle chat"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showChat && (
          <div className="flex w-full max-w-sm flex-col rounded-2xl border border-border/60 bg-card/80 p-4 backdrop-blur md:w-80 self-start md:h-[calc((100vw-8rem-2rem)*9/16)] md:max-h-[600px]">
            <div className="mb-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 text-foreground">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Bình luận</span>
              </div>
              <span className="text-xs text-muted-foreground">{viewerCount} người xem</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">Hãy là người đầu tiên bình luận!</p>
              )}
              {messages.map((msg, idx) => (
                <div key={`${msg.userId}-${idx}`} className="flex items-start gap-3 rounded-xl bg-muted/30 p-2">
                  {msg.userAvatar ? (
                    <img
                      src={msg.userAvatar}
                      alt={msg.userName || "User"}
                      className="h-8 w-8 rounded-full object-cover border border-border/30"
                      onError={(e) => {
                        // Fallback to initial if image fails to load
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary",
                      msg.userAvatar && "hidden"
                    )}
                  >
                    {msg.userName?.[0] || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{msg.userName || "User"}</p>
                    <p className="text-sm text-muted-foreground">{msg.message}</p>
                  </div>
                </div>
              ))}
              {/* Invisible element để scroll xuống */}
              <div ref={messagesEndRef} />
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-2 flex-shrink-0">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Nhập bình luận..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                onClick={handleSendMessage}
                className="rounded-full bg-primary/90 p-2 text-white shadow-lg shadow-primary/30 transition hover:bg-primary"
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

