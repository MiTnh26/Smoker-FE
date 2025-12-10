// src/modules/dj/components/DJBookingRequests.js
import React, { useState, useEffect, useCallback } from "react";
import bookingApi from "../../../api/bookingApi";
import { cn } from "../../../utils/cn";
import { Calendar, Clock, MapPin, DollarSign, CheckCircle, XCircle, Eye, AlertCircle, Loader2, X } from "lucide-react";
import { ToastContainer } from "../../../components/common/Toast";
import { SkeletonCard } from "../../../components/common/Skeleton";

// Slot configuration
const TOTAL_SLOTS = 12;
const SLOT_DURATION = 2;

// Tạo danh sách slot với thời gian
const generateSlots = () => {
  const slots = [];
  for (let i = 1; i <= TOTAL_SLOTS; i++) {
    const startHour = (i - 1) * SLOT_DURATION;
    const endHour = i * SLOT_DURATION;
    slots.push({
      id: i,
      label: `SL${i}`,
      timeRange: `${startHour}h-${endHour}h`,
    });
  }
  return slots;
};

const SLOTS = generateSlots();

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
  
  // Lấy slots đã đặt
  const bookedSlots = detailSchedule?.Slots || detailSchedule?.slots || [];
  const slotInfo = bookedSlots
    .map(slotId => SLOTS.find(s => s.id === slotId))
    .filter(Boolean)
    .sort((a, b) => a.id - b.id);

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
            {slotInfo.length > 0 && (
              <div className="flex items-start gap-3">
                <Clock className="mt-1 text-muted-foreground" size={20} />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">Các slot đã đặt</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {slotInfo.map((slot) => (
                      <span
                        key={slot.id}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm font-medium",
                          "bg-muted/50 text-foreground",
                          "border border-border/30"
                        )}
                      >
                        {slot.label} ({slot.timeRange})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
              {Math.max(0, (booking.totalAmount || booking.TotalAmount || 0) - 50000).toLocaleString('vi-VN')} đ
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '16px'
        }}>
          {bookings.map((booking) => {
            const detailSchedule = booking.detailSchedule || booking.DetailSchedule;
            const scheduleStatus = booking.ScheduleStatus || booking.scheduleStatus;
            const paymentStatus = booking.PaymentStatus || booking.paymentStatus;
            
            // Xác định status badge
            let statusBadge = null;
            if (scheduleStatus === "Pending") {
              statusBadge = {
                label: "Chờ xác nhận",
                color: "rgb(var(--warning))",
                bg: "rgba(var(--warning), 0.1)",
                icon: AlertCircle
              };
            } else if (scheduleStatus === "Confirmed" && paymentStatus === "Paid") {
              statusBadge = {
                label: "Đã xác nhận - Đã cọc",
                color: "rgb(var(--primary))",
                bg: "rgba(var(--primary), 0.1)",
                icon: CheckCircle
              };
            } else if (scheduleStatus === "Completed") {
              statusBadge = {
                label: "Hoàn thành",
                color: "rgb(var(--success))",
                bg: "rgba(var(--success), 0.1)",
                icon: CheckCircle
              };
            }
            
            const StatusIcon = statusBadge?.icon;
            
            return (
              <div
                key={booking.BookedScheduleId || booking.bookedScheduleId}
                style={{
                  background: 'rgb(var(--card))',
                  borderRadius: '8px',
                  padding: '14px',
                  border: '1px solid rgb(var(--border))',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.2s ease-in-out',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.08)';
                }}
              >
                <div style={{ marginBottom: '10px' }}>
                  <div style={{
                    fontSize: '0.7rem',
                    color: '#9ca3af',
                    marginBottom: '6px',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    lineHeight: '1.2'
                  }}>
                    {booking.BookedScheduleId || booking.bookedScheduleId || 'N/A'}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#6b7280',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Calendar size={14} style={{ color: '#9ca3af' }} />
                    <span>{formatDate(booking.bookingDate || booking.BookingDate)}</span>
                  </div>
                  {booking.startTime && booking.endTime && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Clock size={14} style={{ color: '#9ca3af' }} />
                      <span>{formatTime(booking.startTime || booking.StartTime)} - {formatTime(booking.endTime || booking.EndTime)}</span>
                    </div>
                  )}
                  {/* Slots */}
                  {(() => {
                    const bookedSlots = detailSchedule?.Slots || detailSchedule?.slots || [];
                    const slotInfo = bookedSlots
                      .map(slotId => SLOTS.find(s => s.id === slotId))
                      .filter(Boolean)
                      .sort((a, b) => a.id - b.id);
                    
                    if (slotInfo.length > 0) {
                      return (
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#374151',
                          marginBottom: '8px',
                          padding: '6px 8px',
                          background: 'rgba(var(--primary), 0.05)',
                          borderRadius: '6px',
                          border: '1px solid rgba(var(--primary), 0.15)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '4px',
                            fontWeight: '600',
                            color: '#1f2937'
                          }}>
                            <Clock size={14} style={{ color: 'rgb(var(--primary))' }} />
                            <span>Slots đã đặt:</span>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexWrap: 'wrap'
                          }}>
                            {slotInfo.map((slot) => (
                              <span
                                key={slot.id}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: '600',
                                  background: 'rgb(var(--primary))',
                                  color: '#ffffff',
                                  border: '1px solid rgb(var(--primary))'
                                }}
                              >
                                {slot.label} ({slot.timeRange})
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {detailSchedule?.Location && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <MapPin size={14} style={{ color: '#9ca3af' }} />
                      <span style={{ wordBreak: 'break-word' }}>{detailSchedule.Location}</span>
                    </div>
                  )}
                  {detailSchedule?.Note && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginTop: '8px',
                      padding: '6px 8px',
                      background: 'rgba(var(--muted), 0.2)',
                      borderRadius: '4px',
                      borderLeft: '2px solid rgb(var(--primary))'
                    }}>
                      <span style={{ fontWeight: '500', color: '#374151' }}>📝 </span>
                      {detailSchedule.Note}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  {statusBadge && (
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        background: statusBadge.bg,
                        color: statusBadge.color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {StatusIcon && <StatusIcon size={12} />}
                      {statusBadge.label}
                    </span>
                  )}
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'rgb(var(--success))',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <DollarSign size={14} />
                    {Math.max(0, (booking.totalAmount || booking.TotalAmount || 0) - 50000).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setSelectedBooking(booking);
                      setDetailModalOpen(true);
                    }}
                    style={{
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '4px',
                      background: 'rgb(var(--muted))',
                      color: 'rgb(var(--foreground))',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'background-color 0.2s ease-in-out'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--muted-hover))'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--muted))'}
                  >
                    <Eye size={14} />
                    Chi tiết
                  </button>
                  {scheduleStatus === "Pending" && (
                    <>
                      <button
                        onClick={() => handleConfirm(booking)}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '4px',
                          background: 'rgb(var(--success))',
                          color: 'rgb(var(--white))',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'background-color 0.2s ease-in-out'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--success-hover))'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--success))'}
                      >
                        <CheckCircle size={14} />
                        Xác nhận
                      </button>
                      <button
                        onClick={() => handleReject(booking)}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '4px',
                          background: 'rgb(var(--danger))',
                          color: 'rgb(var(--white))',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'background-color 0.2s ease-in-out'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--danger-hover))'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--danger))'}
                      >
                        <XCircle size={14} />
                        Từ chối
                      </button>
                    </>
                  )}
                  {scheduleStatus === "Confirmed" && paymentStatus === "Paid" && (
                    <button
                      onClick={() => handleCompleteTransaction(booking)}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        background: 'rgb(var(--primary))',
                        color: 'rgb(var(--white))',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'background-color 0.2s ease-in-out'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--primary-hover))'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--primary))'}
                    >
                      <CheckCircle size={14} />
                      Hoàn thành
                    </button>
                  )}
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

