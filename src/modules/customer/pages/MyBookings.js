// src/modules/customer/pages/MyBookings.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUserEntity } from "../../../hooks/useCurrentUserEntity";
import bookingApi from "../../../api/bookingApi";
import publicProfileApi from "../../../api/publicProfileApi";
import { cn } from "../../../utils/cn";
import { Calendar, Clock, MapPin, DollarSign, X, Eye, AlertCircle, CheckCircle, XCircle, Loader2, Search, Filter, ExternalLink, Building2, Music2 } from "lucide-react";
import { ToastContainer } from "../../../components/common/Toast";
import { SkeletonCard } from "../../../components/common/Skeleton";

// Booking Detail Modal
const BookingDetailModal = ({ open, onClose, booking }) => {
  const navigate = useNavigate();
  const [receiverInfo, setReceiverInfo] = useState(null);
  const [loadingReceiver, setLoadingReceiver] = useState(false);

  useEffect(() => {
    const fetchReceiverInfo = async () => {
      if (!open || !booking) return;

      const receiverId = booking.receiverId || booking.ReceiverId;
      if (!receiverId) return;

      setLoadingReceiver(true);
      try {
        const res = await publicProfileApi.getByEntityId(receiverId);
        const data = res?.data || {};
        
        // Determine profile type and get ID for navigation
        const role = (data.role || data.Role || "").toString().toUpperCase();
        const isBar = role === "BAR" || data.type === "BarPage";
        const isDJ = role === "DJ";
        const isDancer = role === "DANCER";
        
        const profileId = isBar 
          ? (data.barPageId || data.BarPageId || data.id)
          : (data.businessId || data.BussinessAccountId || data.BusinessAccountId || data.id);
        
        const profileUrl = isBar
          ? `/bar/${profileId}`
          : isDJ
          ? `/dj/${profileId}`
          : isDancer
          ? `/dancer/${profileId}`
          : null;

        setReceiverInfo({
          name: data.name || data.Name || data.userName || data.UserName || data.BarName || data.BusinessName || "Unknown",
          role: role,
          profileUrl: profileUrl,
          isBar: isBar,
          isDJ: isDJ,
          isDancer: isDancer,
        });
      } catch (error) {
        console.error("[BookingDetailModal] Error fetching receiver info:", error);
        setReceiverInfo({
          name: "Unknown",
          role: "",
          profileUrl: null,
          isBar: false,
          isDJ: false,
          isDancer: false,
        });
      } finally {
        setLoadingReceiver(false);
      }
    };

    fetchReceiverInfo();
  }, [open, booking]);

  if (!open || !booking) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      Pending: { label: "Chờ xác nhận", color: "rgb(var(--warning))", bg: "rgba(var(--warning), 0.1)" },
      Confirmed: { label: "Đã xác nhận", color: "rgb(var(--success))", bg: "rgba(var(--success), 0.1)" },
      Completed: { label: "Hoàn thành", color: "rgb(var(--primary))", bg: "rgba(var(--primary), 0.1)" },
      Canceled: { label: "Đã hủy", color: "rgb(var(--danger))", bg: "rgba(var(--danger), 0.1)" },
      Rejected: { label: "Từ chối", color: "rgb(var(--danger))", bg: "rgba(var(--danger), 0.1)" },
    };
    return configs[status] || configs.Pending;
  };

  const statusConfig = getStatusConfig(booking.scheduleStatus || booking.ScheduleStatus);
  const paymentStatus = booking.paymentStatus || booking.PaymentStatus;
  const detailSchedule = booking.detailSchedule || booking.DetailSchedule;
  const bookingType = booking.type || booking.Type;
  const isDJBooking = bookingType === "DJ" || bookingType === "Performer";
  const modalTitle = isDJBooking ? "Chi tiết đặt DJ" : "Chi tiết đặt bàn";
  const bookingCodeLabel = isDJBooking ? "Mã đặt DJ" : "Mã đặt bàn";

  return (
    <div
      className={cn("fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4")}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={cn(
        "w-full max-w-2xl bg-card text-card-foreground rounded-xl",
        "border border-border/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
        "p-6 relative max-h-[90vh] overflow-y-auto"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className={cn("text-2xl font-bold text-foreground")}>
            {modalTitle}
          </h3>
          <button
            onClick={onClose}
            className={cn(
              "p-1 rounded-full hover:bg-muted transition-colors",
              "text-muted-foreground hover:text-foreground"
            )}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={cn("space-y-4")}>
          {/* Receiver Info (Bar/DJ/Dancer) */}
          {loadingReceiver ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/30">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-muted-foreground">Đang tải thông tin...</span>
            </div>
          ) : receiverInfo ? (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/30">
              <div className="flex-shrink-0">
                {receiverInfo.isBar ? (
                  <Building2 className="text-muted-foreground" size={24} />
                ) : receiverInfo.isDJ ? (
                  <Music2 className="text-muted-foreground" size={24} />
                ) : receiverInfo.isDancer ? (
                  <Music2 className="text-muted-foreground" size={24} />
                ) : (
                  <Building2 className="text-muted-foreground" size={24} />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">
                  {isDJBooking ? "DJ/Dancer" : "Quán bar"}
                </p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">
                    {receiverInfo.name}
                  </p>
                  {receiverInfo.profileUrl && (
                    <button
                      onClick={() => {
                        navigate(receiverInfo.profileUrl);
                        onClose();
                      }}
                      className={cn(
                        "p-1.5 rounded-lg hover:bg-muted transition-colors",
                        "text-primary hover:text-primary/80",
                        "flex items-center gap-1"
                      )}
                      title="Xem profile"
                    >
                      <ExternalLink size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground">Trạng thái:</span>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-sm font-semibold",
                "border"
              )}
              style={{
                color: statusConfig.color,
                backgroundColor: statusConfig.bg,
                borderColor: statusConfig.color
              }}
            >
              {statusConfig.label}
            </span>
            {paymentStatus === "Done" && (
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-semibold",
                  "border"
                )}
                style={{
                  color: "rgb(var(--success))",
                  backgroundColor: "rgba(var(--success), 0.1)",
                  borderColor: "rgb(var(--success))"
                }}
              >
                Đã thanh toán
              </span>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="mt-1 text-muted-foreground" size={20} />
              <div>
                <p className="text-sm text-muted-foreground">Ngày đặt</p>
                <p className="font-semibold text-foreground">
                  {formatDate(booking.bookingDate || booking.BookingDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Location (for DJ bookings) */}
          {isDJBooking && detailSchedule?.Location && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 text-muted-foreground" size={20} />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Địa điểm</p>
                <p className="font-semibold text-foreground">{detailSchedule.Location}</p>
              </div>
            </div>
          )}

          {/* Note (for BarTable bookings) */}
          {!isDJBooking && detailSchedule?.Note && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 text-muted-foreground" size={20} />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Ghi chú / Địa điểm</p>
                <p className="font-semibold text-foreground">{detailSchedule.Note}</p>
              </div>
            </div>
          )}

          {/* Note (for DJ bookings) */}
          {isDJBooking && detailSchedule?.Note && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 text-muted-foreground" size={20} />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Ghi chú</p>
                <p className="font-semibold text-foreground">{detailSchedule.Note}</p>
              </div>
            </div>
          )}

          {/* Tables (nếu là booking bàn) */}
          {detailSchedule?.Table && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Danh sách bàn:</p>
              <div className="space-y-2">
                {Object.entries(detailSchedule.Table).map(([tableId, tableInfo]) => (
                  <div
                    key={tableId}
                    className={cn(
                      "p-3 rounded-lg border border-border/30",
                      "bg-background"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">
                        {tableInfo.TableName || "Bàn"}
                      </span>
                      <span className="text-foreground font-medium">
                        {tableInfo.Price ? Number(tableInfo.Price).toLocaleString('vi-VN') + ' đ' : 'Miễn phí'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Amount */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <span className="text-lg font-semibold text-foreground flex items-center gap-2">
              <DollarSign size={20} />
              Tổng tiền
            </span>
            <span className="text-2xl font-bold" style={{ color: "rgb(var(--success))" }}>
              {(booking.totalAmount || booking.TotalAmount || 0).toLocaleString('vi-VN')} đ
            </span>
          </div>

          {/* Booking ID */}
          <div className="pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground">
              {bookingCodeLabel}: {booking.BookedScheduleId || booking.bookedScheduleId || "N/A"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Receiver Info Component (for booking cards)
const ReceiverInfo = ({ receiverId, bookingType }) => {
  const navigate = useNavigate();
  const [receiverInfo, setReceiverInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      if (!receiverId) {
        setLoading(false);
        return;
      }

      try {
        const res = await publicProfileApi.getByEntityId(receiverId);
        const data = res?.data || {};
        
        const role = (data.role || data.Role || "").toString().toUpperCase();
        const isBar = role === "BAR" || data.type === "BarPage";
        const isDJ = role === "DJ";
        const isDancer = role === "DANCER";
        
        const profileId = isBar 
          ? (data.barPageId || data.BarPageId || data.id)
          : (data.businessId || data.BussinessAccountId || data.BusinessAccountId || data.id);
        
        const profileUrl = isBar
          ? `/bar/${profileId}`
          : isDJ
          ? `/dj/${profileId}`
          : isDancer
          ? `/dancer/${profileId}`
          : null;

        setReceiverInfo({
          name: data.name || data.Name || data.userName || data.UserName || data.BarName || data.BusinessName || "Unknown",
          profileUrl: profileUrl,
          isBar: isBar,
          isDJ: isDJ,
          isDancer: isDancer,
        });
      } catch (error) {
        console.error("[ReceiverInfo] Error fetching receiver info:", error);
        setReceiverInfo({ name: "Unknown", profileUrl: null });
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [receiverId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-muted-foreground">Đang tải...</span>
      </div>
    );
  }

  if (!receiverInfo) return null;

  return (
    <div className="flex items-center gap-2">
      {receiverInfo.isBar ? (
        <Building2 size={16} className="text-muted-foreground" />
      ) : receiverInfo.isDJ || receiverInfo.isDancer ? (
        <Music2 size={16} className="text-muted-foreground" />
      ) : null}
      <span className="text-sm font-medium text-foreground">
        {receiverInfo.name}
      </span>
      {receiverInfo.profileUrl && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(receiverInfo.profileUrl);
          }}
          className="p-1 hover:bg-muted rounded transition-colors"
          title="Xem profile"
        >
          <ExternalLink size={14} className="text-primary" />
        </button>
      )}
    </div>
  );
};

export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [filterMode, setFilterMode] = useState("single"); // "single" or "range"
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const currentUserEntityId = useCurrentUserEntity();

  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!currentUserEntityId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Sử dụng getBookingsByBooker với EntityAccountId (booking tables)
      const res = await bookingApi.getBookingsByBooker(currentUserEntityId, { limit: 100 });
      const bookingsData = res.data?.data || res.data || [];

      // Backend đã populate detailSchedule, không cần fetch thêm
      setBookings(bookingsData);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Không thể tải danh sách đặt bàn. Vui lòng thử lại sau.");
      addToast("Lỗi tải danh sách đặt bàn", "error");
    } finally {
      setLoading(false);
    }
  }, [currentUserEntityId, addToast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleViewDetail = (booking) => {
    setSelectedBooking(booking);
    setDetailModalOpen(true);
  };

  const handleCancelBooking = async (booking) => {
    const bookingType = booking.type || booking.Type;
    const isDJBooking = bookingType === "DJ" || bookingType === "Performer";
    const confirmMessage = isDJBooking 
      ? "Bạn có chắc chắn muốn hủy booking DJ này không?"
      : "Bạn có chắc chắn muốn hủy đặt bàn này không?";
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const bookingId = booking.BookedScheduleId || booking.bookedScheduleId;
      if (!bookingId) {
        addToast("Không tìm thấy ID booking", "error");
        return;
      }

      await bookingApi.cancelBooking(bookingId);
      const successMessage = isDJBooking 
        ? "Hủy booking DJ thành công"
        : "Hủy đặt bàn thành công";
      addToast(successMessage, "success");
      fetchBookings(); // Refresh list
    } catch (err) {
      console.error("Error canceling booking:", err);
      const errorMessage = isDJBooking
        ? "Không thể hủy booking DJ. Vui lòng thử lại."
        : "Không thể hủy đặt bàn. Vui lòng thử lại.";
      addToast(errorMessage, "error");
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      Pending: { label: "Chờ xác nhận", color: "rgb(var(--warning))", bg: "rgba(var(--warning), 0.1)", icon: AlertCircle },
      Confirmed: { label: "Đã xác nhận", color: "rgb(var(--success))", bg: "rgba(var(--success), 0.1)", icon: CheckCircle },
      Completed: { label: "Hoàn thành", color: "rgb(var(--primary))", bg: "rgba(var(--primary), 0.1)", icon: CheckCircle },
      Canceled: { label: "Đã hủy", color: "rgb(var(--danger))", bg: "rgba(var(--danger), 0.1)", icon: XCircle },
      Rejected: { label: "Từ chối", color: "rgb(var(--danger))", bg: "rgba(var(--danger), 0.1)", icon: XCircle },
    };
    return configs[status] || configs.Pending;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter bookings by date
  const filterBookingsByDate = (bookingsList) => {
    if (!bookingsList || bookingsList.length === 0) return bookingsList;

    // No filter applied
    if ((filterMode === "single" && !singleDate) || (filterMode === "range" && !startDate && !endDate)) {
      return bookingsList;
    }

    return bookingsList.filter((booking) => {
      const bookingDate = booking.bookingDate || booking.BookingDate;
      if (!bookingDate) return false;

      const bookingDateObj = new Date(bookingDate);
      bookingDateObj.setHours(0, 0, 0, 0);

      if (filterMode === "single") {
        if (!singleDate) return true;
        const filterDate = new Date(singleDate);
        filterDate.setHours(0, 0, 0, 0);
        return bookingDateObj.getTime() === filterDate.getTime();
      } else {
        // Range mode
        if (!startDate && !endDate) return true;
        
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        if (start && end) {
          return bookingDateObj >= start && bookingDateObj <= end;
        } else if (start) {
          return bookingDateObj >= start;
        } else if (end) {
          return bookingDateObj <= end;
        }
        return true;
      }
    });
  };

  // Sort bookings by date (newest first)
  const sortBookingsByDate = (bookingsList) => {
    return [...bookingsList].sort((a, b) => {
      const dateA = new Date(a.bookingDate || a.BookingDate || 0);
      const dateB = new Date(b.bookingDate || b.BookingDate || 0);
      return dateB - dateA; // Newest first
    });
  };

  // Get filtered and sorted bookings
  const getFilteredAndSortedBookings = () => {
    let filtered = filterBookingsByDate(bookings);
    return sortBookingsByDate(filtered);
  };

  // Group bookings by status (after filtering and sorting)
  const filteredBookings = getFilteredAndSortedBookings();
  
  // Separate Pending bookings by Type (BarTable vs DJ/Performer)
  const pendingBookings = filteredBookings.filter(b => (b.scheduleStatus || b.ScheduleStatus) === "Pending");
  const pendingBarTable = pendingBookings.filter(b => (b.type || b.Type) === "BarTable");
  const pendingDJ = pendingBookings.filter(b => (b.type || b.Type) === "DJ" || (b.type || b.Type) === "Performer");
  
  const groupedBookings = {
    PendingBarTable: pendingBarTable,
    PendingDJ: pendingDJ,
    Confirmed: filteredBookings.filter(b => (b.scheduleStatus || b.ScheduleStatus) === "Confirmed"),
    Completed: filteredBookings.filter(b => (b.scheduleStatus || b.ScheduleStatus) === "Completed"),
    Rejected: filteredBookings.filter(b => (b.scheduleStatus || b.ScheduleStatus) === "Rejected"),
    Canceled: filteredBookings.filter(b => (b.scheduleStatus || b.ScheduleStatus) === "Canceled"),
  };

  const clearFilters = () => {
    setSingleDate("");
    setStartDate("");
    setEndDate("");
    setShowFilter(false);
  };

  const hasActiveFilter = singleDate || startDate || endDate;

  return (
    <div className={cn("p-6 max-w-7xl mx-auto")}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={cn("text-3xl font-bold text-foreground mb-2")}>
              Đặt bàn của tôi
            </h1>
            <p className="text-muted-foreground">
              Quản lý và xem chi tiết các đặt bàn của bạn
            </p>
          </div>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={cn(
              "px-4 py-2 rounded-lg font-semibold flex items-center gap-2",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "border-none transition-colors shadow-md",
              hasActiveFilter && "ring-2 ring-primary/50"
            )}
          >
            <Filter size={18} />
            Tìm kiếm
            {hasActiveFilter && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-primary-foreground/20 text-xs">
                {filterMode === "single" && singleDate ? "1" : (startDate || endDate) ? "2" : ""}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilter && (
          <div className={cn(
            "mb-6 p-4 rounded-xl bg-card border border-border/20",
            "shadow-sm"
          )}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn("text-lg font-semibold text-foreground flex items-center gap-2")}>
                <Search size={20} />
                Tìm kiếm theo ngày
              </h3>
              <div className="flex items-center gap-2">
                {hasActiveFilter && (
                  <button
                    onClick={clearFilters}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium",
                      "bg-muted text-muted-foreground hover:bg-muted/80",
                      "border border-border/30 transition-colors"
                    )}
                  >
                    Xóa bộ lọc
                  </button>
                )}
                <button
                  onClick={() => setShowFilter(false)}
                  className={cn(
                    "p-1.5 rounded-lg hover:bg-muted transition-colors",
                    "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Filter Mode Toggle */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-foreground">Chế độ:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setFilterMode("single");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                    filterMode === "single"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  Một ngày
                </button>
                <button
                  onClick={() => {
                    setFilterMode("range");
                    setSingleDate("");
                  }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                    filterMode === "range"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  Khoảng ngày
                </button>
              </div>
            </div>

            {/* Filter Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filterMode === "single" ? (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar size={16} />
                    Chọn ngày
                  </label>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className={cn(
                      "w-full rounded-lg bg-background border border-border/30",
                      "px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                      "text-foreground"
                    )}
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Calendar size={16} />
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate || undefined}
                      className={cn(
                        "w-full rounded-lg bg-background border border-border/30",
                        "px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                        "text-foreground"
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Calendar size={16} />
                      Đến ngày
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || undefined}
                      className={cn(
                        "w-full rounded-lg bg-background border border-border/30",
                        "px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                        "text-foreground"
                      )}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className={cn(
          "mb-6 p-4 rounded-lg bg-danger/10 border border-danger/30",
          "flex items-center gap-2 text-danger"
        )}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <SkeletonCard key={`skeleton-${i}`} />
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className={cn(
          "text-center py-16 bg-card rounded-xl border border-border/20",
          "shadow-sm"
        )}>
          <Calendar size={64} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className={cn("text-xl font-bold text-foreground mb-2")}>
            {hasActiveFilter ? "Không tìm thấy đặt bàn" : "Chưa có đặt bàn nào"}
          </h3>
          <p className="text-muted-foreground">
            {hasActiveFilter 
              ? "Không có đặt bàn nào phù hợp với bộ lọc của bạn. Hãy thử thay đổi điều kiện tìm kiếm."
              : "Bạn chưa có đặt bàn nào. Hãy đặt bàn tại các quán bar yêu thích!"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending BarTable Bookings */}
          {groupedBookings.PendingBarTable.length > 0 && (
            <div>
              <h2 className={cn("text-xl font-bold text-foreground mb-4 flex items-center gap-2")}>
                <span className="px-2 py-1 rounded text-sm font-semibold" style={{ backgroundColor: "rgba(var(--primary), 0.1)", color: "rgb(var(--primary))" }}>
                  Đặt bàn
                </span>
                Chờ xác nhận ({groupedBookings.PendingBarTable.length})
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Đang chờ quán bar xác nhận đặt bàn của bạn
              </p>
              <div className="flex flex-col gap-4">
                {groupedBookings.PendingBarTable.map((booking) => {
                  const statusConfig = getStatusConfig(booking.scheduleStatus || booking.ScheduleStatus);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div
                      key={booking.BookedScheduleId || booking.bookedScheduleId}
                      className={cn(
                        "bg-card rounded-xl border border-border/20 p-6",
                        "shadow-sm hover:shadow-md transition-shadow",
                        "flex items-center justify-between gap-4"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span
                          className={cn("px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 flex-shrink-0")}
                          style={{
                            color: statusConfig.color,
                            backgroundColor: statusConfig.bg,
                          }}
                        >
                          <StatusIcon size={14} />
                          {statusConfig.label}
                        </span>
                        <div className="flex items-center gap-6 flex-1 flex-wrap">
                          {/* Receiver Info */}
                          <ReceiverInfo 
                            receiverId={booking.receiverId || booking.ReceiverId} 
                            bookingType={booking.type || booking.Type}
                          />
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar size={16} className="text-muted-foreground" />
                            <span className="text-foreground font-medium">
                              {formatDate(booking.bookingDate || booking.BookingDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign size={16} className="text-muted-foreground" />
                            <span className="text-foreground font-semibold">
                              {(booking.totalAmount || booking.TotalAmount || 0).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetail(booking)}
                          className={cn(
                            "p-2 rounded-lg hover:bg-muted transition-colors",
                            "text-muted-foreground hover:text-foreground"
                          )}
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleCancelBooking(booking)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-sm font-semibold",
                            "bg-danger/10 text-danger hover:bg-danger/20",
                            "border border-danger/30 transition-colors"
                          )}
                        >
                          Hủy đặt bàn
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending DJ Bookings */}
          {groupedBookings.PendingDJ.length > 0 && (
            <div>
              <h2 className={cn("text-xl font-bold text-foreground mb-4 flex items-center gap-2")}>
                <span className="px-2 py-1 rounded text-sm font-semibold" style={{ backgroundColor: "rgba(var(--warning), 0.1)", color: "rgb(var(--warning))" }}>
                  DJ
                </span>
                Chờ xác nhận ({groupedBookings.PendingDJ.length})
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Đang chờ DJ xác nhận yêu cầu booking của bạn
              </p>
              <div className="flex flex-col gap-4">
                {groupedBookings.PendingDJ.map((booking) => {
                  const statusConfig = getStatusConfig(booking.scheduleStatus || booking.ScheduleStatus);
                  const StatusIcon = statusConfig.icon;
                  const detailSchedule = booking.detailSchedule || booking.DetailSchedule;
                  
                  return (
                    <div
                      key={booking.BookedScheduleId || booking.bookedScheduleId}
                      className={cn(
                        "bg-card rounded-xl border border-border/20 p-6",
                        "shadow-sm hover:shadow-md transition-shadow",
                        "flex items-center justify-between gap-4"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span
                          className={cn("px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 flex-shrink-0")}
                          style={{
                            color: statusConfig.color,
                            backgroundColor: statusConfig.bg,
                          }}
                        >
                          <StatusIcon size={14} />
                          {statusConfig.label}
                        </span>
                        <div className="flex items-center gap-6 flex-1 flex-wrap">
                          {/* Receiver Info */}
                          <ReceiverInfo 
                            receiverId={booking.receiverId || booking.ReceiverId} 
                            bookingType={booking.type || booking.Type}
                          />
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar size={16} className="text-muted-foreground" />
                            <span className="text-foreground font-medium">
                              {formatDate(booking.bookingDate || booking.BookingDate)}
                            </span>
                          </div>
                          {detailSchedule?.Location && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin size={16} className="text-muted-foreground" />
                              <span className="text-foreground">
                                {detailSchedule.Location}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign size={16} className="text-muted-foreground" />
                            <span className="text-foreground font-semibold">
                              {(booking.totalAmount || booking.TotalAmount || 0).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetail(booking)}
                          className={cn(
                            "p-2 rounded-lg hover:bg-muted transition-colors",
                            "text-muted-foreground hover:text-foreground"
                          )}
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleCancelBooking(booking)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-sm font-semibold",
                            "bg-danger/10 text-danger hover:bg-danger/20",
                            "border border-danger/30 transition-colors"
                          )}
                        >
                          Hủy booking
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Confirmed Bookings */}
          {groupedBookings.Confirmed.length > 0 && (
            <div>
              <h2 className={cn("text-xl font-bold text-foreground mb-4")}>
                Đã xác nhận ({groupedBookings.Confirmed.length})
              </h2>
              <div className="flex flex-col gap-4">
                {groupedBookings.Confirmed.map((booking) => {
                  const statusConfig = getStatusConfig(booking.scheduleStatus || booking.ScheduleStatus);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div
                      key={booking.BookedScheduleId || booking.bookedScheduleId}
                      className={cn(
                        "bg-card rounded-xl border border-border/20 p-6",
                        "shadow-sm hover:shadow-md transition-shadow",
                        "flex items-center justify-between gap-4"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span
                          className={cn("px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 flex-shrink-0")}
                          style={{
                            color: statusConfig.color,
                            backgroundColor: statusConfig.bg,
                          }}
                        >
                          <StatusIcon size={14} />
                          {statusConfig.label}
                        </span>
                        <div className="flex items-center gap-6 flex-1 flex-wrap">
                          {/* Receiver Info */}
                          <ReceiverInfo 
                            receiverId={booking.receiverId || booking.ReceiverId} 
                            bookingType={booking.type || booking.Type}
                          />
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar size={16} className="text-muted-foreground" />
                            <span className="text-foreground font-medium">
                              {formatDate(booking.bookingDate || booking.BookingDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign size={16} className="text-muted-foreground" />
                            <span className="text-foreground font-semibold">
                              {(booking.totalAmount || booking.TotalAmount || 0).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewDetail(booking)}
                        className={cn(
                          "p-2 rounded-lg hover:bg-muted transition-colors",
                          "text-muted-foreground hover:text-foreground"
                        )}
                        title="Xem chi tiết"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Bookings */}
          {groupedBookings.Completed.length > 0 && (
            <div>
              <h2 className={cn("text-xl font-bold text-foreground mb-4")}>
                Hoàn thành ({groupedBookings.Completed.length})
              </h2>
              <div className="flex flex-col gap-4">
                {groupedBookings.Completed.map((booking) => {
                  const statusConfig = getStatusConfig(booking.scheduleStatus || booking.ScheduleStatus);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div
                      key={booking.BookedScheduleId || booking.bookedScheduleId}
                      className={cn(
                        "bg-card rounded-xl border border-border/20 p-6",
                        "shadow-sm hover:shadow-md transition-shadow",
                        "flex items-center justify-between gap-4"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span
                          className={cn("px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 flex-shrink-0")}
                          style={{
                            color: statusConfig.color,
                            backgroundColor: statusConfig.bg,
                          }}
                        >
                          <StatusIcon size={14} />
                          {statusConfig.label}
                        </span>
                        <div className="flex items-center gap-6 flex-1 flex-wrap">
                          {/* Receiver Info */}
                          <ReceiverInfo 
                            receiverId={booking.receiverId || booking.ReceiverId} 
                            bookingType={booking.type || booking.Type}
                          />
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar size={16} className="text-muted-foreground" />
                            <span className="text-foreground font-medium">
                              {formatDate(booking.bookingDate || booking.BookingDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign size={16} className="text-muted-foreground" />
                            <span className="text-foreground font-semibold">
                              {(booking.totalAmount || booking.TotalAmount || 0).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewDetail(booking)}
                        className={cn(
                          "p-2 rounded-lg hover:bg-muted transition-colors",
                          "text-muted-foreground hover:text-foreground"
                        )}
                        title="Xem chi tiết"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rejected Bookings */}
          {groupedBookings.Rejected.length > 0 && (
            <div>
              <h2 className={cn("text-xl font-bold text-foreground mb-4")}>
                Từ chối ({groupedBookings.Rejected.length})
              </h2>
              <div className="flex flex-col gap-4">
                {groupedBookings.Rejected.map((booking) => {
                  const statusConfig = getStatusConfig(booking.scheduleStatus || booking.ScheduleStatus);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div
                      key={booking.BookedScheduleId || booking.bookedScheduleId}
                      className={cn(
                        "bg-card rounded-xl border border-border/20 p-6 opacity-75",
                        "shadow-sm hover:shadow-md transition-shadow",
                        "flex items-center justify-between gap-4"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span
                          className={cn("px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 flex-shrink-0")}
                          style={{
                            color: statusConfig.color,
                            backgroundColor: statusConfig.bg,
                          }}
                        >
                          <StatusIcon size={14} />
                          {statusConfig.label}
                        </span>
                        <div className="flex items-center gap-6 flex-1 flex-wrap">
                          {/* Receiver Info */}
                          <ReceiverInfo 
                            receiverId={booking.receiverId || booking.ReceiverId} 
                            bookingType={booking.type || booking.Type}
                          />
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar size={16} className="text-muted-foreground" />
                            <span className="text-foreground font-medium">
                              {formatDate(booking.bookingDate || booking.BookingDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign size={16} className="text-muted-foreground" />
                            <span className="text-foreground font-semibold">
                              {(booking.totalAmount || booking.TotalAmount || 0).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewDetail(booking)}
                        className={cn(
                          "p-2 rounded-lg hover:bg-muted transition-colors",
                          "text-muted-foreground hover:text-foreground"
                        )}
                        title="Xem chi tiết"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Canceled Bookings */}
          {groupedBookings.Canceled.length > 0 && (
            <div>
              <h2 className={cn("text-xl font-bold text-foreground mb-4")}>
                Đã hủy ({groupedBookings.Canceled.length})
              </h2>
              <div className="flex flex-col gap-4">
                {groupedBookings.Canceled.map((booking) => {
                  const statusConfig = getStatusConfig(booking.scheduleStatus || booking.ScheduleStatus);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div
                      key={booking.BookedScheduleId || booking.bookedScheduleId}
                      className={cn(
                        "bg-card rounded-xl border border-border/20 p-6 opacity-75",
                        "shadow-sm hover:shadow-md transition-shadow",
                        "flex items-center justify-between gap-4"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span
                          className={cn("px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 flex-shrink-0")}
                          style={{
                            color: statusConfig.color,
                            backgroundColor: statusConfig.bg,
                          }}
                        >
                          <StatusIcon size={14} />
                          {statusConfig.label}
                        </span>
                        <div className="flex items-center gap-6 flex-1 flex-wrap">
                          {/* Receiver Info */}
                          <ReceiverInfo 
                            receiverId={booking.receiverId || booking.ReceiverId} 
                            bookingType={booking.type || booking.Type}
                          />
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar size={16} className="text-muted-foreground" />
                            <span className="text-foreground font-medium">
                              {formatDate(booking.bookingDate || booking.BookingDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign size={16} className="text-muted-foreground" />
                            <span className="text-foreground font-semibold">
                              {(booking.totalAmount || booking.TotalAmount || 0).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewDetail(booking)}
                        className={cn(
                          "p-2 rounded-lg hover:bg-muted transition-colors",
                          "text-muted-foreground hover:text-foreground"
                        )}
                        title="Xem chi tiết"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <BookingDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
      />
    </div>
  );
}

