import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../utils/cn";
import barEventApi from "../../../api/barEventApi";
import { Modal } from "../../../components/common/Modal";
import { 
  Calendar, 
  Clock, 
  Star, 
  MapPin, 
  Loader2,
  Filter,
  ChevronRight,
  X,
  Phone,
  Mail
} from "lucide-react";

export default function EventsFeedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24); // Mặc định 24 giờ
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const eventsPerPage = 6; // 6 events mỗi trang (2 hàng x 3 cột)

  const timeRangeOptions = [
    { value: 24, label: "24 giờ tới" },
    { value: 168, label: "7 ngày tới" },
    { value: 720, label: "30 ngày tới" },
    { value: 2160, label: "90 ngày tới" }
  ];

  // Fetch events đang và sắp diễn ra
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await barEventApi.getOngoingAndUpcomingEvents({
        hours: timeRange,
        skip: 0,
        take: 1000 // Lấy nhiều để phân trang phía client
      });

      console.log('[EventsFeedPage] API Response:', res);
      
      // Axios interceptor đã unwrap response.data, nên res có dạng:
      // { status: "success", message: "...", data: { total, items } }
      let data = null;
      let items = [];
      
      // Case 1: res.data (sau khi axios interceptor unwrap)
      if (res?.data) {
        data = res.data;
        items = data.items || [];
      }
      // Case 2: res trực tiếp (nếu không có wrapper)
      else if (res) {
        data = res;
        items = res.items || [];
      }

      console.log('[EventsFeedPage] Parsed data:', { 
        data, 
        itemsCount: items.length, 
        total: data?.total,
        rawResponse: res
      });
      
      // Map data để đảm bảo đúng structure
      const mappedEvents = items.map(event => {
        const mapped = {
          eventId: event.eventId || event.EventId,
          barPageId: event.barPageId || event.BarPageId,
          eventName: event.eventName || event.EventName || "Sự kiện",
          description: event.description || event.Description || "",
          picture: event.picture || event.Picture || null,
          startTime: event.startTime || event.StartTime,
          endTime: event.endTime || event.EndTime,
          status: event.status || event.Status,
          eventStatus: event.eventStatus || event.EventStatus, // 'ongoing' hoặc 'upcoming'
          bar: event.bar || {}
        };
        
        // Debug log cho từng event
        if (!mapped.picture) {
          console.warn('[EventsFeedPage] Event missing picture:', {
            eventId: mapped.eventId,
            eventName: mapped.eventName,
            rawEvent: event
          });
        }
        
        return mapped;
      });
      
      console.log('[EventsFeedPage] Mapped events:', mappedEvents.length, mappedEvents);
      console.log('[EventsFeedPage] Events with pictures:', mappedEvents.filter(e => e.picture).length);
      
      setEvents(mappedEvents);
      setTotal(data?.total || mappedEvents.length);
      setCurrentPage(1); // Reset về trang 1 khi filter thay đổi
    } catch (err) {
      console.error("Lỗi tải events:", err);
      console.error("Error response:", err.response);
      setEvents([]);
      setTotal(0);
      setError(err.response?.data?.message || "Đã xảy ra lỗi khi tải danh sách sự kiện");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  // Tính toán phân trang
  const totalPages = Math.ceil(events.length / eventsPerPage);
  const startIndex = (currentPage - 1) * eventsPerPage;
  const endIndex = startIndex + eventsPerPage;
  const paginatedEvents = events.slice(startIndex, endIndex);

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
          Tìm thấy <span className="font-semibold text-gray-900">{total}</span> sự kiện
          {totalPages > 1 && (
            <span className="ml-2">
              (Trang {currentPage}/{totalPages})
            </span>
          )}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={fetchEvents}
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
      ) : events.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">Không tìm thấy sự kiện nào</p>
          <p className="text-gray-500 text-sm">
            Thử chọn khoảng thời gian khác để xem thêm sự kiện
          </p>
        </div>
      ) : (
        <>
          {/* Events Grid - 3 cột, 6 events mỗi trang */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedEvents.map((event) => {
              const bar = event.bar || {};
              const isOngoing = event.eventStatus === 'ongoing';
              
              return (
                <div
                  key={event.eventId || Math.random()}
                  className={cn(
                    "bg-white rounded-lg border border-gray-200 shadow-sm",
                    "hover:shadow-lg transition-all duration-300 overflow-hidden",
                    "group"
                  )}
                >
                  {/* Event Picture */}
                  <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
                    {event.picture && event.picture.trim() !== '' ? (
                      <img
                        src={event.picture}
                        alt={event.eventName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('[EventsFeedPage] Image load error:', event.picture);
                          e.target.style.display = "none";
                        }}
                        onLoad={() => {
                          console.log('[EventsFeedPage] Image loaded successfully:', event.picture);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/50">
                        <Calendar className="w-16 h-16" />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className={cn(
                      "absolute top-3 left-3 rounded-full px-3 py-1.5 text-xs font-medium",
                      isOngoing 
                        ? "bg-green-600 text-white" 
                        : "bg-blue-600 text-white"
                    )}>
                      {isOngoing ? "Đang diễn ra" : "Sắp diễn ra"}
                    </div>

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
                            {bar.barName || "Bar"}
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
                    {/* Event Name */}
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                      {event.eventName}
                    </h4>

                    {/* Event Time */}
                    <div className="mb-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar size={14} className="text-gray-500" />
                        <span className="font-medium">Thời gian:</span>
                      </div>
                      <div className="text-gray-700">
                        {formatDate(event.startTime)}
                      </div>
                      {event.endTime && (
                        <div className="text-gray-700">
                          Đến: {formatDate(event.endTime)}
                        </div>
                      )}
                    </div>

                    {/* Button Xem chi tiết */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className={cn(
                        "w-full px-3 py-2 rounded-md text-sm font-medium",
                        "bg-blue-50 text-blue-600 border border-blue-200",
                        "hover:bg-blue-100 hover:border-blue-300 transition-all",
                        "flex items-center justify-center gap-1.5",
                        "active:scale-[0.98]"
                      )}
                    >
                      <span>Xem chi tiết</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={cn(
                  "px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700",
                  "hover:bg-gray-50 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Trước
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "px-3 py-2 rounded-lg border transition-colors",
                      currentPage === page
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={cn(
                  "px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700",
                  "hover:bg-gray-50 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {/* Event Detail Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        size="lg"
        className="max-h-[90vh] overflow-y-auto"
      >
        {selectedEvent && (
          <EventDetailModalContent
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onNavigateToBar={() => {
              // Use entityAccountId for navigation (consistent with feed and landing)
              if (selectedEvent.bar?.entityAccountId) {
                navigate(`/profile/${selectedEvent.bar.entityAccountId}`);
                setSelectedEvent(null);
              } else if (selectedEvent.entityAccountId) {
                navigate(`/profile/${selectedEvent.entityAccountId}`);
                setSelectedEvent(null);
              } else if (selectedEvent.barPageId) {
                // Fallback: redirect through BarProfile which will convert barPageId to entityAccountId
                navigate(`/bar/${selectedEvent.barPageId}`);
                setSelectedEvent(null);
              }
            }}
            formatDate={formatDate}
            formatTimeUntil={formatTimeUntil}
          />
        )}
      </Modal>
    </div>
  );
}

// Format address helper function
const formatAddress = (address) => {
  if (!address) return null;

  // If it's a string, check if it's JSON
  if (typeof address === 'string') {
    const trimmed = address.trim();
    // If it's a JSON string, try to parse it
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        // If parsed successfully, extract fullAddress or build from parts
        if (parsed.fullAddress) {
          return parsed.fullAddress;
        }
        // Build from parts if available
        const parts = [
          parsed.detail || parsed.addressDetail,
          parsed.wardName || parsed.ward,
          parsed.districtName || parsed.district,
          parsed.provinceName || parsed.province
        ].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
        return null;
      } catch {
        return null;
      }
    }
    // If it's a normal string, return it
    return trimmed || null;
  }

  // If it's an object
  if (typeof address === 'object') {
    if (address.fullAddress) return address.fullAddress;
    const parts = [
      address.detail || address.addressDetail,
      address.wardName || address.ward,
      address.districtName || address.district,
      address.provinceName || address.province
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    return null;
  }

  return null;
};

// Event Detail Modal Content Component
function EventDetailModalContent({ event, onClose, onNavigateToBar, formatDate, formatTimeUntil }) {
  const bar = event.bar || {};
  const isOngoing = event.eventStatus === 'ongoing';
  const displayAddress = formatAddress(bar.address);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Chi tiết sự kiện</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Đóng"
        >
          <X size={20} className="text-gray-500" />
        </button>
      </div>

      {/* Event Image */}
      <div className="relative h-64 mb-6 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
        {event.picture && event.picture.trim() !== '' ? (
          <img
            src={event.picture}
            alt={event.eventName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/50">
            <Calendar className="w-20 h-20" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className={cn(
          "absolute top-4 left-4 rounded-full px-4 py-2 text-sm font-medium",
          isOngoing 
            ? "bg-green-600 text-white" 
            : "bg-blue-600 text-white"
        )}>
          {isOngoing ? "Đang diễn ra" : "Sắp diễn ra"}
        </div>

        {/* Rating Badge */}
        {bar.averageRating && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
            <Star size={16} className="text-yellow-500 fill-yellow-500" />
            <span className="text-base font-semibold text-gray-900">
              {bar.averageRating}
            </span>
            {bar.reviewCount > 0 && (
              <span className="text-sm text-gray-500">
                ({bar.reviewCount})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Event Name */}
      <h3 className="text-2xl font-bold text-gray-900 mb-4">
        {event.eventName}
      </h3>

      {/* Event Time */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center gap-2 text-blue-700 mb-2">
          <Calendar size={18} />
          <span className="font-semibold">Thời gian sự kiện</span>
        </div>
        <div className="text-base text-gray-700 font-medium mb-1">
          Bắt đầu: {formatDate(event.startTime)}
        </div>
        {event.endTime && (
          <div className="text-base text-gray-700 font-medium mb-2">
            Kết thúc: {formatDate(event.endTime)}
          </div>
        )}
        <div className="text-sm text-blue-600 font-medium">
          {formatTimeUntil(event.startTime)}
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Mô tả</h4>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {event.description}
          </p>
        </div>
      )}

      {/* Bar Info */}
      <div className="mb-6 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Thông tin quán bar</h4>
        <div className="flex items-start gap-4">
          {bar.avatar ? (
            <img
              src={bar.avatar}
              alt={bar.barName}
              className="w-16 h-16 rounded-full border-2 border-gray-300 object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full border-2 border-gray-300 bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🏪</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h5 className="text-xl font-semibold text-gray-900 mb-3">
              {bar.barName || "Bar"}
            </h5>
            {displayAddress && (
              <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0 text-blue-600" />
                  <span className="text-gray-700 leading-relaxed break-words">{displayAddress}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {bar.phoneNumber && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone size={16} className="text-gray-500 flex-shrink-0" />
                  <span className="break-all">{bar.phoneNumber}</span>
                </div>
              )}
              {bar.email && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail size={16} className="text-gray-500 flex-shrink-0" />
                  <span className="break-all">{bar.email}</span>
                </div>
              )}
            </div>
            {bar.averageRating && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-1">
                  <Star size={16} className="text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold text-gray-900">{bar.averageRating}</span>
                </div>
                {bar.reviewCount > 0 && (
                  <span className="text-sm text-gray-600">
                    ({bar.reviewCount} đánh giá)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onNavigateToBar}
          className={cn(
            "flex-1 px-6 py-3 rounded-lg font-semibold",
            "bg-blue-600 text-white",
            "hover:bg-blue-700 transition-colors",
            "flex items-center justify-center gap-2"
          )}
        >
          <MapPin size={18} />
          Xem trang quán bar
        </button>
        <button
          onClick={onClose}
          className={cn(
            "px-6 py-3 rounded-lg font-semibold",
            "bg-gray-200 text-gray-700",
            "hover:bg-gray-300 transition-colors"
          )}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

