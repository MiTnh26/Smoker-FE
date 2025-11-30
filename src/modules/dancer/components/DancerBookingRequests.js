// src/modules/dancer/components/DancerBookingRequests.js
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

export default function DancerBookingRequests({ performerEntityAccountId }) {
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

  // Fetch pending bookings - use getDJBookingsByReceiver (same endpoint for both DJ and Dancer)
  const fetchBookings = useCallback(async () => {
    if (!performerEntityAccountId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await bookingApi.getDJBookingsByReceiver(performerEntityAccountId, { limit: 100 });
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
    if (!window.confirm("Bạn có chắc chắn muốn xác nhận booking này không? Các booking khác cùng ngày sẽ bị từ chối tự động.")) {
      return;
    }

    try {
      const bookingId = booking.BookedScheduleId || booking.bookedScheduleId;
      if (!bookingId) {
        addToast("Không tìm thấy ID booking", "error");
        return;
      }

      await bookingApi.confirmDJBooking(bookingId);
      addToast("Xác nhận booking thành công. Các booking khác cùng ngày đã bị từ chối tự động.", "success");
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
      addToast("Từ chối booking thành công", "success");
      fetchBookings(); // Refresh list
    } catch (err) {
      console.error("Error rejecting booking:", err);
      addToast("Không thể từ chối booking. Vui lòng thử lại.", "error");
    }
  };

  const handleCompleteTransaction = async (booking) => {
    if (!window.confirm("Bạn có chắc chắn đã hoàn thành giao dịch với khách hàng? Số tiền còn lại sẽ được chuyển vào tài khoản của bạn.")) {
      return;
    }

    try {
      const bookingId = booking.BookedScheduleId || booking.bookedScheduleId;
      if (!bookingId) {
        addToast("Không tìm thấy ID booking", "error");
        return;
      }

      await bookingApi.completeTransaction(bookingId);
      addToast("Xác nhận hoàn thành giao dịch thành công", "success");
      fetchBookings(); // Refresh list
    } catch (err) {
      console.error("Error completing transaction:", err);
      const errorMessage = err.response?.data?.message || err.message || "Không thể xác nhận hoàn thành giao dịch. Vui lòng thử lại.";
      addToast(errorMessage, "error");
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

  if (loading) {
    return (
      <div className={cn("flex flex-col gap-4")}>
        {[1, 2, 3].map(i => (
          <SkeletonCard key={`skeleton-${i}`} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(
        "p-4 rounded-lg bg-danger/10 border border-danger/30",
        "flex items-center gap-2 text-danger"
      )}>
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className={cn(
        "text-center py-12 text-muted-foreground",
        "bg-card rounded-lg border-[0.5px] border-border/20 p-8"
      )}>
        <Calendar className={cn("w-12 h-12 mx-auto mb-4 opacity-50")} />
        <p className={cn("text-lg font-medium mb-2")}>
          Chưa có yêu cầu booking
        </p>
        <p className={cn("text-sm")}>
          Các yêu cầu booking từ khách hàng sẽ hiển thị ở đây
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4")}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className={cn("mb-4")}>
        <h3 className={cn("text-lg font-semibold text-foreground mb-2")}>
          Yêu cầu booking đang chờ ({bookings.length})
        </h3>
        <p className={cn("text-sm text-muted-foreground")}>
          Khi bạn xác nhận một booking, các booking khác cùng ngày sẽ tự động bị từ chối.
        </p>
      </div>

      <div className={cn("flex flex-col gap-4")}>
        {bookings.map((booking) => {
          const detailSchedule = booking.detailSchedule || booking.DetailSchedule;
          const location = detailSchedule?.Location || "Chưa có địa chỉ";
          const note = detailSchedule?.Note || "";
          const totalAmount = booking.TotalAmount || booking.totalAmount || 0;
          const scheduleStatus = booking.ScheduleStatus || booking.scheduleStatus;
          const paymentStatus = booking.PaymentStatus || booking.paymentStatus;
          
          // Xác định status badge
          let statusBadge = null;
          if (scheduleStatus === "Pending") {
            statusBadge = (
              <span
                className={cn("px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1")}
                style={{
                  color: "rgb(var(--warning))",
                  backgroundColor: "rgba(var(--warning), 0.1)",
                }}
              >
                <AlertCircle size={14} />
                Chờ xác nhận
              </span>
            );
          } else if (scheduleStatus === "Confirmed" && paymentStatus === "Paid") {
            statusBadge = (
              <span
                className={cn("px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1")}
                style={{
                  color: "rgb(var(--primary))",
                  backgroundColor: "rgba(var(--primary), 0.1)",
                }}
              >
                <CheckCircle size={14} />
                Đã xác nhận - Đã cọc
              </span>
            );
          } else if (scheduleStatus === "Completed") {
            statusBadge = (
              <span
                className={cn("px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1")}
                style={{
                  color: "rgb(var(--success))",
                  backgroundColor: "rgba(var(--success), 0.1)",
                }}
              >
                <CheckCircle size={14} />
                Hoàn thành
              </span>
            );
          }

          return (
            <div
              key={booking.BookedScheduleId || booking.bookedScheduleId}
              className={cn(
                "bg-card rounded-xl border border-border/20 p-6",
                "shadow-sm hover:shadow-md transition-shadow"
              )}
            >
              <div className={cn("flex items-start justify-between gap-4")}>
                <div className={cn("flex-1 flex flex-col gap-3")}>
                  <div className={cn("flex items-center gap-3")}>
                    {statusBadge}
                    <span className={cn("text-sm text-muted-foreground")}>
                      {formatDate(booking.bookingDate || booking.BookingDate)}
                    </span>
                  </div>

                  <div className={cn("flex items-start gap-2")}>
                    <MapPin className={cn("w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0")} />
                    <p className={cn("text-sm text-foreground")}>
                      {location}
                    </p>
                  </div>

                  {note && (
                    <div className={cn("text-sm text-muted-foreground")}>
                      <p className={cn("font-medium mb-1")}>Ghi chú:</p>
                      <p className={cn("whitespace-pre-wrap")}>{note}</p>
                    </div>
                  )}

                  {totalAmount > 0 && (
                    <div className={cn("flex items-center gap-2")}>
                      <DollarSign className={cn("w-4 h-4 text-primary")} />
                      <p className={cn("text-sm font-semibold text-primary")}>
                        {parseInt(totalAmount).toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                  )}
                </div>

                <div className={cn("flex items-center gap-2 flex-shrink-0")}>
                  <button
                    onClick={() => {
                      setSelectedBooking(booking);
                      setDetailModalOpen(true);
                    }}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium",
                      "bg-muted text-muted-foreground hover:bg-muted/80",
                      "flex items-center gap-2 transition-colors"
                    )}
                  >
                    <Eye size={16} />
                    Chi tiết
                  </button>
                  {scheduleStatus === "Pending" && (
                    <>
                      <button
                        onClick={() => handleReject(booking)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-semibold",
                          "bg-danger text-white hover:bg-danger/90",
                          "flex items-center gap-2 transition-colors"
                        )}
                      >
                        <XCircle size={16} />
                        Từ chối
                      </button>
                      <button
                        onClick={() => handleConfirm(booking)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-semibold",
                          "bg-success text-white hover:bg-success/90",
                          "flex items-center gap-2 transition-colors"
                        )}
                      >
                        <CheckCircle size={16} />
                        Xác nhận
                      </button>
                    </>
                  )}
                  {scheduleStatus === "Confirmed" && paymentStatus === "Paid" && (
                    <button
                      onClick={() => handleCompleteTransaction(booking)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-semibold",
                        "bg-primary text-white hover:bg-primary/90",
                        "flex items-center gap-2 transition-colors"
                      )}
                    >
                      <CheckCircle size={16} />
                      Xác nhận đã giao dịch xong
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

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

