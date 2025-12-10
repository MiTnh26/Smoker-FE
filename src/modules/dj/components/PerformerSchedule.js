import React, { useState, useEffect, useCallback } from "react";
import { Calendar, MapPin, User, DollarSign, CheckCircle, Clock, ChevronRight, X, Info } from "lucide-react";
import bookingApi from "../../../api/bookingApi";
import publicProfileApi from "../../../api/publicProfileApi";
import { cn } from "../../../utils/cn";
import { useNavigate } from "react-router-dom";

// Slot configuration (giống với RequestBookingModal)
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

export default function PerformerSchedule({ performerEntityAccountId, isOwnProfile = false }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Mặc định hiển thị lịch diễn của ngày hôm nay
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }); // Filter by date
  const [showAllSchedules, setShowAllSchedules] = useState(false); // Toggle để xem tất cả lịch diễn

  // Fetch confirmed bookings - luôn fetch tất cả để có thể tính toán số lịch diễn khác
  const fetchBookings = useCallback(async () => {
    if (!performerEntityAccountId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Luôn fetch tất cả bookings để có thể tính toán số lịch diễn khác
      const params = { limit: 100 };
      
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
  }, [performerEntityAccountId]);

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
  const filteredBookings = showAllSchedules && selectedDate
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

  // Lấy ngày hôm nay để so sánh
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(booking => {
    const bookingDate = booking.bookingDate || booking.BookingDate;
    if (!bookingDate) return false;
    const dateKey = new Date(bookingDate).toISOString().split('T')[0];
    return dateKey === today;
  });
  const otherBookings = bookings.filter(booking => {
    const bookingDate = booking.bookingDate || booking.BookingDate;
    if (!bookingDate) return false;
    const dateKey = new Date(bookingDate).toISOString().split('T')[0];
    return dateKey !== today;
  });

  return (
    <div className={cn("flex flex-col gap-6")}>
      {/* Header với nút xem lịch diễn khác */}
      <div className={cn("flex items-center justify-between")}>
        <div className={cn("flex items-center gap-3")}>
          <h2 className={cn("text-xl font-bold text-foreground")}>
            Lịch diễn {!showAllSchedules ? "hôm nay" : ""}
          </h2>
          {!showAllSchedules && otherBookings.length > 0 && (
            <span className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              "bg-primary/10 text-primary"
            )}>
              {otherBookings.length} lịch diễn khác
            </span>
          )}
        </div>
        {!showAllSchedules && otherBookings.length > 0 && (
          <button
            onClick={() => {
              setShowAllSchedules(true);
              setSelectedDate(null); // Reset date filter khi chuyển sang xem tất cả
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "shadow-sm hover:shadow-md"
            )}
          >
            Xem những lịch diễn khác
            <ChevronRight size={16} />
          </button>
        )}
        {showAllSchedules && (
          <button
            onClick={() => {
              setShowAllSchedules(false);
              const today = new Date();
              setSelectedDate(today.toISOString().split('T')[0]);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
              "bg-muted text-muted-foreground hover:bg-muted/80",
              "transition-colors"
            )}
          >
            <ChevronRight size={16} className="rotate-180" />
            Về lịch diễn hôm nay
          </button>
        )}
      </div>

      {/* Filter by date - chỉ hiển thị khi showAllSchedules */}
      {showAllSchedules && (
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
      )}

      {/* Hiển thị lịch diễn hôm nay hoặc tất cả */}
      {!showAllSchedules ? (
        <>
          {/* Lịch diễn hôm nay */}
          {todayBookings.length > 0 ? (
            <div className={cn("flex flex-col gap-3")}>
              {upcomingBookings.filter(b => {
                const bookingDate = b.bookingDate || b.BookingDate;
                if (!bookingDate) return false;
                const dateKey = new Date(bookingDate).toISOString().split('T')[0];
                return dateKey === today;
              }).length > 0 && (
                <div className={cn("flex flex-col gap-2")}>
                  <h3 className={cn("text-base font-semibold text-foreground mb-1 flex items-center gap-2")}>
                    <Calendar className="w-4 h-4" />
                    Sắp tới
                  </h3>
                  <div className={cn("flex flex-col gap-2")}>
                    {upcomingBookings
                      .filter(b => {
                        const bookingDate = b.bookingDate || b.BookingDate;
                        if (!bookingDate) return false;
                        const dateKey = new Date(bookingDate).toISOString().split('T')[0];
                        return dateKey === today;
                      })
                      .map(booking => (
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
              {pastBookings.filter(b => {
                const bookingDate = b.bookingDate || b.BookingDate;
                if (!bookingDate) return false;
                const dateKey = new Date(bookingDate).toISOString().split('T')[0];
                return dateKey === today;
              }).length > 0 && (
                <div className={cn("flex flex-col gap-2")}>
                  <h3 className={cn("text-base font-semibold text-foreground mb-1 flex items-center gap-2")}>
                    <CheckCircle className="w-4 h-4" />
                    Đã hoàn thành
                  </h3>
                  <div className={cn("flex flex-col gap-2")}>
                    {pastBookings
                      .filter(b => {
                        const bookingDate = b.bookingDate || b.BookingDate;
                        if (!bookingDate) return false;
                        const dateKey = new Date(bookingDate).toISOString().split('T')[0];
                        return dateKey === today;
                      })
                      .map(booking => (
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
            </div>
          ) : (
            <div className={cn(
              "text-center py-12 text-muted-foreground",
              "bg-card rounded-lg border-[0.5px] border-border/20 p-8"
            )}>
              <Calendar className={cn("w-12 h-12 mx-auto mb-4 opacity-50")} />
              <p className={cn("text-lg font-medium mb-2")}>
                Không có lịch diễn hôm nay
              </p>
              <p className={cn("text-sm")}>
                {isOwnProfile 
                  ? "Các booking đã được xác nhận sẽ hiển thị ở đây"
                  : "Chưa có lịch diễn nào được xác nhận cho hôm nay"}
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Tất cả lịch diễn */}
          {upcomingBookings.length > 0 && (
            <div className={cn("flex flex-col gap-3")}>
              <h2 className={cn("text-lg font-bold text-foreground mb-1 flex items-center gap-2")}>
                <Calendar className="w-4 h-4" />
                Sắp tới ({upcomingBookings.length})
              </h2>
              <div className={cn("flex flex-col gap-2")}>
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
            <div className={cn("flex flex-col gap-3")}>
              <h2 className={cn("text-lg font-bold text-foreground mb-1 flex items-center gap-2")}>
                <CheckCircle className="w-4 h-4" />
                Đã hoàn thành ({pastBookings.length})
              </h2>
              <div className={cn("flex flex-col gap-2")}>
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
        </>
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

// Booking Card Component - Compact version
function BookingCard({ booking, isUpcoming, navigate }) {
  const [bookerInfo, setBookerInfo] = useState(null);
  const [loadingBooker, setLoadingBooker] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

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
  
  // Lấy slots đã đặt
  const bookedSlots = detailSchedule.Slots || detailSchedule.slots || [];
  const slotInfo = bookedSlots
    .map(slotId => SLOTS.find(s => s.id === slotId))
    .filter(Boolean)
    .sort((a, b) => a.id - b.id);

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
    <>
      {/* Compact Card */}
      <div className={cn(
        "bg-card rounded-lg border border-border/20 p-3",
        "shadow-sm hover:shadow-md transition-shadow",
        "flex items-center justify-between gap-3"
      )}>
        <div className={cn("flex items-center gap-3 flex-1 min-w-0")}>
          {/* Status Badge */}
          <span
            className={cn("px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 flex-shrink-0")}
            style={{
              color: statusConfig.color,
              backgroundColor: statusConfig.bg,
            }}
          >
            <StatusIcon size={12} />
            {statusConfig.label}
          </span>

          {/* Booker Info - Compact */}
          <div className={cn("flex items-center gap-2 min-w-0 flex-1")}>
            {loadingBooker ? (
              <div className={cn("w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0")} />
            ) : (
              <img
                src={bookerInfo?.avatar || "https://via.placeholder.com/32"}
                alt={bookerInfo?.name}
                className={cn("w-8 h-8 rounded-full object-cover border border-border/20 flex-shrink-0")}
              />
            )}
            <div className={cn("flex flex-col min-w-0")}>
              {loadingBooker ? (
                <div className={cn("h-3 w-20 bg-muted rounded animate-pulse")} />
              ) : (
                <p className={cn("font-medium text-foreground text-sm truncate")}>
                  {bookerInfo?.name || "Đang tải..."}
                </p>
              )}
            </div>
          </div>

          {/* Date - Compact */}
          {bookingDate && (
            <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0")}>
              <Calendar className={cn("w-3.5 h-3.5")} />
              <span>{formatDate(bookingDate)}</span>
            </div>
          )}
        </div>

        {/* Chi tiết Button */}
        <button
          onClick={() => setShowDetails(true)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium",
            "bg-primary/10 text-primary hover:bg-primary/20",
            "transition-colors flex items-center gap-1.5 flex-shrink-0"
          )}
        >
          <Info size={14} />
          Chi tiết
        </button>
      </div>

      {/* Details Modal */}
      {showDetails && (
        <div
          className={cn(
            "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4",
            "overflow-y-auto"
          )}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetails(false);
            }
          }}
        >
          <div
            className={cn(
              "w-full max-w-2xl bg-card text-card-foreground rounded-lg",
              "border border-border/20 shadow-lg",
              "p-5 relative max-h-[90vh] overflow-y-auto"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn("text-lg font-bold text-foreground")}>
                Chi tiết lịch diễn
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className={cn(
                  "p-1.5 rounded-lg",
                  "text-muted-foreground hover:text-foreground",
                  "hover:bg-muted transition-colors"
                )}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className={cn("flex flex-col gap-4")}>
              {/* Status */}
              <div className={cn("flex items-center gap-2")}>
                <span className={cn("text-sm font-medium text-muted-foreground")}>
                  Trạng thái:
                </span>
                <span
                  className={cn("px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1")}
                  style={{
                    color: statusConfig.color,
                    backgroundColor: statusConfig.bg,
                  }}
                >
                  <StatusIcon size={12} />
                  {statusConfig.label}
                </span>
              </div>

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
                        {bookerInfo?.name || "Unknown"}
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
                <div className={cn("flex items-center gap-2")}>
                  <Calendar className={cn("w-4 h-4 text-muted-foreground")} />
                  <span className={cn("text-foreground text-sm")}>
                    {formatDate(bookingDate)}
                  </span>
                </div>
              )}

              {/* Slots */}
              {slotInfo.length > 0 && (
                <div className={cn("flex flex-col gap-2")}>
                  <div className={cn("flex items-center gap-2")}>
                    <Clock className={cn("w-4 h-4 text-muted-foreground")} />
                    <span className={cn("text-sm font-medium text-foreground")}>
                      Các slot đã đặt:
                    </span>
                  </div>
                  <div className={cn("flex items-center gap-1.5 flex-wrap")}>
                    {slotInfo.map((slot) => (
                      <span
                        key={slot.id}
                        className={cn(
                          "px-2 py-1 rounded-md text-xs font-medium",
                          "bg-primary/10 text-primary",
                          "border border-primary/20"
                        )}
                      >
                        {slot.label} ({slot.timeRange})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Location */}
              <div className={cn("flex items-start gap-2")}>
                <MapPin className={cn("w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0")} />
                <div className={cn("flex flex-col")}>
                  <span className={cn("text-sm font-medium text-foreground mb-1")}>
                    Địa chỉ:
                  </span>
                  <span className={cn("text-sm text-foreground")}>
                    {location}
                  </span>
                </div>
              </div>

              {/* Amount */}
              {totalAmount > 0 && (
                <div className={cn("flex items-center gap-2")}>
                  <DollarSign className={cn("w-4 h-4 text-primary")} />
                  <div className={cn("flex flex-col")}>
                    <span className={cn("text-sm font-medium text-foreground mb-1")}>
                      Tổng tiền:
                    </span>
                    <span className={cn("text-sm font-semibold text-primary")}>
                      {parseInt(totalAmount).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              )}

              {/* Note */}
              {note && (
                <div className={cn("flex flex-col gap-2")}>
                  <span className={cn("text-sm font-medium text-foreground")}>
                    Ghi chú:
                  </span>
                  <div className={cn(
                    "px-3 py-2 rounded-lg text-sm",
                    "bg-muted/50 text-foreground",
                    "border border-border/20"
                  )}>
                    {note}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

