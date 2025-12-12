import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import bookingApi from "../../api/bookingApi";
import publicProfileApi from "../../api/publicProfileApi";
import { normalizeProfileData } from "../../utils/profileDataMapper";
import { cn } from "../../utils/cn";
import { Calendar, MapPin, DollarSign, X, AlertCircle, Clock, CheckCircle, Phone } from "lucide-react";
import AddressSelector from "../common/AddressSelector";

// Constants
const TOTAL_SLOTS = 12; // 1 ngày = 12 slot
const SLOT_DURATION = 2; // Mỗi slot = 2 giờ
const SLOTS_PER_SESSION = 3; // 3 slot = 1 buổi (có thể config 3 hoặc 4)
const DEPOSIT_AMOUNT = 50000; // Cọc cố định 50.000 VND

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
      startHour,
      endHour
    });
  }
  return slots;
};

const SLOTS = generateSlots();

export default function RequestBookingModal({ open, onClose, performerEntityAccountId, performerRole = "DJ", performerProfile = null }) {
  const [date, setDate] = useState("");
  const [selectedSlots, setSelectedSlots] = useState([]); // Array of slot IDs [1, 2, 3]
  const [selectedProvinceId, setSelectedProvinceId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedWardId, setSelectedWardId] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [location, setLocation] = useState(""); // Full address string
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookedSlots, setBookedSlots] = useState({}); // { "2024-01-01": [1, 2, 3] } - slots đã được book theo ngày
  const [loadingBookedSlots, setLoadingBookedSlots] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profile, setProfile] = useState(performerProfile);
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasRiskWarning, setHasRiskWarning] = useState(false); // Cảnh báo nếu slot trước đã confirm
  
  // Validation errors cho từng field
  const [fieldErrors, setFieldErrors] = useState({
    date: "",
    slots: "",
    province: "",
    district: "",
    ward: "",
    addressDetail: "",
    phone: ""
  });

  // Fetch profile nếu chưa có
  useEffect(() => {
    if (open && performerEntityAccountId) {
      if (performerProfile) {
        const normalized = normalizeProfileData(performerProfile);
        const pricePerSlot = Number(
          normalized?.pricePerHours || 
          normalized?.PricePerHours || 
          performerProfile?.pricePerHours || 
          performerProfile?.PricePerHours || 
          0
        ) || 0;
        
        setProfile({
          pricePerSlot, // Giá slot lẻ
        });
      } else if (!profile) {
        fetchPerformerProfile();
      }
    }
  }, [open, performerEntityAccountId, performerProfile]);

  const fetchPerformerProfile = async () => {
    if (!performerEntityAccountId) return;
    setLoadingProfile(true);
    try {
      const res = await publicProfileApi.getByEntityId(performerEntityAccountId);
      let rawData = res?.data?.data || res?.data || res || {};
      const normalizedData = normalizeProfileData(rawData);
      
      const pricePerSlot = normalizedData?.pricePerHours || 
                           normalizedData?.PricePerHours || 
                           normalizedData?.pricePerHour || 
                           normalizedData?.PricePerHour || 
                           0;
      
      setProfile({
        pricePerSlot: Number(pricePerSlot) || 0,
      });
    } catch (error) {
      console.error("[RequestBookingModal] Error fetching profile:", error);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Phân nhóm slot: tìm các nhóm slot liền nhau >= 4
  const slotGroups = useMemo(() => {
    if (selectedSlots.length === 0) return { consecutiveGroups: [], individualSlots: [] };
    
    const sortedSlots = [...selectedSlots].sort((a, b) => a - b);
    const consecutiveGroups = []; // Các nhóm >= 4 slot liền nhau
    const individualSlots = []; // Các slot lẻ hoặc nhóm < 4 slot
    
    let currentGroup = [sortedSlots[0]];
    
    for (let i = 1; i < sortedSlots.length; i++) {
      if (sortedSlots[i] === sortedSlots[i - 1] + 1) {
        // Slot liền nhau, thêm vào nhóm hiện tại
        currentGroup.push(sortedSlots[i]);
      } else {
        // Slot không liền nhau, xử lý nhóm hiện tại
        if (currentGroup.length >= 4) {
          consecutiveGroups.push([...currentGroup]);
        } else {
          individualSlots.push(...currentGroup);
        }
        // Bắt đầu nhóm mới
        currentGroup = [sortedSlots[i]];
      }
    }
    
    // Xử lý nhóm cuối cùng
    if (currentGroup.length >= 4) {
      consecutiveGroups.push([...currentGroup]);
    } else {
      individualSlots.push(...currentGroup);
    }
    
    return { consecutiveGroups, individualSlots };
  }, [selectedSlots]);

  // Tính giá dựa trên số slot đã chọn
  // Logic: 4 slot liền nhau trở lên HOẶC 6 slot trong ngày (không cần liền nhau) → giảm 20%
  const calculatedPrice = useMemo(() => {
    if (!profile || selectedSlots.length === 0) return 0;
    
    const { pricePerSlot } = profile;
    
    if (pricePerSlot <= 0) return 0;
    
    // Nếu tổng số slot >= 6 (không cần liền nhau) → giảm 20% cho tất cả
    if (selectedSlots.length >= 6) {
      const totalPrice = pricePerSlot * selectedSlots.length;
      return Math.round(totalPrice * 0.8);
    }
    
    // Nếu không đủ 6 slot, kiểm tra nhóm >= 4 slot liền nhau
    let totalPrice = 0;
    
    // Tính giá cho các nhóm >= 4 slot liền nhau (giảm 20%)
    slotGroups.consecutiveGroups.forEach(group => {
      const groupPrice = pricePerSlot * group.length;
      totalPrice += Math.round(groupPrice * 0.8); // Giảm 20%
    });
    
    // Tính giá cho các slot lẻ (giá bình thường)
    totalPrice += pricePerSlot * slotGroups.individualSlots.length;
    
    return totalPrice;
  }, [profile, selectedSlots, slotGroups]);

  // Kiểm tra xem có slot nào trước slot đã chọn đã được confirm không
  // Lưu ý: bookedSlots chỉ chứa slots đã confirmed hoặc đã thanh toán cọc
  // nên không cần phân biệt thêm
  const checkRiskWarning = useMemo(() => {
    if (!date || selectedSlots.length === 0) return false;
    
    const dateKey = date;
    const bookedSlotsForDate = bookedSlots[dateKey] || [];
    
    // Kiểm tra xem có slot nào nhỏ hơn slot đầu tiên đã được confirm không
    const minSelectedSlot = Math.min(...selectedSlots);
    const confirmedSlotsBefore = bookedSlotsForDate.filter(slot => slot < minSelectedSlot);
    
    return confirmedSlotsBefore.length > 0;
  }, [date, selectedSlots, bookedSlots]);

  // Fetch booked slots khi modal mở hoặc date thay đổi
  useEffect(() => {
    if (open && performerEntityAccountId) {
      if (date) {
        fetchBookedSlots(date);
      }
      
      if (performerProfile) {
        const normalized = normalizeProfileData(performerProfile);
        setProfile({
          pricePerSlot: Number(normalized?.pricePerHours || normalized?.PricePerHours || 0) || 0,
        });
      } else if (!profile) {
        fetchPerformerProfile();
      }
    } else {
      // Reset khi đóng modal
      setDate("");
      setSelectedSlots([]);
      setSelectedProvinceId("");
      setSelectedDistrictId("");
      setSelectedWardId("");
      setAddressDetail("");
      setLocation("");
      setNote("");
      setBookedSlots({});
      setShowConfirmModal(false);
      setHasRiskWarning(false);
      setFieldErrors({
        date: "",
        slots: "",
        province: "",
        district: "",
        ward: "",
        addressDetail: ""
      });
    }
  }, [open, performerEntityAccountId, performerProfile, date]);

  const fetchBookedSlots = async (targetDate) => {
    if (!performerEntityAccountId || !targetDate) return;
    
    setLoadingBookedSlots(true);
    try {
      const res = await bookingApi.getDJBookingsByReceiver(performerEntityAccountId, { limit: 1000 });
      const bookings = res.data?.data || res.data || [];
      
      // Lọc các booking đã confirmed hoặc pending nhưng đã thanh toán cọc
      const blockedBookings = bookings.filter(b => {
        const scheduleStatus = b.scheduleStatus || b.ScheduleStatus;
        const paymentStatus = b.paymentStatus || b.PaymentStatus;
        const bookingDate = b.bookingDate || b.BookingDate || b.StartTime;
        
        if (!bookingDate) return false;
        
        const bookingDateStr = new Date(bookingDate).toISOString().split('T')[0];
        if (bookingDateStr !== targetDate) return false;
        
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
      
      // Extract slots từ bookings
      const slotsByDate = {};
      blockedBookings.forEach(booking => {
        const bookingDate = booking.bookingDate || booking.BookingDate || booking.StartTime;
        if (bookingDate) {
          const dateStr = new Date(bookingDate).toISOString().split('T')[0];
          const detailSchedule = booking.detailSchedule || booking.DetailSchedule || {};
          const slots = detailSchedule.Slots || detailSchedule.slots || [];
          
          if (slots.length > 0) {
            // Nếu đã có slots trong detailSchedule, dùng slots đó
            if (!slotsByDate[dateStr]) {
              slotsByDate[dateStr] = [];
            }
            // Merge slots (tránh duplicate)
            slotsByDate[dateStr] = [...new Set([...slotsByDate[dateStr], ...slots])];
          } else {
            // Nếu không có slots, tính từ startTime/endTime
            // Tính slot từ startTime và endTime
            const startTime = booking.startTime || booking.StartTime;
            const endTime = booking.endTime || booking.EndTime;
            
            if (startTime && endTime) {
              const start = new Date(startTime);
              const end = new Date(endTime);
              const startHour = start.getHours();
              const endHour = end.getHours();
              
              // Tính slot bắt đầu và kết thúc
              const startSlot = Math.floor(startHour / SLOT_DURATION) + 1;
              const endSlot = Math.ceil(endHour / SLOT_DURATION);
              
              // Tạo array slots từ startSlot đến endSlot
              const calculatedSlots = [];
              for (let i = startSlot; i <= endSlot && i <= TOTAL_SLOTS; i++) {
                calculatedSlots.push(i);
              }
              
              if (calculatedSlots.length > 0) {
                if (!slotsByDate[dateStr]) {
                  slotsByDate[dateStr] = [];
                }
                slotsByDate[dateStr] = [...new Set([...slotsByDate[dateStr], ...calculatedSlots])];
              }
            }
          }
        }
      });
      
      setBookedSlots(slotsByDate);
    } catch (error) {
      console.error("[RequestBookingModal] Error fetching booked slots:", error);
    } finally {
      setLoadingBookedSlots(false);
    }
  };

  // Validate từng field
  const validateField = (fieldName, value) => {
    const newErrors = { ...fieldErrors };
    
    switch (fieldName) {
      case "date":
        if (!value) {
          newErrors.date = "Vui lòng chọn ngày";
        } else {
          // Kiểm tra ngày phải sau hôm nay ít nhất 1 ngày
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          if (selectedDate <= today) {
            newErrors.date = "Chỉ có thể đặt từ ngày mai trở đi";
          } else {
            newErrors.date = "";
          }
        }
        break;
      case "slots":
        if (!value || value.length === 0) {
          newErrors.slots = "Vui lòng chọn ít nhất 1 slot";
        } else {
          newErrors.slots = "";
        }
        break;
      case "province":
        if (!value) {
          newErrors.province = "Vui lòng chọn Tỉnh/Thành phố";
        } else {
          newErrors.province = "";
          // Nếu đã chọn tỉnh, kiểm tra huyện
          if (!selectedDistrictId) {
            newErrors.district = "Vui lòng chọn Huyện/Quận";
          } else {
            newErrors.district = "";
            // Nếu đã chọn huyện, kiểm tra xã
            if (!selectedWardId) {
              newErrors.ward = "Vui lòng chọn Xã/Phường";
            } else {
              newErrors.ward = "";
              // Nếu đã chọn xã, kiểm tra chi tiết
              if (!addressDetail?.trim()) {
                newErrors.addressDetail = "Vui lòng nhập địa chỉ chi tiết";
              } else {
                newErrors.addressDetail = "";
              }
            }
          }
        }
        break;
      case "district":
        if (!value) {
          // Chỉ bắt lỗi nếu đã chọn tỉnh
          if (selectedProvinceId) {
            newErrors.district = "Vui lòng chọn Huyện/Quận";
          } else {
            newErrors.district = "";
          }
        } else {
          newErrors.district = "";
          // Nếu đã chọn huyện, kiểm tra xã
          if (!selectedWardId) {
            newErrors.ward = "Vui lòng chọn Xã/Phường";
          } else {
            newErrors.ward = "";
            // Nếu đã chọn xã, kiểm tra chi tiết
            if (!addressDetail?.trim()) {
              newErrors.addressDetail = "Vui lòng nhập địa chỉ chi tiết";
            } else {
              newErrors.addressDetail = "";
            }
          }
        }
        break;
      case "ward":
        if (!value) {
          // Chỉ bắt lỗi nếu đã chọn huyện
          if (selectedDistrictId) {
            newErrors.ward = "Vui lòng chọn Xã/Phường";
          } else {
            newErrors.ward = "";
          }
        } else {
          newErrors.ward = "";
          // Nếu đã chọn xã, kiểm tra chi tiết
          if (!addressDetail?.trim()) {
            newErrors.addressDetail = "Vui lòng nhập địa chỉ chi tiết";
          } else {
            newErrors.addressDetail = "";
          }
        }
        break;
      case "addressDetail":
        if (!value?.trim()) {
          // Chỉ bắt lỗi nếu đã chọn xã
          if (selectedWardId) {
            newErrors.addressDetail = "Vui lòng nhập địa chỉ chi tiết";
          } else {
            newErrors.addressDetail = "";
          }
        } else {
          newErrors.addressDetail = "";
        }
        break;
      case "phone":
        if (!value?.trim()) {
          newErrors.phone = "Vui lòng nhập số điện thoại";
        } else {
          // Validate phone format (Vietnamese phone: 10-11 digits, may start with 0 or +84)
          const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;
          const cleanedPhone = value.trim().replace(/\s+/g, "");
          if (!phoneRegex.test(cleanedPhone)) {
            newErrors.phone = "Số điện thoại không hợp lệ";
          } else {
            newErrors.phone = "";
          }
        }
        break;
    }
    
    setFieldErrors(newErrors);
    return !newErrors[fieldName];
  };
  
  // Validate tất cả các field bắt buộc theo thứ tự
  const validateAllFields = () => {
    const dateValid = validateField("date", date);
    const slotsValid = validateField("slots", selectedSlots);
    const phoneValid = validateField("phone", phone);
    
    // Validate địa chỉ theo thứ tự: tỉnh → huyện → xã → chi tiết
    const provinceValid = validateField("province", selectedProvinceId);
    if (selectedProvinceId) {
      const districtValid = validateField("district", selectedDistrictId);
      if (selectedDistrictId) {
        const wardValid = validateField("ward", selectedWardId);
        if (selectedWardId) {
          const addressDetailValid = validateField("addressDetail", addressDetail);
          return dateValid && slotsValid && phoneValid && provinceValid && districtValid && wardValid && addressDetailValid;
        }
        return dateValid && slotsValid && phoneValid && provinceValid && districtValid && wardValid;
      }
      return dateValid && slotsValid && phoneValid && provinceValid && districtValid;
    }
    
    return dateValid && slotsValid && phoneValid && provinceValid;
  };

  const isSlotBooked = (slotId) => {
    if (!date) return false;
    const dateKey = date;
    const bookedSlotsForDate = bookedSlots[dateKey] || [];
    return bookedSlotsForDate.includes(slotId);
  };

  const handleSlotToggle = (slotId) => {
    if (isSlotBooked(slotId)) return; // Không cho chọn slot đã book
    
    setSelectedSlots(prev => {
      if (prev.includes(slotId)) {
        return prev.filter(id => id !== slotId);
      } else {
        return [...prev, slotId].sort((a, b) => a - b);
      }
    });
  };

  const handleDateChange = (e) => {
    // Không cho đổi ngày nếu đã chọn slot
    if (selectedSlots.length > 0) {
      setError("Vui lòng bỏ chọn tất cả slot trước khi đổi ngày");
      return;
    }
    
    const selectedDate = e.target.value;
    
    // Kiểm tra ngày phải sau hôm nay ít nhất 1 ngày
    if (selectedDate) {
      const date = new Date(selectedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (date <= today) {
        // Nếu chọn ngày hôm nay hoặc quá khứ, không cho chọn
        setError("Chỉ có thể đặt từ ngày mai trở đi");
        return;
      }
    }
    
    setDate(selectedDate);
    setSelectedSlots([]); // Reset slots khi đổi ngày
    setError(""); // Clear error
    validateField("date", selectedDate);
    if (selectedDate) {
      fetchBookedSlots(selectedDate);
    }
  };

  const handleConfirmSubmit = async () => {
    setError("");
    
    if (loadingProfile) {
      setError("Đang tải thông tin giá, vui lòng đợi...");
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
      
      // Tính startTime và endTime từ slots đã chọn
      const selectedDate = new Date(date);
      const firstSlot = Math.min(...selectedSlots);
      const lastSlot = Math.max(...selectedSlots);
      
      const startTime = new Date(selectedDate);
      startTime.setHours((firstSlot - 1) * SLOT_DURATION, 0, 0, 0);
      
      const endTime = new Date(selectedDate);
      endTime.setHours(lastSlot * SLOT_DURATION, 0, 0, 0);
      
      const payload = {
        requesterEntityAccountId,
        requesterRole: "Customer",
        performerEntityAccountId,
        performerRole,
        date,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: location.trim(),
        phone: phone.trim(),
        note: note.trim(),
        offeredPrice: calculatedPrice,
        slots: selectedSlots, // Gửi thông tin slots đã chọn
      };

      try {
        const bookingResponse = await bookingApi.createRequest(payload);
        const bookingId = bookingResponse?.data?.data?.BookedScheduleId || bookingResponse?.data?.BookedScheduleId;
        
        if (!bookingId) {
          throw new Error("Không nhận được booking ID từ server");
        }

        // Tạo payment link với cọc 50.000 VND
        try {
          const paymentResponse = await bookingApi.createPayment(bookingId, DEPOSIT_AMOUNT);
          const paymentUrl = paymentResponse?.data?.data?.paymentUrl || paymentResponse?.data?.paymentUrl;
          
          if (paymentUrl) {
            window.location.href = paymentUrl;
            return;
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

  const handleSubmit = () => {
    if (!validateAllFields()) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    // Kiểm tra risk warning (slot trước đã confirm)
    setHasRiskWarning(checkRiskWarning);
    setShowConfirmModal(true);
  };

  if (!open) return null;

  return (
    <>
      <div 
        className={cn("fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4")}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose?.();
          }
        }}
      >
        <div className={cn(
          "w-full max-w-4xl bg-card text-card-foreground rounded-xl",
          "border border-border/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
          "flex flex-col max-h-[90vh] relative"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-border/20 flex-shrink-0">
            <h3 className={cn("text-xl font-bold text-foreground")}>
              Đặt lịch {performerRole === "DJ" ? "DJ" : "Dancer"}
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
            {error && (
              <div className={cn(
                "mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30",
                "flex items-center gap-2 text-danger text-sm"
              )}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className={cn("grid grid-cols-1 gap-4")}>
              {/* Date */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar size={16} />
                    Ngày <span className="text-danger">*</span>
                  </span>
                  {fieldErrors.date && (
                    <div className="flex items-center gap-1 text-sm text-danger">
                      <AlertCircle size={14} />
                      <span>{fieldErrors.date}</span>
                    </div>
                  )}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={handleDateChange}
                  onBlur={() => validateField("date", date)}
                  onKeyDown={(e) => {
                    // Không cho nhập từ bàn phím nếu đã chọn slot
                    if (selectedSlots.length > 0) {
                      e.preventDefault();
                      return;
                    }
                    // Cho phép nhập từ bàn phím
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    // Không cho mở date picker nếu đã chọn slot
                    if (selectedSlots.length > 0) {
                      e.preventDefault();
                      setError("Vui lòng bỏ chọn tất cả slot trước khi đổi ngày");
                      return;
                    }
                  }}
                  min={(() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return tomorrow.toISOString().split('T')[0];
                  })()}
                  className={cn(
                    "w-full rounded-lg bg-background border",
                    "px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20",
                    "text-foreground",
                    fieldErrors.date
                      ? "border-danger bg-danger/10 focus:border-danger"
                      : "border-border/30 focus:border-primary",
                    (loadingBookedSlots || selectedSlots.length > 0) && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={loadingBookedSlots || selectedSlots.length > 0}
                  title={selectedSlots.length > 0 ? "Vui lòng bỏ chọn tất cả slot trước khi đổi ngày" : ""}
                />
              </div>

              {/* Slot Selection */}
              {date && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Clock size={16} />
                      Chọn slot <span className="text-danger">*</span>
                      {selectedSlots.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (Đã chọn: {selectedSlots.length} slot)
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                      <span className="text-primary text-base">💡</span>
                      <span className="text-xs font-medium text-primary">
                        Đặt 4 slot liền nhau trở lên hoặc 6 slot trong ngày để nhận giá ưu đãi
                      </span>
                    </div>
                    {fieldErrors.slots && (
                      <div className="flex items-center gap-1 text-sm text-danger">
                        <AlertCircle size={14} />
                        <span>{fieldErrors.slots}</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {SLOTS.map(slot => {
                      const isSelected = selectedSlots.includes(slot.id);
                      const isBooked = isSlotBooked(slot.id);
                      
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => handleSlotToggle(slot.id)}
                          disabled={isBooked || loadingBookedSlots}
                          className={cn(
                            "relative p-4 rounded-lg border-2 transition-all",
                            "flex flex-col items-center justify-center gap-1",
                            isBooked
                              ? "bg-muted/50 border-border/30 cursor-not-allowed opacity-50"
                              : isSelected
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-background border-border/30 hover:border-primary/50 hover:bg-primary/5",
                            loadingBookedSlots && "opacity-50 cursor-wait"
                          )}
                        >
                          <span className="text-xs font-semibold">{slot.label}</span>
                          <span className="text-xs text-muted-foreground">{slot.timeRange}</span>
                          {isSelected && (
                            <CheckCircle size={16} className="absolute top-1 right-1 text-primary" />
                          )}
                          {isBooked && (
                            <span className="absolute top-1 right-1 text-xs text-danger">✕</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {loadingBookedSlots && (
                    <div className="text-sm text-muted-foreground">
                      Đang tải danh sách slot đã đặt...
                    </div>
                  )}
                </div>
              )}

              {/* Address Selector */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MapPin size={16} />
                    Địa chỉ <span className="text-danger">*</span>
                  </span>
                  {(fieldErrors.province || fieldErrors.district || fieldErrors.ward || fieldErrors.addressDetail) && (
                    <div className="flex items-center gap-1 text-sm text-danger">
                      <AlertCircle size={14} />
                      <span>
                        {fieldErrors.province || fieldErrors.district || fieldErrors.ward || fieldErrors.addressDetail}
                      </span>
                    </div>
                  )}
                </div>
                <AddressSelector
                  selectedProvinceId={selectedProvinceId}
                  selectedDistrictId={selectedDistrictId}
                  selectedWardId={selectedWardId}
                  addressDetail={addressDetail}
                  onProvinceChange={(id) => {
                    setSelectedProvinceId(id);
                    if (!id) {
                      // Nếu bỏ chọn tỉnh, clear tất cả các field phía sau
                      setSelectedDistrictId("");
                      setSelectedWardId("");
                      setAddressDetail("");
                      setFieldErrors(prev => ({
                        ...prev,
                        province: "",
                        district: "",
                        ward: "",
                        addressDetail: ""
                      }));
                    } else {
                      setSelectedDistrictId("");
                      setSelectedWardId("");
                      validateField("province", id);
                    }
                  }}
                  onDistrictChange={(id) => {
                    setSelectedDistrictId(id);
                    if (!id) {
                      // Nếu bỏ chọn huyện, clear các field phía sau
                      setSelectedWardId("");
                      setAddressDetail("");
                      setFieldErrors(prev => ({
                        ...prev,
                        district: "",
                        ward: "",
                        addressDetail: ""
                      }));
                    } else {
                      setSelectedWardId("");
                      validateField("district", id);
                    }
                  }}
                  onWardChange={(id) => {
                    setSelectedWardId(id);
                    if (!id) {
                      // Nếu bỏ chọn xã, clear chi tiết
                      setAddressDetail("");
                      setFieldErrors(prev => ({
                        ...prev,
                        ward: "",
                        addressDetail: ""
                      }));
                    } else {
                      validateField("ward", id);
                    }
                  }}
                  onAddressDetailChange={(value) => {
                    setAddressDetail(value);
                    validateField("addressDetail", value);
                  }}
                  onAddressChange={setLocation}
                />
              </div>

              {/* Phone Number */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Phone size={16} />
                    Số điện thoại <span className="text-danger">*</span>
                  </label>
                  {fieldErrors.phone && (
                    <div className="flex items-center gap-1 text-sm text-danger">
                      <AlertCircle size={14} />
                      <span>{fieldErrors.phone}</span>
                    </div>
                  )}
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    validateField("phone", e.target.value);
                  }}
                  onBlur={() => validateField("phone", phone)}
                  placeholder="Nhập số điện thoại (ví dụ: 0912345678 hoặc +84912345678)"
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg border transition-colors",
                    "bg-background text-foreground",
                    "placeholder:text-muted-foreground",
                    fieldErrors.phone
                      ? "border-danger focus:border-danger focus:ring-danger/20"
                      : "border-border/30 focus:border-primary focus:ring-primary/20",
                    "focus:outline-none focus:ring-2"
                  )}
                />
              </div>

              {/* Price Summary */}
              {selectedSlots.length > 0 && (
                <div className="flex flex-col gap-2 p-4 rounded-lg bg-muted/30 border border-border/30">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <DollarSign size={16} />
                    Thông tin thanh toán
                  </span>
                  <div className="text-sm text-foreground">
                    <div className="flex justify-between mb-1">
                      <span>Số slot đã chọn:</span>
                      <span className="font-semibold">{selectedSlots.length} slot</span>
                    </div>
                    {profile && (
                      <>
                        {/* Nếu >= 6 slot: hiển thị đơn giản với giảm giá cho tất cả */}
                        {selectedSlots.length >= 6 ? (
                          <>
                            <div className="flex justify-between mb-1 text-sm">
                              <span className="text-muted-foreground">
                                {selectedSlots.length} slot × {profile.pricePerSlot.toLocaleString('vi-VN')} đ:
                              </span>
                              <span>
                                {(profile.pricePerSlot * selectedSlots.length).toLocaleString('vi-VN')} đ
                              </span>
                            </div>
                            <div className="flex justify-between mb-1 text-sm">
                              <span className="text-muted-foreground">
                                Giảm 20% ({selectedSlots.length} slot):
                              </span>
                              <span className="text-success font-medium">
                                -{Math.round(profile.pricePerSlot * selectedSlots.length * 0.2).toLocaleString('vi-VN')} đ
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Hiển thị chi tiết giá từng nhóm >= 4 slot liền nhau */}
                            {slotGroups.consecutiveGroups.length > 0 && (
                              <>
                                {slotGroups.consecutiveGroups.map((group, idx) => {
                                  const groupPrice = Math.round(profile.pricePerSlot * group.length * 0.8);
                                  return (
                                    <div key={`consecutive-${idx}`} className="flex justify-between mb-1 text-sm">
                                      <span className="text-muted-foreground">
                                        {group.length} slot liền nhau (SL{group[0]}-SL{group[group.length - 1]}) - giảm 20%:
                                      </span>
                                      <span className="text-success font-medium">
                                        {groupPrice.toLocaleString('vi-VN')} đ
                                      </span>
                                    </div>
                                  );
                                })}
                              </>
                            )}
                            {slotGroups.individualSlots.length > 0 && (
                              <div className="flex justify-between mb-1 text-sm">
                                <span className="text-muted-foreground">
                                  {slotGroups.individualSlots.length} slot ({slotGroups.individualSlots.map(s => `SL${s}`).join(', ')}):
                                </span>
                                <span>
                                  {(profile.pricePerSlot * slotGroups.individualSlots.length).toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex justify-between mb-1 pt-1 border-t border-border/30">
                          <span className="font-semibold">Tổng tiền:</span>
                          <span className="font-semibold text-lg">
                            {calculatedPrice.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span>Tiền cọc:</span>
                          <span className="font-semibold">{DEPOSIT_AMOUNT.toLocaleString('vi-VN')} đ</span>
                        </div>
                        {calculatedPrice > DEPOSIT_AMOUNT && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Còn lại:</span>
                            <span>{(calculatedPrice - DEPOSIT_AMOUNT).toLocaleString('vi-VN')} đ</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Note */}
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-foreground">Ghi chú (tùy chọn)</span>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Thêm ghi chú..."
                  className={cn(
                    "w-full rounded-lg bg-background border border-border/30",
                    "px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                    "text-foreground placeholder:text-muted-foreground resize-none"
                  )}
                />
              </label>
            </div>
          </div>

          {/* Actions */}
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
              Hủy
            </button>
            <button
              disabled={submitting || selectedSlots.length === 0}
              onClick={handleSubmit}
              className={cn(
                "px-6 py-2.5 rounded-lg font-semibold",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "border-none transition-colors shadow-md",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {submitting ? "Đang xử lý..." : "Tiếp tục"}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div 
          className={cn("fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4")}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowConfirmModal(false);
            }
          }}
        >
          <div className={cn(
            "w-full max-w-lg bg-card text-card-foreground rounded-xl",
            "border border-border/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
            "p-6"
          )}>
            <h3 className="text-lg font-bold text-foreground mb-4">Xác nhận đặt lịch</h3>
            
            {/* Notice */}
            <div className="mb-4 p-4 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-sm text-foreground mb-2">
                <strong>Lưu ý:</strong>
              </p>
              <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
                <li>Bạn chỉ cần thanh toán cọc {DEPOSIT_AMOUNT.toLocaleString('vi-VN')} đ để giữ chỗ</li>
                <li>Số tiền còn lại phải thanh toán trực tiếp với {performerRole === "DJ" ? "DJ" : "Dancer"}</li>
              </ul>
            </div>

            {/* Risk Warning */}
            {hasRiskWarning && (
              <div className="mb-4 space-y-3">
                {checkRiskWarning && (
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-warning mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-foreground">
                        <p className="font-semibold mb-1">Cảnh báo rủi ro:</p>
                        <p>
                          Trước slot bạn đã chọn, {performerRole === "DJ" ? "DJ" : "Dancer"} đã có lịch được xác nhận. 
                          Nếu {performerRole === "DJ" ? "DJ" : "Dancer"} đến muộn, có thể ảnh hưởng đến slot của bạn.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            <div className="mb-4 p-4 rounded-lg bg-muted/30 border border-border/30">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Ngày:</span>
                  <span className="font-semibold">{date ? new Date(date).toLocaleDateString('vi-VN') : ""}</span>
                </div>
                <div className="flex justify-between">
                  <span>Số slot:</span>
                  <span className="font-semibold">{selectedSlots.length} slot</span>
                </div>
                <div className="flex justify-between">
                  <span>Tổng giá:</span>
                  <span className="font-semibold">{calculatedPrice.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Tiền cọc:</span>
                  <span className="font-semibold">{DEPOSIT_AMOUNT.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                disabled={submitting}
                onClick={() => setShowConfirmModal(false)}
                className={cn(
                  "px-6 py-2.5 rounded-lg font-semibold",
                  "bg-muted text-muted-foreground hover:bg-muted/80",
                  "border-none transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Quay lại
              </button>
              <button
                disabled={submitting}
                onClick={handleConfirmSubmit}
                className={cn(
                  "px-6 py-2.5 rounded-lg font-semibold",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "border-none transition-colors shadow-md",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {submitting ? "Đang xử lý..." : "Xác nhận và thanh toán cọc"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
