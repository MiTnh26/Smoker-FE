import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import bookingApi from "../../api/bookingApi";
import publicProfileApi from "../../api/publicProfileApi";
import { normalizeProfileData } from "../../utils/profileDataMapper";
import { cn } from "../../utils/cn";
import { Calendar, MapPin, DollarSign, X, AlertCircle, Clock } from "lucide-react";
import AddressSelector from "../common/AddressSelector";

export default function RequestBookingModal({ open, onClose, performerEntityAccountId, performerRole = "DJ", performerProfile = null }) {
  const [bookingType, setBookingType] = useState("day"); // "day" hoặc "hour"
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedProvinceId, setSelectedProvinceId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedWardId, setSelectedWardId] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [location, setLocation] = useState(""); // Full address string
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookedDates, setBookedDates] = useState([]); // Danh sách ngày đã được book (cho booking theo ngày)
  const [bookedTimeSlots, setBookedTimeSlots] = useState([]); // Danh sách time slots đã được book (cho booking theo giờ)
  const [loadingBookedDates, setLoadingBookedDates] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profile, setProfile] = useState(performerProfile);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [timeConflict, setTimeConflict] = useState(null); // Thông tin conflict nếu có

  // Cọc cố định 100.000 VND
  const DEPOSIT_AMOUNT = 100000;

  // Fetch profile nếu chưa có
  useEffect(() => {
    if (open && performerEntityAccountId) {
      if (performerProfile) {
        // Nếu có performerProfile từ props, normalize và sử dụng
        const normalized = normalizeProfileData(performerProfile);
        console.log("[RequestBookingModal] Using performerProfile from props:", {
          raw: performerProfile,
          normalized: normalized
        });
        
        // Extract giá từ nhiều nguồn
        const pricePerHours = Number(
          normalized?.pricePerHours || 
          normalized?.PricePerHours || 
          performerProfile?.pricePerHours || 
          performerProfile?.PricePerHours || 
          0
        ) || 0;
        
        const pricePerSession = Number(
          normalized?.pricePerSession || 
          normalized?.PricePerSession || 
          performerProfile?.pricePerSession || 
          performerProfile?.PricePerSession || 
          0
        ) || 0;
        
        console.log("[RequestBookingModal] Setting profile with prices:", {
          pricePerHours,
          pricePerSession
        });
        
        setProfile({
          pricePerHours,
          pricePerSession,
        });
      } else if (!profile) {
        // Chỉ fetch nếu chưa có profile
        fetchPerformerProfile();
      }
    }
  }, [open, performerEntityAccountId, performerProfile]);

  const fetchPerformerProfile = async () => {
    if (!performerEntityAccountId) return;
    setLoadingProfile(true);
    try {
      const res = await publicProfileApi.getByEntityId(performerEntityAccountId);
      console.log("[RequestBookingModal] Raw API Response:", res);
      
      // Axios interceptor trả về res.data, nên cần check res.data.data hoặc res.data
      let rawData = res?.data?.data || res?.data || res || {};
      console.log("[RequestBookingModal] Raw data before normalize:", rawData);
      
      // Sử dụng normalizeProfileData để normalize data như các component khác
      const normalizedData = normalizeProfileData(rawData);
      console.log("[RequestBookingModal] Normalized data:", normalizedData);
      
      // Lấy giá từ normalized data (đã handle nhiều field names)
      const pricePerHours = normalizedData?.pricePerHours || 
                           normalizedData?.PricePerHours || 
                           normalizedData?.pricePerHour || 
                           normalizedData?.PricePerHour || 
                           0;
      const pricePerSession = normalizedData?.pricePerSession || 
                              normalizedData?.PricePerSession || 
                              0;
      
      console.log("[RequestBookingModal] Extracted prices:", {
        pricePerHours,
        pricePerSession,
        normalizedPricePerHours: normalizedData?.pricePerHours,
        normalizedPricePerSession: normalizedData?.pricePerSession,
        rawPricePerHours: rawData.pricePerHours || rawData.PricePerHours,
        rawPricePerSession: rawData.pricePerSession || rawData.PricePerSession
      });
      
      // Convert sang number và set profile
      const profileData = {
        pricePerHours: Number(pricePerHours) || 0,
        pricePerSession: Number(pricePerSession) || 0,
      };
      
      console.log("[RequestBookingModal] Final profile data:", profileData);
      setProfile(profileData);
    } catch (error) {
      console.error("[RequestBookingModal] Error fetching profile:", error);
      console.error("[RequestBookingModal] Error details:", error.response?.data || error.message);
      setProfile(null); // Set null để hiển thị "Chưa có giá"
    } finally {
      setLoadingProfile(false);
    }
  };

  // Tính giá tự động
  const calculatedPrice = useMemo(() => {
    // Nếu chưa load profile, trả về null để hiển thị "Đang tải..."
    if (!profile && loadingProfile) return null;
    if (!profile) return 0;
    
    // Lấy giá từ profile (đã được normalize khi fetch)
    const pricePerHours = profile.pricePerHours || 0;
    const pricePerSession = profile.pricePerSession || 0;
    
    console.log("[RequestBookingModal] Calculating price:", {
      bookingType,
      pricePerHours,
      pricePerSession,
      startTime,
      endTime,
      date
    });
    
    if (bookingType === "day") {
      // Ưu tiên pricePerSession (giá theo buổi/cả ngày)
      if (pricePerSession > 0) {
        console.log("[RequestBookingModal] Using pricePerSession:", pricePerSession);
        return pricePerSession;
      }
      
      // Nếu không có pricePerSession, tính từ pricePerHours * 24 (cả ngày)
      if (pricePerHours > 0) {
        const calculated = pricePerHours * 24;
        console.log("[RequestBookingModal] Using pricePerHours * 24:", calculated);
        return calculated;
      }
    } else if (bookingType === "hour") {
      // Tính theo giờ: cần startTime và endTime
      if (!startTime || !endTime) {
        return null; // Chưa chọn thời gian, chưa thể tính giá
      }
      
      if (pricePerHours <= 0) {
        console.warn("[RequestBookingModal] No pricePerHours available");
        return 0; // Không có giá theo giờ
      }
      
      // Tính số giờ
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      
      // Nếu endTime < startTime, có thể là qua ngày hôm sau
      if (end < start) {
        end.setDate(end.getDate() + 1);
      }
      
      const diffMs = end - start;
      const diffHours = diffMs / (1000 * 60 * 60);
      
      // Làm tròn lên (ví dụ: 2.5 giờ = 3 giờ)
      const hours = Math.ceil(diffHours);
      const calculated = pricePerHours * hours;
      
      console.log("[RequestBookingModal] Calculated hourly price:", {
        hours,
        pricePerHours,
        calculated
      });
      
      return calculated;
    }
    
    console.warn("[RequestBookingModal] No price available");
    return 0;
  }, [profile, bookingType, date, startTime, endTime, loadingProfile]);
  
  // Tính số giờ khi booking theo giờ
  const calculatedHours = useMemo(() => {
    if (bookingType !== "hour" || !startTime || !endTime) return 0;
    
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.ceil(diffHours);
  }, [bookingType, date, startTime, endTime]);
  
  // Fetch booked dates khi modal mở
  useEffect(() => {
    if (open && performerEntityAccountId) {
      fetchBookedDates();
      
      // Khi mở modal, fetch hoặc sử dụng profile từ props
      if (performerProfile) {
        const normalized = normalizeProfileData(performerProfile);
        console.log("[RequestBookingModal] Using performerProfile from props:", {
          raw: performerProfile,
          normalized: normalized
        });
        setProfile({
          pricePerHours: Number(normalized?.pricePerHours || normalized?.PricePerHours || 0) || 0,
          pricePerSession: Number(normalized?.pricePerSession || normalized?.PricePerSession || 0) || 0,
        });
      } else if (!profile) {
        // Chỉ fetch nếu chưa có profile
        fetchPerformerProfile();
      }
    } else {
      // Reset khi đóng modal
      setBookingType("day");
      setDate("");
      setStartTime("");
      setEndTime("");
      setSelectedProvinceId("");
      setSelectedDistrictId("");
      setSelectedWardId("");
      setAddressDetail("");
      setLocation("");
      setNote("");
      setBookedDates([]);
      setBookedTimeSlots([]);
      setTimeConflict(null);
      // Không reset profile vì có thể được truyền từ props
      // setProfile(null);
    }
  }, [open, performerEntityAccountId, performerProfile]);

  // Fetch booked time slots khi chọn date và bookingType === "hour"
  useEffect(() => {
    if (open && performerEntityAccountId && bookingType === "hour" && date) {
      fetchBookedTimeSlots();
    } else {
      setBookedTimeSlots([]);
      setTimeConflict(null);
    }
  }, [open, performerEntityAccountId, bookingType, date]);

  const fetchBookedDates = async () => {
    if (!performerEntityAccountId) return;
    
    setLoadingBookedDates(true);
    try {
      // Lấy bookings của performer (receiver) - dùng API cho DJ/Dancer
      const res = await bookingApi.getDJBookingsByReceiver(performerEntityAccountId, { limit: 1000 });
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

  const fetchBookedTimeSlots = async () => {
    if (!performerEntityAccountId || !date) return;
    
    try {
      // Lấy bookings của performer (tất cả, sau đó filter theo date ở frontend)
      const res = await bookingApi.getDJBookingsByReceiver(performerEntityAccountId, { 
        limit: 1000
      });
      const bookings = res.data?.data || res.data || [];
      
      // Lọc các booking đã confirmed trong ngày này
      const confirmedBookings = bookings.filter(b => {
        const status = b.scheduleStatus || b.ScheduleStatus;
        if (status !== "Confirmed") return false;
        
        // Kiểm tra booking có trong ngày đã chọn không
        // Có thể check qua bookingDate, BookingDate, hoặc StartTime
        const bookingDate = b.bookingDate || b.BookingDate || b.StartTime;
        if (bookingDate) {
          const bookingDateObj = new Date(bookingDate);
          const selectedDateObj = new Date(date);
          // So sánh theo ngày (bỏ qua giờ)
          return bookingDateObj.toISOString().split('T')[0] === selectedDateObj.toISOString().split('T')[0];
        }
        return false;
      });
      
      // Extract time slots từ bookings
      const timeSlots = confirmedBookings.map(booking => {
        const start = booking.startTime || booking.StartTime;
        const end = booking.endTime || booking.EndTime;
        if (!start || !end) return null;
        
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        return {
          startTime: startDate,
          endTime: endDate,
        };
      }).filter(slot => slot !== null && slot.startTime && slot.endTime);
      
      setBookedTimeSlots(timeSlots);
    } catch (error) {
      console.error("[RequestBookingModal] Error fetching booked time slots:", error);
      setBookedTimeSlots([]);
    }
  };

  // Kiểm tra conflict thời gian
  const checkTimeConflict = useMemo(() => {
    if (bookingType !== "hour" || !startTime || !endTime || !date || bookedTimeSlots.length === 0) {
      return null;
    }
    
    const newStart = new Date(`${date}T${startTime}`);
    const newEnd = new Date(`${date}T${endTime}`);
    
    // Nếu endTime < startTime, có thể là qua ngày hôm sau
    if (newEnd < newStart) {
      newEnd.setDate(newEnd.getDate() + 1);
    }
    
    // Kiểm tra overlap với các time slots đã book
    for (const slot of bookedTimeSlots) {
      const existingStart = new Date(slot.startTime);
      const existingEnd = new Date(slot.endTime);
      
      // Overlap xảy ra khi: (newStart < existingEnd && newEnd > existingStart)
      if (newStart < existingEnd && newEnd > existingStart) {
        // Format thời gian để hiển thị
        const formatTime = (date) => {
          return date.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          });
        };
        
        return {
          conflict: true,
          message: `Thời gian này đã được đặt (${formatTime(existingStart)} - ${formatTime(existingEnd)})`,
          existingStart: formatTime(existingStart),
          existingEnd: formatTime(existingEnd),
        };
      }
    }
    
    return null;
  }, [bookingType, date, startTime, endTime, bookedTimeSlots]);

  // Update timeConflict khi checkTimeConflict thay đổi
  useEffect(() => {
    setTimeConflict(checkTimeConflict);
  }, [checkTimeConflict]);

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

    if (bookingType === "hour") {
      if (!startTime) {
        setError("Vui lòng chọn giờ bắt đầu");
        return;
      }
      if (!endTime) {
        setError("Vui lòng chọn giờ kết thúc");
        return;
      }
      
      // Kiểm tra endTime phải sau startTime
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      
      // Nếu endTime < startTime, có thể là qua ngày hôm sau (cho phép)
      // Nhưng nếu endTime === startTime thì không hợp lệ
      if (end <= start && endTime === startTime) {
        setError("Giờ kết thúc phải sau giờ bắt đầu");
        return;
      }
      
      // Kiểm tra số giờ tối thiểu (ít nhất 1 giờ)
      const diffMs = end < start ? (end.getTime() + 24 * 60 * 60 * 1000) - start.getTime() : end.getTime() - start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < 1) {
        setError("Thời gian booking phải ít nhất 1 giờ");
        return;
      }
      
      // Kiểm tra conflict thời gian
      if (timeConflict && timeConflict.conflict) {
        setError(timeConflict.message);
        return;
      }
    }

    if (!selectedProvinceId || !selectedDistrictId || !selectedWardId) {
      setError("Vui lòng chọn đầy đủ Tỉnh/Thành phố, Huyện/Quận và Xã/Phường");
      return;
    }

    if (!addressDetail.trim()) {
      setError("Vui lòng nhập địa chỉ chi tiết (số nhà, tên đường, ...)");
      return;
    }

    // Log để debug
    console.log("[RequestBookingModal] Submit validation:", {
      bookingType,
      profile,
      calculatedPrice,
      startTime,
      endTime,
      date,
      loadingProfile
    });

    // Kiểm tra giá - chỉ block nếu đang load hoặc chưa chọn đủ thông tin
    if (calculatedPrice === null) {
      // Đang load hoặc chưa chọn đủ thông tin
      if (bookingType === "hour" && (!startTime || !endTime)) {
        setError("Vui lòng chọn giờ bắt đầu và kết thúc để tính giá");
        return;
      }
      if (loadingProfile) {
        setError("Đang tải thông tin giá, vui lòng đợi...");
        return;
      }
    }

    // Cho phép booking ngay cả khi giá = 0 (performer có thể đã set giá nhưng = 0)
    // Không block submit

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
      
      // Tính startTime và endTime
      let finalStartTime, finalEndTime;
      
      if (bookingType === "day") {
        // Cả ngày: từ 00:00:00 đến 23:59:59
        const selectedDate = new Date(date);
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        finalStartTime = startOfDay.toISOString();
        finalEndTime = endOfDay.toISOString();
      } else {
        // Theo giờ: sử dụng startTime và endTime đã chọn
        const start = new Date(`${date}T${startTime}`);
        const end = new Date(`${date}T${endTime}`);
        // Nếu endTime < startTime, có thể là qua ngày hôm sau
        if (end < start) {
          end.setDate(end.getDate() + 1);
        }
        finalStartTime = start.toISOString();
        finalEndTime = end.toISOString();
      }

      // Sử dụng endpoint /booking/request hoặc tạo booking trực tiếp
      const payload = {
        requesterEntityAccountId,
        requesterRole: "Customer", // Hoặc "Bar" nếu là bar đặt
        performerEntityAccountId,
        performerRole,
        date,
        startTime: finalStartTime,
        endTime: finalEndTime,
        location: location.trim(),
        note: note.trim(),
        offeredPrice: calculatedPrice, // Tự động tính từ profile
      };

      // Thử gọi API tạo booking request
      try {
        const bookingResponse = await bookingApi.createRequest(payload);
        const bookingId = bookingResponse?.data?.data?.BookedScheduleId || bookingResponse?.data?.BookedScheduleId;
        
        if (!bookingId) {
          throw new Error("Không nhận được booking ID từ server");
        }

        // Luôn yêu cầu thanh toán cọc 100.000 VND
        try {
          const paymentResponse = await bookingApi.createPayment(bookingId, DEPOSIT_AMOUNT);
          const paymentUrl = paymentResponse?.data?.data?.paymentUrl || paymentResponse?.data?.paymentUrl;
          
          if (paymentUrl) {
            // Redirect đến PayOS payment page
            window.location.href = paymentUrl;
            return; // Không đóng modal ngay, đợi redirect
          } else {
            throw new Error("Không nhận được payment URL từ server");
          }
        } catch (paymentError) {
          console.error("[RequestBookingModal] Payment API error:", paymentError);
          const paymentErrorMessage = paymentError.response?.data?.message || 
                                    paymentError.message || 
                                    "Không thể tạo payment link. Vui lòng thử lại.";
          setError(paymentErrorMessage);
          return;
        }
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
        "flex flex-col max-h-[90vh] relative"
      )}>
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border/20 flex-shrink-0">
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
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
          {/* Booking Type Selection */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar size={16} />
              Loại booking
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setBookingType("day");
                  setStartTime("");
                  setEndTime("");
                }}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-lg font-semibold transition-colors",
                  bookingType === "day"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Theo ngày
              </button>
              <button
                type="button"
                onClick={() => setBookingType("hour")}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-lg font-semibold transition-colors",
                  bookingType === "hour"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Theo giờ
              </button>
            </div>
          </div>

          {/* Date */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar size={16} />
              Ngày
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

          {/* Time Selection (chỉ hiện khi chọn "theo giờ") */}
          {bookingType === "hour" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Clock size={16} />
                    Giờ bắt đầu
                  </span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setTimeConflict(null); // Reset conflict khi thay đổi
                    }}
                    className={cn(
                      "w-full rounded-lg bg-background border border-border/30",
                      "px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                      "text-foreground",
                      timeConflict && timeConflict.conflict && "border-danger bg-danger/10"
                    )}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Clock size={16} />
                    Giờ kết thúc
                  </span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setTimeConflict(null); // Reset conflict khi thay đổi
                    }}
                    min={startTime || undefined}
                    className={cn(
                      "w-full rounded-lg bg-background border border-border/30",
                      "px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                      "text-foreground",
                      timeConflict && timeConflict.conflict && "border-danger bg-danger/10"
                    )}
                  />
                </label>
              </div>
              
              {/* Hiển thị conflict warning */}
              {timeConflict && timeConflict.conflict && (
                <div className={cn(
                  "p-3 rounded-lg bg-danger/10 border border-danger/30",
                  "flex items-center gap-2 text-danger text-sm"
                )}>
                  <AlertCircle size={16} />
                  <span>{timeConflict.message}</span>
                </div>
              )}
              
              {/* Hiển thị danh sách time slots đã book trong ngày */}
              {bookedTimeSlots.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
                  <div className="text-xs font-semibold text-foreground mb-2">
                    Thời gian đã được đặt trong ngày này:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bookedTimeSlots.map((slot, index) => {
                      const formatTime = (date) => {
                        return new Date(date).toLocaleTimeString('vi-VN', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false 
                        });
                      };
                      return (
                        <span
                          key={index}
                          className="px-2 py-1 rounded bg-danger/20 text-danger text-xs font-medium"
                        >
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Address Selector */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin size={16} />
              Địa chỉ
            </span>
            <AddressSelector
              selectedProvinceId={selectedProvinceId}
              selectedDistrictId={selectedDistrictId}
              selectedWardId={selectedWardId}
              addressDetail={addressDetail}
              onProvinceChange={(id) => {
                setSelectedProvinceId(id);
                setSelectedDistrictId(""); // Reset district khi đổi province
                setSelectedWardId(""); // Reset ward khi đổi province
              }}
              onDistrictChange={(id) => {
                setSelectedDistrictId(id);
                setSelectedWardId(""); // Reset ward khi đổi district
              }}
              onWardChange={setSelectedWardId}
              onAddressDetailChange={setAddressDetail}
              onAddressChange={setLocation} // Update full address string
              disabled={success}
            />
          </div>

          {/* Deposit Amount (Cọc cố định) */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarSign size={16} />
              Số tiền cọc (bắt buộc)
            </span>
            <div className={cn(
              "w-full rounded-lg bg-muted/50 border border-border/30",
              "px-4 py-2.5",
              "text-foreground font-semibold"
            )}>
              <span>{DEPOSIT_AMOUNT.toLocaleString('vi-VN')} đ</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Số tiền cọc cố định 100.000 VND. Số tiền còn lại sẽ được thanh toán sau khi hoàn thành dịch vụ.
            </p>
            {calculatedPrice !== null && calculatedPrice > 0 && (
              <p className="text-xs text-muted-foreground">
                Tổng giá booking: {calculatedPrice.toLocaleString('vi-VN')} đ
                {calculatedPrice > DEPOSIT_AMOUNT && (
                  <span className="ml-2">
                    (Còn lại: {(calculatedPrice - DEPOSIT_AMOUNT).toLocaleString('vi-VN')} đ)
                  </span>
                )}
              </p>
            )}
            {profile && calculatedPrice !== null && (
              <p className="text-xs text-muted-foreground">
                {bookingType === "day" ? (
                  profile.pricePerSession && Number(profile.pricePerSession) > 0
                    ? `Giá theo buổi: ${Number(profile.pricePerSession).toLocaleString('vi-VN')} đ`
                    : profile.pricePerHours && Number(profile.pricePerHours) > 0
                    ? `Giá theo giờ: ${Number(profile.pricePerHours).toLocaleString('vi-VN')} đ/giờ × 24 giờ = ${calculatedPrice.toLocaleString('vi-VN')} đ`
                    : "Performer chưa thiết lập giá. Có thể thỏa thuận sau khi booking được xác nhận."
                ) : (
                  bookingType === "hour" && calculatedHours > 0 && profile.pricePerHours && Number(profile.pricePerHours) > 0 ? (
                    `Giá theo giờ: ${Number(profile.pricePerHours).toLocaleString('vi-VN')} đ/giờ × ${calculatedHours} giờ = ${calculatedPrice.toLocaleString('vi-VN')} đ`
                  ) : "Performer chưa thiết lập giá. Có thể thỏa thuận sau khi booking được xác nhận."
                )}
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
        </div>

        {/* Actions - Fixed */}
        <div className="p-6 pt-4 border-t border-border/20 flex justify-end gap-3 flex-shrink-0">
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
            {submitting ? "Đang xử lý..." : "Đặt cọc lịch diễn"}
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


