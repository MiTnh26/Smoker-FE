
import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import barReviewApi from "../../../api/barReviewApi";
import { useAuth } from "../../../hooks/useAuth";

function StarInput({ value, onChange, disabled }) {
  return (
    <div className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          type="button"
          key={i}
          onClick={() => !disabled && onChange(i + 1)}
          className="focus:outline-none"
          disabled={disabled}
        >
          <Star
            size={20}
            className={
              i < value
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-600"
            }
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

  // Log reviews mỗi khi state reviews thay đổi
  // useEffect(() => {
  //   console.log('Current Reviews State:', reviews);
  // }, [reviews]);
  if (loading) return <p>Đang tải đánh giá...</p>;

  // Kiểm tra user đã review chưa
  const myReview = user && reviews.find((r) => r.AccountId === user.id);

  return (
    <div className="profile-content">
      <h3 className="section-title mb-4">⭐ Đánh giá của khách hàng</h3>
      {error && (
        <div className="text-yellow-400 text-sm mb-2">{error}</div>
      )}

      {/* Form đánh giá */}
      <form
        className="mb-6 bg-[#232323] p-4 rounded-xl flex flex-col gap-3 border border-gray-700"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">Chọn số sao:</span>
          <StarInput
            value={form.rating}
            onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
            disabled={!!myReview && !editingId}
          />
        </div>
        <textarea
          className="rounded p-2 bg-[#181818] text-white border border-gray-600"
          rows={3}
          placeholder="Nhập nhận xét của bạn..."
          value={form.comment}
          onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
          disabled={!!myReview && !editingId}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-1 rounded"
            disabled={form.rating === 0 || !form.comment.trim() || (!!myReview && !editingId)}
          >
            {editingId ? "Cập nhật" : "Gửi đánh giá"}
          </button>
          {editingId && (
            <button
              type="button"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-1 rounded"
              onClick={handleCancelEdit}
            >
              Hủy
            </button>
          )}
        </div>
        {!!myReview && !editingId && (
          <div className="text-gray-400 text-xs">Bạn đã đánh giá quán này. Bạn có thể sửa hoặc xóa đánh giá bên dưới.</div>
        )}
      </form>

      {/* Danh sách đánh giá */}
      <div className="flex flex-col gap-4">
        {reviews.length === 0 && <p>Chưa có đánh giá nào.</p>}
        {reviews.map((r) => (
          <div
            key={r.id}
            className="bg-[#1a1a1a] p-4 rounded-2xl shadow-md flex gap-4 items-start border border-gray-700"
          >
            <img
              src={r.avatar}
              alt={r.userName}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-semibold text-white">{r.userName}</h4>
                <span className="text-xs text-gray-400">
                  {new Date(r.date).toLocaleDateString("vi-VN")}
                </span>
              </div>
              <div className="flex mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={
                      i < r.rating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-600"
                    }
                  />
                ))}
              </div>
              <p className="text-gray-300 mb-2">{r.comment}</p>
              {/* Nếu là review của user hiện tại thì hiện nút sửa/xóa */}
              {user && r.AccountId === user.id && (
                <div className="flex gap-2 mt-1">
                  <button
                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                    onClick={() => handleEdit(r)}
                  >
                    Sửa
                  </button>
                  <button
                    className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
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
