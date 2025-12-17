import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../utils/cn";
import barEventApi from "../../../api/barEventApi";
import { 
  Calendar, 
  Clock, 
  Star, 
  MapPin, 
  Loader2,
  Filter,
  ChevronRight
} from "lucide-react";

export default function EventsFeedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [bars, setBars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24); // Mặc định 24 giờ
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);

  const timeRangeOptions = [
    { value: 24, label: "24 giờ tới" },
    { value: 168, label: "7 ngày tới" },
    { value: 720, label: "30 ngày tới" },
    { value: 2160, label: "90 ngày tới" }
  ];

  // Fetch bars có events mới
  const fetchBarsWithNewEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await barEventApi.getBarsWithNewEvents({
        hours: timeRange,
        skip: 0,
        take: 50
      });

      if (res?.data?.status === "success" || res?.status === "success") {
        const data = res?.data?.data || res?.data || {};
        const items = data.items || [];
        
        // Map data để đảm bảo đúng structure
        const mappedBars = items.map(bar => ({
          barPageId: bar.barPageId || bar.BarPageId,
          entityAccountId: bar.entityAccountId || bar.EntityAccountId,
          barName: bar.barName || bar.BarName || "Unknown",
          avatar: bar.avatar || bar.Avatar,
          background: bar.background || bar.Background,
          address: bar.address || bar.Address,
          phoneNumber: bar.phoneNumber || bar.PhoneNumber,
          email: bar.email || bar.Email,
          reviewCount: bar.reviewCount || bar.ReviewCount || 0,
          averageRating: bar.averageRating !== null && bar.averageRating !== undefined 
            ? bar.averageRating 
            : (bar.AverageRating !== null && bar.AverageRating !== undefined ? bar.AverageRating : null),
          eventCount: bar.eventCount || bar.EventCount || 0,
          nearestEventStartTime: bar.nearestEventStartTime || bar.NearestEventStartTime || bar.latestEventStartTime || bar.LatestEventStartTime,
          latestEventStartTime: bar.latestEventStartTime || bar.LatestEventStartTime || bar.nearestEventStartTime || bar.NearestEventStartTime
        }));
        
        setBars(mappedBars);
        setTotal(data.total || mappedBars.length);
      } else {
        setBars([]);
        setTotal(0);
        setError("Không thể tải dữ liệu sự kiện");
      }
    } catch (err) {
      console.error("Lỗi tải bars:", err);
      setBars([]);
      setTotal(0);
      setError(err.response?.data?.message || "Đã xảy ra lỗi khi tải danh sách sự kiện");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBarsWithNewEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "—";
    }
  };

  const formatTimeUntil = (dateStr) => {
    if (!dateStr) return "";
    try {
      const now = new Date();
      const eventDate = new Date(dateStr);
      const diffMs = eventDate - now;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (diffDays > 0) {
        return `Còn ${diffDays} ngày`;
      } else if (diffHours > 0) {
        return `Còn ${diffHours} giờ`;
      } else {
        return "Sắp diễn ra";
      }
    } catch {
      return "";
    }
  };

  const handleBarClick = (bar) => {
    const barPageId = bar.barPageId || bar.BarPageId;
    const entityAccountId = bar.entityAccountId || bar.EntityAccountId;
    
    // Ưu tiên navigate đến bar page nếu có barPageId
    if (barPageId) {
      navigate(`/bar/${barPageId}`);
    } else if (entityAccountId) {
      navigate(`/profile/${entityAccountId}`);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sự kiện nổi bật</h1>
        <p className="text-gray-600">
          Khám phá các quán bar có sự kiện sắp diễn ra, được sắp xếp theo đánh giá
        </p>
      </div>

      {/* Filter Section */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Lọc theo thời gian:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "border-2",
                timeRange === option.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:text-blue-600"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="mb-4 text-sm text-gray-600">
          Tìm thấy <span className="font-semibold text-gray-900">{total}</span> quán bar có sự kiện
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={fetchBarsWithNewEvents}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : bars.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">Không tìm thấy quán bar nào</p>
          <p className="text-gray-500 text-sm">
            Thử chọn khoảng thời gian khác để xem thêm sự kiện
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bars.map((bar) => (
            <div
              key={bar.barPageId || bar.entityAccountId || Math.random()}
              onClick={() => handleBarClick(bar)}
              className={cn(
                "bg-white rounded-lg border border-gray-200 shadow-sm",
                "hover:shadow-lg transition-all duration-300 overflow-hidden",
                "cursor-pointer group"
              )}
            >
              {/* Bar Avatar/Background */}
              <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
                {bar.background ? (
                  <img
                    src={bar.background}
                    alt={bar.barName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : null}
                
                {/* Rating Badge */}
                {bar.averageRating && (
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5">
                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-semibold text-gray-900">
                      {bar.averageRating}
                    </span>
                    {bar.reviewCount > 0 && (
                      <span className="text-xs text-gray-500">
                        ({bar.reviewCount})
                      </span>
                    )}
                  </div>
                )}

                {/* Event Count Badge */}
                {bar.eventCount > 0 && (
                  <div className="absolute top-3 left-3 bg-blue-600 text-white rounded-full px-3 py-1.5 text-xs font-medium">
                    {bar.eventCount} sự kiện
                  </div>
                )}

                {/* Bar Avatar Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <div className="flex items-center gap-3">
                    {bar.avatar ? (
                      <img
                        src={bar.avatar}
                        alt={bar.barName}
                        className="w-12 h-12 rounded-full border-2 border-white object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full border-2 border-white bg-white/20 flex items-center justify-center">
                        <span className="text-white text-lg">🏪</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-lg truncate">
                        {bar.barName}
                      </h3>
                      {bar.address && (
                        <div className="flex items-center gap-1 text-white/90 text-xs mt-0.5">
                          <MapPin size={12} />
                          <span className="truncate">{bar.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-4">
                {/* Nearest Event Info */}
                {(bar.nearestEventStartTime || bar.latestEventStartTime) && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 text-blue-700 mb-1">
                      <Calendar size={14} />
                      <span className="text-xs font-medium">Sự kiện sắp tới</span>
                    </div>
                    <div className="text-sm text-gray-700 font-medium">
                      {formatDate(bar.nearestEventStartTime || bar.latestEventStartTime)}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {formatTimeUntil(bar.nearestEventStartTime || bar.latestEventStartTime)}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    {bar.averageRating && (
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                        <span>{bar.averageRating}</span>
                      </div>
                    )}
                    {bar.reviewCount > 0 && (
                      <span>{bar.reviewCount} đánh giá</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 group-hover:gap-2 transition-all">
                    <span className="font-medium">Xem chi tiết</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

