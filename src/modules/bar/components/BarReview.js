import React, { useEffect, useState, useMemo } from "react";
import { Star } from "lucide-react";
import { cn } from "../../../utils/cn";
import barReviewApi from "../../../api/barReviewApi";
import { useAuth } from "../../../hooks/useAuth";

function StarInput({ value, onChange, disabled }) {
  return (
    <div className={cn("flex items-center gap-1")}>
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          type="button"
          key={i}
          onClick={() => !disabled && onChange(i + 1)}
          className={cn(
            "bg-transparent border-none cursor-pointer",
            "transition-all duration-200",
            "hover:opacity-80 active:scale-95",
            "focus:outline-none"
          )}
          disabled={disabled}
        >
          <Star
            size={20}
            className={cn(
              i < value
                ? "text-warning fill-warning"
                : "text-muted-foreground/40"
            )}
          />
        </button>
      ))}
    </div>
  );
}
// Dữ liệu giả lập fallback
const mockReviews = [
  {
    id: 1,
    userName: "Nguyễn Văn A",
    avatar: "https://i.pravatar.cc/50?img=1",
    rating: 5,
    comment: "Không gian đẹp, nhạc cực cháy 🔥",
    date: "2025-10-20",
  },
  {
    id: 2,
    userName: "Lê Thị B",
    avatar: "https://i.pravatar.cc/50?img=2",
    rating: 4,
    comment: "Đồ uống ổn, phục vụ thân thiện.",
    date: "2025-10-18",
  },
];

export default function BarReview({ barPageId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [form, setForm] = useState({ rating: 0, comment: "" });
  const [editingId, setEditingId] = useState(null);
  // Lấy tất cả review theo barId (giả sử API có filter theo barId, nếu chưa có thì lấy tất cả)
  useEffect(() => {
    setLoading(true);
    setError(null);
    barReviewApi
      .getAll()
      .then((res) => {
        // Nếu API trả về mảng, map lại cho đúng định dạng FE
        const data = Array.isArray(res) ? res : [];
        // console.log('🔄 [BarReview] Fetched data:', data);
        const mappedReviews = data
          .filter((r) => !barPageId || r.BarId === barPageId)
          .map((r) => ({
            id: r.BarReviewId,
            userName: r.user?.UserName || "Ẩn danh",
            avatar: r.user?.Avatar || "https://i.pravatar.cc/50",
            rating: r.Star || r.rating || 0,
            comment: r.Content || r.comment || "",
            date: r.created_at || r.date || new Date().toISOString(),
            AccountId: r.AccountId,
            Picture: r.Picture, // Ảnh feed
            FeedBackContent: r.FeedBackContent, // Ảnh back hoặc text
            BookingId: r.BookingId || r.bookingId, // ID booking
            BookingDate: r.BookingDate || r.bookingDate, // Ngày book
            TableName: r.TableName || r.tableName, // Tên bàn
          }));
        
        // Debug: Log reviews với ảnh
        mappedReviews.forEach((r) => {
          if (r.Picture || r.FeedBackContent) {
            console.log('[BarReview] Review with images:', {
              id: r.id,
              userName: r.userName,
              hasPicture: !!r.Picture,
              hasFeedBackContent: !!r.FeedBackContent,
              Picture: r.Picture,
              FeedBackContent: r.FeedBackContent
            });
          }
        });
        
        setReviews(mappedReviews);
        // console.log('✅ [BarReview] Fetched data:', data);
        setLoading(false);
      })
      .catch((err) => {
        // Nếu lỗi, dùng dữ liệu giả lập
        setReviews(mockReviews);
        setError("Không thể tải đánh giá từ server, đang hiển thị dữ liệu mẫu.");
        setLoading(false);
      });
  }, [barPageId]);



  // Thêm hoặc cập nhật review
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const reviewData = {
      BarId: barPageId,
      Star: form.rating,
      Content: form.comment,
      AccountId: user?.id,
      // Nếu muốn lưu avatar, truyền vào Picture
      Picture: user?.avatar || null,
    };
    try {
      if (editingId) {
        await barReviewApi.update(editingId, reviewData);
      } else {
        await barReviewApi.create(reviewData);
      }
      setForm({ rating: 0, comment: "" });
      setEditingId(null);
      await reloadReviews();
    } catch (err) {
      setError(editingId ? "Không thể cập nhật đánh giá." : "Không thể thêm đánh giá mới.");
      setLoading(false);
    }
  };

  // Xóa review
  const handleDeleteReview = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await barReviewApi.remove(id);
      await reloadReviews();
    } catch (err) {
      setError("Không thể xóa đánh giá.");
      setLoading(false);
    }
  };

  // Bắt đầu sửa review
  const handleEdit = (r) => {
    setForm({ rating: r.rating, comment: r.comment });
    setEditingId(r.id);
  };

  // Hủy sửa
  const handleCancelEdit = () => {
    setForm({ rating: 0, comment: "" });
    setEditingId(null);
  };

  // Hàm reload lại danh sách review (dùng lại logic useEffect)
  const reloadReviews = async () => {
    try {
      const res = await barReviewApi.getAll();
      const data = Array.isArray(res) ? res : [];
      // console.log('🔄 [BarReview] Reloaded data:', data);
      setReviews(
        data
          .filter((r) => !barPageId || r.BarId === barPageId)
          .map((r) => ({
            id: r.BarReviewId || r.id,
            userName: r.user?.UserName || "Ẩn danh",
            avatar: r.user?.Avatar || "https://i.pravatar.cc/50",
            rating: r.Star || r.rating || 0,
            comment: r.Content || r.comment || "",
            date: r.created_at || r.date || new Date().toISOString(),
            AccountId: r.AccountId,
            Picture: r.Picture, // Ảnh feed
            FeedBackContent: r.FeedBackContent, // Ảnh back hoặc text
            BookingId: r.BookingId || r.bookingId, // ID booking
            BookingDate: r.BookingDate || r.bookingDate, // Ngày book
            TableName: r.TableName || r.tableName, // Tên bàn
          }))
          .sort((a, b) => {
            // Sắp xếp theo ngày review mới nhất trước
            return new Date(b.date) - new Date(a.date);
          })
      );
      setLoading(false);
    } catch (err) {
      setReviews(mockReviews);
      setError("Không thể tải đánh giá từ server, đang hiển thị dữ liệu mẫu.");
      setLoading(false);
    }
  };

  // Không cần check myReview nữa vì mỗi booking có thể có review riêng
  // Form review trong component này chỉ dùng cho backward compatibility
  // Review chính được gửi từ MyBookings với BookingId cụ thể
  const myReview = null; // Disable form review trong component này

  // Tính số sao trung bình và breakdown
  const reviewStats = useMemo(() => {
    if (reviews.length === 0) {
      return { average: 0, count: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }
    const totalStars = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    const average = totalStars / reviews.length;
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const star = r.rating || 0;
      if (star >= 1 && star <= 5) {
        breakdown[star] = (breakdown[star] || 0) + 1;
      }
    });
    return { average, count: reviews.length, breakdown };
  }, [reviews]);

  // Kiểm tra user có phải là customer không (không phải BAR, DJ, DANCER)
  const isCustomer = useMemo(() => {
    if (!user) return false;
    try {
      const sessionRaw = localStorage.getItem("session");
      if (!sessionRaw) return false;
      const session = JSON.parse(sessionRaw);
      const active = session?.activeEntity || {};
      const role = (active.Role || active.role || user.role || user.Role || "").toString().toUpperCase();
      // Customer là user không có role BAR, DJ, DANCER, hoặc không có role
      return !role || (!role.includes("BAR") && !role.includes("DJ") && !role.includes("DANCER") && !role.includes("BUSINESS"));
    } catch {
      // Nếu không parse được session, giả sử là customer nếu có user
      return !!user;
    }
  }, [user]);

  if (loading) {
    return (
      <div className={cn("w-full py-8 flex items-center justify-center")}>
        <p className={cn("text-muted-foreground")}>Đang tải đánh giá...</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full")}>
      {/* Header */}
      <div className={cn("mb-6")}>
        <h3 className={cn(
          "text-xl md:text-2xl font-bold text-foreground mb-2"
        )}>
          ⭐ Đánh giá của khách hàng
        </h3>
        {reviewStats.count > 0 ? (
          <div className={cn("flex flex-col gap-2")}>
            <div className={cn("flex items-center gap-2")}>
              <span className={cn("text-lg font-semibold text-foreground")}>
                {reviewStats.average.toFixed(1)}
              </span>
              <div className={cn("flex items-center gap-0.5")}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className={cn(
                      i < Math.round(reviewStats.average)
                        ? "text-warning fill-warning"
                        : "text-muted-foreground/40"
                    )}
                  />
                ))}
              </div>
              <span className={cn("text-sm text-muted-foreground")}>
                ({reviewStats.count} đánh giá)
              </span>
            </div>
            <div className={cn("flex flex-wrap gap-3 text-xs text-muted-foreground")}>
              {[5, 4, 3, 2, 1].map((star) => (
                <span key={star} className={cn("flex items-center gap-1")}>
                  <Star size={12} className={cn("text-warning fill-warning")} />
                  <span>{star}★</span>
                  <span>({reviewStats.breakdown[star] || 0})</span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className={cn("text-sm text-muted-foreground")}>
            Chưa có đánh giá nào
          </p>
        )}
      </div>

      {error && (
        <div className={cn(
          "mb-4 p-3 rounded-lg",
          "bg-warning/10 border-[0.5px] border-warning/20",
          "text-warning text-sm"
        )}>
          {error}
        </div>
      )}

      {/* Form đánh giá - chỉ hiển thị cho customer */}
      {isCustomer && (
      <form
        className={cn(
          "mb-6 bg-card rounded-lg",
          "border-[0.5px] border-border/20",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
          "p-4 md:p-5 flex flex-col gap-4"
        )}
        onSubmit={handleSubmit}
      >
        <div className={cn("flex items-center gap-3 flex-wrap")}>
          <span className={cn("text-sm font-medium text-foreground")}>
            Chọn số sao:
          </span>
          <StarInput
            value={form.rating}
            onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
            disabled={!!myReview && !editingId}
          />
        </div>
        <textarea
          className={cn(
            "w-full px-4 py-2.5 rounded-lg",
            "border-[0.5px] border-border/20",
            "bg-background text-foreground",
            "outline-none transition-all duration-200",
            "placeholder:text-muted-foreground/60",
            "focus:border-primary/40 focus:ring-1 focus:ring-primary/20",
            "resize-y",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          rows={3}
          placeholder="Nhập nhận xét của bạn..."
          value={form.comment}
          onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
          disabled={!!myReview && !editingId}
        />
        <div className={cn("flex items-center gap-2 flex-wrap")}>
          <button
            type="submit"
            className={cn(
              "bg-warning text-foreground border-none",
              "px-4 py-2 rounded-lg font-semibold text-sm",
              "transition-all duration-200",
              "hover:bg-warning/90",
              "active:scale-95",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            )}
            disabled={form.rating === 0 || !form.comment.trim() || (!!myReview && !editingId)}
          >
            {editingId ? "Cập nhật" : "Gửi đánh giá"}
          </button>
          {editingId && (
            <button
              type="button"
              className={cn(
                "bg-transparent border-none",
                "text-muted-foreground font-semibold",
                "px-4 py-2 rounded-lg text-sm",
                "transition-all duration-200",
                "hover:text-foreground hover:bg-muted/50",
                "active:scale-95"
              )}
              onClick={handleCancelEdit}
            >
              Hủy
            </button>
          )}
        </div>
        {!!myReview && !editingId && (
          <div className={cn(
            "text-xs text-muted-foreground",
            "p-2 rounded-lg bg-muted/30"
          )}>
            Bạn đã đánh giá quán này. Bạn có thể sửa hoặc xóa đánh giá bên dưới.
          </div>
        )}
      </form>
      )}
      
      {!isCustomer && user && (
        <div className={cn(
          "mb-6 bg-card rounded-lg",
          "border-[0.5px] border-border/20",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
          "p-4 md:p-5"
        )}>
          <p className={cn("text-sm text-muted-foreground")}>
            Chỉ khách hàng mới có thể đánh giá quán bar.
          </p>
        </div>
      )}

      {/* Danh sách đánh giá */}
      <div className={cn("flex flex-col gap-4")}>
        {reviews.length === 0 && (
          <div className={cn(
            "w-full py-12 flex items-center justify-center",
            "bg-card rounded-lg border-[0.5px] border-border/20",
            "px-4 md:px-0"
          )}>
            <p className={cn("text-muted-foreground")}>Chưa có đánh giá nào.</p>
          </div>
        )}
        {reviews.map((r) => (
          <div
            key={r.id}
            className={cn(
              "bg-card rounded-lg",
              "border-[0.5px] border-border/20",
              "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
              "p-4 md:p-5 flex gap-4 items-start"
            )}
          >
            <img
              src={r.avatar}
              alt={r.userName}
              className={cn(
                "w-10 h-10 md:w-12 md:h-12 rounded-full object-cover",
                "flex-shrink-0 border-2 border-border/20"
              )}
            />
            <div className={cn("flex-1 min-w-0")}>
              <div className={cn("flex justify-between items-start mb-2 gap-2")}>
                <div className={cn("flex-1")}>
                  <div className={cn("flex items-center gap-2 mb-1")}>
                    <h4 className={cn(
                      "font-semibold text-foreground",
                      "text-sm md:text-base"
                    )}>
                      {r.userName}
                    </h4>
                    {/* Badge "Đã đánh giá" nếu có BookingId (review từ booking cụ thể) */}
                    {r.BookingId && (
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        "bg-success/10 text-success border border-success/20"
                      )}>
                        ✓ Đã đánh giá
                      </span>
                    )}
                  </div>
                  {/* Thông tin booking - hiển thị nổi bật theo chiều ngang */}
                  {(r.TableName || r.BookingDate) && (
                    <div className={cn(
                      "mb-3 p-3 rounded-lg",
                      "bg-primary/5 border border-primary/20"
                    )}>
                      <p className={cn("text-xs font-semibold text-muted-foreground mb-2")}>
                        Thông tin đặt bàn:
                      </p>
                      <div className={cn("flex flex-wrap items-center gap-3 text-sm")}>
                        {r.BookingDate && (
                          <div className={cn("flex items-center gap-2")}>
                            <span className={cn("text-muted-foreground font-medium")}>Ngày:</span>
                            <span className={cn("px-2.5 py-1 rounded-md bg-warning/10 text-warning font-semibold")}>
                              {new Date(r.BookingDate).toLocaleDateString("vi-VN", {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                        {r.TableName && (
                          <div className={cn("flex items-center gap-2")}>
                            <span className={cn("text-muted-foreground font-medium")}>Bàn đã đặt:</span>
                            <span className={cn("px-2.5 py-1 rounded-md bg-primary/10 text-primary font-semibold")}>
                              {r.TableName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className={cn("flex flex-col items-end gap-1")}>
                  <span className={cn(
                    "text-xs text-muted-foreground",
                    "flex-shrink-0 whitespace-nowrap"
                  )}>
                    ⭐ Đánh giá: {new Date(r.date).toLocaleDateString("vi-VN", {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
              <div className={cn("flex items-center gap-0.5 mb-2")}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={cn(
                      i < r.rating
                        ? "text-warning fill-warning"
                        : "text-muted-foreground/40"
                    )}
                  />
                ))}
              </div>
              <p className={cn(
                "text-sm md:text-base text-foreground mb-2",
                "leading-relaxed whitespace-pre-wrap break-words"
              )}>
                {r.comment}
              </p>
              
              {/* Hiển thị ảnh feed và back nếu có - gọn và cân đối */}
              {(r.Picture || r.FeedBackContent) && (
                <div className={cn("mt-3")}>
                  {/* Kiểm tra xem có cả 2 ảnh không */}
                  {(() => {
                    const hasPicture = r.Picture && r.Picture.trim() !== '';
                    const hasFeedbackImage = r.FeedBackContent && 
                      r.FeedBackContent.trim() !== '' && 
                      (r.FeedBackContent.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) || 
                       r.FeedBackContent.startsWith('data:image') ||
                       r.FeedBackContent.startsWith('http'));
                    
                    // Nếu có cả 2 ảnh, hiển thị cạnh nhau với kích thước gọn hơn
                    if (hasPicture && hasFeedbackImage) {
                      return (
                        <div className={cn("grid grid-cols-2 gap-2")}>
                          <div className={cn("relative rounded-lg overflow-hidden border border-border/20 bg-muted/10 group")}>
                            <img
                              src={r.Picture}
                              alt="Review feed"
                              className={cn("w-full h-32 sm:h-40 object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105")}
                              onClick={() => window.open(r.Picture, '_blank')}
                              onError={(e) => {
                                console.error('[BarReview] Error loading Picture:', r.Picture);
                                e.target.style.display = 'none';
                              }}
                            />
                            <div className={cn("absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200")} />
                          </div>
                          <div className={cn("relative rounded-lg overflow-hidden border border-border/20 bg-muted/10 group")}>
                            <img
                              src={r.FeedBackContent}
                              alt="Review back"
                              className={cn("w-full h-32 sm:h-40 object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105")}
                              onClick={() => window.open(r.FeedBackContent, '_blank')}
                              onError={(e) => {
                                console.error('[BarReview] Error loading FeedBackContent:', r.FeedBackContent);
                                e.target.style.display = 'none';
                              }}
                            />
                            <div className={cn("absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200")} />
                          </div>
                        </div>
                      );
                    }
                    
                    // Nếu chỉ có 1 ảnh, hiển thị với kích thước gọn hơn
                    return (
                      <div className={cn("flex flex-col gap-2")}>
                        {hasPicture && (
                          <div className={cn("relative rounded-lg overflow-hidden border border-border/20 bg-muted/10 group max-w-xs")}>
                            <img
                              src={r.Picture}
                              alt="Review feed"
                              className={cn("w-full h-40 sm:h-48 object-cover cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]")}
                              onClick={() => window.open(r.Picture, '_blank')}
                              onError={(e) => {
                                console.error('[BarReview] Error loading Picture:', r.Picture);
                                e.target.style.display = 'none';
                              }}
                            />
                            <div className={cn("absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200")} />
                          </div>
                        )}
                        {r.FeedBackContent && (
                          <div className={cn("relative rounded-lg overflow-hidden border border-border/20 bg-muted/10 max-w-xs")}>
                            {/* Check if FeedBackContent is an image URL */}
                            {r.FeedBackContent.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) || 
                             r.FeedBackContent.startsWith('data:image') ||
                             r.FeedBackContent.startsWith('http') ? (
                              <div className={cn("group")}>
                                <img
                                  src={r.FeedBackContent}
                                  alt="Review back"
                                  className={cn("w-full h-40 sm:h-48 object-cover cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]")}
                                  onClick={() => window.open(r.FeedBackContent, '_blank')}
                                  onError={(e) => {
                                    console.error('[BarReview] Error loading FeedBackContent image:', r.FeedBackContent);
                                    e.target.style.display = 'none';
                                  }}
                                />
                                <div className={cn("absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200")} />
                              </div>
                            ) : (
                              <p className={cn(
                                "text-sm text-foreground p-3",
                                "leading-relaxed whitespace-pre-wrap break-words"
                              )}>
                                {r.FeedBackContent}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {/* Nếu là review của user hiện tại thì hiện nút sửa */}
              {user && r.AccountId === user.id && (
                <div className={cn("flex gap-2 mt-2")}>
                  <button
                    className={cn(
                      "bg-transparent border-none",
                      "text-primary font-semibold text-xs",
                      "px-3 py-1.5 rounded-lg",
                      "transition-all duration-200",
                      "hover:bg-primary/10",
                      "active:scale-95"
                    )}
                    onClick={() => handleEdit(r)}
                  >
                    Sửa
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
