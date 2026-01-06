import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { MessageCircle, Send, X, Wrench, Maximize2, Minimize2, Volume2, VolumeX, Volume1, PictureInPicture2, Settings, Radio, Users, Minimize } from "lucide-react";
import livestreamApi from "../../../../api/livestreamApi";
import { cn } from "../../../../utils/cn";
import useAgoraClient from "./hooks/useAgoraClient";
import useLivestreamChat from "./hooks/useLivestreamChat";
import { getSessionUser } from "./utils";

export default function LiveViewer({ livestream, onClose }) {
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const remoteTracksRef = useRef({ video: null, audio: null });
  const messagesEndRef = useRef(null);
  const isMountedRef = useRef(true);
  const subscribeInProgressRef = useRef(false);
  const isRestoringRef = useRef(false);
  const pipWindowRef = useRef(null);
  const pipClickHandlerRef = useRef(null);
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(10);
  
  // Video controls state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const controlsTimeoutRef = useRef(null);

  const sessionUser = useMemo(() => getSessionUser(), []);
  // Kiểm tra xem user hiện tại có phải là broadcaster không
  const isBroadcaster = useMemo(() => {
    if (!sessionUser || !livestream) return false;
    return livestream.hostAccountId === sessionUser.id || 
           livestream.hostEntityAccountId === sessionUser.entityAccountId;
  }, [sessionUser, livestream]);
  
  const { messages, viewerCount, sendMessage, isEnded } = useLivestreamChat({
    channelName: livestream?.agoraChannelName || '',
    user: sessionUser,
    isBroadcaster: isBroadcaster,
  });

  const { client, joinChannel, leaveChannel } = useAgoraClient({ mode: "viewer" });

  const handleUserPublished = useCallback(
    async (user, mediaType) => {
      // Check if component is still mounted
      if (!isMountedRef.current) return;
      
      // Prevent multiple subscribe operations
      if (subscribeInProgressRef.current) {
        console.warn("[LiveViewer] Subscribe already in progress, skipping");
        return;
      }
      
      try {
        subscribeInProgressRef.current = true;
        const agoraClient = client.current;
        if (!agoraClient || !isMountedRef.current) {
          subscribeInProgressRef.current = false;
          return;
        }
        const remoteTrack = await agoraClient.subscribe(user, mediaType);
        
        // Check again after subscribe
        if (!isMountedRef.current) {
          subscribeInProgressRef.current = false;
          return;
        }
        if (mediaType === "video") {
          remoteTracksRef.current.video = remoteTrack;
          if (videoRef.current) {
            // Đảm bảo video element sẵn sàng
            if (videoRef.current.tagName === 'VIDEO') {
              try {
                // Flip video 1 lần (giống video preview và modal)
                requestAnimationFrame(() => {
                  if (videoRef.current) {
                    videoRef.current.style.transform = 'scaleX(-1)';
                    videoRef.current.style.webkitTransform = 'scaleX(-1)';
                  }
                });
                await remoteTrack.play(videoRef.current);
              } catch (err) {
                // Ignore OPERATION_ABORTED errors
                if (err.code === 'OPERATION_ABORTED') {
                  return;
                }
                console.warn("[LiveViewer] Error playing video track, retrying:", err);
                // Retry after small delay
                setTimeout(() => {
                  if (videoRef.current && remoteTracksRef.current.video === remoteTrack) {
                    try {
                      remoteTrack.play(videoRef.current).catch((retryErr) => {
                        if (retryErr.code !== 'OPERATION_ABORTED') {
                          console.error("[LiveViewer] Failed to play video track after retry:", retryErr);
                        }
                      });
                    } catch (retryErr) {
                      if (retryErr.code !== 'OPERATION_ABORTED') {
                        console.error("[LiveViewer] Failed to play video track after retry:", retryErr);
                      }
                    }
                  }
                }, 200);
              }
            } else {
              // Nếu là div, tạo video element mới
              // NHƯNG không thay thế nếu đang ở PiP mode (sẽ làm mất PiP)
              if (document.pictureInPictureElement) {
                console.warn("[LiveViewer] Cannot replace video element: PiP is active");
                // Thử play trên element hiện tại nếu có thể
                try {
                  await remoteTrack.play(videoRef.current);
                } catch (err) {
                  console.warn("[LiveViewer] Error playing video track:", err);
                }
                return;
              }
              
              const videoElement = document.createElement('video');
              videoElement.className = 'w-full h-full bg-black';
              videoElement.style.objectFit = 'contain';
              videoElement.style.transform = 'scaleX(-1)'; // Flip 1 lần (giống video preview)
              videoElement.style.webkitTransform = 'scaleX(-1)';
              videoElement.autoplay = true;
              videoElement.playsInline = true;
              
              // Setup PiP event listeners cho video element mới
              const handleEnterPiP = () => {
                setIsPictureInPicture(true);
              };
              const handleLeavePiP = () => {
                setIsPictureInPicture(false);
              };
              videoElement.addEventListener('enterpictureinpicture', handleEnterPiP);
              videoElement.addEventListener('leavepictureinpicture', handleLeavePiP);
              
              if (videoRef.current.parentNode) {
                videoRef.current.parentNode.replaceChild(videoElement, videoRef.current);
                videoRef.current = videoElement;
              }
              try {
                await remoteTrack.play(videoElement);
              } catch (err) {
                console.warn("[LiveViewer] Error playing video track on new element:", err);
              }
            }
          }
        }
        if (mediaType === "audio") {
          remoteTracksRef.current.audio = remoteTrack;
          try {
            await remoteTrack.play();
            // Set initial volume
            if (remoteTrack.setVolume) {
              remoteTrack.setVolume(isMuted ? 0 : volume);
            }
          } catch (err) {
            console.warn("[LiveViewer] Error playing audio track:", err);
          }
        }
      } catch (err) {
        // Ignore OPERATION_ABORTED errors (có thể do cancel khi unmount)
        if (err.code === 'OPERATION_ABORTED' || err.name === 'AbortError') {
          // Expected khi component unmount hoặc operation bị cancel
          return;
        }
        console.error("[LiveViewer] Failed to subscribe remote track:", err);
      } finally {
        subscribeInProgressRef.current = false;
      }
    },
    [client, isMuted, volume]
  );

  const handleUserUnpublished = useCallback((_, mediaType) => {
    try {
      if (mediaType === "video" && remoteTracksRef.current.video) {
        const track = remoteTracksRef.current.video;
        remoteTracksRef.current.video = null;
        try {
          track.stop();
        } catch (err) {
          // Ignore errors khi stop track (có thể đã bị stop rồi)
          if (err.code !== 'OPERATION_ABORTED') {
            console.warn("[LiveViewer] Error stopping video track:", err);
          }
        }
        try {
          track.close();
        } catch (err) {
          // Ignore errors khi close track
          if (err.code !== 'OPERATION_ABORTED') {
            console.warn("[LiveViewer] Error closing video track:", err);
          }
        }
      }
      if (mediaType === "audio" && remoteTracksRef.current.audio) {
        const track = remoteTracksRef.current.audio;
        remoteTracksRef.current.audio = null;
        try {
          track.stop();
        } catch (err) {
          if (err.code !== 'OPERATION_ABORTED') {
            console.warn("[LiveViewer] Error stopping audio track:", err);
          }
        }
        try {
          track.close();
        } catch (err) {
          if (err.code !== 'OPERATION_ABORTED') {
            console.warn("[LiveViewer] Error closing audio track:", err);
          }
        }
      }
    } catch (err) {
      if (err.code !== 'OPERATION_ABORTED') {
        console.warn("[LiveViewer] Error in handleUserUnpublished:", err);
      }
    }
  }, []);

  const cleanupTracks = useCallback(() => {
    ["video", "audio"].forEach((type) => {
      const track = remoteTracksRef.current[type];
      if (track) {
        remoteTracksRef.current[type] = null;
        try {
          track.stop();
        } catch (err) {
          // Ignore OPERATION_ABORTED errors
          if (err.code !== 'OPERATION_ABORTED') {
            console.warn(`[LiveViewer] Error stopping ${type} track:`, err);
          }
        }
        try {
          track.close?.();
        } catch (err) {
          if (err.code !== 'OPERATION_ABORTED') {
            console.warn(`[LiveViewer] Error closing ${type} track:`, err);
          }
        }
      }
    });
  }, []);

  // Fullscreen handlers
  const toggleFullscreen = useCallback(() => {
    if (!videoContainerRef.current) return;
    
    if (!isFullscreen) {
      // Enter fullscreen
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen();
      } else if (videoContainerRef.current.webkitRequestFullscreen) {
        videoContainerRef.current.webkitRequestFullscreen();
      } else if (videoContainerRef.current.msRequestFullscreen) {
        videoContainerRef.current.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Mute/unmute handlers
  const toggleMute = useCallback(() => {
    if (remoteTracksRef.current.audio) {
      if (isMuted) {
        remoteTracksRef.current.audio.setVolume(volume);
      } else {
        remoteTracksRef.current.audio.setVolume(0);
      }
    }
    setIsMuted(!isMuted);
  }, [isMuted, volume]);

  // Volume change handler
  const handleVolumeChange = useCallback((newVolume) => {
    const vol = Math.max(0, Math.min(100, newVolume));
    setVolume(vol);
    if (remoteTracksRef.current.audio) {
      remoteTracksRef.current.audio.setVolume(vol);
    }
    if (vol === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  // Picture-in-Picture handler
  const togglePictureInPicture = useCallback(async () => {
    if (!videoRef.current) {
      console.warn("[LiveViewer] Cannot toggle PiP: video element not found");
      return;
    }
    
    // Kiểm tra browser support
    if (!document.pictureInPictureEnabled) {
      console.warn("[LiveViewer] Picture-in-Picture is not supported");
      return;
    }
    
    try {
      if (isPictureInPicture) {
        // Exit PiP
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        }
      } else {
        // Enter PiP - đảm bảo video track đã sẵn sàng
        if (!remoteTracksRef.current.video) {
          console.warn("[LiveViewer] Cannot enter PiP: video track not ready");
          return;
        }
        
        if (!videoRef.current || videoRef.current.tagName !== 'VIDEO') {
          console.warn("[LiveViewer] Cannot enter PiP: video element not ready");
          return;
        }
        
        // Đợi một chút để đảm bảo track đã play xong
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Kiểm tra lại trước khi request
        if (!isMountedRef.current) {
          return; // Component đã unmount
        }
        
        if (videoRef.current && remoteTracksRef.current.video) {
          await videoRef.current.requestPictureInPicture();
        }
      }
    } catch (err) {
      // Ignore OPERATION_ABORTED và các lỗi user cancel
      if (err.code === 'OPERATION_ABORTED' || err.name === 'NotAllowedError' || err.name === 'AbortError') {
        // Expected errors, không cần log
        return;
      }
      console.error("[LiveViewer] Picture-in-Picture error:", err);
    }
  }, [isPictureInPicture]);


  // Đảm bảo transform được giữ khi ở PiP mode - chỉ flip 1 lần giống video preview và modal
  useEffect(() => {
    if (isPictureInPicture && videoRef.current && document.pictureInPictureElement === videoRef.current) {
      const video = videoRef.current;
      
      // Function để set transform - chỉ flip 1 lần (giống video preview và modal)
      const setTransform = () => {
        if (video && document.pictureInPictureElement === video) {
          // Set transform = scaleX(-1) - chỉ flip 1 lần, giống như video preview và modal
          video.style.transform = 'scaleX(-1)';
          video.style.webkitTransform = 'scaleX(-1)';
        }
      };
      
      // Set ngay lập tức
      setTransform();
      
      // Set nhiều lần với delay để đảm bảo browser không reset
      requestAnimationFrame(setTransform);
      setTimeout(setTransform, 0);
      setTimeout(setTransform, 10);
      setTimeout(setTransform, 50);
      setTimeout(setTransform, 100);
      setTimeout(setTransform, 200);
      
      // Dùng MutationObserver để theo dõi thay đổi style
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            // Kiểm tra transform có đúng không
            const computedStyle = window.getComputedStyle(video);
            const currentTransform = computedStyle.transform;
            // matrix(-1, 0, 0, 1, 0, 0) là kết quả của scaleX(-1)
            if (currentTransform !== 'matrix(-1, 0, 0, 1, 0, 0)' && currentTransform !== 'none') {
              setTransform();
            }
          }
        });
      });
      
      // Observe video element
      observer.observe(video, {
        attributes: true,
        attributeFilter: ['style']
      });
      
      // Interval để kiểm tra và set lại transform - kiểm tra thường xuyên hơn
      const interval = setInterval(() => {
        if (video && document.pictureInPictureElement === video) {
          const computedStyle = window.getComputedStyle(video);
          const currentTransform = computedStyle.transform;
          // Kiểm tra xem transform có phải là scaleX(-1) không
          // matrix(-1, 0, 0, 1, 0, 0) = scaleX(-1)
          if (currentTransform !== 'matrix(-1, 0, 0, 1, 0, 0)' && currentTransform !== 'none') {
            setTransform();
          }
        }
      }, 20); // Kiểm tra mỗi 20ms để đảm bảo transform được giữ
      
      return () => {
        observer.disconnect();
        clearInterval(interval);
      };
    }
  }, [isPictureInPicture]);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000); // Hide after 3 seconds of inactivity
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'p':
          e.preventDefault();
          togglePictureInPicture();
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(Math.min(100, volume + 10));
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 10));
          break;
        case 'escape':
          if (isFullscreen) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
      }
      resetControlsTimeout();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleMute, toggleFullscreen, togglePictureInPicture, handleVolumeChange, volume, isFullscreen, resetControlsTimeout]);

  // Mouse movement to show controls
  useEffect(() => {
    const handleMouseMove = () => {
      resetControlsTimeout();
    };

    const container = videoContainerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseenter', () => setShowControls(true));
      container.addEventListener('mouseleave', () => {
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 1000);
      });
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);

  // Comprehensive cleanup function
  const fullCleanup = useCallback(async () => {
    try {
      // 1. Exit Picture-in-Picture if active
      if (document.pictureInPictureElement && document.pictureInPictureElement === videoRef.current) {
        try {
          await document.exitPictureInPicture();
        } catch (err) {
          console.warn("[LiveViewer] Error exiting Picture-in-Picture:", err);
        }
      }

      // 2. Exit fullscreen if active
      if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
        try {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            await document.webkitExitFullscreen();
          } else if (document.msExitFullscreen) {
            await document.msExitFullscreen();
          }
        } catch (err) {
          console.warn("[LiveViewer] Error exiting fullscreen:", err);
        }
      }

      // 3. Stop video element
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
          videoRef.current.load();
        } catch (err) {
          console.warn("[LiveViewer] Error stopping video:", err);
        }
      }

      // 4. Cleanup tracks
      cleanupTracks();

      // 5. Leave channel
      await leaveChannel();

      // 6. Clear timeouts
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }

      // 7. Reset states
      setIsPictureInPicture(false);
      setIsFullscreen(false);
      setIsMuted(false);
      setVolume(100);
      setShowControls(true);
    } catch (err) {
      console.error("[LiveViewer] Error during full cleanup:", err);
    }
  }, [cleanupTracks, leaveChannel]);

  const leaveStream = useCallback(async () => {
    await fullCleanup();
  }, [fullCleanup]);

  // Listen to Picture-in-Picture changes và hiển thị thông báo
  // Phải đặt sau khi fullCleanup được định nghĩa
  useEffect(() => {
    const handleEnterPictureInPicture = () => {
      setIsPictureInPicture(true);
      
      // Giữ flip khi vào PiP (giống modal) - set trực tiếp vào style
      const setTransform = () => {
        if (videoRef.current && document.pictureInPictureElement === videoRef.current) {
          const video = videoRef.current;
          // Set trực tiếp vào style (không dùng CSS)
          video.style.transform = 'scaleX(-1)';
          video.style.webkitTransform = 'scaleX(-1)';
        }
      };
      
      // Set ngay lập tức
      setTransform();
      
      // Set sau các delay khác nhau để đảm bảo
      requestAnimationFrame(setTransform);
      setTimeout(setTransform, 10);
      setTimeout(setTransform, 50);
      setTimeout(setTransform, 100);
      setTimeout(setTransform, 200);
      setTimeout(setTransform, 500);
    };
    
    const handleLeavePictureInPicture = async () => {
      setIsPictureInPicture(false);
      
      // Giữ flip khi ra khỏi PiP
      if (videoRef.current) {
        videoRef.current.style.transform = 'scaleX(-1)';
      }
      
      // Nếu đang restore (do chúng ta gọi exitPictureInPicture từ handleRestore)
      // → restore modal và tắt PiP
      if (isRestoringRef.current) {
        isRestoringRef.current = false;
        setIsMinimized(false);
        return;
      }
      
      // Nếu đang minimized và không phải restore
      // Browser PiP API không cho phép phân biệt giữa restore và close
      // Cách đơn giản nhất: khi PiP exit và đang minimized, mặc định restore modal
      // User muốn đóng thì sẽ đóng modal trực tiếp bằng nút đóng trong modal
      if (isMinimized) {
        // Restore modal thay vì đóng livestream
        setIsMinimized(false);
      }
    };

    // Setup event listeners khi video element sẵn sàng
    const setupListeners = () => {
      const video = videoRef.current;
      if (video && video.tagName === 'VIDEO') {
        video.addEventListener('enterpictureinpicture', handleEnterPictureInPicture);
        video.addEventListener('leavepictureinpicture', handleLeavePictureInPicture);
        return video;
      }
      return null;
    };

    // Thử setup ngay lập tức
    let video = setupListeners();
    
    // Nếu chưa có video, thử lại sau một chút
    if (!video) {
      const timeout = setTimeout(() => {
        video = setupListeners();
      }, 100);
      
      return () => {
        clearTimeout(timeout);
        if (video) {
          video.removeEventListener('enterpictureinpicture', handleEnterPictureInPicture);
          video.removeEventListener('leavepictureinpicture', handleLeavePictureInPicture);
        }
      };
    }

    return () => {
      if (video) {
        video.removeEventListener('enterpictureinpicture', handleEnterPictureInPicture);
        video.removeEventListener('leavepictureinpicture', handleLeavePictureInPicture);
      }
    };
  }, [isMinimized, fullCleanup, onClose]);

  const joinStream = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    // Kiểm tra livestream có tồn tại không
    if (!livestream || !livestream.agoraChannelName) {
      console.error("[LiveViewer] Cannot join: livestream data missing");
      setError("Thông tin livestream không hợp lệ");
      setIsConnecting(false);
      return;
    }
    
    try {
      setIsConnecting(true);
      setError(null);
      const payload = await livestreamApi.getStreamByChannel(livestream.agoraChannelName);
      
      if (!isMountedRef.current) return;
      
      const { agora } = payload;
      if (!agora?.token || !agora?.uid || !agora?.appId) {
        throw new Error("Thông tin livestream không hợp lệ");
      }

      if (!isMountedRef.current) return;

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
      
      if (!isMountedRef.current) {
        // Nếu unmount trong khi join, cleanup ngay
        await leaveChannel();
        return;
      }
      
      // Chỉ tăng view count nếu không phải broadcaster
      // Kiểm tra xem user hiện tại có phải là broadcaster không
      const currentUserId = sessionUser?.id;
      const isBroadcaster = livestream.hostAccountId === currentUserId || 
                           livestream.hostEntityAccountId === sessionUser?.entityAccountId;
      if (!isBroadcaster && isMountedRef.current) {
        await livestreamApi.incrementViewCount(livestream.livestreamId);
      }
      
      if (isMountedRef.current) {
        setIsConnecting(false);
      }
    } catch (err) {
      // Ignore OPERATION_ABORTED errors
      if (err.code === 'OPERATION_ABORTED' || err.name === 'AbortError') {
        return;
      }
      console.error("[LiveViewer] join error:", err);
      if (isMountedRef.current) {
        setError(err.message || "Không thể kết nối tới livestream");
        setIsConnecting(false);
      }
    }
  }, [handleUserPublished, handleUserUnpublished, joinChannel, leaveChannel, livestream, sessionUser]);

  useEffect(() => {
    // Kiểm tra livestream có tồn tại không
    if (!livestream || !livestream.agoraChannelName) {
      console.warn("[LiveViewer] Livestream data not available", { 
        hasLivestream: !!livestream, 
        hasChannelName: !!livestream?.agoraChannelName 
      });
      setError("Thông tin livestream không hợp lệ");
      setIsConnecting(false);
      return;
    }
    
    // Kiểm tra status
    if (livestream.status !== "live") {
      console.warn("[LiveViewer] Livestream is not live:", livestream.status);
      setError("Livestream này đã kết thúc");
      setIsConnecting(false);
      return;
    }
    
    // Reset states khi component mount
    isMountedRef.current = true;
    subscribeInProgressRef.current = false;
    setIsConnecting(true);
    setError(null);
    
    // Đợi một chút để đảm bảo component đã mount xong và video element sẵn sàng
    const timer = setTimeout(() => {
      // Double check trước khi join
      if (!isMountedRef.current) {
        console.warn("[LiveViewer] Component unmounted before join");
        return;
      }
      
      if (!livestream?.agoraChannelName) {
        console.error("[LiveViewer] Livestream data lost before join");
        setError("Thông tin livestream không hợp lệ");
        setIsConnecting(false);
        return;
      }
      
      // Kiểm tra client đã sẵn sàng chưa
      const agoraClient = client.current;
      if (!agoraClient) {
        console.warn("[LiveViewer] Agora client not ready, retrying...");
        // Retry sau một delay nhỏ
        setTimeout(() => {
          if (isMountedRef.current && livestream?.agoraChannelName) {
            joinStream();
          }
        }, 200);
        return;
      }
      
      joinStream();
    }, 150); // Tăng delay một chút để đảm bảo component đã render xong
    
    return () => {
      clearTimeout(timer);
      // Mark as unmounted để prevent new operations
      isMountedRef.current = false;
      subscribeInProgressRef.current = false;
      // Full cleanup on unmount
      fullCleanup();
    };
  }, [livestream, joinStream, fullCleanup, client]);

  // Tự động dừng video và cleanup khi livestream kết thúc
  useEffect(() => {
    if (isEnded) {
      // Use full cleanup when livestream ends
      fullCleanup();
    }
  }, [isEnded, fullCleanup]);

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
            await fullCleanup();
            await new Promise(resolve => setTimeout(resolve, 100));
            onClose?.();
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isEnded, fullCleanup, onClose]);

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
    // Full cleanup before closing
    await fullCleanup();
    // Small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 100));
    onClose?.();
  };

  // Handler để minimize modal (ẩn modal nhưng giữ PiP)
  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
    // Đảm bảo PiP được bật nếu chưa có
    if (!isPictureInPicture && videoRef.current && remoteTracksRef.current.video) {
      togglePictureInPicture();
    }
  }, [isPictureInPicture, togglePictureInPicture]);

  // Handler để restore modal
  const handleRestore = useCallback(async () => {
    // Đánh dấu đang restore để tránh handleLeavePictureInPicture đóng livestream
    isRestoringRef.current = true;
    
    // Exit PiP để restore về modal
    if (document.pictureInPictureElement && document.pictureInPictureElement === videoRef.current) {
      try {
        await document.exitPictureInPicture();
      } catch (err) {
        console.warn("[LiveViewer] Error exiting Picture-in-Picture during restore:", err);
        // Reset flag nếu có lỗi
        isRestoringRef.current = false;
      }
    }
    
    // Set isMinimized = false sau khi exit PiP
    setIsMinimized(false);
  }, []);

  // Không tự động restore nữa - khi đóng PiP trong chế độ minimized thì đóng luôn livestream
  // User có thể restore bằng cách click vào nút "Khôi phục" trong PiP

  // Early return nếu không có livestream (sau khi gọi hooks)
  if (!livestream || !livestream.agoraChannelName) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-card">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-foreground font-medium">Đang tải thông tin livestream...</p>
        </div>
      </div>
    );
  }

  // Nếu minimize, không render gì (PiP sẽ tự hiển thị với controls của browser)
  if (isMinimized && isPictureInPicture) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--background))' }}>
      <div className="relative flex w-full h-full flex-col gap-0 md:flex-row" style={{ backgroundColor: 'rgb(var(--background))' }}>
        <div className="absolute right-4 top-4 z-50 flex items-center gap-2">
          {/* Nút minimize */}
          <button
            onClick={handleMinimize}
            className={cn(
              "rounded-full backdrop-blur-md",
              "p-2.5 transition-all duration-200",
              "hover:scale-110 active:scale-95",
              "border border-border/30",
              "bg-card/80 text-foreground/80",
              "hover:bg-card hover:text-foreground",
              "shadow-lg"
            )}
            aria-label="Thu nhỏ livestream"
            title="Thu nhỏ (chỉ xem hình nhỏ)"
          >
            <Minimize className="h-5 w-5" />
          </button>
          {/* Nút đóng */}
          <button
            onClick={handleClose}
            className={cn(
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
        </div>

        <div 
          ref={videoContainerRef}
          className="relative flex-1 self-start flex items-center justify-center group" 
          style={{ backgroundColor: 'rgb(var(--background))' }}
        >
          <video 
            ref={videoRef} 
            className="w-full h-full min-h-[100vh] md:min-h-[calc(100vh-0px)]" 
            style={{ 
              objectFit: 'contain', 
              backgroundColor: 'rgb(var(--background))',
              transform: 'scaleX(-1)', // Flip 1 lần (giống video preview và modal)
              WebkitTransform: 'scaleX(-1)' // Webkit prefix
            }}
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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 backdrop-blur-md rounded-lg bg-black/60 z-50">
              <div className="rounded-full p-4 mb-2 border border-border/30 bg-card">
                <X className="h-12 w-12 text-foreground" />
              </div>
              <p className="text-xl font-semibold text-white">Phiên live đã kết thúc</p>
              <p className="text-sm text-white/80 text-center px-4">Người phát đã kết thúc livestream này</p>
              {countdown > 0 && (
                <p className="text-sm text-white/80 mt-2">
                  Tự động đóng sau <span className="font-semibold text-white">{countdown}</span> giây
                </p>
              )}
            </div>
          )}

          {/* Thông báo khi vào Picture-in-Picture */}
          {isPictureInPicture && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 backdrop-blur-md rounded-lg bg-black/60 z-50">
              <div className="rounded-full p-4 mb-2 border border-border/30 bg-card">
                <PictureInPicture2 className="h-12 w-12 text-foreground" />
              </div>
              <p className="text-xl font-semibold text-white">Đã chuyển sang hình trong hình</p>
              <p className="text-sm text-white/80 text-center px-4">
                Video đã được chuyển sang chế độ Picture-in-Picture
              </p>
            </div>
          )}

          {!isEnded && (
          <div 
            className={cn(
              "absolute left-4 top-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md border border-danger/30 transition-opacity duration-300",
              showControls ? "opacity-100" : "opacity-70"
            )}
            style={{ backgroundColor: 'rgb(var(--danger))' }}
          >
            <Radio className="h-3 w-3" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            <span>LIVE</span>
            {viewerCount > 0 && (
              <div className="flex items-center gap-1 ml-1 pl-2 border-l border-white/30">
                <Users className="h-3 w-3" />
                <span className="text-[10px]">{viewerCount}</span>
              </div>
            )}
          </div>
          )}


          {/* Video Controls - Bottom Right */}
          <div 
            className={cn(
              "absolute right-4 bottom-4 flex items-center gap-2 z-40 transition-opacity duration-300",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            {/* Volume Control */}
            <div 
              className="relative flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={toggleMute}
                className={cn(
                  "rounded-full p-3 backdrop-blur-md transition-all duration-200",
                  "border border-white/20 shadow-lg",
                  "hover:scale-110 active:scale-95",
                  "text-white"
                )}
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
                aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : volume > 50 ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <Volume1 className="h-5 w-5" />
                )}
              </button>
              
              {/* Volume Slider */}
              {showVolumeSlider && (
                <div 
                  className="absolute right-full mr-2 bg-black/80 backdrop-blur-md rounded-lg p-3 shadow-xl border border-white/10"
                  style={{ minWidth: '120px' }}
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                    style={{
                      background: `linear-gradient(to right, white 0%, white ${volume}%, rgba(255,255,255,0.2) ${volume}%, rgba(255,255,255,0.2) 100%)`
                    }}
                  />
                  <div className="text-white text-xs text-center mt-1 font-medium">{volume}%</div>
                </div>
              )}
            </div>

            {/* Picture-in-Picture Toggle */}
            {document.pictureInPictureEnabled && (
              <button
                onClick={togglePictureInPicture}
                className={cn(
                  "rounded-full p-3 backdrop-blur-md transition-all duration-200",
                  "border border-white/20 shadow-lg",
                  "hover:scale-110 active:scale-95",
                  "text-white",
                  isPictureInPicture && "bg-primary/80"
                )}
                style={{ backgroundColor: isPictureInPicture ? 'rgb(var(--primary))' : 'rgba(0, 0, 0, 0.6)' }}
                aria-label={isPictureInPicture ? "Thoát Picture-in-Picture" : "Picture-in-Picture"}
              >
                <PictureInPicture2 className="h-5 w-5" />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className={cn(
                "rounded-full p-3 backdrop-blur-md transition-all duration-200",
                "border border-white/20 shadow-lg",
                "hover:scale-110 active:scale-95",
                "text-white"
              )}
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
              aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </button>

            {/* Chat Toggle */}
            <button
              className={cn(
                "rounded-full p-3 backdrop-blur-md transition-all duration-200",
                "border border-white/20 shadow-lg",
                "hover:scale-110 active:scale-95",
                "text-white"
              )}
              style={{ 
                backgroundColor: showChat ? 'rgb(var(--primary))' : 'rgba(0, 0, 0, 0.6)'
              }}
              onClick={() => setShowChat((prev) => !prev)}
              aria-label="Toggle chat"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          </div>

          {/* Chat Toggle Button khi chat đã bị tắt - hiển thị ở bên phải giữa màn hình */}
          {!showChat && (
            <button
              onClick={() => setShowChat(true)}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-40",
                "rounded-full p-3 backdrop-blur-md transition-all duration-200",
                "border border-white/20 shadow-lg",
                "hover:scale-110 active:scale-95",
                "text-white",
                showControls ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              style={{ backgroundColor: 'rgb(var(--primary))' }}
              aria-label="Mở chat"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          )}
        </div>

        {showChat && (
          <div className="flex w-full md:w-96 flex-col md:h-full md:max-h-screen border-l backdrop-blur-md shadow-2xl" style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
            {/* Broadcaster Info - Top Right */}
            {(livestream.broadcasterName || livestream.broadcasterAvatar) && (
              <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
                <div className="flex items-center gap-2 mb-2">
                  {livestream.broadcasterAvatar ? (
                    <img
                      src={livestream.broadcasterAvatar}
                      alt={livestream.broadcasterName || "Broadcaster"}
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
                      livestream.broadcasterAvatar && "hidden"
                    )}
                    style={{ backgroundColor: 'rgb(var(--primary))', color: 'rgb(var(--primary-foreground))', borderColor: 'rgb(var(--primary))' }}
                  >
                    {livestream.broadcasterName?.[0]?.toUpperCase() || "B"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {livestream.broadcasterName || "Người phát trực tiếp"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {viewerCount} người đang xem
                    </p>
                  </div>
                </div>
                <p className="text-base font-semibold text-foreground mb-1 truncate">{livestream.title}</p>
                {livestream.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {livestream.description}
                  </p>
                )}
              </div>
            )}
            <div className="mb-3 flex items-center justify-between flex-shrink-0 px-4 pt-4 pb-2 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <div className="flex items-center gap-2 text-foreground">
                <MessageCircle className="h-4 w-4" style={{ color: 'rgb(var(--primary))' }} />
                <span className="text-sm font-semibold">Bình luận</span>
              </div>
              <span className="text-xs text-muted-foreground">{viewerCount} người xem</span>
            </div>
            {/* Pinned Comment */}
            {livestream?.pinnedComment && (
              <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
                <div className="rounded-lg p-3" style={{ backgroundColor: 'rgb(var(--muted))', borderColor: 'rgb(var(--primary))', borderWidth: '1px' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: 'rgb(var(--primary))', color: 'rgb(var(--primary-foreground))' }}>
                      📌
                    </div>
                    <span className="text-xs font-semibold" style={{ color: 'rgb(var(--primary))' }}>
                      Bình luận ghim
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: 'rgb(var(--foreground))' }}>
                    {livestream.pinnedComment}
                  </p>
                </div>
              </div>
            )}
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
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-foreground">{msg.userName || "User"}</p>
                        {/* Badge "Chủ Live" nếu là chủ livestream */}
                        {(msg.userId === livestream.hostAccountId || msg.entityAccountId === livestream.hostEntityAccountId) && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500 text-white">
                            Chủ Live
                          </span>
                        )}
                      </div>
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
    pinnedComment: PropTypes.string,
    agoraChannelName: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

