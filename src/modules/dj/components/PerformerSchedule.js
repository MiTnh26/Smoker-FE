import React, { useState, useEffect, useCallback } from "react";
import { Calendar, MapPin, User, DollarSign, CheckCircle } from "lucide-react";
import bookingApi from "../../../api/bookingApi";
import publicProfileApi from "../../../api/publicProfileApi";
import { cn } from "../../../utils/cn";
import { useNavigate } from "react-router-dom";

export default function PerformerSchedule({ performerEntityAccountId, isOwnProfile = false }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(null); // Filter by date

  // Fetch confirmed bookings
  const fetchBookings = useCallback(async () => {
    if (!performerEntityAccountId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = { limit: 100 };
      if (selectedDate) {
        params.date = selectedDate;
      }
      
      const res = await bookingApi.getDJBookingsByReceiver(performerEntityAccountId, params);
      const bookingsData = res.data?.data || res.data || [];
      
      // Chỉ lấy các booking Confirmed và Completed
      const confirmedBookings = bookingsData.filter(b => {
        const status = b.scheduleStatus || b.ScheduleStatus;
        return status === "Confirmed" || status === "Completed";
      });
      
      // Sắp xếp theo ngày (sắp tới trước, sau đó là quá khứ)
      const sorted = confirmedBookings.sort((a, b) => {
        const dateA = new Date(a.bookingDate || a.BookingDate || 0);
        const dateB = new Date(b.bookingDate || b.BookingDate || 0);
        const now = new Date();
        
        // Nếu cả hai đều trong tương lai hoặc quá khứ, sắp xếp bình thường
        if ((dateA >= now && dateB >= now) || (dateA < now && dateB < now)) {
          return dateA - dateB;
        }
        // Tương lai trước quá khứ
        return dateB - dateA;
      });

      setBookings(sorted);
    } catch (err) {
      console.error("[PerformerSchedule] Error fetching bookings:", err);
      setError("Không thể tải lịch diễn. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }, [performerEntityAccountId, selectedDate]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const isUpcoming = (dateString) => {
    if (!dateString) return false;
    try {
      const date = new Date(dateString);
      return date >= new Date();
    } catch {
      return false;
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      Confirmed: { label: "Đã xác nhận", color: "rgb(var(--success))", bg: "rgba(var(--success), 0.1)" },
      Completed: { label: "Hoàn thành", color: "rgb(var(--primary))", bg: "rgba(var(--primary), 0.1)" },
    };
    return configs[status] || configs.Confirmed;
  };

  // Filter bookings by selected date if any
  const filteredBookings = selectedDate 
    ? bookings.filter(booking => {
        const bookingDate = booking.bookingDate || booking.BookingDate;
        if (!bookingDate) return false;
        const dateKey = new Date(bookingDate).toISOString().split('T')[0];
        return dateKey === selectedDate;
      })
    : bookings;

  // Separate upcoming and past bookings
  const upcomingBookings = filteredBookings.filter(booking => {
    const bookingDate = booking.bookingDate || booking.BookingDate;
    if (!bookingDate) return false;
    return new Date(bookingDate) >= new Date();
  });

  const pastBookings = filteredBookings.filter(booking => {
    const bookingDate = booking.bookingDate || booking.BookingDate;
    if (!bookingDate) return false;
    return new Date(bookingDate) < new Date();
  });

  if (loading) {
    return (
      <div className={cn("flex flex-col gap-4")}>
        <div className={cn("text-center py-12 text-muted-foreground")}>
          Đang tải lịch diễn...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col gap-4")}>
        <div className={cn("text-center py-12 text-danger")}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6")}>
      {/* Filter by date */}
      <div className={cn("flex items-center gap-4")}>
        <label className={cn("text-sm font-medium text-foreground")}>
          Lọc theo ngày:
        </label>
        <input
          type="date"
          value={selectedDate || ""}
          onChange={(e) => setSelectedDate(e.target.value || null)}
          className={cn(
            "px-3 py-2 rounded-lg border border-border/20",
            "bg-card text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/50"
          )}
        />
        {selectedDate && (
          <button
            onClick={() => setSelectedDate(null)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm",
              "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Upcoming Bookings */}
      {upcomingBookings.length > 0 && (
        <div className={cn("flex flex-col gap-4")}>
          <h2 className={cn("text-xl font-bold text-foreground mb-2 flex items-center gap-2")}>
            <Calendar className="w-5 h-5" />
            Sắp tới ({upcomingBookings.length})
          </h2>
          <div className={cn("flex flex-col gap-4")}>
            {upcomingBookings.map(booking => (
              <BookingCard
                key={booking.BookedScheduleId || booking.bookedScheduleId}
                booking={booking}
                isUpcoming={true}
                navigate={navigate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <div className={cn("flex flex-col gap-4")}>
          <h2 className={cn("text-xl font-bold text-foreground mb-2 flex items-center gap-2")}>
            <CheckCircle className="w-5 h-5" />
            Đã hoàn thành ({pastBookings.length})
          </h2>
          <div className={cn("flex flex-col gap-4")}>
            {pastBookings.map(booking => (
              <BookingCard
                key={booking.BookedScheduleId || booking.bookedScheduleId}
                booking={booking}
                isUpcoming={false}
                navigate={navigate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredBookings.length === 0 && (
        <div className={cn(
          "text-center py-12 text-muted-foreground",
          "bg-card rounded-lg border-[0.5px] border-border/20 p-8"
        )}>
          <Calendar className={cn("w-12 h-12 mx-auto mb-4 opacity-50")} />
          <p className={cn("text-lg font-medium mb-2")}>
            Chưa có lịch diễn
          </p>
          <p className={cn("text-sm")}>
            {isOwnProfile 
              ? "Các booking đã được xác nhận sẽ hiển thị ở đây"
              : "Chưa có lịch diễn nào được xác nhận"}
          </p>
        </div>
      )}
    </div>
  );
}

// Booking Card Component
function BookingCard({ booking, isUpcoming, navigate }) {
  const [bookerInfo, setBookerInfo] = useState(null);
  const [loadingBooker, setLoadingBooker] = useState(true);

  useEffect(() => {
    const fetchBookerInfo = async () => {
      const bookerId = booking.BookerId || booking.bookerId;
      if (!bookerId) {
        setLoadingBooker(false);
        return;
      }

      try {
        const res = await publicProfileApi.getByEntityId(bookerId);
        const data = res?.data || {};
        setBookerInfo({
          name: data.name || data.Name || data.userName || data.UserName || "Unknown",
          avatar: data.avatar || data.Avatar || null,
        });
      } catch (error) {
        console.error("[BookingCard] Error fetching booker info:", error);
        setBookerInfo({ name: "Unknown", avatar: null });
      } finally {
        setLoadingBooker(false);
      }
    };

    fetchBookerInfo();
  }, [booking]);

  const status = booking.scheduleStatus || booking.ScheduleStatus;
  const statusConfigs = {
    Confirmed: { label: "Đã xác nhận", color: "rgb(var(--success))", bg: "rgba(var(--success), 0.1)", icon: CheckCircle },
    Completed: { label: "Hoàn thành", color: "rgb(var(--primary))", bg: "rgba(var(--primary), 0.1)", icon: CheckCircle },
  };
  const statusConfig = statusConfigs[status] || statusConfigs.Confirmed;
  const StatusIcon = statusConfig.icon;

  const detailSchedule = booking.detailSchedule || booking.DetailSchedule || {};
  // Lấy địa chỉ từ nhiều nguồn để đảm bảo hiển thị được
  const location = detailSchedule.Location || 
                   detailSchedule.location || 
                   booking.location || 
                   booking.Location ||
                   "Chưa có địa chỉ";
  const note = detailSchedule.Note || detailSchedule.note || booking.note || "";
  const totalAmount = booking.TotalAmount || booking.totalAmount || 0;
  const bookingDate = booking.bookingDate || booking.BookingDate;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className={cn(
      "bg-card rounded-xl border border-border/20 p-6",
      "shadow-sm hover:shadow-md transition-shadow",
      "flex items-center justify-between gap-4"
    )}>
      <div className={cn("flex items-center gap-4 flex-1")}>
        {/* Status Badge */}
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

        <div className={cn("flex items-center gap-6 flex-1 flex-wrap")}>
          {/* Booker Info */}
          <div className={cn("flex items-center gap-3")}>
            {loadingBooker ? (
              <div className={cn("w-10 h-10 rounded-full bg-muted animate-pulse")} />
            ) : (
              <img
                src={bookerInfo?.avatar || "https://via.placeholder.com/40"}
                alt={bookerInfo?.name}
                className={cn("w-10 h-10 rounded-full object-cover border border-border/20")}
              />
            )}
            <div className={cn("flex flex-col")}>
              {loadingBooker ? (
                <>
                  <div className={cn("h-4 w-24 bg-muted rounded animate-pulse mb-1")} />
                  <div className={cn("h-3 w-16 bg-muted rounded animate-pulse")} />
                </>
              ) : (
                <>
                  <p className={cn("font-semibold text-foreground text-sm")}>
                    {bookerInfo?.name}
                  </p>
                  <p className={cn("text-xs text-muted-foreground")}>
                    Khách hàng
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Date */}
          {bookingDate && (
            <div className={cn("flex items-center gap-2 text-sm")}>
              <Calendar className={cn("w-4 h-4 text-muted-foreground")} />
              <span className={cn("text-foreground font-medium")}>
                {formatDate(bookingDate)}
              </span>
            </div>
          )}

          {/* Location */}
          <div className={cn("flex items-center gap-2 text-sm")}>
            <MapPin className={cn("w-4 h-4 text-muted-foreground")} />
            <span className={cn("text-foreground")}>
              {location}
            </span>
          </div>

          {/* Amount */}
          {totalAmount > 0 && (
            <div className={cn("flex items-center gap-2 text-sm")}>
              <DollarSign className={cn("w-4 h-4 text-primary")} />
              <span className={cn("text-foreground font-semibold text-primary")}>
                {parseInt(totalAmount).toLocaleString('vi-VN')} đ
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Note tooltip or expandable */}
      {note && (
        <div className={cn("flex-shrink-0")}>
          <div className={cn(
            "px-3 py-1.5 rounded-lg text-xs",
            "bg-muted text-muted-foreground",
            "max-w-xs truncate",
            "cursor-help"
          )} title={note}>
            {note.length > 30 ? `${note.substring(0, 30)}...` : note}
          </div>
        </div>
      )}
    </div>
  );
}

