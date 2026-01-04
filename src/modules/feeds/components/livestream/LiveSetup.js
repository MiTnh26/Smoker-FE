import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { 
  CheckCircle2, Circle, 
  Maximize2,
  X,
  Globe,
  MapPin,
  Smile,
  Tag,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Trash2,
  Video,
  AlertCircle
} from "lucide-react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { cn } from "../../../../utils/cn";
import { getSessionUser } from "./utils";
import livestreamApi from "../../../../api/livestreamApi";

export default function LiveSetup({ onClose, onStartLive }) {
  const sessionUser = useMemo(() => getSessionUser(), []);
  const [step, setStep] = useState(1); // 1: Video source, 2: Post details, 3: Ready to go live
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMicrophone, setSelectedMicrophone] = useState("");
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const privacy = "public"; // Always public
  const [pinnedComment, setPinnedComment] = useState("");
  const [enablePinnedComment, setEnablePinnedComment] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("live"); // "live" | "manage"
  const [scheduleType, setScheduleType] = useState("now"); // "now" | "scheduled"
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [scheduledLivestreams, setScheduledLivestreams] = useState([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [showCreateScheduled, setShowCreateScheduled] = useState(false);
  const [scheduledTitle, setScheduledTitle] = useState("");
  const [scheduledDescription, setScheduledDescription] = useState("");
  const [creatingScheduled, setCreatingScheduled] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  
  const localTracksRef = useRef({ videoTrack: null, audioTrack: null });
  const videoPreviewRef = useRef(null);


  // Load available cameras and microphones
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await AgoraRTC.getDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        
        setCameras(videoDevices);
        setMicrophones(audioDevices);
        
        if (videoDevices.length > 0 && !selectedCamera) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
        if (audioDevices.length > 0 && !selectedMicrophone) {
          setSelectedMicrophone(audioDevices[0].deviceId);
        }
      } catch (err) {
        console.error("[LiveSetup] Error loading devices:", err);
      }
    };
    loadDevices();
  }, []);

  // Start video preview
  useEffect(() => {
    if (selectedCamera && videoPreviewRef.current && activeTab === "live") {
      const startPreview = async () => {
        try {
          setPreviewError(null);
          // Cleanup existing tracks
          if (localTracksRef.current.videoTrack) {
            localTracksRef.current.videoTrack.stop();
            localTracksRef.current.videoTrack.close();
            localTracksRef.current.videoTrack = null;
          }

          const videoTrack = await AgoraRTC.createCameraVideoTrack({
            cameraId: selectedCamera,
            encoderConfig: "720p_1"
          });
          
          localTracksRef.current.videoTrack = videoTrack;
          videoTrack.play(videoPreviewRef.current, { fit: "cover" });
          setPreviewError(null);
        } catch (err) {
          console.error("[LiveSetup] Error starting preview:", err);
          let errorMessage = "Không thể khởi tạo camera.";
          
          if (err.name === "NotReadableError" || err.code === "NOT_READABLE") {
            errorMessage = "Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng ứng dụng khác và thử lại.";
          } else if (err.name === "NotAllowedError" || err.code === "PERMISSION_DENIED") {
            errorMessage = "Không có quyền truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.";
          } else if (err.name === "NotFoundError" || err.code === "DEVICE_NOT_FOUND") {
            errorMessage = "Không tìm thấy camera. Vui lòng kiểm tra thiết bị của bạn.";
          } else if (err.name === "OverconstrainedError") {
            errorMessage = "Camera không hỗ trợ cấu hình yêu cầu. Vui lòng thử camera khác.";
          }
          
          setPreviewError(errorMessage);
          setCameraError(errorMessage);
        }
      };
      startPreview();
    }

    return () => {
      if (localTracksRef.current.videoTrack) {
        localTracksRef.current.videoTrack.stop();
        localTracksRef.current.videoTrack.close();
        localTracksRef.current.videoTrack = null;
      }
    };
  }, [selectedCamera, activeTab]);

  // Load scheduled livestreams when manage tab is active
  useEffect(() => {
    if (activeTab === "manage") {
      const loadScheduledLivestreams = async () => {
        try {
          setLoadingScheduled(true);
          const livestreams = await livestreamApi.getScheduledLivestreams();
          setScheduledLivestreams(livestreams || []);
        } catch (err) {
          console.error("[LiveSetup] Error loading scheduled livestreams:", err);
          setScheduledLivestreams([]);
        } finally {
          setLoadingScheduled(false);
        }
      };
      loadScheduledLivestreams();
    }
  }, [activeTab]);

  const handleCancelScheduled = async (livestreamId) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy buổi phát trực tiếp này?")) {
      return;
    }
    try {
      await livestreamApi.cancelScheduledLivestream(livestreamId);
      setScheduledLivestreams(prev => prev.filter(l => l.livestreamId !== livestreamId));
    } catch (err) {
      console.error("[LiveSetup] Error canceling scheduled livestream:", err);
      alert("Không thể hủy buổi phát trực tiếp. Vui lòng thử lại.");
    }
  };

  const handleCreateScheduled = async () => {
    if (!scheduledTitle.trim()) {
      alert("Vui lòng nhập tiêu đề cho buổi phát trực tiếp.");
      return;
    }
    if (!scheduledDateTime) {
      alert("Vui lòng chọn thời gian phát trực tiếp.");
      return;
    }
    try {
      setCreatingScheduled(true);
      const scheduledTime = new Date(scheduledDateTime);
      if (scheduledTime <= new Date()) {
        alert("Thời gian phát trực tiếp phải trong tương lai.");
        setCreatingScheduled(false);
        return;
      }
      await livestreamApi.createScheduledLivestream(
        scheduledTitle,
        scheduledDescription,
        scheduledTime.toISOString(),
        {
          privacy: "public",
          cameraId: selectedCamera,
          microphoneId: selectedMicrophone,
        }
      );
      // Reload scheduled livestreams
      const livestreams = await livestreamApi.getScheduledLivestreams();
      setScheduledLivestreams(livestreams || []);
      setShowCreateScheduled(false);
      setScheduledTitle("");
      setScheduledDescription("");
      setScheduledDateTime("");
    } catch (err) {
      console.error("[LiveSetup] Error creating scheduled livestream:", err);
      alert("Không thể tạo lịch phát trực tiếp. Vui lòng thử lại.");
    } finally {
      setCreatingScheduled(false);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onClose?.();
    }
  };

  const handleStartLive = async () => {
    // Pass setup data to parent
    onStartLive?.({
      title,
      description,
      privacy,
      pinnedComment: enablePinnedComment ? pinnedComment : null,
      cameraId: selectedCamera,
      microphoneId: selectedMicrophone,
      isScheduled: scheduleType === "scheduled",
      scheduledDateTime: scheduleType === "scheduled" ? scheduledDateTime : null,
    });
    
    // Cleanup preview tracks
    if (localTracksRef.current.videoTrack) {
      localTracksRef.current.videoTrack.stop();
      localTracksRef.current.videoTrack.close();
      localTracksRef.current.videoTrack = null;
    }
  };

  const canProceed = () => {
    if (step === 1) {
      return !!selectedCamera;
    }
    if (step === 2) {
      return !!title.trim();
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-4 py-1 sm:py-2 backdrop-blur-sm" style={{ backgroundColor: 'rgba(var(--overlay))' }}>
      <div className="relative w-full max-w-6xl max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-0.5rem)] rounded-2xl border p-2 sm:p-3 md:p-4 shadow-2xl backdrop-blur-md flex flex-col" style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full border p-1.5 sm:p-2 transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
          style={{ 
            backgroundColor: 'rgb(var(--card))',
            borderColor: 'rgb(var(--border))',
            color: 'rgb(var(--foreground))'
          }}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-2 sm:mb-3 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold mb-1.5" style={{ color: 'rgb(var(--foreground))' }}>
            Tạo video trực tiếp
          </h2>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mt-2">
            <div className="flex items-center gap-2">
              {step >= 1 ? (
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: 'rgb(var(--primary))' }} />
              ) : (
                <Circle className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: 'rgb(var(--muted-foreground))' }} />
              )}
              <span className={cn("text-xs sm:text-sm font-medium", step >= 1 ? "text-foreground" : "text-muted-foreground")}>
                Kết nối nguồn video
              </span>
            </div>
            <div className="flex-1 h-0.5" style={{ backgroundColor: step >= 2 ? 'rgb(var(--primary))' : 'rgb(var(--border))' }} />
            <div className="flex items-center gap-2">
              {step >= 2 ? (
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: 'rgb(var(--primary))' }} />
              ) : (
                <Circle className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: 'rgb(var(--muted-foreground))' }} />
              )}
              <span className={cn("text-xs sm:text-sm font-medium", step >= 2 ? "text-foreground" : "text-muted-foreground")}>
                Hoàn tất chi tiết bài viết
              </span>
            </div>
            <div className="flex-1 h-0.5" style={{ backgroundColor: step >= 3 ? 'rgb(var(--primary))' : 'rgb(var(--border))' }} />
            <div className="flex items-center gap-2">
              {step >= 3 ? (
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: 'rgb(var(--primary))' }} />
              ) : (
                <Circle className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: 'rgb(var(--muted-foreground))' }} />
              )}
              <span className={cn("text-xs sm:text-sm font-medium", step >= 3 ? "text-foreground" : "text-muted-foreground")}>
                Phát trực tiếp
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3 md:gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-44 sm:w-52 md:w-60 flex-shrink-0 space-y-2 overflow-y-auto pr-1">
            {/* Tabs */}
            <div className="flex gap-1 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <button
                onClick={() => {
                  setActiveTab("live");
                  setScheduleType("now");
                  setScheduledDateTime("");
                }}
                className={cn(
                  "flex-1 px-2 py-1.5 text-xs font-medium transition-all duration-200 border-b-2",
                  activeTab === "live" 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                style={{ 
                  borderBottomColor: activeTab === "live" ? 'rgb(var(--primary))' : 'transparent',
                  color: activeTab === "live" ? 'rgb(var(--primary))' : 'rgb(var(--muted-foreground))'
                }}
              >
                Tạo video trực tiếp
              </button>
              <button
                onClick={() => {
                  setActiveTab("manage");
                }}
                className={cn(
                  "flex-1 px-2 py-1.5 text-xs font-medium transition-all duration-200 border-b-2",
                  activeTab === "manage" 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                style={{ 
                  borderBottomColor: activeTab === "manage" ? 'rgb(var(--primary))' : 'transparent',
                  color: activeTab === "manage" ? 'rgb(var(--primary))' : 'rgb(var(--muted-foreground))'
                }}
              >
                Quản lý lịch phát trực tiếp
              </button>
            </div>

            {/* User Info */}
            <div className="rounded-lg border p-1.5" style={{ backgroundColor: 'rgb(var(--muted))', borderColor: 'rgb(var(--border))' }}>
              <p className="text-xs font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                {sessionUser?.name || "Người dùng"}
              </p>
              <p className="text-[10px]" style={{ color: 'rgb(var(--muted-foreground))' }}>
                Người tổ chức - Trang cá nhân của bạn
              </p>
            </div>

            {/* When to go live - Only show in live tab */}
            {activeTab === "live" && (
              <div className="space-y-1">
                <label className="block text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                  Khi nào bạn sẽ phát trực tiếp?
                </label>
                <select
                  value={scheduleType}
                  onChange={(e) => {
                    setScheduleType(e.target.value);
                    if (e.target.value === "now") {
                      setScheduledDateTime("");
                    }
                  }}
                  className="w-full rounded-lg border px-2 py-1 text-xs transition-all duration-200 focus:outline-none"
                  style={{ 
                    backgroundColor: 'rgb(var(--muted))',
                    borderColor: 'rgb(var(--border))',
                    color: 'rgb(var(--foreground))'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgb(var(--primary))';
                    e.target.style.boxShadow = '0 0 0 2px rgba(var(--primary), 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgb(var(--border))';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="now">Bây giờ</option>
                  <option value="scheduled">Theo lịch</option>
                </select>
                {scheduleType === "scheduled" && (
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full rounded-lg border px-2 py-1 text-xs transition-all duration-200 focus:outline-none mt-1"
                    style={{ 
                      backgroundColor: 'rgb(var(--muted))',
                      borderColor: 'rgb(var(--border))',
                      color: 'rgb(var(--foreground))'
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
                )}
              </div>
            )}

            {/* Privacy - Always Public */}
            <div className="rounded-lg border px-2 py-1.5 text-xs" style={{ backgroundColor: 'rgb(var(--primary))', borderColor: 'rgb(var(--primary))', color: 'rgb(var(--primary-foreground))' }}>
              <span className="flex items-center justify-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                Công khai
              </span>
            </div>

            {/* Navigation Menu */}
            <div className="space-y-1 pt-1.5 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
              <div className="rounded-lg px-2 py-1 text-xs font-medium" style={{ backgroundColor: 'rgb(var(--primary))', color: 'rgb(var(--primary-foreground))' }}>
                Thiết lập buổi phát trực tiếp
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 overflow-y-auto pr-1">
            {activeTab === "manage" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                    Buổi phát trực tiếp đã lên lịch
                  </h3>
                  <button
                    onClick={() => setShowCreateScheduled(!showCreateScheduled)}
                    className="rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105"
                    style={{ 
                      backgroundColor: showCreateScheduled ? 'rgb(var(--muted))' : 'rgb(var(--primary))',
                      borderColor: 'rgb(var(--primary))',
                      color: showCreateScheduled ? 'rgb(var(--foreground))' : 'rgb(var(--primary-foreground))'
                    }}
                  >
                    {showCreateScheduled ? "Hủy" : "+ Tạo lịch mới"}
                  </button>
                </div>
                
                {/* Create Scheduled Form */}
                {showCreateScheduled && (
                  <div className="rounded-xl border p-4 space-y-4" style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
                    <h4 className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                      Tạo buổi phát trực tiếp theo lịch
                    </h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                          Tiêu đề <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          value={scheduledTitle}
                          onChange={(e) => setScheduledTitle(e.target.value)}
                          placeholder="Nhập tiêu đề..."
                          className="w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:outline-none"
                          style={{ 
                            backgroundColor: 'rgb(var(--muted))',
                            borderColor: 'rgb(var(--border))',
                            color: 'rgb(var(--foreground))'
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
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                          Mô tả
                        </label>
                        <textarea
                          value={scheduledDescription}
                          onChange={(e) => setScheduledDescription(e.target.value)}
                          placeholder="Mô tả (tùy chọn)"
                          rows={3}
                          className="w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:outline-none resize-none"
                          style={{ 
                            backgroundColor: 'rgb(var(--muted))',
                            borderColor: 'rgb(var(--border))',
                            color: 'rgb(var(--foreground))'
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
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                          Thời gian phát trực tiếp <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduledDateTime}
                          onChange={(e) => setScheduledDateTime(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                          className="w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:outline-none"
                          style={{ 
                            backgroundColor: 'rgb(var(--muted))',
                            borderColor: 'rgb(var(--border))',
                            color: 'rgb(var(--foreground))'
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
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={handleCreateScheduled}
                          disabled={creatingScheduled || !scheduledTitle.trim() || !scheduledDateTime}
                          className="rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ 
                            backgroundColor: 'rgb(var(--primary))',
                            borderColor: 'rgb(var(--primary))',
                            color: 'rgb(var(--primary-foreground))'
                          }}
                        >
                          {creatingScheduled ? "Đang tạo..." : "Tạo lịch"}
                        </button>
                        <button
                          onClick={() => {
                            setShowCreateScheduled(false);
                            setScheduledTitle("");
                            setScheduledDescription("");
                            setScheduledDateTime("");
                          }}
                          className="rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-105"
                          style={{ 
                            backgroundColor: 'rgb(var(--card))',
                            borderColor: 'rgb(var(--border))',
                            color: 'rgb(var(--foreground))'
                          }}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {loadingScheduled ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : scheduledLivestreams.length === 0 ? (
                  <div className="text-center py-12 rounded-lg border" style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--muted))' }}>
                    <Calendar className="h-16 w-16 mx-auto mb-4" style={{ color: 'rgb(var(--muted-foreground))' }} />
                    <p className="text-sm font-medium mb-1" style={{ color: 'rgb(var(--foreground))' }}>
                      Chưa có buổi phát trực tiếp nào được lên lịch
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--muted-foreground))' }}>
                      Tạo lịch phát trực tiếp để người xem biết khi nào bạn sẽ phát trực tiếp
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scheduledLivestreams.map((livestream) => {
                      const scheduledTime = livestream.scheduledStartTime ? new Date(livestream.scheduledStartTime) : null;
                      const now = new Date();
                      const canStart = scheduledTime && scheduledTime <= now && livestream.status === "scheduled";
                      
                      return (
                        <div
                          key={livestream.livestreamId}
                          className="rounded-xl border p-4 shadow-sm hover:shadow-md transition-all duration-200"
                          style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-base font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                                  {livestream.title || "Không có tiêu đề"}
                                </h4>
                                {canStart && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgb(var(--danger))', color: 'rgb(var(--primary-foreground))' }}>
                                    Sẵn sàng
                                  </span>
                                )}
                              </div>
                              {livestream.description && (
                                <p className="text-sm mb-3 line-clamp-2" style={{ color: 'rgb(var(--muted-foreground))' }}>
                                  {livestream.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1.5" style={{ color: 'rgb(var(--muted-foreground))' }}>
                                  <Clock className="h-4 w-4" />
                                  {scheduledTime 
                                    ? scheduledTime.toLocaleString('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })
                                    : 'Chưa có thời gian'}
                                </span>
                                {scheduledTime && scheduledTime > now && (
                                  <span className="text-xs" style={{ color: 'rgb(var(--muted-foreground))' }}>
                                    Còn {Math.ceil((scheduledTime - now) / (1000 * 60))} phút
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {canStart && (
                                <button
                                  onClick={async () => {
                                    try {
                                      // Activate scheduled livestream
                                      await livestreamApi.activateScheduledLivestream(livestream.livestreamId);
                                      // Start live with scheduled data
                                      onStartLive?.({
                                        title: livestream.title,
                                        description: livestream.description,
                                        privacy: "public",
                                        cameraId: selectedCamera || livestream.scheduledSettings?.cameraId,
                                        microphoneId: selectedMicrophone || livestream.scheduledSettings?.microphoneId,
                                        isScheduled: false,
                                        scheduledLivestreamId: livestream.livestreamId,
                                      });
                                    } catch (err) {
                                      console.error("[LiveSetup] Error activating scheduled livestream:", err);
                                      alert("Không thể bắt đầu buổi phát trực tiếp đã lên lịch. Vui lòng thử lại.");
                                    }
                                  }}
                                  className="rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                                  style={{ 
                                    backgroundColor: 'rgb(var(--danger))',
                                    borderColor: 'rgb(var(--danger))',
                                    color: 'rgb(var(--primary-foreground))'
                                  }}
                                >
                                  Bắt đầu
                                </button>
                              )}
                              <button
                                onClick={() => handleCancelScheduled(livestream.livestreamId)}
                                className="rounded-lg border p-2 transition-all duration-200 hover:scale-110 active:scale-95"
                                style={{ 
                                  backgroundColor: 'rgb(var(--card))',
                                  borderColor: 'rgb(var(--border))',
                                  color: 'rgb(var(--danger))'
                                }}
                                title="Hủy buổi phát trực tiếp"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {activeTab === "live" && step === 1 && (
              <div className="space-y-3">
                {/* Camera Control */}
                <div className="space-y-1.5">
                    <h3 className="text-sm sm:text-base font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                      Kiểm soát camera
                    </h3>
                    <p className="text-xs" style={{ color: 'rgb(var(--muted-foreground))' }}>
                      Trước khi phát trực tiếp, hãy kiểm tra xem đầu vào camera và micrô đã hoạt động đúng cách chưa.
                    </p>
                    
                    {cameraError && (
                      <div className="rounded-lg border px-3 py-2 text-xs mb-2 flex items-start gap-2" style={{ borderColor: 'rgb(var(--danger))', backgroundColor: 'rgba(var(--danger), 0.1)' }}>
                        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--danger))' }} />
                        <p style={{ color: 'rgb(var(--danger))' }}>{cameraError}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label htmlFor="camera-select" className="block text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                          Camera
                        </label>
                        <select
                          id="camera-select"
                          value={selectedCamera}
                          onChange={(e) => {
                            setSelectedCamera(e.target.value);
                            setCameraError(null);
                            setPreviewError(null);
                          }}
                          className="w-full rounded-lg border px-2 py-1 text-xs transition-all duration-200 focus:outline-none"
                          style={{ 
                            backgroundColor: 'rgb(var(--muted))',
                            borderColor: cameraError ? 'rgb(var(--danger))' : 'rgb(var(--border))',
                            color: 'rgb(var(--foreground))'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = 'rgb(var(--primary))';
                            e.target.style.boxShadow = '0 0 0 2px rgba(var(--primary), 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = cameraError ? 'rgb(var(--danger))' : 'rgb(var(--border))';
                            e.target.style.boxShadow = 'none';
                          }}
                        >
                          {cameras.length === 0 ? (
                            <option value="">Không có camera</option>
                          ) : (
                            cameras.map((camera) => (
                              <option key={camera.deviceId} value={camera.deviceId}>
                                {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                          Microphone
                        </label>
                        <select
                          value={selectedMicrophone}
                          onChange={(e) => setSelectedMicrophone(e.target.value)}
                          className="w-full rounded-lg border px-2 py-1 text-xs transition-all duration-200 focus:outline-none"
                          style={{ 
                            backgroundColor: 'rgb(var(--muted))',
                            borderColor: 'rgb(var(--border))',
                            color: 'rgb(var(--foreground))'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = 'rgb(var(--primary))';
                            e.target.style.boxShadow = '0 0 0 2px rgba(var(--primary), 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'rgb(var(--border))';
                            e.target.style.boxShadow = 'none';
                          }}
                        >
                          {microphones.map((mic) => (
                            <option key={mic.deviceId} value={mic.deviceId}>
                              {mic.label || `Microphone ${microphones.indexOf(mic) + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                </div>

                {/* Video Preview */}
                <div 
                  className="relative rounded-lg border overflow-hidden" 
                  style={{ 
                    backgroundColor: 'rgb(var(--background))',
                    borderColor: 'rgb(var(--border))',
                  }}
                >
                  <div 
                    className={cn("w-full relative", isPreviewExpanded ? "h-[300px] sm:h-[350px] md:h-[400px]" : "aspect-video max-h-[300px] sm:max-h-[350px] md:max-h-[400px]")}
                  >
                    {/* Error Message */}
                    {previewError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-sm z-10 rounded-lg">
                        <div className="text-center px-4">
                          <div className="mb-2">
                            <Video className="h-12 w-12 mx-auto" style={{ color: 'rgb(var(--muted-foreground))' }} />
                          </div>
                          <p className="text-sm font-medium mb-1" style={{ color: 'rgb(var(--foreground))' }}>
                            Lỗi camera
                          </p>
                          <p className="text-xs mb-3" style={{ color: 'rgb(var(--muted-foreground))' }}>
                            {previewError}
                          </p>
                          <button
                            onClick={async () => {
                              setPreviewError(null);
                              setCameraError(null);
                              // Retry
                              if (selectedCamera && videoPreviewRef.current) {
                                try {
                                  if (localTracksRef.current.videoTrack) {
                                    localTracksRef.current.videoTrack.stop();
                                    localTracksRef.current.videoTrack.close();
                                    localTracksRef.current.videoTrack = null;
                                  }
                                  const videoTrack = await AgoraRTC.createCameraVideoTrack({
                                    cameraId: selectedCamera,
                                    encoderConfig: "720p_1"
                                  });
                                  localTracksRef.current.videoTrack = videoTrack;
                                  videoTrack.play(videoPreviewRef.current, { fit: "cover" });
                                  setPreviewError(null);
                                  setCameraError(null);
                                } catch (err) {
                                  console.error("[LiveSetup] Retry preview error:", err);
                                  let errorMessage = "Không thể khởi tạo camera.";
                                  if (err.name === "NotReadableError" || err.code === "NOT_READABLE") {
                                    errorMessage = "Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng ứng dụng khác và thử lại.";
                                  } else if (err.name === "NotAllowedError" || err.code === "PERMISSION_DENIED") {
                                    errorMessage = "Không có quyền truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.";
                                  } else if (err.name === "NotFoundError" || err.code === "DEVICE_NOT_FOUND") {
                                    errorMessage = "Không tìm thấy camera. Vui lòng kiểm tra thiết bị của bạn.";
                                  } else if (err.name === "OverconstrainedError") {
                                    errorMessage = "Camera không hỗ trợ cấu hình yêu cầu. Vui lòng thử camera khác.";
                                  }
                                  setPreviewError(errorMessage);
                                  setCameraError(errorMessage);
                                }
                              }
                            }}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-105"
                            style={{ 
                              backgroundColor: 'rgb(var(--primary))',
                              borderColor: 'rgb(var(--primary))',
                              color: 'rgb(var(--primary-foreground))'
                            }}
                          >
                            Thử lại
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Webcam preview */}
                    <div 
                      ref={videoPreviewRef}
                      className="w-full h-full"
                      style={{ backgroundColor: 'rgb(var(--muted))' }}
                    />
                  </div>
                  <button
                    onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                    className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 rounded-full border p-1.5 sm:p-2 backdrop-blur-md transition-all duration-200 hover:scale-110 z-20"
                    style={{ 
                      backgroundColor: 'rgba(var(--card), 0.8)',
                      borderColor: 'rgb(var(--border))',
                      color: 'rgb(var(--foreground))'
                    }}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "live" && step === 2 && (
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                  Thêm chi tiết về bài viết
                </h3>

                {/* Title Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                    Video trực tiếp của bạn nói về điều gì?
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập tiêu đề..."
                    className="w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:outline-none"
                    style={{ 
                      backgroundColor: 'rgb(var(--muted))',
                      borderColor: 'rgb(var(--border))',
                      color: 'rgb(var(--foreground))'
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
                </div>

                {/* Description Input */}
                <div className="space-y-1">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả (tùy chọn)"
                    rows={2}
                    className="w-full rounded-lg border px-2 py-1.5 text-xs transition-all duration-200 focus:outline-none resize-none"
                    style={{ 
                      backgroundColor: 'rgb(var(--muted))',
                      borderColor: 'rgb(var(--border))',
                      color: 'rgb(var(--foreground))'
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
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105"
                    style={{ 
                      backgroundColor: 'rgb(var(--card))',
                      borderColor: 'rgb(var(--border))',
                      color: 'rgb(var(--foreground))'
                    }}
                  >
                    <Tag className="h-4 w-4" />
                    Gắn thẻ người khác
                  </button>
                  <button
                    className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105"
                    style={{ 
                      backgroundColor: 'rgb(var(--card))',
                      borderColor: 'rgb(var(--border))',
                      color: 'rgb(var(--foreground))'
                    }}
                  >
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Check in
                  </button>
                  <button
                    className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105"
                    style={{ 
                      backgroundColor: 'rgb(var(--card))',
                      borderColor: 'rgb(var(--border))',
                      color: 'rgb(var(--foreground))'
                    }}
                  >
                    <Smile className="h-4 w-4" />
                    Cảm xúc/hoạt động
                  </button>
                </div>
              </div>
            )}

            {activeTab === "live" && step === 3 && (
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                  Bình luận ghim sẵn
                </h3>
                <p className="text-xs" style={{ color: 'rgb(var(--muted-foreground))' }}>
                  Bình luận này sẽ tự động được ghim trong đoạn chat của tất cả video trực tiếp mà bạn đăng.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enablePinnedComment"
                    checked={enablePinnedComment}
                    onChange={(e) => setEnablePinnedComment(e.target.checked)}
                    className="h-4 w-4 rounded border"
                    style={{ 
                      accentColor: 'rgb(var(--primary))',
                      borderColor: 'rgb(var(--border))'
                    }}
                  />
                  <label htmlFor="enablePinnedComment" className="text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                    Bật bình luận ghim sẵn
                  </label>
                </div>

                {enablePinnedComment && (
                  <div className="space-y-2">
                    <div className="rounded-lg border p-3" style={{ backgroundColor: 'rgb(var(--muted))', borderColor: 'rgb(var(--border))' }}>
                      <p className="text-[10px] sm:text-xs font-medium mb-2" style={{ color: 'rgb(var(--muted-foreground))' }}>Xem trước</p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold" style={{ backgroundColor: 'rgb(var(--primary))', color: 'rgb(var(--primary-foreground))' }}>
                          {sessionUser?.name?.[0] || "U"}
                        </div>
                        <span className="text-xs sm:text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                          {sessionUser?.name || "Người dùng"}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm" style={{ color: 'rgb(var(--muted-foreground))' }}>
                        {pinnedComment || "Đây là một bình luận ghim sẵn. Bạn có thể nhấp vào nút Chỉnh sửa bên dưới để thêm bình luận."}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                        Chỉnh sửa
                      </label>
                      <textarea
                        value={pinnedComment}
                        onChange={(e) => setPinnedComment(e.target.value)}
                        placeholder="Nhập bình luận ghim sẵn..."
                        rows={2}
                        className="w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:outline-none resize-none"
                        style={{ 
                          backgroundColor: 'rgb(var(--card))',
                          borderColor: 'rgb(var(--border))',
                          color: 'rgb(var(--foreground))'
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
                    </div>
                  </div>
                )}

                <div className="rounded-lg border p-2.5" style={{ backgroundColor: 'rgb(var(--muted))', borderColor: 'rgb(var(--border))' }}>
                  <h4 className="text-xs sm:text-sm font-semibold mb-1.5" style={{ color: 'rgb(var(--foreground))' }}>
                    Tóm tắt
                  </h4>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p style={{ color: 'rgb(var(--muted-foreground))' }}>
                      <span className="font-medium" style={{ color: 'rgb(var(--foreground))' }}>Tiêu đề:</span> {title || "Chưa có"}
                    </p>
                    <p style={{ color: 'rgb(var(--muted-foreground))' }}>
                      <span className="font-medium" style={{ color: 'rgb(var(--foreground))' }}>Nguồn video:</span> Webcam
                    </p>
                    {scheduleType === "scheduled" && scheduledDateTime && (
                      <p style={{ color: 'rgb(var(--muted-foreground))' }}>
                        <span className="font-medium" style={{ color: 'rgb(var(--foreground))' }}>Thời gian:</span> {new Date(scheduledDateTime).toLocaleString('vi-VN')}
                      </p>
                    )}
                    <p style={{ color: 'rgb(var(--muted-foreground))' }}>
                      <span className="font-medium" style={{ color: 'rgb(var(--foreground))' }}>Quyền riêng tư:</span> {privacy === "public" ? "Công khai" : "Bạn bè"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="mt-2 sm:mt-3 flex items-center justify-between border-t pt-2 sm:pt-2.5 flex-shrink-0" style={{ borderColor: 'rgb(var(--border))' }}>
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105"
            style={{ 
              backgroundColor: 'rgb(var(--card))',
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--foreground))'
            }}
          >
            <ChevronLeft className="h-4 w-4" />
            Quay lại
          </button>
          
          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: canProceed() ? 'rgb(var(--primary))' : 'rgb(var(--muted))',
                boxShadow: canProceed() ? '0 4px 20px rgba(var(--primary), 0.3)' : 'none'
              }}
            >
              Tiếp tục
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleStartLive}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: canProceed() ? 'rgb(var(--danger))' : 'rgb(var(--muted))',
                boxShadow: canProceed() ? '0 4px 20px rgba(var(--danger), 0.3)' : 'none'
              }}
            >
              Phát trực tiếp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

LiveSetup.propTypes = {
  onClose: PropTypes.func.isRequired,
  onStartLive: PropTypes.func.isRequired,
};

