import { useState, useEffect, useRef } from "react";
import { X, Heart, ThumbsUp, Smile, MessageCircle, Send, Share2 } from "lucide-react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { useSocket } from "../../../contexts/SocketContext";
import livestreamApi from "../../../api/livestreamApi";
import "../../../styles/modules/feeds/LiveViewer.css";

export default function LiveViewer({ livestream, onClose }) {
  const { socket } = useSocket();
  const [isConnected, setIsConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(livestream.viewCount || 0);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(true);

  const clientRef = useRef(null);
  const remoteTrackRef = useRef(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("session") || "{}");
    setUserId(session?.account?.id || session?.userId);
  }, []);

  useEffect(() => {
    joinStream();
    return () => {
      leaveStream();
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("new-chat-message", (data) => {
      setChatMessages((prev) => [...prev, data]);
    });

    socket.on("new-reaction", (data) => {
      // Show reaction animation
      console.log("New reaction:", data);
    });

    socket.on("viewer-count-updated", (data) => {
      setViewerCount(data.count);
    });

    socket.on("user-joined", () => {
      setViewerCount((prev) => prev + 1);
    });

    socket.on("user-left", () => {
      setViewerCount((prev) => Math.max(0, prev - 1));
    });

    return () => {
      socket.off("new-chat-message");
      socket.off("new-reaction");
      socket.off("viewer-count-updated");
      socket.off("user-joined");
      socket.off("user-left");
    };
  }, [socket]);

  const joinStream = async () => {
    try {
      // Get stream credentials
      const response = await livestreamApi.getStreamByChannel(livestream.agoraChannelName);
      const { agora } = response.data;

      // Initialize Agora client
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      // Join channel as audience
      await client.join(agora.appId, livestream.agoraChannelName, agora.token, agora.uid);

      // Listen for remote tracks
      client.on("user-published", async (user, mediaType) => {
        if (mediaType === "video") {
          const remoteTrack = await client.subscribe(user, mediaType);
          remoteTrackRef.current = remoteTrack;
          remoteTrack.play("remote-video");
        }
        if (mediaType === "audio") {
          const remoteTrack = await client.subscribe(user, mediaType);
          remoteTrack.play();
        }
      });

      setIsConnected(true);

      // Join socket room
      socket?.emit("join-livestream", {
        channelName: livestream.agoraChannelName,
        userId,
      });

      // Increment view count
      livestreamApi.incrementViewCount(livestream.livestreamId);
    } catch (error) {
      console.error("Error joining stream:", error);
      alert("Không thể kết nối tới livestream. Vui lòng thử lại.");
    }
  };

  const leaveStream = async () => {
    try {
      // Leave socket room
      if (socket && livestream.agoraChannelName) {
        socket.emit("leave-livestream", {
          channelName: livestream.agoraChannelName,
          userId,
        });
      }

      // Stop remote track
      if (remoteTrackRef.current) {
        remoteTrackRef.current.stop();
        remoteTrackRef.current.close();
      }

      // Leave channel
      if (clientRef.current) {
        await clientRef.current.leave();
      }

      setIsConnected(false);
    } catch (error) {
      console.error("Error leaving stream:", error);
    }
  };

  const sendReaction = (reaction) => {
    if (!socket) return;

    const session = JSON.parse(localStorage.getItem("session") || "{}");
    socket.emit("reaction", {
      channelName: livestream.agoraChannelName,
      reaction,
      userId: session?.account?.id,
      userName: session?.account?.fullName || "User",
    });
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    const session = JSON.parse(localStorage.getItem("session") || "{}");
    socket.emit("chat-message", {
      channelName: livestream.agoraChannelName,
      message: newMessage,
      userId: session?.account?.id,
      userName: session?.account?.fullName || "User",
      userAvatar: session?.account?.avatar || "",
    });

    setNewMessage("");
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    alert("Đã sao chép link!");
  };

  return (
    <div className="live-viewer-overlay">
      <div className="live-viewer-container">
        <div className="viewer-main">
          <div className="video-container">
            <div id="remote-video" className="remote-video"></div>
            {!isConnected && (
              <div className="connecting-overlay">
                <div className="loading-spinner"></div>
                <p>Đang kết nối...</p>
              </div>
            )}
            <div className="live-badge">
              <span className="live-dot"></span>
              <span>LIVE</span>
            </div>

            <button onClick={onClose} className="close-viewer-btn">
              <X size={20} />
            </button>

            <div className="viewer-info-overlay">
              <h3>{livestream.title}</h3>
              <div className="viewer-count">
                <span className="viewer-count-number">{viewerCount}</span> người đang xem
              </div>
            </div>

            <div className="reactions-bar">
              <button onClick={() => sendReaction("❤️")} className="reaction-btn">
                <Heart size={24} />
              </button>
              <button onClick={() => sendReaction("👍")} className="reaction-btn">
                <ThumbsUp size={24} />
              </button>
              <button onClick={() => sendReaction("😍")} className="reaction-btn">
                <Smile size={24} />
              </button>
              <button onClick={() => setShowChat(!showChat)} className="reaction-btn">
                <MessageCircle size={24} />
              </button>
              <button onClick={handleShare} className="reaction-btn">
                <Share2 size={24} />
              </button>
            </div>
          </div>

          {showChat && (
            <div className="viewer-chat">
              <div className="chat-header">
                <MessageCircle size={16} />
                Bình luận
              </div>
              <div className="chat-messages">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className="chat-message">
                    <img src={msg.userAvatar || "/default-avatar.png"} alt={msg.userName} className="chat-avatar" />
                    <div className="chat-message-content">
                      <strong>{msg.userName}</strong>
                      <p>{msg.message}</p>
                    </div>
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
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

