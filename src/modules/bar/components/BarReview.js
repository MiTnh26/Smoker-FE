import React, { useEffect, useState } from "react";
import { Star } from "lucide-react"; // icon đánh giá

export default function BarReview({ barPageId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔹 Giả lập gọi API — sau này thay bằng barReviewApi.getByBarId(barPageId)
    setTimeout(() => {
      setReviews([
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
      ]);
      setLoading(false);
    }, 500);
  }, [barPageId]);

  if (loading) return <p>Đang tải đánh giá...</p>;
  if (reviews.length === 0) return <p>Chưa có đánh giá nào.</p>;

  return (
    <div className="profile-content">
      <h3 className="section-title mb-4">⭐ Đánh giá của khách hàng</h3>

      <div className="flex flex-col gap-4">
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
                    className={`${
                      i < r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"
                    }`}
                  />
                ))}
              </div>

              <p className="text-gray-300">{r.comment}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
