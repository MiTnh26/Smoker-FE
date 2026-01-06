import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { MessageCircle, Mic, MicOff, Users, Video, VideoOff, X, Wrench, Send, Monitor } from "lucide-react";
import AgoraRTC from "agora-rtc-sdk-ng";
import livestreamApi from "../../../../api/livestreamApi";
import { cn } from "../../../../utils/cn";
import useAgoraClient from "./hooks/useAgoraClient";
import useLivestreamChat from "./hooks/useLivestreamChat";
import { getSessionUser } from "./utils";

export default function LiveBroadcaster({ onClose, onEnded, setupData }) {
  const sessionUser = useMemo(() => getSessionUser(), []);
  const [title, setTitle] = useState(setupData?.title || "");
  const [description, setDescription] = useState(setupData?.description || "");
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [livestreamMeta, setLivestreamMeta] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);

  const localTracksRef = useRef({ videoTrack: null, audioTrack: null, screenTrack: null });
  const videoContainerRef = useRef(null);
  const screenContainerRef = useRef(null);
  const webcamOverlayRef = useRef(null);
  const messagesEndRef = useRef(null);

  const { client, joinChannel, leaveChannel } = useAgoraClient({ mode: "host" });
  const { messages, viewerCount, sendMessage } = useLivestreamChat({
    channelName: livestreamMeta?.channelName,
    user: sessionUser,
    isBroadcaster: true, // Broadcaster không được đếm vào viewer count
  });

  const cleanupTracks = useCallback(() => {
    ["videoTrack", "audioTrack", "screenTrack"].forEach((key) => {
      const track = localTracksRef.current[key];
      if (track) {
        track.stop();
        track.close();
        localTracksRef.current[key] = null;
      }
    });
  }, []);

  const stopBroadcast = useCallback(async () => {
    try {
      if (livestreamMeta?.livestreamId) {
        await livestreamApi.endLivestream(livestreamMeta.livestreamId);
      }
    } catch (err) {
      console.error("[LiveBroadcaster] end error:", err);
    } finally {
      cleanupTracks();
      await leaveChannel();
      setIsLive(false);
      setLivestreamMeta(null);
      setIsMuted(false);
      setIsVideoOff(false);
    }
  }, [cleanupTracks, leaveChannel, livestreamMeta]);

  useEffect(() => {
    return () => {
      if (isLive) {
        stopBroadcast();
      }
    };
  }, [isLive, stopBroadcast]);

  // Auto-scroll xuống comment mới nhất
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const playLocalVideo = useCallback(() => {
    const screenTrack = localTracksRef.current.screenTrack;
    const videoTrack = localTracksRef.current.videoTrack;
    
    if (screenTrack && screenContainerRef.current) {
      screenTrack.play(screenContainerRef.current, { fit: "contain" });
    }
    
    if (videoTrack) {
      if (screenShareEnabled && webcamOverlayRef.current) {
        // Play webcam as overlay
        videoTrack.play(webcamOverlayRef.current, { fit: "cover" });
      } else if (videoContainerRef.current) {
        // Play webcam as main video
        videoTrack.play(videoContainerRef.current, { fit: "cover" });
      }
    }
  }, [screenShareEnabled]);

  const startBroadcast = useCallback(async () => {
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề livestream");
      return;
    }
    try {
      setIsInitializing(true);
      setError(null);

      const payload = await livestreamApi.startLivestream(
        title, 
        description, 
        setupData?.pinnedComment || null
      );
      const livestream = payload?.livestream;
      const agora = payload?.agora;

      if (!livestream || !agora) {
        throw new Error("Server không trả về thông tin livestream hợp lệ.");
      }

      await joinChannel({
        appId: agora.appId,
        channelName: agora.channelName,
        token: agora.token,
        uid: agora.uid,
      });

      // Use setup data if available
      const cameraId = setupData?.cameraId;
      const microphoneId = setupData?.microphoneId;
      const screenShareEnabled = setupData?.screenShareEnabled || false;
      const screenShareType = setupData?.screenShareType || "fullscreen";
      
      let videoTrack = null;
      let screenTrack = null;
      
      // Create camera track
      if (!screenShareEnabled || (screenShareEnabled && setupData?.webcamPosition)) {
        try {
          videoTrack = await AgoraRTC.createCameraVideoTrack({ 
            encoderConfig: "720p_1",
            cameraId: cameraId || undefined
          });
        } catch (err) {
          console.error("[LiveBroadcaster] camera access failed:", err);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            throw new Error("Không có quyền truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.");
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            throw new Error("Không tìm thấy camera. Vui lòng kiểm tra thiết bị của bạn.");
          } else {
            throw new Error("Không thể khởi tạo camera. Vui lòng thử lại.");
          }
        }
      }
      
      // Create screen share track if enabled
      if (screenShareEnabled) {
        try {
          screenTrack = await AgoraRTC.createScreenVideoTrack({
            screenSourceType: screenShareType === "window" ? "window" : "screen",
            encoderConfig: "720p_1"
          });
          setScreenShareEnabled(true);
        } catch (err) {
          console.error("[LiveBroadcaster] screen share failed:", err);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setError("Không có quyền chia sẻ màn hình. Vui lòng cấp quyền và thử lại.");
            cleanupTracks();
            await leaveChannel();
            setIsInitializing(false);
            return;
          } else {
            // Fallback to camera only if screen share fails for other reasons
            setError("Không thể chia sẻ màn hình. Đang chuyển sang chế độ camera.");
            setScreenShareEnabled(false);
          }
        }
      }
      
      let audioTrack = null;
      try {
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          microphoneId: microphoneId || undefined
        });
      } catch (err) {
        console.warn("[LiveBroadcaster] microphone unavailable:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          // Microphone is optional, just warn user
          setError("Không có quyền truy cập microphone. Livestream sẽ không có âm thanh.");
        }
      }

      localTracksRef.current = { videoTrack, audioTrack, screenTrack };

      const tracksToPublish = [];
      if (screenTrack) tracksToPublish.push(screenTrack);
      if (videoTrack) tracksToPublish.push(videoTrack);
      if (audioTrack) tracksToPublish.push(audioTrack);

      await client.current.publish(tracksToPublish);

      setLivestreamMeta({
        livestreamId: livestream.livestreamId,
        channelName: agora.channelName,
        hostAccountId: livestream.hostAccountId || sessionUser?.id,
        hostEntityAccountId: livestream.hostEntityAccountId || sessionUser?.entityAccountId,
      });
      setIsLive(true);
    } catch (err) {
      console.error("[LiveBroadcaster] start error:", err);
      setError(err.message || "Không thể bắt đầu livestream.");
      cleanupTracks();
      await leaveChannel();
    } finally {
      setIsInitializing(false);
    }
  }, [title, description, setupData, joinChannel, leaveChannel, cleanupTracks, client]);

  // Auto-start broadcast when component mounts
  useEffect(() => {
    // Wait a bit to ensure state is initialized
    const timer = setTimeout(() => {
      if (!isLive && !isInitializing && !error && title.trim()) {
        console.log("[LiveBroadcaster] Auto-starting broadcast...");
        startBroadcast();
      } else {
          console.log("[LiveBroadcaster] Cannot start:", { isLive, isInitializing, error, hasTitle: !!title.trim() });
      }
    }, 100);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    if (!isLive) return;
    const id = requestAnimationFrame(() => playLocalVideo());
    return () => cancelAnimationFrame(id);
  }, [isLive, playLocalVideo]);

  // Warning và tự động end livestream khi user refresh/close tab
  useEffect(() => {
    if (!isLive || !livestreamMeta?.livestreamId) return;
    
    const handleBeforeUnload = async (e) => {
      // Cố gắng end livestream trước khi unload
      // Sử dụng sendBeacon để đảm bảo request được gửi ngay cả khi trang đang unload
      if (livestreamMeta?.livestreamId) {
        try {
          const endpoint = `/api/livestream/${livestreamMeta.livestreamId}/end`;
          const url = new URL(endpoint, window.location.origin);
          
          // Sử dụng fetch với keepalive (reliable hơn sendBeacon cho POST)
          fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
            credentials: 'include'
          }).catch(() => {}); // Ignore errors khi unload
        } catch (err) {
          console.error("[LiveBroadcaster] Error ending livestream on unload:", err);
        }
      }
      
      // Vẫn hiển thị warning
      e.preventDefault();
      e.returnValue = "Bạn đang phát trực tiếp. Livestream sẽ tự động kết thúc sau 30 giây nếu bạn rời khỏi trang.";
      return e.returnValue;
    };
    
    const handleVisibilityChange = () => {
      // Khi tab bị ẩn hoặc đóng, log để debug
      if (document.hidden && livestreamMeta?.livestreamId) {
        console.log("[LiveBroadcaster] Tab hidden, livestream will auto-end if broadcaster doesn't return");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLive, livestreamMeta]);

  const handleStop = async () => {
    await stopBroadcast();
    onEnded?.();
  };

  const handleToggleMute = () => {
    const track = localTracksRef.current.audioTrack;
    if (!track) return;
    track.setEnabled(isMuted);
    setIsMuted((prev) => !prev);
  };

  const handleToggleVideo = () => {
    const track = localTracksRef.current.videoTrack;
    if (!track) return;
    track.setEnabled(isVideoOff);
    setIsVideoOff((prev) => !prev);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessage(newMessage.trim());
    setNewMessage("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-4 py-2 sm:py-4 backdrop-blur-sm" style={{ backgroundColor: 'rgba(var(--overlay))' }}>
      <div className="relative w-full max-w-6xl rounded-2xl border p-3 sm:p-4 md:p-5 shadow-2xl backdrop-blur-md" style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
        <button
          onClick={async () => {
            if (isLive) {
              await handleStop();
            } else {
              onClose?.();
            }
          }}
          className="absolute right-6 top-6 rounded-full border p-2 transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
          style={{ 
            backgroundColor: 'rgb(var(--card))',
            borderColor: 'rgb(var(--border))',
            color: 'rgb(var(--foreground))'
          }}
        >
          <X className="h-5 w-5" />
        </button>

        {!isLive && (
          <div className="space-y-4">
            {error && (
              <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'rgb(var(--danger))', backgroundColor: 'rgba(var(--danger), 0.1)', color: 'rgb(var(--danger))' }}>
                {error}
              </div>
            )}
            {isInitializing ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-foreground font-medium">Đang khởi tạo livestream...</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-foreground">Đang chuẩn bị phát trực tiếp...</p>
            </div>
            )}
          </div>
        )}

        {isLive && (
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex flex-1 flex-col gap-4">
              <div 
                className="relative overflow-hidden rounded-3xl border backdrop-blur-md shadow-xl" 
                style={{ 
                  backgroundColor: setupData?.background?.url === "blur" ? 'rgb(var(--muted))' : setupData?.background?.url || 'rgb(var(--background))',
                  backgroundImage: setupData?.background?.url && setupData.background.url.startsWith("linear-gradient") ? setupData.background.url : undefined,
                  borderColor: 'rgb(var(--border))',
                  backdropFilter: setupData?.background?.url === "blur" ? 'blur(10px)' : undefined,
                }}
              >
                <div className="aspect-video w-full relative" style={{ backgroundColor: 'rgb(var(--background))' }}>
                  {/* Screen share container */}
                  {screenShareEnabled && (
                    <div ref={screenContainerRef} className="absolute inset-0 w-full h-full" />
                  )}
                  
                  {/* Webcam overlay (when screen share is enabled) */}
                  {screenShareEnabled && setupData?.webcamPosition && (
                    <div
                      ref={webcamOverlayRef}
                      className="absolute border-2 rounded-lg overflow-hidden"
                      style={{
                        left: `${setupData.webcamPosition.x}%`,
                        top: `${setupData.webcamPosition.y}%`,
                        width: `${setupData.webcamPosition.width}%`,
                        height: `${setupData.webcamPosition.height}%`,
                        borderColor: 'rgb(var(--primary))',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                        zIndex: 10,
                      }}
                    />
                  )}
                  
                  {/* Webcam only (no screen share) */}
                  {!screenShareEnabled && (
                    <div ref={videoContainerRef} className="absolute inset-0 w-full h-full" />
                  )}
                </div>
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-md border z-20" style={{ backgroundColor: 'rgb(var(--danger))', borderColor: 'rgba(var(--danger), 0.3)' }}>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  LIVE
                </div>
              </div>
              
              {/* Broadcaster Info - Moved to bottom */}
              <div className="rounded-xl px-4 py-3 backdrop-blur-md border border-border/30 shadow-lg" style={{ backgroundColor: 'rgb(var(--card))' }}>
                <div className="flex items-center gap-2 mb-2">
                  {sessionUser?.avatar ? (
                    <img
                      src={sessionUser.avatar}
                      alt={sessionUser?.name || "You"}
                      className="h-10 w-10 rounded-full object-cover border flex-shrink-0"
                      style={{ borderColor: 'rgb(var(--border))' }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold flex-shrink-0 border",
                      sessionUser?.avatar && "hidden"
                    )}
                    style={{ backgroundColor: 'rgb(var(--primary))', color: 'rgb(var(--primary-foreground))', borderColor: 'rgb(var(--primary))' }}
                  >
                    {sessionUser?.name?.[0]?.toUpperCase() || "Y"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground mb-0.5">
                      {sessionUser?.name || "Bạn"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {viewerCount} người đang xem {description && `· ${description}`}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Video trực tiếp của bạn nói về điều gì?
                </p>
                <p className="text-base font-semibold text-foreground">
                  {title || "Chưa có tiêu đề"}
                </p>
              </div>
              <div className="rounded-3xl border p-4 backdrop-blur-md shadow-lg" style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-full px-3 py-1 text-sm border" style={{ backgroundColor: 'rgb(var(--muted))', color: 'rgb(var(--muted-foreground))', borderColor: 'rgb(var(--border))' }}>
                    <Users className="h-4 w-4" />
                    {viewerCount} người đang xem
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={handleToggleMute}
                      className="rounded-full border p-2 transition-all duration-200 hover:scale-110 active:scale-95 shadow-md"
                      style={{ 
                        backgroundColor: 'rgb(var(--card))',
                        borderColor: 'rgb(var(--border))',
                        color: isMuted ? 'rgb(var(--danger))' : 'rgb(var(--foreground))'
                      }}
                    >
                      {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={handleToggleVideo}
                      className="rounded-full border p-2 transition-all duration-200 hover:scale-110 active:scale-95 shadow-md"
                      style={{ 
                        backgroundColor: 'rgb(var(--card))',
                        borderColor: 'rgb(var(--border))',
                        color: isVideoOff ? 'rgb(var(--danger))' : 'rgb(var(--foreground))'
                      }}
                    >
                      {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </button>
                    {screenShareEnabled && (
                      <button
                        onClick={async () => {
                          if (localTracksRef.current.screenTrack) {
                            await client.current.unpublish([localTracksRef.current.screenTrack]);
                            localTracksRef.current.screenTrack.stop();
                            localTracksRef.current.screenTrack.close();
                            localTracksRef.current.screenTrack = null;
                            setScreenShareEnabled(false);
                          }
                        }}
                        className="rounded-full border p-2 transition-all duration-200 hover:scale-110 active:scale-95 shadow-md"
                        style={{ 
                          backgroundColor: 'rgb(var(--card))',
                          borderColor: 'rgb(var(--border))',
                          color: 'rgb(var(--foreground))'
                        }}
                      >
                        <Monitor className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={handleStop}
                      className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{ backgroundColor: 'rgb(var(--danger))' }}
                    >
                      Kết thúc
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col rounded-3xl border p-4 md:w-80 h-[500px] md:h-[600px] backdrop-blur-md shadow-xl" style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
              <div className="mb-3 flex items-center gap-2 flex-shrink-0" style={{ color: 'rgb(var(--foreground))' }}>
                <MessageCircle className="h-5 w-5" style={{ color: 'rgb(var(--primary))' }} />
                <span className="text-sm font-semibold uppercase tracking-wide">Bình luận</span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-sm" style={{ color: 'rgb(var(--muted-foreground))' }}>Chưa có bình luận nào.</p>
                )}
                {messages.map((msg, index) => {
                  // System notification messages
                  if (msg.type === 'system-notification' || msg.type === 'notification' || msg.type === 'batch-notification') {
                    return (
                      <div key={`notification-${index}`} className="flex items-start gap-2.5 py-1.5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--muted))', borderColor: 'rgb(var(--border))' }}>
                          <Wrench className="h-4 w-4" style={{ color: 'rgb(var(--muted-foreground))' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>Hệ thống</p>
                          <p className="text-sm break-words" style={{ color: 'rgb(var(--muted-foreground))' }}>{msg.message}</p>
                        </div>
                      </div>
                    );
                  }
                  // Regular chat messages
                  return (
                    <div key={`${msg.userId}-${index}`} className="flex items-start gap-3 rounded-2xl px-3 py-2 hover:bg-muted/30 transition-colors" style={{ backgroundColor: 'rgb(var(--muted))' }}>
                    {msg.userAvatar ? (
                      <img
                        src={msg.userAvatar}
                        alt={msg.userName || "User"}
                          className="h-8 w-8 rounded-full object-cover border flex-shrink-0"
                          style={{ borderColor: 'rgb(var(--border))' }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = "flex";
                          }
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
                      {msg.userName?.[0] || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>{msg.userName || "User"}</p>
                          {/* Badge "Chủ Live" nếu là chủ livestream */}
                          {(msg.userId === livestreamMeta?.hostAccountId || 
                            msg.entityAccountId === livestreamMeta?.hostEntityAccountId ||
                            msg.userId === sessionUser?.id ||
                            msg.entityAccountId === sessionUser?.entityAccountId) && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500 text-white">
                              Chủ Live
                            </span>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: 'rgb(var(--muted-foreground))' }}>{msg.message}</p>
                    </div>
                  </div>
                  );
                })}
                {/* Invisible element để scroll xuống */}
                <div ref={messagesEndRef} />
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-2xl border px-3 py-2 flex-shrink-0" style={{ backgroundColor: 'rgb(var(--muted))', borderColor: 'rgb(var(--border))' }}>
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Nhập bình luận..."
                  className="flex-1 bg-transparent text-sm focus:outline-none transition-all duration-200"
                  style={{ color: 'rgb(var(--foreground))' }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgb(var(--primary))';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'transparent';
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  className="rounded-full p-2 text-white shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
                  style={{ backgroundColor: 'rgb(var(--primary))' }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

LiveBroadcaster.propTypes = {
  onClose: PropTypes.func.isRequired,
  onEnded: PropTypes.func,
  setupData: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    privacy: PropTypes.string,
    shareToStory: PropTypes.bool,
    pinnedComment: PropTypes.string,
    videoSource: PropTypes.string,
    cameraId: PropTypes.string,
    microphoneId: PropTypes.string,
  }),
};

