import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import bookingApi from "../../api/bookingApi";
import publicProfileApi from "../../api/publicProfileApi";
import { normalizeProfileData } from "../../utils/profileDataMapper";
import { cn } from "../../utils/cn";
import { Calendar, MapPin, DollarSign, X, AlertCircle } from "lucide-react";
import AddressSelector from "../common/AddressSelector";

export default function RequestBookingModal({ open, onClose, performerEntityAccountId, performerRole = "DJ", performerProfile = null }) {
  const [date, setDate] = useState("");
  const [selectedProvinceId, setSelectedProvinceId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedWardId, setSelectedWardId] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [location, setLocation] = useState(""); // Full address string
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookedDates, setBookedDates] = useState([]); // Danh sách ngày đã được book
  const [loadingBookedDates, setLoadingBookedDates] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profile, setProfile] = useState(performerProfile);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  // Validation errors cho từng field
  const [fieldErrors, setFieldErrors] = useState({
    date: "",
    province: "",
    district: "",
    ward: "",
    addressDetail: ""
  });

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

  // Tính giá tự động (chỉ theo ngày)
  const calculatedPrice = useMemo(() => {
    // Nếu chưa load profile, trả về null để hiển thị "Đang tải..."
    if (!profile && loadingProfile) return null;
    if (!profile) return 0;
    
    // Lấy giá từ profile (đã được normalize khi fetch)
    const pricePerHours = profile.pricePerHours || 0;
    const pricePerSession = profile.pricePerSession || 0;
    
    console.log("[RequestBookingModal] Calculating price:", {
      pricePerHours,
      pricePerSession,
      date
    });
    
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
    
    console.warn("[RequestBookingModal] No price available");
    return 0;
  }, [profile, date, loadingProfile]);
  
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
      setDate("");
      setSelectedProvinceId("");
      setSelectedDistrictId("");
      setSelectedWardId("");
      setAddressDetail("");
      setLocation("");
      setNote("");
      setBookedDates([]);
      setFieldErrors({
        date: "",
        province: "",
        district: "",
        ward: "",
        addressDetail: ""
      });
      // Không reset profile vì có thể được truyền từ props
      // setProfile(null);
    }
  }, [open, performerEntityAccountId, performerProfile]);

  const fetchBookedDates = async () => {
    if (!performerEntityAccountId) return;
    
    setLoadingBookedDates(true);
    try {
      // Lấy bookings của performer (receiver) - dùng API cho DJ/Dancer
      const res = await bookingApi.getDJBookingsByReceiver(performerEntityAccountId, { limit: 1000 });
      const bookings = res.data?.data || res.data || [];
      
      // Lọc các booking đã confirmed HOẶC pending nhưng đã thanh toán cọc (Paid)
      // Khi PaymentStatus = Paid và ScheduleStatus = Pending, ngày đó cũng bị block
      const blockedBookings = bookings.filter(b => {
        const scheduleStatus = b.scheduleStatus || b.ScheduleStatus;
        const paymentStatus = b.paymentStatus || b.PaymentStatus;
        
        // Block nếu đã confirmed
        if (scheduleStatus === "Confirmed") {
          return true;
        }
        
        // Block nếu pending nhưng đã thanh toán cọc (Paid)
        if (scheduleStatus === "Pending" && paymentStatus === "Paid") {
          return true;
        }
        
        return false;
      });
      
      // Extract dates từ bookings
      const dates = blockedBookings.map(booking => {
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

  // Validate từng field
  const validateField = (fieldName, value) => {
    const newErrors = { ...fieldErrors };
    
    switch (fieldName) {
      case "date":
        if (!value) {
          newErrors.date = "Vui lòng chọn ngày";
        } else if (isDateBooked(value)) {
          newErrors.date = "Ngày này đã được đặt. Vui lòng chọn ngày khác.";
        } else {
          newErrors.date = "";
        }
        break;
      case "province":
        newErrors.province = !value ? "Vui lòng chọn Tỉnh/Thành phố" : "";
        break;
      case "district":
        newErrors.district = !value ? "Vui lòng chọn Huyện/Quận" : "";
        break;
      case "ward":
        newErrors.ward = !value ? "Vui lòng chọn Xã/Phường" : "";
        break;
      case "addressDetail":
        newErrors.addressDetail = !value?.trim() ? "Vui lòng nhập địa chỉ chi tiết (số nhà, tên đường, ...)" : "";
        break;
    }
    
    setFieldErrors(newErrors);
    return !newErrors[fieldName];
  };
  
  // Validate tất cả các field bắt buộc
  const validateAllFields = () => {
    const dateValid = validateField("date", date);
    const provinceValid = validateField("province", selectedProvinceId);
    const districtValid = validateField("district", selectedDistrictId);
    const wardValid = validateField("ward", selectedWardId);
    const addressDetailValid = validateField("addressDetail", addressDetail);
    
    return dateValid && provinceValid && districtValid && wardValid && addressDetailValid;
  };

  const isDateBooked = (dateString) => {
    return bookedDates.includes(dateString);
  };

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    setDate(selectedDate);
    validateField("date", selectedDate);
  };
  
  if (!open) return null;

  const submit = async () => {
    setError("");
    
    // Validate tất cả các field bắt buộc
    if (!validateAllFields()) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    // Kiểm tra giá - chỉ block nếu đang load
    if (loadingProfile) {
      setError("Đang tải thông tin giá, vui lòng đợi...");
      return;
    }

    // Cho phép booking ngay cả khi giá = 0 (performer có thể đã set giá nhưng = 0)

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
      
      // Tính startTime và endTime (cả ngày: từ 00:00:00 đến 23:59:59)
      const selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      const finalStartTime = startOfDay.toISOString();
      const finalEndTime = endOfDay.toISOString();

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
          {/* Date */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar size={16} />
              Ngày <span className="text-danger">*</span>
            </span>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={handleDateChange}
                onBlur={() => validateField("date", date)}
                min={new Date().toISOString().split('T')[0]} // Không cho chọn ngày quá khứ
                className={cn(
                  "w-full rounded-lg bg-background border",
                  "px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20",
                  "text-foreground",
                  fieldErrors.date || isDateBooked(date)
                    ? "border-danger bg-danger/10 focus:border-danger"
                    : "border-border/30 focus:border-primary"
                )}
                disabled={loadingBookedDates}
              />
              {fieldErrors.date && (
                <div className="mt-1 flex items-center gap-2 text-sm text-danger">
                  <AlertCircle size={14} />
                  <span>{fieldErrors.date}</span>
                </div>
              )}
              {!fieldErrors.date && isDateBooked(date) && (
                <div className="mt-1 flex items-center gap-2 text-sm text-danger">
                  <AlertCircle size={14} />
                  <span>Ngày này đã được đặt</span>
                </div>
              )}
              {loadingBookedDates && (
                <div className="mt-1 text-sm text-muted-foreground">
                  Đang tải danh sách ngày đã đặt...
                </div>
              )}
            </div>
          </label>

          {/* Address Selector */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin size={16} />
              Địa chỉ <span className="text-danger">*</span>
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
                validateField("province", id);
              }}
              onDistrictChange={(id) => {
                setSelectedDistrictId(id);
                setSelectedWardId(""); // Reset ward khi đổi district
                validateField("district", id);
              }}
              onWardChange={(id) => {
                setSelectedWardId(id);
                validateField("ward", id);
              }}
              onAddressDetailChange={(value) => {
                setAddressDetail(value);
                validateField("addressDetail", value);
              }}
              onAddressChange={setLocation} // Update full address string
              disabled={success}
            />
            {/* Hiển thị lỗi cho từng phần của địa chỉ */}
            {fieldErrors.province && (
              <div className="flex items-center gap-2 text-sm text-danger mt-1">
                <AlertCircle size={14} />
                <span>{fieldErrors.province}</span>
              </div>
            )}
            {fieldErrors.district && (
              <div className="flex items-center gap-2 text-sm text-danger mt-1">
                <AlertCircle size={14} />
                <span>{fieldErrors.district}</span>
              </div>
            )}
            {fieldErrors.ward && (
              <div className="flex items-center gap-2 text-sm text-danger mt-1">
                <AlertCircle size={14} />
                <span>{fieldErrors.ward}</span>
              </div>
            )}
            {fieldErrors.addressDetail && (
              <div className="flex items-center gap-2 text-sm text-danger mt-1">
                <AlertCircle size={14} />
                <span>{fieldErrors.addressDetail}</span>
              </div>
            )}
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
                {profile.pricePerSession && Number(profile.pricePerSession) > 0
                  ? `Giá theo buổi: ${Number(profile.pricePerSession).toLocaleString('vi-VN')} đ`
                  : profile.pricePerHours && Number(profile.pricePerHours) > 0
                  ? `Giá theo giờ: ${Number(profile.pricePerHours).toLocaleString('vi-VN')} đ/giờ × 24 giờ = ${calculatedPrice.toLocaleString('vi-VN')} đ`
                  : "Performer chưa thiết lập giá. Có thể thỏa thuận sau khi booking được xác nhận."}
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


