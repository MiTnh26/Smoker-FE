import React, { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import { Button } from "../../../components/common/Button";
import "swiper/css";
import "swiper/css/pagination";
import AddEventModal from "./AddEventModal";
import barEventApi from "../../../api/barEventApi";

export default function BarEvent({ barPageId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    if (!barPageId) return;
    fetchEvents();
  }, [barPageId]);

  const fetchEvents = async () => {
    try {
      const res = await barEventApi.getEventsByBarId(barPageId);
      if (res.status === "success") setEvents(res.data);
    } catch (err) {
      console.error("❌ Lỗi khi tải sự kiện:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEventAdded = async () => {
    await fetchEvents();
    setTimeout(() => setOpenModal(false), 200);
  };

  // 🕓 Hàm định dạng thời gian hiển thị đẹp
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 🟢 Xác định trạng thái sự kiện (status)
  const getStatus = (start, end) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (now < startDate) return { label: "Sắp diễn ra", color: "bg-blue-500" };
    if (now >= startDate && now <= endDate)
      return { label: "Đang diễn ra", color: "bg-green-500" };
    return { label: "Đã kết thúc", color: "bg-gray-500" };
  };

  if (loading) return <p>Đang tải sự kiện...</p>;

  return (
    <div className="profile-card relative p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="section-title font-semibold text-lg">Sự kiện</h3>
        <Button size="sm" onClick={() => setOpenModal(true)}>
          + Thêm sự kiện
        </Button>
      </div>

      {events.length === 0 ? (
        <p>Chưa có sự kiện nào.</p>
      ) : (
        <div className="relative w-full max-w-[19vw] h-[240px] mx-auto overflow-hidden">
          <Swiper
            spaceBetween={10}
            autoplay={events.length > 1 ? { delay: 4000 } : false}
            pagination={{ clickable: true }}
            loop={events.length > 1}
            modules={[Autoplay, Pagination]}
            className="rounded-xl h-full"
          >
            {events.map((ev) => {
              const status = getStatus(ev.StartTime, ev.EndTime);
              return (
                <SwiperSlide key={ev.EventId}>
                  <div className="relative w-full h-full overflow-hidden rounded-xl shadow-md">
                    <img
                      src={ev.Picture || "https://placehold.co/400x200?text=No+Image"}
                      alt={ev.EventName}
                      className="w-full h-full object-cover bg-neutral-800"
                      loading="lazy"
                    />

                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

                    {/* Thông tin chi tiết */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white z-10">
                      <h4 className="text-base font-semibold truncate">{ev.EventName}</h4>
                      <p className="text-xs opacity-90 line-clamp-2">
                        {ev.Description || "Không có mô tả"}
                      </p>

                      <div className="mt-1 text-xs flex flex-col gap-0.5">
                        <p>🕒 Bắt đầu: {formatDate(ev.StartTime)}</p>
                        <p>🏁 Kết thúc: {formatDate(ev.EndTime)}</p>
                      </div>

                      {/* Status badge */}
                      <span
                        className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-md ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
      )}

      {/* Modal thêm sự kiện */}
      {openModal && (
        <AddEventModal
          barPageId={barPageId}
          onClose={() => setOpenModal(false)}
          onSuccess={handleEventAdded}
        />
      )}
    </div>
  );
}
