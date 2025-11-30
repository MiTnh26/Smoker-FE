// src/modules/customer/pages/BarTablesPage.js
import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import barTableApi from "../../../api/barTableApi";
import barPageApi from "../../../api/barPageApi";
import bookingApi from "../../../api/bookingApi";
import { ToastContainer } from "../../../components/common/Toast";
import { SkeletonCard } from "../../../components/common/Skeleton";
import "../../../styles/modules/customer.css";

// Table Icon Component - Sử dụng CSS variables
const TableIcon = ({ status, color, className = "" }) => {
  const getStatusColor = () => {
    // Nếu có màu từ table.Color (màu của loại bàn), ưu tiên dùng nó khi available
    if (status === "available" && color) {
      return color;
    }
    
    // Sử dụng CSS variables từ variables.css
    switch (status) {
      case "available": 
        return "rgb(var(--success))"; // Màu xanh từ --success
      case "booked": 
        return "rgb(var(--danger))"; // Màu đỏ từ --danger
      case "maintenance": 
        return "rgb(var(--muted-foreground))"; // Màu xám từ --muted-foreground
      default: 
        return color || "rgb(var(--muted-foreground))";
    }
  };

  const iconColor = getStatusColor();

  return (
    <svg
      className={className}
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: iconColor }}
    >
      {/* Table top */}
      <rect
        x="15"
        y="20"
        width="50"
        height="35"
        rx="5"
        fill="currentColor"
        fillOpacity={status === "booked" ? "0.4" : "0.2"}
        stroke="currentColor"
        strokeWidth="2.5"
      />
      
      {/* Status indicator */}
      {status === "booked" && (
        <text
          x="40"
          y="42"
          textAnchor="middle"
          fill="currentColor"
          fontSize="14"
          fontWeight="bold"
          opacity="0.9"
        >
          ĐÃ ĐẶT
        </text>
      )}
      
      {/* Table legs */}
      <line x1="25" y1="55" x2="25" y2="65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="55" y1="55" x2="55" y2="65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="25" y1="65" x2="55" y2="65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
};

// Status Badge - Sử dụng CSS variables
const StatusBadge = ({ status }) => {
  const configs = {
    available: { 
      label: "Bàn trống", 
      color: "rgb(var(--success))", 
      bg: "rgba(var(--success), 0.1)" // 10% opacity của success color
    },
    booked: { 
      label: "Đã đặt", 
      color: "rgb(var(--danger))", 
      bg: "rgba(var(--danger), 0.1)" // 10% opacity của danger color
    },
    maintenance: { 
      label: "Bảo trì", 
      color: "rgb(var(--muted-foreground))", 
      bg: "rgba(var(--muted-foreground), 0.1)" // 10% opacity của muted-foreground
    }
  };
  const config = configs[status] || configs.available;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
      backgroundColor: config.bg,
      color: config.color,
      border: `1px solid ${config.color}40` // 40 = 25% opacity trong hex
    }}>
      {config.label}
    </span>
  );
};

// Booking Modal Component
const BookingModal = ({ open, onClose, tables = [], selectedDate, onConfirm }) => {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim()) {
      alert("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm({
        customerName: customerName.trim(),
        phone: phone.trim(),
        note: note.trim()
      });
      setCustomerName("");
      setPhone("");
      setNote("");
      onClose();
    } catch (error) {
      console.error("Booking error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '24px',
          color: '#1f2937'
        }}>
          Đặt bàn {tables.length > 1 ? `(${tables.length} bàn)` : ''}
        </h2>

        {/* Danh sách bàn đã chọn */}
        {tables.length > 0 && (
          <div style={{
            background: '#f3f4f6',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
              Bàn đã chọn:
            </div>
            {tables.map((table, index) => (
              <div key={table.BarTableId} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: index < tables.length - 1 ? '1px solid #e5e7eb' : 'none'
              }}>
                <span style={{ color: '#6b7280' }}>{table.TableName}</span>
                <span style={{ fontWeight: '600', color: 'rgb(var(--success))' }}>
                  {table.DepositPrice ? table.DepositPrice.toLocaleString('vi-VN') + ' đ' : 'Miễn phí'}
                </span>
              </div>
            ))}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '2px solid #d1d5db'
            }}>
              <span style={{ fontWeight: '700', color: '#1f2937' }}>Tổng tiền cọc:</span>
              <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'rgb(var(--success))' }}>
                {(tables.length * 100000).toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Tên khách hàng *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
              placeholder="Nhập tên của bạn"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Số điện thoại *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
              placeholder="Nhập số điện thoại"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Ghi chú (tùy chọn)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                resize: 'vertical'
              }}
              placeholder="Ghi chú thêm (nếu có)"
            />
          </div>

          {tables.length > 0 && (
            <div style={{ 
              marginBottom: '20px',
              padding: '12px',
              background: '#FEF3C7',
              borderRadius: '8px',
              border: '1px solid #FCD34D'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                color: '#92400E',
                fontWeight: '600'
              }}>
                <span>💳</span>
                <span>Bạn sẽ được chuyển đến trang thanh toán PayOS để đặt cọc sau khi xác nhận</span>
              </div>
            </div>
          )}

          <div style={{
            background: '#f3f4f6',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7280' }}>Ngày:</span>
              <span style={{ fontWeight: '600' }}>{selectedDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Tổng tiền cọc ({tables.length} bàn × 100k):</span>
              <span style={{ fontWeight: '600', color: 'rgb(var(--success))' }}>
                {(tables.length * 100000).toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                background: '#3b82f6',
                color: 'white',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Đang xử lý...' : 'Đặt cọc lịch đặt bàn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BarTablesPage = ({ barId: propBarId }) => {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  
  const barId = propBarId || params.barId;
  
  const [tables, setTables] = useState([]);
  const [filteredTables, setFilteredTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [receiverId, setReceiverId] = useState(null);
  
  // Filter states
  const [selectedDate, setSelectedDate] = useState(() => {
    if (propBarId) {
      return new Date().toISOString().split('T')[0];
    }
    return searchParams.get('date') || new Date().toISOString().split('T')[0];
  });
  
  // Booking modal
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedTables, setSelectedTables] = useState([]);

  // Toast management
  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Fetch receiverId
  useEffect(() => {
    const fetchReceiverId = async () => {
      try {
        const barDetails = await barPageApi.getBarPageById(barId);
        const entityAccountId = barDetails.data?.data?.EntityAccountId || barDetails.data?.EntityAccountId;
        if (entityAccountId) {
          setReceiverId(entityAccountId);
        }
      } catch (error) {
        console.error("Error fetching bar details:", error);
      }
    };
    
    if (barId) {
      fetchReceiverId();
    }
  }, [barId]);

  // Fetch bookings for date - wrap trong useCallback để tránh infinite loop
  const fetchBookingsForDate = useCallback(async (date) => {
    if (!receiverId) return [];
    
    try {
      const res = await bookingApi.getBookingsByReceiver(receiverId, { date });
      const bookings = res.data?.data || res.data || [];
      
      // Filter by date
      if (date) {
        return bookings.filter(booking => {
          const bookingDate = new Date(booking.bookingDate || booking.StartTime || booking.BookingDate);
          const filterDate = new Date(date);
          return bookingDate.toDateString() === filterDate.toDateString();
        });
      }
      
      return bookings;
    } catch (error) {
      console.error("Error fetching bookings:", error);
      return [];
    }
  }, [receiverId]);


  // Fetch tables
  const fetchTables = useCallback(async () => {
    if (!barId) {
      setError("Không tìm thấy thông tin bar");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await barTableApi.getTablesByBar(barId);
      console.log("📊 API Response:", res);
      console.log("📊 res.data:", res.data);
      
      // API trả về { status: "success", data: [...] }
      let tablesData = [];
      if (res.data?.data && Array.isArray(res.data.data)) {
        tablesData = res.data.data;
      } else if (Array.isArray(res.data)) {
        tablesData = res.data;
      } else if (res.data?.status === "success" && Array.isArray(res.data.data)) {
        tablesData = res.data.data;
      }
      
      console.log("📊 Tables Data:", tablesData);
      console.log("📊 Tables Count:", tablesData.length);

      if (!Array.isArray(tablesData) || tablesData.length === 0) {
        console.warn("⚠️ Không có bàn nào hoặc dữ liệu không hợp lệ");
        setTables([]);
        setLoading(false);
        return;
      }

      // Fetch bookings for selected date (chỉ khi có receiverId)
      let bookings = [];
      if (receiverId) {
        try {
          bookings = await fetchBookingsForDate(selectedDate);
          console.log("📅 Bookings for date:", bookings);
        } catch (bookingError) {
          console.warn("⚠️ Lỗi fetch bookings (tiếp tục với tables):", bookingError);
          // Tiếp tục với tables dù không fetch được bookings
        }
      }
      
      // Enhance tables with booking status
      const enhancedTables = tablesData.map(table => {
        // Find bookings for this table in the selected date
        const tableBookings = bookings.filter(booking => {
          // 1. Kiểm tra scheduleStatus phải là "Confirmed"
          const scheduleStatus = booking.scheduleStatus || booking.ScheduleStatus;
          if (scheduleStatus !== "Confirmed") {
            return false; // Bỏ qua booking chưa confirmed
          }

          // 2. Kiểm tra booking có trong ngày đã chọn không
          const bookingDate = booking.bookingDate || booking.BookingDate || booking.StartTime;
          if (bookingDate) {
            const bookingDateObj = new Date(bookingDate);
            const selectedDateObj = new Date(selectedDate);
            // So sánh theo ngày (bỏ qua giờ)
            if (bookingDateObj.toDateString() !== selectedDateObj.toDateString()) {
              return false; // Không cùng ngày
            }
          }

          // 3. Check if booking has this table in detailSchedule
          const detailSchedule = booking.detailSchedule || booking.DetailSchedule;
          if (!detailSchedule || !detailSchedule.Table) {
            return false; // Không có detailSchedule hoặc Table
          }

          // detailSchedule.Table có thể là Map (MongoDB) hoặc Object
          let tableMap = detailSchedule.Table;
          
          // Nếu là Map, convert sang Object
          if (tableMap instanceof Map) {
            tableMap = Object.fromEntries(tableMap);
          }
          
          // Nếu là Object với toObject method (Mongoose document)
          if (tableMap && typeof tableMap.toObject === 'function') {
            tableMap = tableMap.toObject();
          }

          // Kiểm tra xem bàn này có trong booking không
          const tableKeys = Object.keys(tableMap || {});
          const currentTableId = table.BarTableId?.toLowerCase();
          
          const isTableInBooking = tableKeys.some(key => {
            const tableId = key.toLowerCase();
            return tableId === currentTableId;
          });

          return isTableInBooking;
        });
        
        // Bàn được coi là "booked" nếu có ít nhất 1 booking confirmed trong ngày đó
        const isBooked = tableBookings.length > 0;
        
        const status = table.Status?.toLowerCase() === 'active' 
          ? (isBooked ? 'booked' : 'available')
          : 'maintenance';

        return {
          ...table,
          status,
          isSelectable: status === 'available' && !isBooked // Chỉ selectable nếu available và không booked
        };
      });

      // Log để debug
      console.log("📅 Selected Date:", selectedDate);
      console.log("📋 Bookings for date:", bookings.length);
      console.log("📋 Bookings details:", bookings.map(b => ({
        id: b.BookedScheduleId,
        date: b.bookingDate || b.BookingDate,
        status: b.scheduleStatus || b.ScheduleStatus,
        hasDetailSchedule: !!(b.detailSchedule || b.DetailSchedule),
        tableCount: b.detailSchedule?.Table ? Object.keys(b.detailSchedule.Table).length : 0
      })));
      console.log("✅ Enhanced Tables:", enhancedTables.map(t => ({
        id: t.BarTableId,
        name: t.TableName,
        status: t.status,
        isSelectable: t.isSelectable
      })));
      setTables(enhancedTables);
    } catch (err) {
      console.error("❌ Error fetching tables:", err);
      console.error("❌ Error details:", err.response?.data || err.message);
      setError("Không tải được danh sách bàn. Vui lòng thử lại sau.");
      addToast("Lỗi tải danh sách bàn", "error");
      setTables([]); // Đảm bảo tables là array rỗng khi lỗi
    } finally {
      setLoading(false);
    }
  }, [barId, selectedDate, receiverId, addToast, fetchBookingsForDate]);

  // Apply filters
  useEffect(() => {
    console.log("🔄 Updating filteredTables, tables count:", tables.length);
    console.log("🔄 Tables:", tables);
    setFilteredTables(tables);
  }, [tables]);

  // Update URL
  useEffect(() => {
    if (!propBarId) {
      const params = new URLSearchParams();
      if (selectedDate) params.set('date', selectedDate);
      setSearchParams(params);
    }
  }, [selectedDate, propBarId, setSearchParams]);

  // Refetch when date changes
  useEffect(() => {
    // Chỉ fetch khi có barId
    if (barId) {
      console.log("🔄 Refetching tables - barId:", barId, "receiverId:", receiverId);
      fetchTables();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barId, selectedDate, receiverId]); // Loại bỏ fetchTables khỏi deps để tránh loop

  // Handle table click - toggle selection
  const handleTableClick = (table) => {
    // Kiểm tra lại trạng thái bàn trước khi cho phép chọn
    if (table.status === 'booked') {
      addToast("Bàn này đã được đặt trong ngày này", "warning");
      return;
    }
    
    if (!table.isSelectable) {
      addToast("Bàn này đã được đặt hoặc đang bảo trì", "warning");
      return;
    }
    
    // Toggle selection
    setSelectedTables(prev => {
      const isSelected = prev.some(t => t.BarTableId === table.BarTableId);
      if (isSelected) {
        // Bỏ chọn
        return prev.filter(t => t.BarTableId !== table.BarTableId);
      } else {
        // Thêm vào danh sách
        return [...prev, table];
      }
    });
  };

  // Handle open booking modal
  const handleOpenBookingModal = () => {
    if (selectedTables.length === 0) {
      addToast("Vui lòng chọn ít nhất một bàn", "warning");
      return;
    }
    setBookingModalOpen(true);
  };

  // Handle booking confirm
  const handleBookingConfirm = async (formData) => {
    if (!receiverId || selectedTables.length === 0) {
      addToast("Lỗi: Thiếu thông tin", "error");
      return;
    }

    try {
      // Format tables data for API
      const tablesData = selectedTables.map(table => ({
        id: table.BarTableId,
        tableName: table.TableName,
        price: table.DepositPrice || 0
      }));

      // Tính tổng tiền cọc: mỗi bàn 100k VND
      const DEPOSIT_PER_TABLE = 100000; // 100k VND mỗi bàn
      const totalDepositAmount = selectedTables.length * DEPOSIT_PER_TABLE;
      const totalAmount = selectedTables.reduce((sum, table) => sum + (table.DepositPrice || 0), 0);

      // Tính startTime và endTime
      // startTime: Nếu ngày hôm nay thì từ thời điểm hiện tại, nếu ngày tương lai thì từ 00:00:00
      // endTime: Cuối ngày đã chọn (23:59:59)
      const now = new Date();
      const selectedDateObj = new Date(selectedDate);
      const isToday = selectedDateObj.toDateString() === now.toDateString();
      
      let startTime, endTime;
      if (isToday) {
        // Nếu là hôm nay, bắt đầu từ thời điểm hiện tại
        startTime = now.toISOString();
        // Kết thúc vào cuối ngày hôm nay
        const endOfDay = new Date(selectedDateObj);
        endOfDay.setHours(23, 59, 59, 999);
        endTime = endOfDay.toISOString();
      } else {
        // Nếu là ngày tương lai, bắt đầu từ đầu ngày
        const startOfDay = new Date(selectedDateObj);
        startOfDay.setHours(0, 0, 0, 0);
        startTime = startOfDay.toISOString();
        // Kết thúc vào cuối ngày
        const endOfDay = new Date(selectedDateObj);
        endOfDay.setHours(23, 59, 59, 999);
        endTime = endOfDay.toISOString();
      }

      const bookingData = {
        receiverId: receiverId,
        tables: tablesData,
        note: `${formData.customerName} - ${formData.phone}${formData.note ? ` - ${formData.note}` : ''}`,
        totalAmount: totalAmount,
        bookingDate: selectedDate,
        startTime: startTime,
        endTime: endTime,
        // Luôn để Pending vì sẽ thanh toán qua PayOS
        paymentStatus: "Pending",
        scheduleStatus: "Confirmed" // Luôn confirmed vì không cần bar xác nhận
      };

      // Tạo booking trước
      const result = await bookingApi.createBooking(bookingData);
      
      if (!result.success) {
        throw new Error(result.message || "Đặt bàn thất bại");
      }

      const bookingId = result.data?.BookedScheduleId || result.data?.bookedScheduleId;
      if (!bookingId) {
        throw new Error("Không lấy được booking ID");
      }

      // Tạo payment link PayOS cho tiền cọc (mỗi bàn 100k)
      console.log("[BarTablesPage] Creating payment link for deposit:", {
        bookingId,
        depositAmount: totalDepositAmount,
        tableCount: selectedTables.length
      });

      const paymentResult = await bookingApi.createTablePayment(bookingId, totalDepositAmount);
      
      if (paymentResult.success && paymentResult.data?.paymentUrl) {
        // Redirect đến PayOS để thanh toán
        window.location.href = paymentResult.data.paymentUrl;
      } else {
        throw new Error("Không thể tạo link thanh toán");
      }
    } catch (error) {
      console.error("Booking error:", error);
      addToast(error.message || "Lỗi khi đặt bàn", "error");
      throw error;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '24px'
        }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <SkeletonCard key={`skeleton-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' }}>
          Đặt bàn
        </h1>
        <p style={{ color: '#6b7280' }}>Chọn ngày và bàn phù hợp với bạn</p>
      </div>

      {/* Selected tables summary and booking button - Sử dụng CSS variables */}
      {selectedTables.length > 0 && (
        <div style={{
          background: 'rgba(var(--success), 0.1)', // 10% opacity của success
          border: '2px solid rgb(var(--success))',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontWeight: '600', color: 'rgb(var(--success))', marginBottom: '4px' }}>
              Đã chọn {selectedTables.length} bàn
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgb(var(--success))' }}>
              Tổng tiền cọc: {selectedTables.reduce((sum, t) => sum + (t.DepositPrice || 0), 0).toLocaleString('vi-VN')} đ
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setSelectedTables([])}
              style={{
                padding: '10px 20px',
                border: '1px solid rgb(var(--success))',
                borderRadius: '8px',
                background: 'rgb(var(--card))',
                color: 'rgb(var(--success))',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Bỏ chọn tất cả
            </button>
            <button
              onClick={handleOpenBookingModal}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                background: 'rgb(var(--success))',
                color: 'rgb(var(--white))',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Đặt bàn ({selectedTables.length})
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '32px',
        flexWrap: 'wrap'
      }}>
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Ngày
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            style={{
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          />
        </div>

      </div>

      {/* Error State */}
      {error && (
        <div style={{
          padding: '20px',
          background: '#fef2f2',
          borderRadius: '12px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#dc2626', marginBottom: '12px' }}>{error}</p>
          <button
            onClick={fetchTables}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Tables Grid - 3 bàn 1 hàng */}
      <div className="bar-tables-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px'
      }}>
        <AnimatePresence>
          {filteredTables.map((table) => {
            const isDisabled = !table.isSelectable;
            const isSelected = selectedTables.some(t => t.BarTableId === table.BarTableId);
            
            return (
              <motion.div
                key={table.BarTableId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleTableClick(table)}
                style={{
                  background: isSelected ? 'rgba(var(--success), 0.1)' : 'rgb(var(--card))',
                  borderRadius: isSelected ? '0' : '12px', // Hình vuông khi được chọn
                  padding: '24px',
                  boxShadow: isDisabled 
                    ? '0 2px 8px rgba(0, 0, 0, 0.1)'
                    : isSelected
                    ? '0 4px 12px rgba(var(--success), 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: isDisabled 
                    ? `2px solid rgb(var(--border))` 
                    : isSelected
                    ? '2px solid rgb(var(--success))'
                    : '2px solid transparent',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.6 : 1,
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgb(var(--success))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgb(var(--white))',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}>
                    ✓
                  </div>
                )}

                {/* Table Icon */}
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                  <TableIcon status={table.status} color={table.Color} />
                </div>

                {/* Table Name */}
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  margin: '0 0 12px 0'
                }}>
                  {table.TableName}
                </h3>

                {/* Status Badge */}
                <div style={{ marginBottom: '12px' }}>
                  <StatusBadge status={table.status} />
                </div>

                {/* Table Info */}
                {table.TableTypeName && (
                  <p style={{
                    color: table.Color || '#6b7280',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    margin: '0 0 8px 0'
                  }}>
                    {table.TableTypeName}
                  </p>
                )}
                <p style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'rgb(var(--success))',
                  margin: '8px 0 0 0'
                }}>
                  {table.DepositPrice 
                    ? table.DepositPrice.toLocaleString('vi-VN') + ' đ'
                    : 'Miễn phí đặt cọc'
                  }
                </p>

                {/* Disabled Overlay */}
                {isDisabled && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                  }}>
                    <span style={{
                      background: '#ef4444',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {table.status === 'booked' ? 'Đã được đặt' : 'Bảo trì'}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty State */}
        {!loading && filteredTables.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '60px 20px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
              Không có bàn nào
            </h3>
            <p style={{ color: '#6b7280' }}>
              Bar này chưa có bàn nào được thiết lập
            </p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal
        open={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
        }}
        tables={selectedTables}
        selectedDate={selectedDate}
        onConfirm={handleBookingConfirm}
      />
    </div>
  );
};

export default BarTablesPage;

