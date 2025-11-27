import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import bookingApi from "../../api/bookingApi";
import publicProfileApi from "../../api/publicProfileApi";
import { cn } from "../../utils/cn";
import { Calendar, MapPin, DollarSign, X, AlertCircle } from "lucide-react";

export default function RequestBookingModal({ open, onClose, performerEntityAccountId, performerRole = "DJ", performerProfile = null }) {
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookedDates, setBookedDates] = useState([]); // Danh sách ngày đã được book
  const [loadingBookedDates, setLoadingBookedDates] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profile, setProfile] = useState(performerProfile);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch profile nếu chưa có
  useEffect(() => {
    if (open && performerEntityAccountId && !profile) {
      fetchPerformerProfile();
    } else if (performerProfile) {
      setProfile(performerProfile);
    }
  }, [open, performerEntityAccountId, performerProfile]);

  const fetchPerformerProfile = async () => {
    if (!performerEntityAccountId) return;
    setLoadingProfile(true);
    try {
      const res = await publicProfileApi.getByEntityId(performerEntityAccountId);
      const data = res?.data || {};
      setProfile({
        pricePerHours: data.pricePerHours || data.PricePerHours || data.pricePerHour || data.PricePerHour || 0,
        pricePerSession: data.pricePerSession || data.PricePerSession || 0,
      });
    } catch (error) {
      console.error("[RequestBookingModal] Error fetching profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Tính giá tự động cho cả ngày
  const calculatedPrice = useMemo(() => {
    if (!profile) return 0;
    
    // Ưu tiên pricePerSession (giá theo buổi/cả ngày)
    if (profile.pricePerSession && Number(profile.pricePerSession) > 0) {
      return Number(profile.pricePerSession);
    }
    
    // Nếu không có pricePerSession, tính từ pricePerHours * 24 (cả ngày)
    if (profile.pricePerHours && Number(profile.pricePerHours) > 0) {
      return Number(profile.pricePerHours) * 24;
    }
    
    return 0;
  }, [profile]);
  
  // Fetch booked dates khi modal mở
  useEffect(() => {
    if (open && performerEntityAccountId) {
      fetchBookedDates();
    } else {
      // Reset khi đóng modal
      setDate("");
      setLocation("");
      setNote("");
      setBookedDates([]);
    }
  }, [open, performerEntityAccountId]);

  const fetchBookedDates = async () => {
    if (!performerEntityAccountId) return;
    
    setLoadingBookedDates(true);
    try {
      // Lấy bookings của performer (receiver)
      const res = await bookingApi.getBookingsByReceiver(performerEntityAccountId, { limit: 1000 });
      const bookings = res.data?.data || res.data || [];
      
      // Lọc các booking đã confirmed và lấy danh sách ngày
      const confirmedBookings = bookings.filter(b => 
        (b.scheduleStatus || b.ScheduleStatus) === "Confirmed"
      );
      
      // Extract dates từ bookings
      const dates = confirmedBookings.map(booking => {
        const bookingDate = booking.bookingDate || booking.BookingDate || booking.StartTime;
        if (bookingDate) {
          const date = new Date(bookingDate);
          return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        }
        return null;
      }).filter(Boolean);
      
      setBookedDates([...new Set(dates)]); // Remove duplicates
    } catch (error) {
      console.error("[RequestBookingModal] Error fetching booked dates:", error);
    } finally {
      setLoadingBookedDates(false);
    }
  };

  const isDateBooked = (dateString) => {
    return bookedDates.includes(dateString);
  };

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    if (isDateBooked(selectedDate)) {
      alert("Ngày này đã được đặt. Vui lòng chọn ngày khác.");
      return;
    }
    setDate(selectedDate);
  };
  
  if (!open) return null;

  const submit = async () => {
    setError("");
    
    if (!date) {
      setError("Vui lòng chọn ngày");
      return;
    }

    if (isDateBooked(date)) {
      setError("Ngày này đã được đặt. Vui lòng chọn ngày khác.");
      return;
    }

    if (!location.trim()) {
      setError("Vui lòng nhập địa điểm");
      return;
    }

    try {
      setSubmitting(true);
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const ae = session?.activeEntity || {};
      const entities = session?.entities || [];
      const requesterEntityAccountId =
        ae.EntityAccountId ||
        ae.entityAccountId ||
        entities[0]?.EntityAccountId ||
        entities[0]?.entityAccountId ||
        null;

      if (!requesterEntityAccountId) {
        setError("Không tìm thấy thông tin người đặt. Vui lòng đăng nhập lại.");
        return;
      }

      if (!performerEntityAccountId) {
        setError("Không tìm thấy thông tin performer.");
        return;
      }
      
      // Tính startTime và endTime từ date (cả ngày)
      const selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Sử dụng endpoint /booking/request hoặc tạo booking trực tiếp
      const payload = {
        requesterEntityAccountId,
        requesterRole: "Customer", // Hoặc "Bar" nếu là bar đặt
        performerEntityAccountId,
        performerRole,
        date,
        startTime: startOfDay.toISOString(),
        endTime: endOfDay.toISOString(),
        location: location.trim(),
        note: note.trim(),
        offeredPrice: calculatedPrice, // Tự động tính từ profile
      };

      // Thử gọi API
      try {
        await bookingApi.createRequest(payload);
        setSuccess(true);
        // Đóng modal sau 2 giây
        setTimeout(() => {
          onClose?.("success");
          setSuccess(false);
          // Reset form
          setDate("");
          setLocation("");
          setNote("");
        }, 2000);
      } catch (apiError) {
        console.error("[RequestBookingModal] API error:", apiError);
        const errorMessage = apiError.response?.data?.message || 
                           apiError.message || 
                           "Không thể gửi yêu cầu booking. Vui lòng thử lại.";
        setError(errorMessage);
      }
    } catch (e) {
      console.error("[RequestBookingModal] submit error:", e);
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className={cn("fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4")}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className={cn(
        "w-full max-w-lg bg-card text-card-foreground rounded-xl",
        "border border-border/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
        "p-6 relative"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className={cn("text-xl font-bold text-foreground")}>
            Request booking
          </h3>
          <button
            onClick={() => onClose?.()}
            className={cn(
              "p-1 rounded-full hover:bg-muted transition-colors",
              "text-muted-foreground hover:text-foreground"
            )}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className={cn(
            "mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30",
            "flex items-center gap-2 text-danger text-sm"
          )}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className={cn(
            "mb-4 p-4 rounded-lg bg-success/10 border border-success/30",
            "flex items-center gap-2 text-success"
          )}>
            <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <span className="font-semibold">Đang chờ xác nhận</span>
          </div>
        )}

        {/* Form */}
        <div className={cn("grid grid-cols-1 gap-4", success && "opacity-50 pointer-events-none")}>
          {/* Date - Booking cả ngày */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar size={16} />
              Date (Booking cả ngày)
            </span>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={handleDateChange}
                min={new Date().toISOString().split('T')[0]} // Không cho chọn ngày quá khứ
                className={cn(
                  "w-full rounded-lg bg-background border border-border/30",
                  "px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                  "text-foreground",
                  isDateBooked(date) && "border-danger bg-danger/10"
                )}
                disabled={loadingBookedDates}
              />
              {isDateBooked(date) && (
                <div className="mt-2 flex items-center gap-2 text-sm text-danger">
                  <AlertCircle size={16} />
                  <span>Ngày này đã được đặt</span>
                </div>
              )}
              {loadingBookedDates && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Đang tải danh sách ngày đã đặt...
                </div>
              )}
            </div>
          </label>

          {/* Location */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin size={16} />
              Location
            </span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bar address / venue"
              className={cn(
                "w-full rounded-lg bg-background border border-border/30",
                "px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                "text-foreground placeholder:text-muted-foreground"
              )}
            />
          </label>

          {/* Calculated Price (Read-only) */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarSign size={16} />
              Giá booking (tự động tính)
            </span>
            <div className={cn(
              "w-full rounded-lg bg-muted/50 border border-border/30",
              "px-4 py-2.5",
              "text-foreground font-semibold",
              loadingProfile && "opacity-50"
            )}>
              {loadingProfile ? (
                <span className="text-muted-foreground">Đang tải...</span>
              ) : calculatedPrice > 0 ? (
                <span>{calculatedPrice.toLocaleString('vi-VN')} đ</span>
              ) : (
                <span className="text-muted-foreground">Chưa có giá</span>
              )}
            </div>
            {profile && (
              <p className="text-xs text-muted-foreground">
                {profile.pricePerSession && Number(profile.pricePerSession) > 0
                  ? `Giá theo buổi: ${Number(profile.pricePerSession).toLocaleString('vi-VN')} đ`
                  : profile.pricePerHours && Number(profile.pricePerHours) > 0
                  ? `Giá theo giờ: ${Number(profile.pricePerHours).toLocaleString('vi-VN')} đ/giờ × 24 giờ = ${calculatedPrice.toLocaleString('vi-VN')} đ`
                  : "Chưa có giá được thiết lập"}
              </p>
            )}
          </div>

          {/* Note */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground">Note</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Thêm ghi chú (tùy chọn)"
              className={cn(
                "w-full rounded-lg bg-background border border-border/30",
                "px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                "text-foreground placeholder:text-muted-foreground resize-none"
              )}
            />
          </label>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            disabled={submitting}
            onClick={() => onClose?.()}
            className={cn(
              "px-6 py-2.5 rounded-lg font-semibold",
              "bg-muted text-muted-foreground hover:bg-muted/80",
              "border-none transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Cancel
          </button>
          <button
            disabled={submitting}
            onClick={submit}
            className={cn(
              "px-6 py-2.5 rounded-lg font-semibold",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "border-none transition-colors shadow-md",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {submitting ? "Submitting..." : "Send request"}
          </button>
        </div>
      </div>
    </div>
  );
}

RequestBookingModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  performerEntityAccountId: PropTypes.string,
  performerRole: PropTypes.string,
  performerProfile: PropTypes.shape({
    pricePerHours: PropTypes.number,
    pricePerSession: PropTypes.number,
  }),
};


