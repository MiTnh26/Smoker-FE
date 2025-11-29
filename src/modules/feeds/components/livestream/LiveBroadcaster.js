import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { MessageCircle, Mic, MicOff, Users, Video, VideoOff, X } from "lucide-react";
import AgoraRTC from "agora-rtc-sdk-ng";
import livestreamApi from "../../../../api/livestreamApi";
import { cn } from "../../../../utils/cn";
import useAgoraClient from "./hooks/useAgoraClient";
import useLivestreamChat from "./hooks/useLivestreamChat";
import { getSessionUser } from "./utils";

export default function LiveBroadcaster({ onClose, onEnded }) {
  const sessionUser = useMemo(() => getSessionUser(), []);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [livestreamMeta, setLivestreamMeta] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  const localTracksRef = useRef({ videoTrack: null, audioTrack: null });
  const videoContainerRef = useRef(null);

  const { client, joinChannel, leaveChannel } = useAgoraClient({ mode: "host" });
  const { messages, viewerCount, sendMessage } = useLivestreamChat({
    channelName: livestreamMeta?.channelName,
    user: sessionUser,
    isBroadcaster: true, // Broadcaster không được đếm vào viewer count
  });

  const cleanupTracks = useCallback(() => {
    ["videoTrack", "audioTrack"].forEach((key) => {
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

  const playLocalVideo = useCallback(() => {
    const track = localTracksRef.current.videoTrack;
    if (!track || !videoContainerRef.current) return;
    track.play(videoContainerRef.current, { fit: "cover" });
  }, []);

  const startBroadcast = async () => {
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề livestream");
      return;
    }
    try {
      setIsInitializing(true);
      setError(null);

      const payload = await livestreamApi.startLivestream(title, description);
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

      const videoTrack = await AgoraRTC.createCameraVideoTrack({ encoderConfig: "720p_1" });
      let audioTrack = null;
      try {
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      } catch (err) {
        console.warn("[LiveBroadcaster] microphone unavailable:", err);
      }

      localTracksRef.current = { videoTrack, audioTrack };

      const tracksToPublish = [videoTrack];
      if (audioTrack) tracksToPublish.push(audioTrack);

      await client.current.publish(tracksToPublish);

      setLivestreamMeta({
        livestreamId: livestream.livestreamId,
        channelName: agora.channelName,
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
  };

  useEffect(() => {
    if (!isLive) return;
    const id = requestAnimationFrame(() => playLocalVideo());
    return () => cancelAnimationFrame(id);
  }, [isLive, playLocalVideo]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/90 px-4 py-10">
      <div className="relative w-full max-w-5xl rounded-3xl border border-border/50 bg-card/95 p-6 shadow-2xl">
        <button
          onClick={async () => {
            if (isLive) {
              await handleStop();
            } else {
              onClose?.();
            }
          }}
          className="absolute right-6 top-6 rounded-full border border-border/50 bg-card/70 p-2 text-foreground/70 transition hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {!isLive && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Bắt đầu livestream</h2>
            <input
              type="text"
              className="w-full rounded-2xl border border-border/60 bg-input/70 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Tiêu đề livestream"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              rows={4}
              className="w-full rounded-2xl border border-border/60 bg-input/70 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Mô tả (tùy chọn)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {error && (
              <div className="rounded-2xl border border-danger/50 bg-danger/10 px-4 py-3 text-danger">
                {error}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl border border-border/70 px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground md:flex-none md:px-6"
                disabled={isInitializing}
              >
                Hủy
              </button>
              <button
                onClick={startBroadcast}
                className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90 md:flex-none md:px-6"
                disabled={isInitializing}
              >
                {isInitializing ? "Đang khởi tạo..." : "Bắt đầu phát trực tiếp"}
              </button>
            </div>
          </div>
        )}

        {isLive && (
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex flex-1 flex-col gap-4">
              <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-black/80">
                <div ref={videoContainerRef} className="aspect-video w-full" />
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-danger px-3 py-1 text-xs font-semibold text-white">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  LIVE
                </div>
              </div>
              <div className="rounded-3xl border border-border/40 bg-card/90 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {viewerCount} người đang xem
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={handleToggleMute}
                      className="rounded-full border border-border/50 bg-card/70 p-2 text-foreground/80 transition hover:text-primary"
                    >
                      {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={handleToggleVideo}
                      className="rounded-full border border-border/50 bg-card/70 p-2 text-foreground/80 transition hover:text-primary"
                    >
                      {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={handleStop}
                      className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-danger/30 transition hover:bg-danger/90"
                    >
                      Kết thúc
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col rounded-3xl border border-border/40 bg-card/90 p-4 md:w-80 h-[500px] md:h-[600px]">
              <div className="mb-3 flex items-center gap-2 text-foreground flex-shrink-0">
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">Bình luận</span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">Chưa có bình luận nào.</p>
                )}
                {messages.map((msg, index) => (
                  <div key={`${msg.userId}-${index}`} className="flex items-start gap-3 rounded-2xl bg-muted/40 px-3 py-2">
                    {msg.userAvatar ? (
                      <img
                        src={msg.userAvatar}
                        alt={msg.userName || "User"}
                        className="h-8 w-8 rounded-full object-cover border border-border/30 flex-shrink-0"
                        onError={(e) => {
                          // Fallback to initial if image fails to load
                          e.target.style.display = "none";
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = "flex";
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary flex-shrink-0",
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
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border/60 bg-card/70 px-3 py-2 flex-shrink-0">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Nhập bình luận..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  className="rounded-full bg-primary p-2 text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90"
                >
                  Gửi
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
};

