// src/modules/customer/pages/MyBookings.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUserEntity } from "../../../hooks/useCurrentUserEntity";
import bookingApi from "../../../api/bookingApi";
import publicProfileApi from "../../../api/publicProfileApi";
import { cn } from "../../../utils/cn";
import { Calendar, Clock, MapPin, DollarSign, X, Eye, AlertCircle, CheckCircle, XCircle, Loader2, Search, Filter, ExternalLink, Building2, Music2, Star, Upload, Image as ImageIcon, Edit, Phone } from "lucide-react";
import { getAvatarUrl } from "../../../utils/defaultAvatar";
import { ToastContainer } from "../../../components/common/Toast";
import { SkeletonCard } from "../../../components/common/Skeleton";
import barReviewApi from "../../../api/barReviewApi";
import userReviewApi from "../../../api/userReviewApi";
import { uploadPostMedia } from "../../../api/postApi";
import { useAuth } from "../../../hooks/useAuth";
import bankInfoApi from "../../../api/bankInfoApi";

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
  const bookingTypeUpper = (bookingType || "").toString().toUpperCase();
  const isDJBooking = bookingTypeUpper === "DJ" || bookingTypeUpper === "DANCER" || bookingTypeUpper === "PERFORMER";
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

          {/* Slots cho DJ/Dancer bookings */}
          {isDJBooking && detailSchedule?.Slots && Array.isArray(detailSchedule.Slots) && detailSchedule.Slots.length > 0 && (
            <div className="flex items-start gap-3">
              <Clock className="mt-1 text-muted-foreground" size={20} />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">Các slot đã đặt:</p>
                <div className="flex flex-wrap gap-2">
                  {detailSchedule.Slots
                    .map(slotId => SLOTS.find(s => s.id === slotId))
                    .filter(Boolean)
                    .sort((a, b) => a.id - b.id)
                    .map(slot => (
                      <span
                        key={slot.id}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm",
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

          {/* Phone Number (for DJ bookings) */}
          {isDJBooking && (
            <div className="flex items-start gap-3">
              <Phone className="mt-1 text-muted-foreground" size={20} />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Số điện thoại</p>
                <p className="font-semibold text-foreground">
                  {detailSchedule?.Phone || detailSchedule?.phone || "Chưa có"}
                </p>
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

// Review Modal Component
const ReviewModal = ({ open, onClose, booking, receiverInfo, onReviewSubmitted, existingReview = null }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [feedImage, setFeedImage] = useState(null);
  const [feedImagePreview, setFeedImagePreview] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [backImagePreview, setBackImagePreview] = useState(null);
  const [requestRefund, setRequestRefund] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const bookingType = booking?.type || booking?.Type || "";
  const isBarBooking = bookingType === "BarTable";
  const detailSchedule = booking?.detailSchedule || booking?.DetailSchedule || {};
  
  // Lấy slots đã đặt cho DJ/Dancer bookings
  const isDJBooking = bookingType?.toUpperCase() === "DJ" || bookingType?.toUpperCase() === "DANCER" || bookingType?.toUpperCase() === "PERFORMER";
  const bookedSlots = isDJBooking ? (detailSchedule?.Slots || detailSchedule?.slots || []) : [];
  const slotInfo = bookedSlots
    .map(slotId => SLOTS.find(s => s.id === slotId))
    .filter(Boolean)
    .sort((a, b) => a.id - b.id);

  // Load existing review when modal opens
  useEffect(() => {
    if (open && existingReview) {
      // Load review data vào form
      setRating(existingReview.Star || existingReview.StarValue || existingReview.star || 0);
      setComment(existingReview.Content || existingReview.content || "");
      // Không load RequestRefund khi edit (ẩn checkbox)
      setRequestRefund(false);
      
      // Load images nếu có
      if (existingReview.Picture) {
        setFeedImagePreview(existingReview.Picture);
      }
      if (existingReview.FeedBackContent && 
          existingReview.FeedBackContent.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
        setBackImagePreview(existingReview.FeedBackContent);
      }
    } else if (!open) {
      // Reset form when modal closes
      setRating(0);
      setComment("");
      setFeedImage(null);
      setFeedImagePreview(null);
      setBackImage(null);
      setBackImagePreview(null);
      setRequestRefund(false);
      setError("");
    }
  }, [open, existingReview]);

  const handleImageSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("File phải là ảnh");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Kích thước ảnh không được vượt quá 5MB");
      return;
    }

    if (type === 'feed') {
      setFeedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setFeedImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setBackImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setBackImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
    setError("");
  };

  const removeImage = (type) => {
    if (type === 'feed') {
      setFeedImage(null);
      setFeedImagePreview(null);
    } else {
      setBackImage(null);
      setBackImagePreview(null);
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('images', file);
    
    try {
      const res = await uploadPostMedia(formData);
      const responseData = res.data || res;
      const files = responseData.data || responseData;
      
      if (files && Array.isArray(files) && files.length > 0) {
        const uploadedFile = files[0];
        return uploadedFile.url || uploadedFile.path || uploadedFile.secure_url;
      }
      throw new Error("Upload failed - no URL in response");
    } catch (err) {
      console.error("[ReviewModal] Upload error:", err);
      throw new Error(err.response?.data?.message || err.message || "Không thể upload ảnh");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError("Vui lòng chọn số sao đánh giá");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Upload images if any
      let feedImageUrl = null;
      let backImageUrl = null;

      if (feedImage) {
        setUploading(true);
        feedImageUrl = await uploadImage(feedImage);
        setUploading(false);
      }

      if (backImage) {
        setUploading(true);
        backImageUrl = await uploadImage(backImage);
        setUploading(false);
      }

      // Lấy thông tin booking để lưu vào review
      // Thử nhiều cách để lấy BookingId và normalize
      const rawBookingId = booking?.BookedScheduleId || 
                          booking?.bookedScheduleId || 
                          booking?.BookedScheduleID ||
                          booking?.id ||
                          booking?.Id;
      const bookingId = rawBookingId ? rawBookingId.toString().toLowerCase().trim() : null;
      const bookingDate = booking?.bookingDate || booking?.BookingDate;
      
      if (!bookingId) {
        console.error('[ReviewModal] Cannot find BookingId from booking object:', {
          booking,
          allKeys: booking ? Object.keys(booking) : []
        });
        setError("Không tìm thấy ID booking. Vui lòng thử lại.");
        setSubmitting(false);
        return;
      }
      
      console.log('[ReviewModal] Submitting review with booking info:', {
        rawBookingId,
        bookingId,
        bookingDate,
        bookingObject: booking ? {
          keys: Object.keys(booking),
          BookedScheduleId: booking.BookedScheduleId,
          bookedScheduleId: booking.bookedScheduleId,
          id: booking.id
        } : null
      });
      
      // Lấy tên bàn (nếu là booking bàn)
      let tableName = null;
      if (isBarBooking && detailSchedule?.Table) {
        const tables = Object.values(detailSchedule.Table);
        if (tables.length > 0) {
          // Lấy tên các bàn, nối bằng dấu phẩy nếu có nhiều bàn
          tableName = tables.map(t => t.TableName || "Bàn").join(", ");
        }
      }

      // Xử lý theo luồng feedback trong hình ảnh
      // Chỉ xử lý RequestRefund khi không phải đang edit (không có existingReview)
      if (requestRefund && !existingReview) {
        // Nếu có vấn đề (yêu cầu hoàn tiền)
        // Kiểm tra xem đã lưu bankinfo của account đó chưa
        try {
          const bankInfoRes = await bankInfoApi.getByAccountId(user.id);
          const hasBankInfo = bankInfoRes?.status === "success" && bankInfoRes.data;
          
          if (!hasBankInfo) {
            // Nếu chưa có bankinfo: chuyển hướng sang trang bankinfo
            setError("Bạn cần thêm thông tin ngân hàng để yêu cầu hoàn tiền. Đang chuyển hướng...");
            setTimeout(() => {
              onClose();
              navigate("/customer/bank-info", { 
                state: { 
                  returnTo: "/customer/my-bookings",
                  bookingId: bookingId,
                  reviewData: {
                    rating,
                    comment: comment.trim(),
                    feedImageUrl,
                    backImageUrl,
                    bookingId,
                    bookingDate,
                    tableName
                  }
                } 
              });
            }, 1500);
            setSubmitting(false);
            return;
          }
          
          // Nếu có bankinfo: sẽ tạo refund request sau khi lưu review
          console.log('[ReviewModal] User has bankinfo, will create refund request after saving review...');
        } catch (bankInfoError) {
          // Nếu lỗi 404 (không tìm thấy bankinfo), redirect đến trang bankinfo
          if (bankInfoError.response?.status === 404) {
            setError("Bạn cần thêm thông tin ngân hàng để yêu cầu hoàn tiền. Đang chuyển hướng...");
            setTimeout(() => {
              onClose();
              navigate("/customer/bank-info", { 
                state: { 
                  returnTo: "/customer/my-bookings",
                  bookingId: bookingId,
                  reviewData: {
                    rating,
                    comment: comment.trim(),
                    feedImageUrl,
                    backImageUrl,
                    bookingId,
                    bookingDate,
                    tableName
                  }
                } 
              });
            }, 1500);
            setSubmitting(false);
            return;
          }
          throw bankInfoError;
        }
      }

      // Prepare review data
      const reviewData = {
        Star: rating,
        Content: comment.trim() || null,
        AccountId: user?.id,
        Picture: feedImageUrl || null, // Ảnh feed (ưu tiên feedImage)
        FeedBackContent: backImageUrl || null, // Ảnh back
        RequestRefund: existingReview ? false : requestRefund, // Không cho phép yêu cầu hoàn tiền khi edit
        BookingId: bookingId, // ID của booking
        BookingDate: bookingDate, // Ngày book
        TableName: tableName, // Tên bàn (nếu có)
      };

      if (isBarBooking) {
        // Bar review
        const barId = receiverInfo?.targetId || receiverInfo?.barPageId || receiverInfo?.id;
        if (!barId) {
          throw new Error("Không tìm thấy ID bar");
        }
        reviewData.BarId = barId;
        
        // Nếu có existingReview, update thay vì create
        if (existingReview && (existingReview.BarReviewId || existingReview.id)) {
          const reviewId = existingReview.BarReviewId || existingReview.id;
          await barReviewApi.update(reviewId, reviewData);
        } else {
          await barReviewApi.create(reviewData);
        }
      } else {
        // DJ/Dancer review
        const businessId = receiverInfo?.targetId || receiverInfo?.businessId || receiverInfo?.BussinessAccountId || receiverInfo?.id;
        if (!businessId) {
          throw new Error("Không tìm thấy ID business");
        }
        reviewData.BussinessAccountId = businessId;
        reviewData.StarValue = rating; // userReviewApi uses StarValue
        delete reviewData.Star;
        // DJ/Dancer không có TableName, bỏ field này
        delete reviewData.TableName;
        
        // Nếu có existingReview, update thay vì create
        if (existingReview && (existingReview.ReviewId || existingReview.id)) {
          const reviewId = existingReview.ReviewId || existingReview.id;
          await userReviewApi.update(reviewId, reviewData);
        } else {
          await userReviewApi.create(reviewData);
        }
      }

      // Nếu có RequestRefund và đã có bankinfo, tạo refund request (chỉ khi không phải edit)
      if (requestRefund && !existingReview) {
        // TODO: Gọi API để tạo refund request
        // refundRequestApi.create({ reviewId, bookingId, accountId, images, etc. })
        console.log('[ReviewModal] Review saved, refund request will be created separately');
      }

      // Success
      console.log('[ReviewModal] Review submitted successfully:', {
        bookingId,
        isBarBooking,
        requestRefund,
        reviewData: {
          ...reviewData,
          Picture: reviewData.Picture ? 'has image' : null,
          FeedBackContent: reviewData.FeedBackContent ? 'has image' : null
        }
      });
      
      if (onReviewSubmitted) {
        onReviewSubmitted(requestRefund);
      }
      
      onClose();
    } catch (err) {
      console.error("[ReviewModal] Submit error:", err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "Không thể gửi đánh giá");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (!open || !booking || !receiverInfo) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

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
            {existingReview ? "Sửa đánh giá" : `Đánh giá ${isBarBooking ? "đặt bàn" : "booking"}`}
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

        {/* Booking Info */}
        <div className={cn("mb-6 p-4 rounded-lg bg-muted/50 border border-border/30")}>
          <h4 className={cn("text-lg font-semibold text-foreground mb-3")}>
            Thông tin {isBarBooking ? "đặt bàn" : "booking"}
          </h4>
          <div className={cn("space-y-2 text-sm")}>
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-muted-foreground" />
              <span className="text-foreground font-medium">
                {receiverInfo.name || "Unknown"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <span className="text-foreground">
                Ngày: {formatDate(booking.bookingDate || booking.BookingDate)}
              </span>
            </div>
            {/* Slots cho DJ/Dancer bookings */}
            {isDJBooking && slotInfo.length > 0 && (
              <div className="mt-2">
                <p className="text-muted-foreground mb-2 text-sm">Các slot đã đặt:</p>
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
            )}
            {isBarBooking && detailSchedule?.Table && (
              <div className="mt-2">
                <p className="text-muted-foreground mb-1">Bàn đã đặt:</p>
                <div className="space-y-1">
                  {Object.entries(detailSchedule.Table).map(([tableId, tableInfo]) => (
                    <div key={tableId} className="text-foreground">
                      • {tableInfo.TableName || "Bàn"}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-muted-foreground" />
              <span className="text-foreground font-semibold">
                Tổng tiền: {(booking.totalAmount || booking.TotalAmount || 0).toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={cn("space-y-4")}>
          {/* Rating */}
          <div>
            <label className={cn("text-sm font-semibold text-foreground mb-2 block")}>
              Đánh giá <span className="text-danger">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={cn(
                    "p-1 transition-colors",
                    rating >= star ? "" : "text-muted-foreground"
                  )}
                  style={rating >= star ? { color: "#FFD700" } : {}}
                >
                  <Star
                    size={32}
                    fill={rating >= star ? "#FFD700" : "none"}
                    stroke={rating >= star ? "#FFD700" : "currentColor"}
                    className="transition-all"
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className={cn("text-sm text-muted-foreground ml-2")}>
                  {rating} sao
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className={cn("text-sm font-semibold text-foreground mb-2 block")}>
              Nội dung đánh giá
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn..."
              rows={4}
              className={cn(
                "w-full rounded-lg bg-background border border-border/30",
                "px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                "text-foreground resize-none"
              )}
            />
          </div>

          {/* Image Upload */}
          <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4")}>
            {/* Feed Image */}
            <div>
              <label className={cn("text-sm font-semibold text-foreground mb-2 block")}>
                Ảnh feed
              </label>
              {feedImagePreview ? (
                <div className={cn("relative rounded-lg overflow-hidden border border-border/30")}>
                  <img
                    src={feedImagePreview}
                    alt="Feed preview"
                    className="w-full h-32 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage('feed')}
                    className={cn(
                      "absolute top-2 right-2 p-1 rounded-full bg-danger text-white",
                      "hover:bg-danger/80 transition-colors"
                    )}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className={cn(
                  "flex flex-col items-center justify-center",
                  "w-full h-32 rounded-lg border-2 border-dashed border-border/30",
                  "bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                )}>
                  <Upload size={24} className="text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Chọn ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, 'feed')}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Back Image */}
            <div>
              <label className={cn("text-sm font-semibold text-foreground mb-2 block")}>
                Ảnh back
              </label>
              {backImagePreview ? (
                <div className={cn("relative rounded-lg overflow-hidden border border-border/30")}>
                  <img
                    src={backImagePreview}
                    alt="Back preview"
                    className="w-full h-32 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage('back')}
                    className={cn(
                      "absolute top-2 right-2 p-1 rounded-full bg-danger text-white",
                      "hover:bg-danger/80 transition-colors"
                    )}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className={cn(
                  "flex flex-col items-center justify-center",
                  "w-full h-32 rounded-lg border-2 border-dashed border-border/30",
                  "bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                )}>
                  <Upload size={24} className="text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Chọn ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, 'back')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Request Refund */}
          {/* Chỉ hiển thị checkbox yêu cầu hoàn tiền khi không phải đang edit (không có existingReview) */}
          {!existingReview && (
            <div className={cn("flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/30")}>
              <input
                type="checkbox"
                id="requestRefund"
                checked={requestRefund}
                onChange={(e) => setRequestRefund(e.target.checked)}
                className={cn("w-4 h-4 rounded border-border")}
              />
              <label htmlFor="requestRefund" className={cn("text-sm text-foreground cursor-pointer")}>
                Yêu cầu hoàn tiền (nếu dịch vụ không hài lòng)
              </label>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className={cn(
              "p-3 rounded-lg bg-danger/10 border border-danger/30",
              "flex items-center gap-2 text-danger text-sm"
            )}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className={cn("flex items-center justify-end gap-3 pt-4 border-t border-border/30")}>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold",
                "bg-muted text-muted-foreground hover:bg-muted/80",
                "border border-border/30 transition-colors"
              )}
              disabled={submitting || uploading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-semibold",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "border-none transition-colors shadow-md",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center gap-2"
              )}
              disabled={submitting || uploading || rating === 0}
            >
              {(submitting || uploading) ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {uploading ? "Đang upload..." : "Đang gửi..."}
                </>
              ) : (
                existingReview ? "Cập nhật đánh giá" : "Gửi đánh giá"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Review Button Component (check if reviewed)
const ReviewButton = ({ receiverId, bookingType, booking, userReviews, user, onReview, onEditReview }) => {
  const [receiverInfo, setReceiverInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Lấy review hiện tại nếu đã review
  const currentReview = useMemo(() => {
    if (!receiverInfo || !user?.id || !booking) return null;
    
    const rawBookingId = booking?.BookedScheduleId || 
                        booking?.bookedScheduleId || 
                        booking?.BookedScheduleID ||
                        booking?.id ||
                        booking?.Id;
    const bookingId = rawBookingId ? rawBookingId.toString().toLowerCase() : null;
    const checkKey = bookingId ? `booking_${bookingId}` : null;
    
    if (checkKey && userReviews[checkKey]) {
      return userReviews[checkKey];
    }
    return null;
  }, [receiverInfo, user?.id, userReviews, booking]);
  
  const hasReviewed = useMemo(() => {
    if (!receiverInfo || !user?.id || !booking) return false;
    
    // Check ReviewStatus từ booking trước (ưu tiên cao nhất)
    const reviewStatus = booking?.ReviewStatus || booking?.reviewStatus;
    if (reviewStatus === 'Reviewed' || reviewStatus === 'reviewed' || reviewStatus === 'REVIEWED') {
      console.log('[ReviewButton] Booking already reviewed (ReviewStatus = Reviewed)');
      return true;
    }
    
    const isBarBooking = bookingType === "BarTable";
    
    // Lấy BookingId từ booking - đây là key để check
    // Thử nhiều cách để lấy BookingId
    const rawBookingId = booking?.BookedScheduleId || 
                        booking?.bookedScheduleId || 
                        booking?.BookedScheduleID ||
                        booking?.id ||
                        booking?.Id;
    // Normalize BookingId (toLowerCase) để match với key đã map
    const bookingId = rawBookingId ? rawBookingId.toString().toLowerCase() : null;
    const checkKey = bookingId ? `booking_${bookingId}` : null;
    
    console.log('[ReviewButton] Checking hasReviewed:', {
      rawBookingId,
      bookingId,
      checkKey,
      isBarBooking,
      reviewStatus,
      hasReview: checkKey ? userReviews[checkKey] !== undefined : false,
      allKeys: Object.keys(userReviews),
      matchingKeys: checkKey ? Object.keys(userReviews).filter(k => k.includes(bookingId || '')) : [],
      bookingObject: booking ? {
        keys: Object.keys(booking),
        BookedScheduleId: booking.BookedScheduleId,
        bookedScheduleId: booking.bookedScheduleId,
        id: booking.id,
        Id: booking.Id,
        ReviewStatus: booking.ReviewStatus
      } : null
    });
    
    if (isBarBooking) {
      // Ưu tiên check theo BookingId (mỗi booking có thể có 1 review riêng)
      if (bookingId && checkKey) {
        const hasReview = userReviews[checkKey] !== undefined;
        console.log('[ReviewButton] Bar booking check result:', { bookingId, checkKey, hasReview });
        return hasReview;
      }
      // Fallback: check theo BarId (backward compatibility)
      const barId = receiverInfo?.targetId || receiverInfo?.barPageId || receiverInfo?.id;
      if (barId) {
        const barKey = `bar_${barId.toString().toLowerCase()}`;
        return userReviews[barKey] !== undefined;
      }
      return false;
    } else {
      // DJ/Dancer: cũng check theo BookingId nếu có
      if (bookingId && checkKey) {
        const hasReview = userReviews[checkKey] !== undefined;
        console.log('[ReviewButton] DJ/Dancer booking check result:', { bookingId, checkKey, hasReview });
        return hasReview;
      }
      // Fallback: check theo BusinessId
      const businessId = receiverInfo?.targetId || receiverInfo?.businessId || receiverInfo?.BussinessAccountId || receiverInfo?.id;
      if (businessId) {
        const businessKey = `business_${businessId.toString().toLowerCase()}`;
        return userReviews[businessKey] !== undefined;
      }
      return false;
    }
  }, [receiverInfo, user?.id, userReviews, bookingType, booking]);

  useEffect(() => {
    const fetchInfo = async () => {
      if (!receiverId) {
        setLoading(false);
        return;
      }

      try {
        const res = await publicProfileApi.getByEntityId(receiverId);
        const responseData = res?.data;
        const data = responseData?.data || responseData || {};
        
        setReceiverInfo(data);
      } catch (error) {
        console.error("[ReviewButton] Error fetching receiver info:", error);
        setReceiverInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [receiverId]);

  if (loading) {
    return (
      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    );
  }

  if (!receiverInfo) return null;

  // Nếu đã review (có ReviewStatus = 'Reviewed' hoặc có review trong userReviews), không hiển thị nút "Gửi đánh giá"
  // Chỉ hiển thị badge "Đã đánh giá" và nút "Sửa" nếu có currentReview
  if (hasReviewed) {
    // Nếu chỉ có ReviewStatus = 'Reviewed' mà không có currentReview, chỉ hiển thị badge
    if (!currentReview) {
      return (
        <span className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-semibold",
          "bg-success/10 text-success border border-success/20"
        )}>
          ✓ Đã đánh giá
        </span>
      );
    }
    
    // Nếu có currentReview, hiển thị badge và nút Sửa
    return (
      <div className={cn("flex items-center gap-2")}>
        <span className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-semibold",
          "bg-success/10 text-success border border-success/20"
        )}>
          ✓ Đã đánh giá
        </span>
        <button
          onClick={() => {
            if (onEditReview) {
              onEditReview(booking, receiverInfo, currentReview);
            }
          }}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1",
            "bg-primary/10 text-primary hover:bg-primary/20",
            "border border-primary/20 transition-colors"
          )}
          title="Sửa đánh giá"
        >
          <Edit size={14} />
          Sửa
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => onReview(booking, receiverInfo)}
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "border-none transition-colors shadow-md"
      )}
      title="Gửi đánh giá"
    >
      <Star size={16} />
      Gửi review
    </button>
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
        
        // Kiểm tra xem API có trả về success không
        if (!res?.data || (res.data.success === false)) {
          console.warn("[ReceiverInfo] API returned error or no data:", res?.data);
          // Nếu API lỗi, không set profileUrl để tránh navigate đến profile không tồn tại
          setReceiverInfo({ 
            name: "Unknown", 
            avatar: null,
            profileUrl: null, // Không navigate nếu EntityAccountId không tồn tại
            isBar: false,
            isDJ: false,
            isDancer: false,
          });
          return;
        }
        
        const data = res?.data?.data || res?.data || {};
        
        console.log("[ReceiverInfo] API Response:", { 
          receiverId, 
          success: res?.data?.success,
          data, 
          targetId: data.targetId, 
          targetType: data.targetType,
          role: data.role,
          type: data.type
        });
        
        const role = (data.role || data.Role || "").toString().toUpperCase();
        const type = (data.type || "").toString().toUpperCase(); // type đã được uppercase từ backend
        const targetType = (data.targetType || "").toString();
        const bookingTypeUpper = bookingType ? bookingType.toString().toUpperCase() : "";
        
        // Xác định loại entity: Bar, DJ, hoặc Dancer
        // Ưu tiên: type/role từ API > bookingType từ props > targetType
        const isBar = role === "BAR" || type === "BAR" || targetType === "BarPage" || targetType === "BAR" || bookingTypeUpper === "BARTABLE";
        
        // Xác định DJ/Dancer: dựa trên type (đã uppercase), role, targetType, hoặc bookingType
        // type từ API response là (row.role || '').toUpperCase() nên sẽ là "DJ" hoặc "DANCER"
        let isDJ = type === "DJ" || role === "DJ" || (targetType === "BusinessAccount" && (type === "DJ" || role === "DJ"));
        let isDancer = type === "DANCER" || role === "DANCER" || (targetType === "BusinessAccount" && (type === "DANCER" || role === "DANCER"));
        
        // Fallback: nếu không xác định được từ API, dùng bookingType
        if (!isDJ && !isDancer && targetType === "BusinessAccount" && bookingTypeUpper) {
          if (bookingTypeUpper === "DJ") {
            isDJ = true;
          } else if (bookingTypeUpper === "DANCER" || bookingTypeUpper === "PERFORMER") {
            isDancer = true;
          }
        }
        
        // Debug log để kiểm tra
        console.log("[ReceiverInfo] Type detection:", {
          role,
          type,
          targetType,
          bookingTypeUpper,
          isBar,
          isDJ,
          isDancer
        });
        
        // Lấy profileId từ targetId (đây là ID thực sự của BarPage hoặc BusinessAccount)
        const targetId = data.targetId;
        const barPageId = data.barPageId || data.BarPageId || targetId;
        // targetId chính là BussinessAccountId cho DJ/Dancer
        const businessId = data.businessId || data.BussinessAccountId || data.BusinessAccountId || targetId;
        
        // Xác định profileUrl - chỉ set nếu có targetId hợp lệ
        // Lưu ý: Route /dj/:id và /dancer/:id sẽ redirect đến /profile/:entityAccountId
        // Nếu EntityAccountId không tồn tại, route sẽ fail
        // Vì vậy, chỉ navigate đến /dj/:id hoặc /dancer/:id nếu chắc chắn EntityAccountId tồn tại
        let profileUrl = null;
        
        if (isBar && barPageId) {
          profileUrl = `/bar/${barPageId}`;
        } else if ((isDJ || isDancer) && targetId) {
          // Với DJ/Dancer, route /dj/:id và /dancer/:id cần resolve businessId thành EntityAccountId
          // Nếu EntityAccountId không tồn tại, route sẽ fail
          // Kiểm tra xem có entityAccountId trong response không (để đảm bảo EntityAccountId tồn tại)
          const entityAccountId = data.entityAccountId || data.entityId || data.EntityAccountId;
          if (entityAccountId && entityAccountId === receiverId) {
            // Nếu có entityAccountId và nó khớp với receiverId, có nghĩa là EntityAccountId tồn tại
            // Navigate đến /dj/:id hoặc /dancer/:id sẽ redirect đến /profile/:entityAccountId
            profileUrl = isDJ ? `/dj/${targetId}` : `/dancer/${targetId}`;
          } else {
            // Nếu không có entityAccountId hoặc không khớp, có nghĩa là EntityAccountId không tồn tại
            // Không navigate đến /dj/:id hoặc /dancer/:id, để profileUrl = null và sẽ navigate đến search
            console.warn("[ReceiverInfo] EntityAccountId không tồn tại hoặc không khớp, không navigate đến /dj/:id hoặc /dancer/:id", {
              entityAccountId,
              receiverId,
              targetId
            });
            profileUrl = null;
          }
        }
        
        // KHÔNG dùng fallback đến /profile/:id nếu EntityAccountId không tồn tại
        // Vì sẽ gây lỗi 404

        console.log("[ReceiverInfo] Resolved profileUrl:", {
          isBar,
          isDJ,
          isDancer,
          targetId,
          barPageId,
          businessId,
          profileUrl
        });

        setReceiverInfo({
          name: data.name || data.Name || data.userName || data.UserName || data.BarName || data.BusinessName || "Unknown",
          avatar: data.avatar || data.Avatar || null,
          profileUrl: profileUrl, // Có thể là null nếu không xác định được
          isBar: isBar,
          isDJ: isDJ,
          isDancer: isDancer,
        });
      } catch (error) {
        console.error("[ReceiverInfo] Error fetching receiver info:", error);
        // Nếu API lỗi (404, 500, etc.), không set profileUrl
        setReceiverInfo({ 
          name: "Unknown", 
          avatar: null,
          profileUrl: null, // Không navigate nếu EntityAccountId không tồn tại
          isBar: false,
          isDJ: false,
          isDancer: false,
        });
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
      {/* Avatar */}
      <img
        src={getAvatarUrl(receiverInfo.avatar, 32)}
        alt={receiverInfo.name}
        className={cn(
          "w-8 h-8 rounded-full object-cover",
          "border border-border/20 flex-shrink-0"
        )}
        onError={(e) => {
          e.target.src = getAvatarUrl(null, 32);
        }}
      />
      
      {/* Name */}
      <span className="text-sm font-medium text-foreground">
        {receiverInfo.name}
      </span>
      
      {/* External Link Button - luôn hiển thị, navigate đến profile hoặc search */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (receiverInfo.profileUrl) {
            // Nếu có profileUrl hợp lệ, navigate đến profile
            console.log("[ReceiverInfo] Navigating to profile:", receiverInfo.profileUrl);
            navigate(receiverInfo.profileUrl);
          } else {
            // Nếu không có profileUrl, navigate đến trang search với tên receiver
            const searchQuery = encodeURIComponent(receiverInfo.name || "");
            console.log("[ReceiverInfo] Navigating to search:", `/search?q=${searchQuery}`);
            navigate(`/search?q=${searchQuery}`);
          }
        }}
        className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
        title={receiverInfo.profileUrl ? "Xem profile" : "Tìm kiếm profile"}
      >
        <ExternalLink size={14} className="text-primary" />
      </button>
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
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewReceiverInfo, setReviewReceiverInfo] = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [loadingReviewReceiver, setLoadingReviewReceiver] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [filterMode, setFilterMode] = useState("single"); // "single" or "range"
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [userReviews, setUserReviews] = useState({}); // { barId: review, businessId: review }
  const currentUserEntityId = useCurrentUserEntity();
  const { user } = useAuth();

  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Fetch user reviews to check if already reviewed
  const fetchUserReviews = useCallback(async () => {
    if (!user?.id) return;

    try {
      const reviewsMap = {};

      // Fetch all bar reviews
      try {
        const barReviewsRes = await barReviewApi.getAll();
        const barReviews = Array.isArray(barReviewsRes?.data) 
          ? barReviewsRes.data 
          : Array.isArray(barReviewsRes) 
          ? barReviewsRes 
          : [];
        
        // Filter reviews by current user and map by BookingId
        barReviews
          .filter(review => {
            const reviewAccountId = review.AccountId || review.accountId;
            return reviewAccountId && reviewAccountId.toString().toLowerCase() === user.id.toString().toLowerCase();
          })
          .forEach(review => {
            // Map theo BookingId nếu có, nếu không thì map theo BarId (backward compatibility)
            if (review.BookingId || review.bookingId) {
              const bookingId = (review.BookingId || review.bookingId).toString().toLowerCase();
              const key = `booking_${bookingId}`;
              reviewsMap[key] = review;
              console.log('[MyBookings] Mapped bar review by BookingId:', key, bookingId);
            } else if (review.BarId || review.barId) {
              // Backward compatibility: nếu không có BookingId, dùng BarId
              const barId = (review.BarId || review.barId).toString().toLowerCase();
              const key = `bar_${barId}`;
              reviewsMap[key] = review;
              console.log('[MyBookings] Mapped bar review by BarId (no BookingId):', key);
            }
          });
      } catch (err) {
        console.error("[MyBookings] Error fetching bar reviews:", err);
      }

      // Fetch all user reviews (DJ/Dancer)
      try {
        const userReviewsRes = await userReviewApi.getAll();
        const userReviewsList = Array.isArray(userReviewsRes?.data) 
          ? userReviewsRes.data 
          : Array.isArray(userReviewsRes) 
          ? userReviewsRes 
          : [];
        
        // Filter reviews by current user and map by BookingId
        userReviewsList
          .filter(review => {
            const reviewAccountId = review.AccountId || review.accountId;
            return reviewAccountId && reviewAccountId.toString().toLowerCase() === user.id.toString().toLowerCase();
          })
          .forEach(review => {
            // Map theo BookingId nếu có, nếu không thì map theo BusinessId (backward compatibility)
            if (review.BookingId || review.bookingId) {
              const bookingId = (review.BookingId || review.bookingId).toString().toLowerCase();
              const key = `booking_${bookingId}`;
              reviewsMap[key] = review;
              console.log('[MyBookings] Mapped user review by BookingId:', key, bookingId);
            } else if (review.BussinessAccountId || review.bussinessAccountId) {
              // Backward compatibility: nếu không có BookingId, dùng BusinessId
              const businessId = (review.BussinessAccountId || review.bussinessAccountId).toString().toLowerCase();
              const key = `business_${businessId}`;
              reviewsMap[key] = review;
              console.log('[MyBookings] Mapped user review by BusinessId (no BookingId):', key);
            }
          });
      } catch (err) {
        console.error("[MyBookings] Error fetching user reviews:", err);
      }

      setUserReviews(reviewsMap);
    } catch (err) {
      console.error("[MyBookings] Error fetching reviews:", err);
    }
  }, [user?.id]);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!currentUserEntityId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Chỉ cần gọi 1 API vì cả booking tables và DJ/Dancer bookings đều nằm trong cùng bảng BookedSchedules
      // API getBookingsByBooker đã trả về tất cả bookings của booker
      const res = await bookingApi.getBookingsByBooker(currentUserEntityId, { limit: 100 });
      const bookingsData = res.data?.data || res.data || [];

      // Backend đã populate detailSchedule, không cần fetch thêm
      setBookings(bookingsData);
      
      // Fetch reviews after bookings are loaded
      await fetchUserReviews();
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Không thể tải danh sách đặt bàn. Vui lòng thử lại sau.");
      addToast("Lỗi tải danh sách đặt bàn", "error");
    } finally {
      setLoading(false);
    }
  }, [currentUserEntityId, addToast, fetchUserReviews]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleViewDetail = (booking) => {
    setSelectedBooking(booking);
    setDetailModalOpen(true);
  };

  const handleReview = (booking) => {
    const receiverId = booking.receiverId || booking.ReceiverId;
    if (!receiverId) {
      addToast("Không tìm thấy thông tin để gửi review", "error");
      return;
    }

    setReviewBooking(booking);
    setLoadingReviewReceiver(true);
    setReviewReceiverInfo(null);
    setExistingReview(null); // Reset existing review khi tạo mới

    // Fetch receiver info để hiển thị trong modal
    publicProfileApi.getByEntityId(receiverId)
      .then(res => {
        const responseData = res?.data;
        const data = responseData?.data || responseData || {};
        setReviewReceiverInfo(data);
        setReviewModalOpen(true);
      })
      .catch(err => {
        console.error("[MyBookings] Error fetching receiver info for review:", err);
        addToast("Không thể tải thông tin để gửi review", "error");
      })
      .finally(() => {
        setLoadingReviewReceiver(false);
      });
  };

  const handleEditReview = (booking, receiverInfo, review) => {
    setReviewBooking(booking);
    setReviewReceiverInfo(receiverInfo);
    setExistingReview(review);
    setReviewModalOpen(true);
  };

  const handleReviewSubmitted = async () => {
    addToast("Gửi đánh giá thành công!", "success");
    // Refresh reviews ngay lập tức để cập nhật UI
    await fetchUserReviews();
    // Refresh bookings list
    await fetchBookings();
  };

  // Check if booking has been reviewed
  const hasReviewed = useCallback((booking, receiverInfo) => {
    if (!receiverInfo || !user?.id) return false;
    
    // Check ReviewStatus từ booking trước (ưu tiên)
    const reviewStatus = booking?.ReviewStatus || booking?.reviewStatus;
    if (reviewStatus === 'Reviewed' || reviewStatus === 'reviewed') {
      console.log('[MyBookings] Booking already reviewed (ReviewStatus = Reviewed)');
      return true;
    }
    
    const bookingType = booking?.type || booking?.Type || "";
    const isBarBooking = bookingType === "BarTable";
    
    // Lấy BookingId từ booking - thử nhiều cách và normalize
    const rawBookingId = booking?.BookedScheduleId || 
                        booking?.bookedScheduleId || 
                        booking?.BookedScheduleID ||
                        booking?.id ||
                        booking?.Id;
    const bookingId = rawBookingId ? rawBookingId.toString().toLowerCase() : null;
    
    if (isBarBooking) {
      // Ưu tiên check theo BookingId (mỗi booking có thể có 1 review riêng)
      if (bookingId) {
        const checkKey = `booking_${bookingId}`;
        return userReviews[checkKey] !== undefined;
      }
      // Fallback: check theo BarId (backward compatibility)
      const barId = receiverInfo?.targetId || receiverInfo?.barPageId || receiverInfo?.id;
      if (barId) {
        const barKey = `bar_${barId.toString().toLowerCase()}`;
        return userReviews[barKey] !== undefined;
      }
      return false;
    } else {
      // DJ/Dancer: cũng check theo BookingId nếu có
      if (bookingId) {
        const checkKey = `booking_${bookingId}`;
        return userReviews[checkKey] !== undefined;
      }
      // Fallback: check theo BusinessId
      const businessId = receiverInfo?.targetId || receiverInfo?.businessId || receiverInfo?.BussinessAccountId || receiverInfo?.id;
      if (businessId) {
        const businessKey = `business_${businessId.toString().toLowerCase()}`;
        return userReviews[businessKey] !== undefined;
      }
      return false;
    }
  }, [user?.id, userReviews]);

  const handleCancelBooking = async (booking) => {
    const bookingType = booking.type || booking.Type;
    const isDJBooking = bookingType === "DJ" || bookingType === "DANCER" || bookingType === "Performer";
    const scheduleStatus = booking.scheduleStatus || booking.ScheduleStatus;
    
    // Check if booking can be cancelled
    if (scheduleStatus !== "Pending" && scheduleStatus !== "Confirmed") {
      addToast("Chỉ có thể hủy booking đang ở trạng thái Chờ xác nhận hoặc Đã xác nhận", "error");
      return;
    }
    
    const confirmMessage = isDJBooking 
      ? "Bạn có chắc chắn muốn hủy booking này không?"
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

      console.log("[MyBookings] Canceling booking:", {
        bookingId,
        isDJBooking,
        bookingType,
        scheduleStatus
      });

      // Sử dụng cancelDJBooking cho DJ/Dancer bookings, cancelBooking cho table bookings
      let result;
      if (isDJBooking) {
        result = await bookingApi.cancelDJBooking(bookingId);
      } else {
        result = await bookingApi.cancelBooking(bookingId);
      }

      console.log("[MyBookings] Cancel booking result:", result);

      // Check response
      if (result?.data?.success === false) {
        throw new Error(result.data.message || "Không thể hủy booking");
      }

      const successMessage = isDJBooking 
        ? "Hủy booking thành công"
        : "Hủy đặt bàn thành công";
      addToast(successMessage, "success");
      fetchBookings(); // Refresh list
    } catch (err) {
      console.error("[MyBookings] Error canceling booking:", err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message ||
                          (isDJBooking
                            ? "Không thể hủy booking. Vui lòng thử lại."
                            : "Không thể hủy đặt bàn. Vui lòng thử lại.");
      addToast(errorMessage, "error");
    }
  };

  // Check if booking is completed (Ended status, Completed status, or past date + confirmed)
  const isBookingCompleted = (booking) => {
    const scheduleStatus = booking.scheduleStatus || booking.ScheduleStatus;
    
    // Nếu status là "Ended" hoặc "Completed" → đã hoàn thành
    if (scheduleStatus === "Ended" || scheduleStatus === "Completed") {
      return true;
    }
    
    // Nếu status là "Confirmed" và đã qua ngày → đã hoàn thành
    if (scheduleStatus === "Confirmed") {
      const bookingDate = booking.bookingDate || booking.BookingDate;
      if (!bookingDate) return false;
      
      const bookingDateObj = new Date(bookingDate);
      bookingDateObj.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return bookingDateObj < today;
    }
    
    return false;
  };

  const getStatusConfig = (status, booking = null) => {
    // Nếu booking đã hoàn thành (Ended, Completed, hoặc đã qua ngày + confirmed) → hiển thị "Đã hoàn thành"
    if (booking && isBookingCompleted(booking)) {
      return {
        label: "Đã hoàn thành",
        color: "rgb(var(--primary))",
        bg: "rgba(var(--primary), 0.1)",
        icon: CheckCircle
      };
    }
    
    const configs = {
      Pending: { label: "Chờ xác nhận", color: "rgb(var(--warning))", bg: "rgba(var(--warning), 0.1)", icon: AlertCircle },
      Confirmed: { label: "Đã xác nhận", color: "rgb(var(--success))", bg: "rgba(var(--success), 0.1)", icon: CheckCircle },
      Completed: { label: "Hoàn thành", color: "rgb(var(--primary))", bg: "rgba(var(--primary), 0.1)", icon: CheckCircle },
      Ended: { label: "Đã hoàn thành", color: "rgb(var(--primary))", bg: "rgba(var(--primary), 0.1)", icon: CheckCircle },
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
  
  // Separate Pending bookings by Type (BarTable vs DJ/Dancer)
  const pendingBookings = filteredBookings.filter(b => (b.scheduleStatus || b.ScheduleStatus) === "Pending");
  const pendingBarTable = pendingBookings.filter(b => (b.type || b.Type) === "BarTable");
  const pendingDJ = pendingBookings.filter(b => {
    const bookingType = (b.type || b.Type || "").toString().toUpperCase();
    return bookingType === "DJ" || bookingType === "DANCER" || bookingType === "PERFORMER";
  });
  
  // Confirmed bookings (chưa qua ngày)
  const confirmedBookings = filteredBookings.filter(b => {
    const status = b.scheduleStatus || b.ScheduleStatus;
    return status === "Confirmed" && !isBookingCompleted(b);
  });
  
  // Completed bookings (Ended, Completed, hoặc đã qua ngày + confirmed)
  const completedBookings = filteredBookings.filter(b => {
    const status = b.scheduleStatus || b.ScheduleStatus;
    return status === "Ended" || status === "Completed" || (status === "Confirmed" && isBookingCompleted(b));
  });
  
  const groupedBookings = {
    PendingBarTable: pendingBarTable,
    PendingDJ: pendingDJ,
    Confirmed: confirmedBookings,
    Completed: completedBookings,
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

  // Compact Booking Card Component - chỉ hiển thị thông tin cơ bản
  const CompactBookingCard = ({ booking, onViewDetail, onCancel, showCancel = false, reviewButton = null }) => {
    return (
      <div className={cn(
        "bg-card rounded-lg border border-border/20 p-3",
        "shadow-sm hover:shadow-md transition-shadow",
        "flex items-center justify-between gap-3"
      )}>
        <div className={cn("flex flex-col gap-1.5 flex-1 min-w-0")}>
          {/* Booking ID */}
          <div className={cn("text-[0.7rem] text-muted-foreground font-mono break-all leading-tight")}>
            {booking.BookedScheduleId || booking.bookedScheduleId || 'N/A'}
          </div>
          
          {/* Date */}
          <div className={cn("flex items-center gap-1.5 text-sm text-foreground")}>
            <Calendar size={14} className={cn("text-muted-foreground")} />
            <span>{formatDate(booking.bookingDate || booking.BookingDate)}</span>
          </div>
          
          {/* Receiver Info */}
          <div>
            <ReceiverInfo 
              receiverId={booking.receiverId || booking.ReceiverId} 
              bookingType={booking.type || booking.Type}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className={cn("flex items-center gap-2 flex-shrink-0")}>
          <button
            onClick={() => onViewDetail(booking)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium",
              "bg-primary/10 text-primary hover:bg-primary/20",
              "transition-colors"
            )}
          >
            Chi tiết
          </button>
          {showCancel && (
            <button
              onClick={() => onCancel(booking)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium",
                "bg-danger/10 text-danger hover:bg-danger/20",
                "transition-colors"
              )}
            >
              Hủy
            </button>
          )}
          {reviewButton}
        </div>
      </div>
    );
  };

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
              <div className="flex flex-col gap-2">
                {groupedBookings.PendingBarTable.map((booking) => (
                  <CompactBookingCard
                    key={booking.BookedScheduleId || booking.bookedScheduleId}
                    booking={booking}
                    onViewDetail={handleViewDetail}
                    onCancel={handleCancelBooking}
                    showCancel={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending DJ Bookings */}
          {groupedBookings.PendingDJ.length > 0 && (
            <div>
              <h2 className={cn("text-xl font-bold text-foreground mb-4 flex items-center gap-2")}>
                <span className="px-2 py-1 rounded text-sm font-semibold" style={{ backgroundColor: "rgba(var(--primary), 0.1)", color: "rgb(var(--primary))" }}>
                  DJ/Dancer
                </span>
                Chờ xác nhận ({groupedBookings.PendingDJ.length})
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Đang chờ DJ/Dancer xác nhận yêu cầu booking của bạn
              </p>
              <div className="flex flex-col gap-2">
                {groupedBookings.PendingDJ.map((booking) => (
                  <CompactBookingCard
                    key={booking.BookedScheduleId || booking.bookedScheduleId}
                    booking={booking}
                    onViewDetail={handleViewDetail}
                    onCancel={handleCancelBooking}
                    showCancel={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Confirmed Bookings */}
          {groupedBookings.Confirmed.length > 0 && (
            <div>
              <h2 className={cn("text-xl font-bold text-foreground mb-4")}>
                Đã xác nhận ({groupedBookings.Confirmed.length})
              </h2>
              <div className="flex flex-col gap-2">
                {groupedBookings.Confirmed.map((booking) => (
                  <CompactBookingCard
                    key={booking.BookedScheduleId || booking.bookedScheduleId}
                    booking={booking}
                    onViewDetail={handleViewDetail}
                    reviewButton={
                      <ReviewButton
                        receiverId={booking.receiverId || booking.ReceiverId}
                        bookingType={booking.type || booking.Type}
                        booking={booking}
                        userReviews={userReviews}
                        user={user}
                        onReview={handleReview}
                        onEditReview={handleEditReview}
                      />
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Bookings */}
          {groupedBookings.Completed.length > 0 && (
            <div>
              <h2 className={cn("text-xl font-bold text-foreground mb-4")}>
                Hoàn thành ({groupedBookings.Completed.length})
              </h2>
              <div className="flex flex-col gap-2">
                {groupedBookings.Completed.map((booking) => (
                  <CompactBookingCard
                    key={booking.BookedScheduleId || booking.bookedScheduleId}
                    booking={booking}
                    onViewDetail={handleViewDetail}
                    reviewButton={
                      <ReviewButton
                        receiverId={booking.receiverId || booking.ReceiverId}
                        bookingType={booking.type || booking.Type}
                        booking={booking}
                        userReviews={userReviews}
                        user={user}
                        onReview={handleReview}
                        onEditReview={handleEditReview}
                      />
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Rejected Bookings */}
          {groupedBookings.Rejected.length > 0 && (
            <div>
              <h2 className={cn("text-xl font-bold text-foreground mb-4")}>
                Từ chối ({groupedBookings.Rejected.length})
              </h2>
              <div className="flex flex-col gap-2">
                {groupedBookings.Rejected.map((booking) => (
                  <CompactBookingCard
                    key={booking.BookedScheduleId || booking.bookedScheduleId}
                    booking={booking}
                    onViewDetail={handleViewDetail}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Canceled Bookings */}
          {groupedBookings.Canceled.length > 0 && (
            <div>
              <h2 className={cn("text-xl font-bold text-foreground mb-4")}>
                Đã hủy ({groupedBookings.Canceled.length})
              </h2>
              <div className="flex flex-col gap-2">
                {groupedBookings.Canceled.map((booking) => (
                  <CompactBookingCard
                    key={booking.BookedScheduleId || booking.bookedScheduleId}
                    booking={booking}
                    onViewDetail={handleViewDetail}
                  />
                ))}
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

      {/* Review Modal */}
      {reviewBooking && (
        <ReviewModal
          open={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setReviewBooking(null);
            setReviewReceiverInfo(null);
            setExistingReview(null);
          }}
          booking={reviewBooking}
          receiverInfo={reviewReceiverInfo}
          existingReview={existingReview}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
}

