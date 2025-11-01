import { useState, useEffect, useRef } from "react";
import { X, Mic, MicOff, Video, VideoOff, MessageCircle, Users } from "lucide-react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { useSocket } from "../../../contexts/SocketContext";
import livestreamApi from "../../../api/livestreamApi";
import "../../../styles/modules/feeds/LiveBroadcaster.css";

export default function LiveBroadcaster({ onClose }) {
  const { socket } = useSocket();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [livestreamId, setLivestreamId] = useState(null);
  const [channelName, setChannelName] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);

  const clientRef = useRef(null);
  const localTrackRef = useRef({
    videoTrack: null,
    audioTrack: null,
  });

  // Get user info from localStorage
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("session") || "{}");
    setUserId(session?.account?.id || session?.userId);
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !channelName) return;

    socket.on("new-chat-message", (data) => {
      setChatMessages((prev) => [...prev, data]);
    });

    socket.on("user-joined", () => {
      setViewerCount((prev) => prev + 1);
    });

    socket.on("user-left", () => {
      setViewerCount((prev) => Math.max(0, prev - 1));
    });

    return () => {
      socket.off("new-chat-message");
      socket.off("user-joined");
      socket.off("user-left");
    };
  }, [socket, channelName]);

  // Ensure video plays when element is rendered
  useEffect(() => {
    if (isLive && localTrackRef.current?.videoTrack) {
      const videoElement = document.getElementById("local-video");
      if (videoElement) {
        try {
          localTrackRef.current.videoTrack.play("local-video", { fit: "cover" });
          console.log("✅ Video playback triggered from useEffect");
        } catch (error) {
          console.error("❌ Error playing video in useEffect:", error);
        }
      }
    }
  }, [isLive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only cleanup if we actually started broadcasting
      if (isLive && livestreamId) {
        stopBroadcast();
      }
    };
  }, []);

  const startBroadcast = async () => {
    try {
      if (!title.trim()) {
        alert("Vui lòng nhập tiêu đề cho livestream");
        return;
      }

      setIsInitializing(true);
      setError(null);

      console.log("🎬 Starting livestream with:", { title, description });
      
      // Create livestream via API
      const response = await livestreamApi.startLivestream(title, description);
      
      console.log("Start livestream response:", response);
      
      // Handle different response formats
      let livestream, agora;
      if (response.data && response.data.livestream && response.data.agora) {
        // Format: { status: "success", data: { livestream, agora } }
        livestream = response.data.livestream;
        agora = response.data.agora;
      } else if (response.livestream && response.agora) {
        // Format: { livestream, agora }
        livestream = response.livestream;
        agora = response.agora;
      } else {
        throw new Error("Invalid response format from server");
      }

      if (!livestream || !agora) {
        throw new Error("Missing livestream or agora data");
      }

      setLivestreamId(livestream.livestreamId);
      setChannelName(agora.channelName);

      // Initialize Agora client
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      // Join channel
      await client.join(agora.appId, agora.channelName, agora.token, agora.uid);

      // Create local tracks with error handling
      let videoTrack, audioTrack;
      try {
        videoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: "720p_1", // Use 720p quality
        });
        console.log("✅ Video track created successfully");
      } catch (error) {
        console.error("❌ Error creating video track:", error);
        throw new Error("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập camera.");
      }

      try {
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        console.log("✅ Audio track created successfully");
      } catch (error) {
        console.error("❌ Error creating audio track:", error);
        // Audio is optional, continue without it
        console.warn("⚠️ Continuing without audio track");
      }

      localTrackRef.current = { videoTrack, audioTrack };

      // Publish tracks
      const tracksToPublish = [videoTrack];
      if (audioTrack) {
        tracksToPublish.push(audioTrack);
      }
      await client.publish(tracksToPublish);
      console.log("✅ Tracks published successfully");

      setIsLive(true);
      setIsInitializing(false);
      
      // Play video after state update and DOM render
      // Use requestAnimationFrame and setTimeout to ensure DOM is ready
      requestAnimationFrame(() => {
        setTimeout(() => {
          const videoElement = document.getElementById("local-video");
          if (videoElement) {
            try {
              videoTrack.play("local-video", { fit: "cover" });
              console.log("✅ Video playback started");
            } catch (error) {
              console.error("❌ Error playing video:", error);
              // Try again after a short delay
              setTimeout(() => {
                try {
                  videoTrack.play("local-video", { fit: "cover" });
                  console.log("✅ Video playback started (retry)");
                } catch (e) {
                  console.error("❌ Retry video play failed:", e);
                }
              }, 500);
            }
          } else {
            console.warn("⚠️ Video element not found, retrying...");
            setTimeout(() => {
              const retryElement = document.getElementById("local-video");
              if (retryElement && videoTrack) {
                videoTrack.play("local-video", { fit: "cover" });
                console.log("✅ Video playback started (delayed retry)");
              }
            }, 500);
          }
        }, 100);
      });

      // Join socket room
      if (socket) {
        socket.emit("join-livestream", { channelName: agora.channelName, userId });
      }
    } catch (error) {
      console.error("Error starting broadcast:", error);
      console.error("Error response data:", error.response?.data);
      console.error("Error response status:", error.response?.status);
      setIsInitializing(false);
      
      // Extract error message from response
      // Backend returns: { status: "error", message: "...", code: 400 }
      let errorMessage = "Không thể bắt đầu livestream. Vui lòng thử lại.";
      
      const errorData = error.response?.data;
      if (errorData) {
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error("Final error message:", errorMessage);
      console.error("Full error data:", errorData);
      setError(errorMessage);
      
      // Cleanup on error
      if (clientRef.current) {
        try {
          await clientRef.current.leave();
        } catch (e) {
          console.error("Error leaving channel on failure:", e);
        }
      }
      if (localTrackRef.current.videoTrack) {
        localTrackRef.current.videoTrack.close();
      }
      if (localTrackRef.current.audioTrack) {
        localTrackRef.current.audioTrack.close();
      }
      
      alert(errorMessage);
    }
  };

  const stopBroadcast = async () => {
    try {
      if (livestreamId) {
        await livestreamApi.endLivestream(livestreamId);
      }

      // Leave socket room
      if (channelName && socket) {
        socket.emit("leave-livestream", { channelName, userId });
      }

      // Stop local tracks
      if (localTrackRef.current.videoTrack) {
        localTrackRef.current.videoTrack.stop();
        localTrackRef.current.videoTrack.close();
      }

      if (localTrackRef.current.audioTrack) {
        localTrackRef.current.audioTrack.stop();
        localTrackRef.current.audioTrack.close();
      }

      // Leave channel
      if (clientRef.current) {
        await clientRef.current.leave();
      }

      setIsLive(false);
      onClose();
    } catch (error) {
      console.error("Error stopping broadcast:", error);
      alert("Có lỗi xảy ra khi kết thúc livestream");
    }
  };

  const toggleMute = () => {
    if (localTrackRef.current.audioTrack) {
      localTrackRef.current.audioTrack.setEnabled(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localTrackRef.current.videoTrack) {
      localTrackRef.current.videoTrack.setEnabled(!isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socket || !channelName) return;

    const session = JSON.parse(localStorage.getItem("session") || "{}");
    socket.emit("chat-message", {
      channelName,
      message: newMessage,
      userId: session?.account?.id,
      userName: session?.account?.fullName || "User",
      userAvatar: session?.account?.avatar || "",
    });

    setNewMessage("");
  };

  const handleOverlayClick = (e) => {
    // Only close if clicking directly on overlay, not on container
    if (e.target === e.currentTarget && !isInitializing && !isLive) {
      onClose();
    }
  };

  return (
    <div className="live-broadcaster-overlay" onClick={handleOverlayClick}>
      <div className="live-broadcaster-container" onClick={(e) => e.stopPropagation()}>
        {!isLive ? (
          <div className="live-broadcaster-setup">
            <h2>Bắt đầu livestream</h2>
            <input
              type="text"
              placeholder="Nhập tiêu đề livestream"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="broadcast-title-input"
            />
            <textarea
              placeholder="Mô tả (tùy chọn)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="broadcast-description-input"
              rows={4}
            />
            <div className="broadcast-actions">
              <button 
                onClick={onClose} 
                className="btn-cancel"
                disabled={isInitializing}
              >
                Hủy
              </button>
              <button 
                onClick={startBroadcast} 
                className="btn-start"
                disabled={isInitializing}
              >
                {isInitializing ? "Đang khởi tạo..." : "Bắt đầu phát trực tiếp"}
              </button>
            </div>
            {error && (
              <div className="error-message" style={{ color: 'red', marginTop: '10px', padding: '10px', background: '#ffe0e0', borderRadius: '4px' }}>
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="live-broadcaster-live">
            <div className="broadcast-main">
              <div className="video-container">
                <div id="local-video" className="local-video"></div>
              <div className="live-badge">
            <span className="live-dot"></span>
            <span>LIVE</span>
          </div>
              </div>

              <div className="broadcast-info">
                <h3>{title}</h3>
                <div className="viewer-count">
                  <Users size={16} />
                  {viewerCount} người đang xem
                </div>

                <div className="broadcast-controls">
                  <button onClick={toggleMute} className="control-btn">
                    {isMuted ? <MicOff /> : <Mic />}
                  </button>
                  <button onClick={toggleVideo} className="control-btn">
                    {isVideoOff ? <VideoOff /> : <Video />}
                  </button>
                  <button onClick={stopBroadcast} className="control-btn btn-end">
                    Kết thúc
                  </button>
                </div>
              </div>
            </div>

            <div className="broadcast-chat">
              <div className="chat-header">
                <MessageCircle size={16} />
                Bình luận
              </div>
              <div className="chat-messages">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className="chat-message">
                    <strong>{msg.userName}:</strong> {msg.message}
                  </div>
                ))}
              </div>
              <div className="chat-input-container">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Nhập bình luận..."
                  className="chat-input"
                />
                <button onClick={sendMessage} className="chat-send-btn">
                  Gửi
                </button>
              </div>
            </div>
          </div>
        )}

        <button 
          onClick={onClose} 
          className="close-btn"
          disabled={isInitializing}
          style={{ opacity: isInitializing ? 0.5 : 1, cursor: isInitializing ? 'not-allowed' : 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}

