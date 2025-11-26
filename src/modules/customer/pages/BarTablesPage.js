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

// Table Icon Component
const TableIcon = ({ status, color, className = "" }) => {
  const getStatusColor = () => {
    switch (status) {
      case "available": return "#10B981"; // green
      case "booked": return "#EF4444"; // red
      case "maintenance": return "#6B7280"; // gray
      default: return color || "#6B7280";
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

// Status Badge
const StatusBadge = ({ status }) => {
  const configs = {
    available: { label: "Có sẵn", color: "#10B981", bg: "#D1FAE5" },
    booked: { label: "Đã đặt", color: "#EF4444", bg: "#FEE2E2" },
    maintenance: { label: "Bảo trì", color: "#6B7280", bg: "#F3F4F6" }
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
      border: `1px solid ${config.color}40`
    }}>
      {config.label}
    </span>
  );
};

// Booking Modal Component
const BookingModal = ({ open, onClose, table, selectedDate, selectedTime, onConfirm }) => {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [isPaid, setIsPaid] = useState(false);
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
        note: note.trim(),
        isPaid: isPaid
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
          Đặt bàn: {table?.TableName}
        </h2>

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

          {table?.DepositPrice > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                background: isPaid ? '#D1FAE5' : 'white',
                transition: 'all 0.2s'
              }}>
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontWeight: '600', color: '#374151' }}>
                  Đã thanh toán tiền cọc ({table.DepositPrice.toLocaleString('vi-VN')} đ)
                </span>
              </label>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7280' }}>Giờ:</span>
              <span style={{ fontWeight: '600' }}>{selectedTime}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Tiền cọc:</span>
              <span style={{ fontWeight: '600', color: '#059669' }}>
                {table?.DepositPrice ? table.DepositPrice.toLocaleString('vi-VN') + ' đ' : 'Miễn phí'}
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
              {submitting ? 'Đang xử lý...' : 'Xác nhận đặt bàn'}
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
  const [selectedTime, setSelectedTime] = useState(() => {
    if (propBarId) {
      return '19:00';
    }
    return searchParams.get('time') || '19:00';
  });
  
  // Booking modal
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);

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

  // Check time overlap
  const isTimeOverlap = (selectedTime, bookingStart, bookingEnd) => {
    const [selectedHour, selectedMinute] = selectedTime.split(':').map(Number);
    const selectedDateTime = new Date(selectedDate);
    selectedDateTime.setHours(selectedHour, selectedMinute);
    
    const start = new Date(bookingStart);
    const end = new Date(bookingEnd);
    
    return selectedDateTime >= start && selectedDateTime <= end;
  };

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
        // Find bookings for this table
        const tableBookings = bookings.filter(booking => {
          // Check if booking has this table in detailSchedule
          const detailSchedule = booking.detailSchedule || booking.DetailSchedule;
          if (detailSchedule && detailSchedule.Table) {
            const tableMap = detailSchedule.Table;
            return Object.keys(tableMap).some(key => 
              key.toLowerCase() === table.BarTableId?.toLowerCase()
            );
          }
          return false;
        });
        
        // Check if table is booked at selected time
        // Chỉ coi là "booked" nếu scheduleStatus = "Confirmed" (đã xác nhận)
        const isBooked = tableBookings.some(booking => {
          const scheduleStatus = booking.scheduleStatus || booking.ScheduleStatus;
          // Chỉ coi là booked nếu đã confirmed
          if (scheduleStatus !== "Confirmed") return false;
          
          const startTime = booking.startTime || booking.StartTime;
          const endTime = booking.endTime || booking.EndTime;
          return isTimeOverlap(selectedTime, startTime, endTime);
        });
        
        const status = table.Status?.toLowerCase() === 'active' 
          ? (isBooked ? 'booked' : 'available')
          : 'maintenance';

        return {
          ...table,
          status,
          isSelectable: status === 'available'
        };
      });

      console.log("✅ Enhanced Tables:", enhancedTables);
      console.log("✅ Enhanced Tables Count:", enhancedTables.length);
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
  }, [barId, selectedDate, selectedTime, receiverId, addToast, fetchBookingsForDate]);

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
      if (selectedTime) params.set('time', selectedTime);
      setSearchParams(params);
    }
  }, [selectedDate, selectedTime, propBarId, setSearchParams]);

  // Refetch when date/time changes
  useEffect(() => {
    // Chỉ fetch khi có barId
    if (barId) {
      console.log("🔄 Refetching tables - barId:", barId, "receiverId:", receiverId);
      fetchTables();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barId, selectedDate, selectedTime, receiverId]); // Loại bỏ fetchTables khỏi deps để tránh loop

  // Handle table click
  const handleTableClick = (table) => {
    if (!table.isSelectable) {
      addToast("Bàn này đã được đặt hoặc đang bảo trì", "warning");
      return;
    }
    setSelectedTable(table);
    setBookingModalOpen(true);
  };

  // Handle booking confirm
  const handleBookingConfirm = async (formData) => {
    if (!receiverId || !selectedTable) {
      addToast("Lỗi: Thiếu thông tin", "error");
      return;
    }

    try {
      // Format tables data for API
      const tablesData = [{
        id: selectedTable.BarTableId,
        tableName: selectedTable.TableName,
        price: selectedTable.DepositPrice || 0
      }];

      const bookingData = {
        receiverId: receiverId,
        tables: tablesData,
        note: `${formData.customerName} - ${formData.phone}${formData.note ? ` - ${formData.note}` : ''}`,
        totalAmount: selectedTable.DepositPrice || 0,
        bookingDate: selectedDate,
        startTime: `${selectedDate}T${selectedTime}:00Z`,
        endTime: `${selectedDate}T${parseInt(selectedTime.split(':')[0]) + 3}:${selectedTime.split(':')[1]}:00Z`,
        // Nếu đã thanh toán → paymentStatus = "Paid", scheduleStatus = "Confirmed"
        // Nếu chưa thanh toán → paymentStatus = "Pending", scheduleStatus = "Confirmed" (vẫn confirmed vì không cần bar xác nhận)
        paymentStatus: formData.isPaid ? "Paid" : "Pending",
        scheduleStatus: "Confirmed" // Luôn confirmed vì không cần bar xác nhận
      };

      const result = await bookingApi.createBooking(bookingData);
      
      if (result.success) {
        addToast("Đặt bàn thành công!", "success");
        setBookingModalOpen(false);
        setSelectedTable(null);
        // Refresh tables to update status
        fetchTables();
      } else {
        throw new Error(result.message || "Đặt bàn thất bại");
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

        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Giờ
          </label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem',
              minWidth: '120px'
            }}
          >
            {Array.from({ length: 13 }, (_, i) => {
              const hour = i + 10;
              return hour <= 22 ? (
                <option key={hour} value={`${hour}:00`}>
                  {hour}:00
                </option>
              ) : null;
            })}
          </select>
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

      {/* Tables Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '24px'
      }}>
        <AnimatePresence>
          {filteredTables.map((table) => {
            const isDisabled = !table.isSelectable;
            
            return (
              <motion.div
                key={table.BarTableId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleTableClick(table)}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: isDisabled 
                    ? '0 2px 8px rgba(0, 0, 0, 0.1)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: isDisabled 
                    ? '2px solid #e5e7eb' 
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
                  color: '#059669',
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
          setSelectedTable(null);
        }}
        table={selectedTable}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onConfirm={handleBookingConfirm}
      />
    </div>
  );
};

export default BarTablesPage;

