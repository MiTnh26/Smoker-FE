import React, { useEffect, useState } from "react";
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
        setReviews(
          data
            .filter((r) => !barPageId || r.BarId === barPageId)
            .map((r) => ({
              id: r.BarReviewId,
              userName: r.user?.UserName || "Ẩn danh",
              avatar: r.user?.Avatar || "https://i.pravatar.cc/50",
              rating: r.Star || r.rating || 0,
              comment: r.Content || r.comment || "",
              date: r.created_at || r.date || new Date().toISOString(),
              AccountId: r.AccountId,
              FeedBackContent: r.FeedBackContent,
            }))
        );
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
          }))
      );
      setLoading(false);
    } catch (err) {
      setReviews(mockReviews);
      setError("Không thể tải đánh giá từ server, đang hiển thị dữ liệu mẫu.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("w-full py-8 flex items-center justify-center")}>
        <p className={cn("text-muted-foreground")}>Đang tải đánh giá...</p>
      </div>
    );
  }

  // Kiểm tra user đã review chưa
  const myReview = user && reviews.find((r) => r.AccountId === user.id);

  return (
    <div className={cn("w-full")}>
      {/* Header */}
      <div className={cn("mb-6")}>
        <h3 className={cn(
          "text-xl md:text-2xl font-bold text-foreground"
        )}>
          ⭐ Đánh giá của khách hàng
        </h3>
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

      {/* Form đánh giá */}
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
                <h4 className={cn(
                  "font-semibold text-foreground",
                  "text-sm md:text-base"
                )}>
                  {r.userName}
                </h4>
                <span className={cn(
                  "text-xs text-muted-foreground",
                  "flex-shrink-0 whitespace-nowrap"
                )}>
                  {new Date(r.date).toLocaleDateString("vi-VN")}
                </span>
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
              {/* Nếu là review của user hiện tại thì hiện nút sửa/xóa */}
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
                  <button
                    className={cn(
                      "bg-transparent border-none",
                      "text-danger font-semibold text-xs",
                      "px-3 py-1.5 rounded-lg",
                      "transition-all duration-200",
                      "hover:bg-danger/10",
                      "active:scale-95"
                    )}
                    onClick={() => handleDeleteReview(r.id)}
                  >
                    Xóa
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
