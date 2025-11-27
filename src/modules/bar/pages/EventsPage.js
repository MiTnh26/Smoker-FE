// src/pages/bar/EventsPage.jsx
// ĐÃ THÊM NÚT QUẢNG CÁO

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";
import barEventApi from "../../../api/barEventApi";
import notificationApi from "../../../api/notificationApi"; // Thêm import notification API
import AddEventModal from "../components/AddEventModal";
import EditEventModal from "../components/EditEventModal";
import EventAdPackageModal from "../components/EventAdPackageModal";
import { Button } from "../../../components/common/Button";
import { ToastContainer } from "../../../components/common/Toast";
import { 
  Pencil, 
  Trash2, 
  Plus, 
  Eye, 
  EyeOff, 
  Search, 
  Loader2,
  Calendar,
  Clock,
  Image as ImageIcon,
  Megaphone // Icon cho quảng cáo
} from "lucide-react";

export default function EventsPage() {
  const { t } = useTranslation();

  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [barPageId, setBarPageId] = useState(null);
  const [barInfo, setBarInfo] = useState(null); // Thêm state lưu thông tin bar
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdPackageModal, setShowAdPackageModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [advertisingEvent, setAdvertisingEvent] = useState(null); // Event được chọn để quảng cáo
  
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [advertisingId, setAdvertisingId] = useState(null); // State cho loading nút quảng cáo
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState([]); // State cho toast notifications
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // 6 events mỗi trang

  // Lấy barPageId và thông tin bar từ session
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const activeEntity = session.activeEntity || {};
      const entities = session.entities || [];
      
      const current = entities.find(e => 
        String(e.id) === String(activeEntity.id) && e.type === "BarPage"
      ) || activeEntity;
      
      if (current?.id) {
        setBarPageId(current.id);
        setBarInfo(current); // Lưu thông tin bar
      }
    } catch (err) {
      console.error("Lỗi khi lấy session:", err);
    }
  }, []);

  const ensureArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (data.items && Array.isArray(data.items)) return data.items;
    if (data.result && Array.isArray(data.result)) return data.result;
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) return [data];
    return [];
  };

  const isValidImageUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return /^https?:\/\/.+/i.test(url);
  };

  // Fetch events
  const fetchAllEvents = async () => {
    if (!barPageId) return;

    try {
      setLoading(true);

      const myResponse = await barEventApi.getEventsByBarId(barPageId).catch(() => ({ data: { items: [] } }));
      const myData = ensureArray(myResponse.data);
      setMyEvents(myData);

    } catch (err) {
      console.error("Lỗi tải events:", err);
      setMyEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (barPageId) fetchAllEvents();
  }, [barPageId]);

  const refresh = () => fetchAllEvents();

  // Toast management
  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Xóa event
  const handleDelete = async (id) => {
    if (!window.confirm("Xóa sự kiện này?")) return;
    
    try {
      setDeletingId(id);
      const res = await barEventApi.deleteEvent(id);
      
      if (res?.ok || res?.success) {
        addToast("Xóa sự kiện thành công", "success");
        refresh();
      } else {
        addToast("Xóa sự kiện thất bại", "error");
      }
    } catch (err) {
      addToast("Lỗi kết nối server", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Ẩn / Hiện event - với optimistic update và toast notification
  const handleToggle = async (id) => {
    if (togglingId === id) return;

    // Tìm event hiện tại để lấy trạng thái
    const currentEvent = myEvents.find(ev => ev.EventId === id);
    if (!currentEvent) return;

    // So sánh case-insensitive để tránh lỗi
    const currentStatus = (currentEvent.Status || "").toLowerCase();
    const isCurrentlyActive = currentStatus === "active";
    const newStatus = isCurrentlyActive ? "hidden" : "active";
    const isHiding = isCurrentlyActive;

    // Optimistic update: cập nhật UI ngay lập tức
    setMyEvents(prevEvents => 
      prevEvents.map(ev => 
        ev.EventId === id 
          ? { ...ev, Status: newStatus }
          : ev
      )
    );

    setTogglingId(id);
    try {
      const res = await barEventApi.toggleEventStatus(id);
      
      // Kiểm tra response - có thể là res.data hoặc res trực tiếp
      const responseData = res?.data || res;
      const isSuccess = responseData?.success !== false && 
                       !responseData?.message?.includes("không thể") &&
                       !responseData?.message?.includes("lỗi");
      
      if (isSuccess) {
        // Thành công - hiển thị toast
        addToast(
          isHiding ? "Đã ẩn sự kiện" : "Đã hiển thị sự kiện",
          "success"
        );
        
        // Cập nhật Status từ response nếu có, nếu không thì dùng newStatus đã set
        if (responseData?.data?.Status) {
          setMyEvents(prevEvents => 
            prevEvents.map(ev => 
              ev.EventId === id 
                ? { ...ev, Status: responseData.data.Status }
                : ev
            )
          );
        }
      } else {
        // Thất bại - revert lại trạng thái cũ
        setMyEvents(prevEvents => 
          prevEvents.map(ev => 
            ev.EventId === id 
              ? { ...ev, Status: currentEvent.Status }
              : ev
          )
        );
        addToast(
          responseData?.message || "Không thể thay đổi trạng thái sự kiện",
          "error"
        );
      }
    } catch (err) {
      // Lỗi - revert lại trạng thái cũ
      setMyEvents(prevEvents => 
        prevEvents.map(ev => 
          ev.EventId === id 
            ? { ...ev, Status: currentEvent.Status }
            : ev
        )
      );
      addToast("Lỗi kết nối server", "error");
    } finally {
      setTogglingId(null);
    }
  };

  // MỞ MODAL CHỌN GÓI QUẢNG CÁO - FUNCTION MỚI
  const handleAdvertise = (event) => {
    if (!event) return;
    setAdvertisingEvent(event);
    setShowAdPackageModal(true);
  };

  // Xử lý sau khi mua gói thành công
  const handlePurchaseSuccess = () => {
    addToast("✅ Đã mua gói quảng cáo thành công! Admin sẽ set lên Revive và thông báo lại cho bạn.", "success");
    // Có thể refresh events list nếu cần
    // refresh();
  };

  // Format date
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

  const getEventStatus = (start, end, status) => {
    if (status === "Ended") return { label: "Đã kết thúc", color: "bg-gray-500" };
    if (status === "hidden") return { label: "Đang ẩn", color: "bg-orange-500" };
    
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (now < startDate) return { label: "Sắp diễn ra", color: "bg-blue-500" };
    if (now <= endDate) return { label: "Đang diễn ra", color: "bg-green-500" };
    return { label: "Đã kết thúc", color: "bg-gray-500" };
  };

  const filteredEvents = myEvents.filter(ev =>
    (ev.EventName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ev.Description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  // Reset về trang 1 khi search thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const getEventImage = (event) => {
    if (isValidImageUrl(event.Picture)) {
      return event.Picture;
    }
    return `https://placehold.co/600x400/f3f4f6/6b7280?text=📷`;
  };

  // CARD DESIGN TỐI GIẢN - ĐẸP - ĐÃ THÊM NÚT QUẢNG CÁO
  const renderEventCard = (ev) => {
    const status = getEventStatus(ev.StartTime, ev.EndTime, ev.Status);
    // So sánh case-insensitive để đảm bảo đúng
    // active = hiển thị, hidden = ẩn
    const eventStatus = (ev.Status || "").toLowerCase().trim();
    const isVisible = eventStatus === "active";
    const isEnded = eventStatus === "ended";
    const eventImage = getEventImage(ev);
    
    return (
      <div key={ev.EventId} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
        {/* Image Section */}
        <div className="relative h-48 bg-gray-100">
          <img 
            src={eventImage}
            alt={ev.EventName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = "https://placehold.co/600x400/f3f4f6/6b7280?text=📷";
            }}
          />
          
          {/* Status Badges */}
          <div className="absolute top-3 left-3 right-3 flex justify-between">
            <span className={cn(
              "px-2 py-1 rounded text-xs font-medium text-white",
              status.color
            )}>
              {status.label}
            </span>
            
            <span className={cn(
              "px-2 py-1 rounded text-xs font-medium text-white",
              isVisible ? "bg-green-600" : "bg-red-600"
            )}>
              {isVisible ? "Hiển thị" : "Ẩn"}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="absolute bottom-3 right-3 flex gap-1">
            <button 
              onClick={() => { setEditingEvent(ev); setShowEditModal(true); }}
              className="p-1.5 bg-black/80 hover:bg-black rounded text-white transition-colors"
              title="Sửa sự kiện"
            >
              <Pencil size={14} />
            </button>
            
            <button 
              onClick={() => handleToggle(ev.EventId)}
              disabled={togglingId === ev.EventId || isEnded}
              className={cn(
                "p-1.5 rounded text-white transition-colors",
                isVisible ? "bg-orange-600 hover:bg-orange-700" : "bg-gray-600 hover:bg-gray-700",
                "disabled:opacity-50"
              )}
              title={isVisible ? "Ẩn sự kiện" : "Hiện sự kiện"}
            >
              {togglingId === ev.EventId ? 
                <Loader2 size={14} className="animate-spin" /> : 
                (isVisible ? <EyeOff size={14} /> : <Eye size={14} />)
              }
            </button>
            
            <button 
              onClick={() => handleDelete(ev.EventId)} 
              disabled={deletingId === ev.EventId}
              className="p-1.5 bg-red-600 hover:bg-red-700 rounded text-white transition-colors disabled:opacity-50"
              title="Xóa sự kiện"
            >
              {deletingId === ev.EventId ? 
                <Loader2 size={14} className="animate-spin" /> : 
                <Trash2 size={14} />
              }
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4">
          <h4 className="font-semibold text-gray-900 line-clamp-1 mb-2">
            {ev.EventName}
          </h4>
          
          {ev.Description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {ev.Description}
            </p>
          )}
          
          <div className="text-xs text-gray-500 space-y-1 mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-gray-400" />
              <span>Bắt đầu: {formatDate(ev.StartTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-gray-400" />
              <span>Kết thúc: {formatDate(ev.EndTime)}</span>
            </div>
          </div>

          {/* NÚT QUẢNG CÁO - MỞ MODAL CHỌN GÓI */}
          <button
            onClick={() => handleAdvertise(ev)}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300",
              "bg-purple-600 hover:bg-purple-700 text-white"
            )}
          >
            <Megaphone size={14} />
            Quảng Cáo
          </button>
        </div>
      </div>
    );
  };


  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý sự kiện</h1>
        <p className="text-gray-600 mt-1">Quản lý và xem các sự kiện của bar</p>
      </div>

      {/* Events Management Section */}
      <div className="space-y-6">
          {/* Search and Create */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm sự kiện..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
              />
            </div>
            
            <Button 
              onClick={() => setShowAddModal(true)} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm"
            >
              <Plus size={16} />
              Tạo sự kiện
            </Button>
          </div>

          {/* Events Grid - 3 CARDS PER ROW */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-600">
                {searchQuery ? "Không tìm thấy sự kiện phù hợp" : "Chưa có sự kiện nào"}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setShowAddModal(true)}
                  className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2"
                >
                  <Plus size={16} className="mr-1" />
                  Tạo sự kiện đầu tiên
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedEvents.map(renderEventCard)}
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
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      // Hiển thị tối đa 5 số trang
                      if (totalPages <= 7) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={cn(
                              "w-10 h-10 rounded-lg border transition-colors",
                              currentPage === page
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            )}
                          >
                            {page}
                          </button>
                        );
                      } else {
                        // Logic hiển thị trang với ellipsis
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                "w-10 h-10 rounded-lg border transition-colors",
                                currentPage === page
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                              )}
                            >
                              {page}
                            </button>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <span key={page} className="w-10 h-10 flex items-center justify-center text-gray-500">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }
                    })}
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
                  
                  <span className="text-sm text-gray-600 ml-4">
                    Trang {currentPage} / {totalPages} ({filteredEvents.length} sự kiện)
                  </span>
                </div>
              )}
            </>
          )}
        </div>

      {/* Modals */}
      {showAddModal && barPageId && (
        <AddEventModal 
          barPageId={barPageId} 
          onClose={() => setShowAddModal(false)} 
          onSuccess={refresh} 
        />
      )}
      
      {showEditModal && editingEvent && barPageId && (
        <EditEventModal
          event={editingEvent}
          barPageId={barPageId}
          onClose={() => { 
            setShowEditModal(false); 
            setEditingEvent(null); 
          }}
          onSuccess={refresh}
        />
      )}

      {/* Modal chọn gói quảng cáo */}
      {showAdPackageModal && advertisingEvent && barPageId && (
        <EventAdPackageModal
          event={advertisingEvent}
          barPageId={barPageId}
          onClose={() => {
            setShowAdPackageModal(false);
            setAdvertisingEvent(null);
          }}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </div>
  );
}