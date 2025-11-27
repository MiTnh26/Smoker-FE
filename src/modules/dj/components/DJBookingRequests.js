// src/modules/dj/components/DJBookingRequests.js
import React, { useState, useEffect, useCallback } from "react";
import bookingApi from "../../../api/bookingApi";
import { cn } from "../../../utils/cn";
import { Calendar, Clock, MapPin, DollarSign, CheckCircle, XCircle, Eye, AlertCircle, Loader2, X } from "lucide-react";
import { ToastContainer } from "../../../components/common/Toast";
import { SkeletonCard } from "../../../components/common/Skeleton";

// Booking Detail Modal
const BookingDetailModal = ({ open, onClose, booking }) => {
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

  const detailSchedule = booking.detailSchedule || booking.DetailSchedule;

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
        <div className="flex items-center justify-between mb-6">
          <h3 className={cn("text-2xl font-bold text-foreground")}>
            Chi tiết yêu cầu booking
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

        <div className={cn("space-y-4")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="mt-1 text-muted-foreground" size={20} />
              <div>
                <p className="text-sm text-muted-foreground">Ngày booking</p>
                <p className="font-semibold text-foreground">
                  {formatDate(booking.bookingDate || booking.BookingDate)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-1 text-muted-foreground" size={20} />
              <div>
                <p className="text-sm text-muted-foreground">Thời gian</p>
                <p className="font-semibold text-foreground">
                  {formatTime(booking.startTime || booking.StartTime)} - {formatTime(booking.endTime || booking.EndTime)}
                </p>
              </div>
            </div>
          </div>

          {detailSchedule?.Location && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 text-muted-foreground" size={20} />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Địa điểm</p>
                <p className="font-semibold text-foreground">{detailSchedule.Location}</p>
              </div>
            </div>
          )}

          {detailSchedule?.Note && (
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-1 text-muted-foreground" size={20} />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Ghi chú</p>
                <p className="font-semibold text-foreground">{detailSchedule.Note}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <span className="text-lg font-semibold text-foreground flex items-center gap-2">
              <DollarSign size={20} />
              Tổng tiền
            </span>
            <span className="text-2xl font-bold" style={{ color: "rgb(var(--success))" }}>
              {(booking.totalAmount || booking.TotalAmount || 0).toLocaleString('vi-VN')} đ
            </span>
          </div>

          <div className="pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground">
              Mã booking: {booking.BookedScheduleId || booking.bookedScheduleId || "N/A"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DJBookingRequests({ performerEntityAccountId }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Fetch pending bookings
  const fetchBookings = useCallback(async () => {
    if (!performerEntityAccountId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await bookingApi.getBookingsByReceiver(performerEntityAccountId, { limit: 100 });
      const bookingsData = res.data?.data || res.data || [];
      
      // Chỉ lấy các booking Pending
      const pendingBookings = bookingsData.filter(b => 
        (b.scheduleStatus || b.ScheduleStatus) === "Pending"
      );
      
      // Sắp xếp theo ngày (mới nhất trước)
      const sorted = pendingBookings.sort((a, b) => {
        const dateA = new Date(a.bookingDate || a.BookingDate || 0);
        const dateB = new Date(b.bookingDate || b.BookingDate || 0);
        return dateB - dateA;
      });

      setBookings(sorted);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Không thể tải danh sách yêu cầu booking. Vui lòng thử lại sau.");
      addToast("Lỗi tải danh sách booking", "error");
    } finally {
      setLoading(false);
    }
  }, [performerEntityAccountId, addToast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleConfirm = async (booking) => {
    if (!window.confirm("Bạn có chắc chắn muốn xác nhận booking này không?")) {
      return;
    }

    try {
      const bookingId = booking.BookedScheduleId || booking.bookedScheduleId;
      if (!bookingId) {
        addToast("Không tìm thấy ID booking", "error");
        return;
      }

      await bookingApi.confirmDJBooking(bookingId);
      addToast("Xác nhận booking thành công", "success");
      fetchBookings(); // Refresh list
    } catch (err) {
      console.error("Error confirming booking:", err);
      addToast("Không thể xác nhận booking. Vui lòng thử lại.", "error");
    }
  };

  const handleReject = async (booking) => {
    if (!window.confirm("Bạn có chắc chắn muốn từ chối booking này không?")) {
      return;
    }

    try {
      const bookingId = booking.BookedScheduleId || booking.bookedScheduleId;
      if (!bookingId) {
        addToast("Không tìm thấy ID booking", "error");
        return;
      }

      await bookingApi.rejectDJBooking(bookingId);
      addToast("Đã từ chối booking", "success");
      fetchBookings(); // Refresh list
    } catch (err) {
      console.error("Error rejecting booking:", err);
      addToast("Không thể từ chối booking. Vui lòng thử lại.", "error");
    }
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

  return (
    <div className={cn("p-6")}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="mb-6">
        <h2 className={cn("text-2xl font-bold text-foreground mb-2")}>
          Yêu cầu booking
        </h2>
        <p className="text-muted-foreground">
          Xác nhận hoặc từ chối các yêu cầu booking từ khách hàng
        </p>
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
          {[1, 2, 3].map(i => (
            <SkeletonCard key={`skeleton-${i}`} />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className={cn(
          "text-center py-16 bg-card rounded-xl border border-border/20",
          "shadow-sm"
        )}>
          <Calendar size={64} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className={cn("text-xl font-bold text-foreground mb-2")}>
            Chưa có yêu cầu booking nào
          </h3>
          <p className="text-muted-foreground">
            Bạn chưa có yêu cầu booking nào đang chờ xác nhận.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((booking) => {
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
                      color: "rgb(var(--warning))",
                      backgroundColor: "rgba(var(--warning), 0.1)",
                    }}
                  >
                    <AlertCircle size={14} />
                    Chờ xác nhận
                  </span>
                  <div className="flex items-center gap-6 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={16} className="text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {formatDate(booking.bookingDate || booking.BookingDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={16} className="text-muted-foreground" />
                      <span className="text-foreground">
                        {formatTime(booking.startTime || booking.StartTime)} - {formatTime(booking.endTime || booking.EndTime)}
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
                    onClick={() => {
                      setSelectedBooking(booking);
                      setDetailModalOpen(true);
                    }}
                    className={cn(
                      "p-2 rounded-lg hover:bg-muted transition-colors",
                      "text-muted-foreground hover:text-foreground"
                    )}
                    title="Xem chi tiết"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleConfirm(booking)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-semibold",
                      "bg-success/10 text-success hover:bg-success/20",
                      "border border-success/30 transition-colors",
                      "flex items-center gap-2"
                    )}
                  >
                    <CheckCircle size={16} />
                    Xác nhận
                  </button>
                  <button
                    onClick={() => handleReject(booking)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-semibold",
                      "bg-danger/10 text-danger hover:bg-danger/20",
                      "border border-danger/30 transition-colors",
                      "flex items-center gap-2"
                    )}
                  >
                    <XCircle size={16} />
                    Từ chối
                  </button>
                </div>
              </div>
            );
          })}
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

