import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import { cn } from "../../../utils/cn";
import "swiper/css";
import "swiper/css/pagination";
import barEventApi from "../../../api/barEventApi";

export default function BarEvent({ barPageId }) {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!barPageId) return;
    fetchEvents();
  }, [barPageId]);

  // Hàm đảm bảo data luôn là array
  const ensureArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (data.items && Array.isArray(data.items)) return data.items;
    if (data.result && Array.isArray(data.result)) return data.result;
    return [];
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await barEventApi.getEventsByBarId(barPageId);
      console.log("📦 API Response:", res); // Debug log

      let eventsData = [];
      
      // Xử lý nhiều định dạng response khác nhau
      if (res.status === "success") {
        eventsData = ensureArray(res.data);
      } else if (res.data && res.data.items) {
        eventsData = ensureArray(res.data.items);
      } else if (Array.isArray(res)) {
        eventsData = res;
      } else if (res.data && Array.isArray(res.data)) {
        eventsData = res.data;
      } else {
        console.warn("⚠️ Unexpected API response format:", res);
      }

      console.log("🎯 Processed events:", eventsData);
      setEvents(eventsData);

    } catch (err) {
      console.error("❌ Lỗi khi tải sự kiện:", err);
      setError("Không thể tải sự kiện");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // 🕓 Hàm định dạng thời gian hiển thị đẹp
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  // 🟢 Xác định trạng thái sự kiện (status)
  const getStatus = (start, end, status) => {
    // Ưu tiên status từ backend
    if (status === "ended") return { label: t("bar.ended"), color: "bg-gray-500" };
    if (status === "invisible") return { label: t("bar.invisible"), color: "bg-orange-500" };
    
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (now < startDate) return { label: t("bar.upcoming"), color: "bg-blue-500" };
    if (now >= startDate && now <= endDate)
      return { label: t("bar.ongoing"), color: "bg-green-500" };
    return { label: t("bar.ended"), color: "bg-gray-500" };
  };

  // Hiển thị loading
  if (loading) {
    return (
      <div className={cn("w-full py-8 flex items-center justify-center")}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className={cn("text-muted-foreground")}>{t("bar.loadingEvents")}</p>
        </div>
      </div>
    );
  }

  // Hiển thị lỗi
  if (error) {
    return (
      <div className={cn("w-full py-8 flex items-center justify-center")}>
        <div className="text-center">
          <p className={cn("text-red-500 mb-2")}>❌ {error}</p>
          <button 
            onClick={fetchEvents}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Đảm bảo events là array trước khi render
  const safeEvents = Array.isArray(events) ? events : [];

  return (
    <div className={cn("w-full")}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between mb-6",
        "px-4 md:px-0"
      )}>
        <h3 className={cn(
          "text-xl md:text-2xl font-bold text-foreground"
        )}>
          {t("bar.events")}
        </h3>
      </div>

      {safeEvents.length === 0 ? (
        <div className={cn(
          "w-full py-12 flex items-center justify-center",
          "bg-card rounded-lg border-[0.5px] border-border/20",
          "px-4 md:px-0"
        )}>
          <p className={cn("text-muted-foreground")}>{t("bar.noEvents")}</p>
        </div>
      ) : (
        <div className={cn(
          "relative w-full h-[400px] md:h-[500px] lg:h-[600px]",
          "overflow-hidden rounded-lg",
          "bg-card border-[0.5px] border-border/20",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        )}>
          <Swiper
            spaceBetween={0}
            autoplay={safeEvents.length > 1 ? { delay: 4000 } : false}
            pagination={{ clickable: true }}
            loop={safeEvents.length > 1}
            modules={[Autoplay, Pagination]}
            className={cn("w-full h-full")}
          >
            {safeEvents.map((ev) => {
              if (!ev) return null; // Bảo vệ trường hợp event null
              
              const status = getStatus(ev.StartTime, ev.EndTime, ev.Status);
              return (
                <SwiperSlide key={ev.EventId || Math.random()}>
                  <div className={cn("relative w-full h-full overflow-hidden")}>
                    <img
                      src={ev.Picture || "https://placehold.co/1200x600?text=No+Image"}
                      alt={ev.EventName || "Event"}
                      className={cn("w-full h-full object-cover bg-muted")}
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = "https://placehold.co/1200x600?text=No+Image";
                      }}
                    />

                    {/* Overlay gradient - Multi-layer for better text readability */}
                    <div className={cn(
                      "absolute inset-0",
                      "bg-gradient-to-t from-black via-black/60 via-black/30 to-transparent"
                    )} />
                    <div className={cn(
                      "absolute inset-0",
                      "bg-gradient-to-b from-black/20 via-transparent to-black/80"
                    )} />

                    {/* Content Container - Refined Layout */}
                    <div className={cn(
                      "absolute inset-0 flex flex-col justify-between",
                      "p-5 md:p-6 lg:p-7 text-white z-10"
                    )}>
                      {/* Top Section - Title & Status Badge */}
                      <div className={cn("flex items-center justify-between gap-3")}>
                        <div className={cn("flex-1")}>
                          <h4 className={cn(
                            "text-3xl md:text-4xl lg:text-5xl font-extrabold",
                            "leading-tight tracking-tight",
                            "text-white",
                            "drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                          )}>
                            {ev.EventName || "Unnamed Event"}
                          </h4>
                        </div>
                        
                        {/* Status Badge - Top Right */}
                        <div className={cn(
                          "flex-shrink-0",
                          "backdrop-blur-md bg-black/40 rounded-lg",
                          "px-3 py-1.5 border border-white/20",
                          "shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
                          "self-start mt-1"
                        )}>
                          <span className={cn(
                            "inline-flex items-center justify-center gap-1.5",
                            "text-xs md:text-sm font-semibold",
                            "text-white whitespace-nowrap"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              status.color === "bg-blue-500" && "bg-blue-400",
                              status.color === "bg-green-500" && "bg-green-400",
                              status.color === "bg-gray-500" && "bg-gray-400",
                              status.color === "bg-orange-500" && "bg-orange-400",
                              "animate-pulse"
                            )} />
                            {status.label}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Section - Description & Time Info */}
                      <div className={cn("space-y-3")}>
                        {/* Description */}
                        {ev.Description && (
                          <div className={cn(
                            "max-w-xl",
                            "backdrop-blur-sm bg-black/25 rounded-lg",
                            "px-4 py-3 border border-white/10",
                            "shadow-[0_1px_4px_rgba(0,0,0,0.2)]"
                          )}>
                            <p className={cn(
                              "text-sm md:text-base",
                              "leading-relaxed",
                              "text-white/90",
                              "line-clamp-2",
                              "drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                            )}>
                              {ev.Description}
                            </p>
                          </div>
                        )}

                        {/* Time Information - Card Style */}
                        <div className={cn(
                          "flex flex-col md:flex-row gap-2.5 md:gap-3",
                          "backdrop-blur-md bg-black/45 rounded-lg",
                          "px-4 py-3 border border-white/15",
                          "shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                        )}>
                          {/* Start Time */}
                          <div className={cn(
                            "flex items-center gap-2.5",
                            "flex-1"
                          )}>
                            <div className={cn(
                              "w-8 h-8 rounded-lg",
                              "bg-white/10 backdrop-blur-sm",
                              "flex items-center justify-center",
                              "border border-white/20"
                            )}>
                              <i className="bx bx-calendar text-base text-white"></i>
                            </div>
                            <div className={cn("flex-1 min-w-0")}>
                              <p className={cn(
                                "text-[10px] md:text-xs font-medium",
                                "text-white/60 mb-0.5",
                                "uppercase tracking-wider"
                              )}>
                                {t("bar.startTime")}
                              </p>
                              <p className={cn(
                                "text-xs md:text-sm font-semibold",
                                "text-white",
                                "drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
                                "truncate"
                              )}>
                                {formatDate(ev.StartTime)}
                              </p>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className={cn(
                            "hidden md:block w-px bg-white/15"
                          )} />

                          {/* End Time */}
                          <div className={cn(
                            "flex items-center gap-2.5",
                            "flex-1"
                          )}>
                            <div className={cn(
                              "w-8 h-8 rounded-lg",
                              "bg-white/10 backdrop-blur-sm",
                              "flex items-center justify-center",
                              "border border-white/20"
                            )}>
                              <i className="bx bx-time-five text-base text-white"></i>
                            </div>
                            <div className={cn("flex-1 min-w-0")}>
                              <p className={cn(
                                "text-[10px] md:text-xs font-medium",
                                "text-white/60 mb-0.5",
                                "uppercase tracking-wider"
                              )}>
                                {t("bar.endTime")}
                              </p>
                              <p className={cn(
                                "text-xs md:text-sm font-semibold",
                                "text-white",
                                "drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
                                "truncate"
                              )}>
                                {formatDate(ev.EndTime)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
      )}
    </div>
  );
}