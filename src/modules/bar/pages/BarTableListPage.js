// src/modules/bar/pages/BarTableListPage.js
import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import barTableApi from "../../../api/barTableApi";
import barPageApi from "../../../api/barPageApi";
import bookingApi from "../../../api/bookingApi";
import { ToastContainer } from "../../../components/common/Toast";
import { SkeletonCard } from "../../../components/common/Skeleton";

// Table Icon Component
const TableIcon = ({ status, color, className = "" }) => {
  const getStatusColor = () => {
    if (status === "available" && color) {
      return color;
    }
    
    switch (status) {
      case "available": 
        return "rgb(var(--success))";
      case "booked": 
        return "rgb(var(--danger))";
      case "maintenance": 
        return "rgb(var(--muted-foreground))";
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
      <line x1="25" y1="55" x2="25" y2="65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="55" y1="55" x2="55" y2="65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="25" y1="65" x2="55" y2="65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
};

// Status Badge
const StatusBadge = ({ status }) => {
  const configs = {
    available: { 
      label: "Bàn trống", 
      color: "rgb(var(--success))", 
      bg: "rgba(var(--success), 0.1)"
    },
    booked: { 
      label: "Đã đặt", 
      color: "rgb(var(--danger))", 
      bg: "rgba(var(--danger), 0.1)"
    },
    maintenance: { 
      label: "Bảo trì", 
      color: "rgb(var(--muted-foreground))", 
      bg: "rgba(var(--muted-foreground), 0.1)"
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
      border: `1px solid ${config.color}40`
    }}>
      {config.label}
    </span>
  );
};

export default function BarTableListPage() {
  const { t } = useTranslation();
  const { barPageId } = useParams();
  
  const [tables, setTables] = useState([]);
  const [filteredTables, setFilteredTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [receiverId, setReceiverId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [updatingBooking, setUpdatingBooking] = useState(null);

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
        const barDetails = await barPageApi.getBarPageById(barPageId);
        const entityAccountId = barDetails.data?.data?.EntityAccountId || barDetails.data?.EntityAccountId;
        if (entityAccountId) {
          setReceiverId(entityAccountId);
        }
      } catch (error) {
        console.error("Error fetching bar details:", error);
      }
    };
    
    if (barPageId) {
      fetchReceiverId();
    }
  }, [barPageId]);

  // Fetch bookings for date
  const fetchBookingsForDate = useCallback(async (date) => {
    if (!receiverId) return [];
    
    try {
      const response = await bookingApi.getBookingsByReceiver(receiverId, {
        limit: 1000,
        offset: 0
      });
      
      const bookings = response.data?.data || response.data || [];
      
      if (date) {
        return bookings.filter(booking => {
          const bookingDate = booking.bookingDate || booking.BookingDate || booking.StartTime;
          if (!bookingDate) return false;
          const bookingDateObj = new Date(bookingDate);
          const filterDate = new Date(date);
          return bookingDateObj.toDateString() === filterDate.toDateString();
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
    if (!barPageId) {
      setError("Không tìm thấy thông tin bar");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await barTableApi.getTablesByBar(barPageId);
      
      let tablesData = [];
      if (res.data?.data && Array.isArray(res.data.data)) {
        tablesData = res.data.data;
      } else if (Array.isArray(res.data)) {
        tablesData = res.data;
      } else if (res.data?.status === "success" && Array.isArray(res.data.data)) {
        tablesData = res.data.data;
      }

      if (!Array.isArray(tablesData) || tablesData.length === 0) {
        setTables([]);
        setLoading(false);
        return;
      }

      // Fetch bookings for selected date
      let bookings = [];
      if (receiverId) {
        try {
          bookings = await fetchBookingsForDate(selectedDate);
        } catch (bookingError) {
          console.warn("⚠️ Lỗi fetch bookings:", bookingError);
        }
      }
      
      // Lưu bookings vào state
      setBookings(bookings.filter(b => {
        const type = b.Type || b.type;
        return type === "BarTable";
      }));

      // Enhance tables with booking status
      const enhancedTables = tablesData.map(table => {
        const tableBookings = bookings.filter(booking => {
          const scheduleStatus = booking.scheduleStatus || booking.ScheduleStatus;
          const paymentStatus = booking.paymentStatus || booking.PaymentStatus;
          
          // Bỏ qua bookings có status "Ended"
          if (scheduleStatus === "Ended") {
            return false;
          }
          
          // Block nếu đã confirmed
          if (scheduleStatus === "Confirmed") {
            // Không cần check paymentStatus vì đã confirmed
          }
          // Block nếu pending nhưng đã thanh toán cọc (Paid)
          else if (scheduleStatus === "Pending" && paymentStatus === "Paid") {
            // Block slot này
          }
          // Không block nếu pending nhưng chưa thanh toán (sẽ bị reject sau 5 phút)
          else {
            return false;
          }

          const bookingDate = booking.bookingDate || booking.BookingDate || booking.StartTime;
          if (bookingDate) {
            const bookingDateObj = new Date(bookingDate);
            const selectedDateObj = new Date(selectedDate);
            if (bookingDateObj.toDateString() !== selectedDateObj.toDateString()) {
              return false;
            }
          }

          const detailSchedule = booking.detailSchedule || booking.DetailSchedule;
          if (!detailSchedule || !detailSchedule.Table) {
            return false;
          }

          let tableMap = detailSchedule.Table;
          if (tableMap instanceof Map) {
            tableMap = Object.fromEntries(tableMap);
          }
          if (tableMap && typeof tableMap.toObject === 'function') {
            tableMap = tableMap.toObject();
          }

          const tableKeys = Object.keys(tableMap || {});
          const currentTableId = table.BarTableId?.toLowerCase();
          
          const isTableInBooking = tableKeys.some(key => {
            const tableId = key.toLowerCase();
            return tableId === currentTableId;
          });

          return isTableInBooking;
        });
        
        const isBooked = tableBookings.length > 0;
        
        const status = table.Status?.toLowerCase() === 'active' 
          ? (isBooked ? 'booked' : 'available')
          : 'maintenance';

        return {
          ...table,
          status,
          isSelectable: true
        };
      });

      setTables(enhancedTables);
    } catch (err) {
      console.error("❌ Error fetching tables:", err);
      setError("Không tải được danh sách bàn. Vui lòng thử lại sau.");
      addToast("Lỗi tải danh sách bàn", "error");
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, [barPageId, selectedDate, receiverId, addToast, fetchBookingsForDate]);

  // Apply filters
  useEffect(() => {
    setFilteredTables(tables);
  }, [tables]);

  // Refetch when date changes
  useEffect(() => {
    if (barPageId) {
      fetchTables();
    }
  }, [barPageId, selectedDate, receiverId, fetchTables]);

  // Handle table click - toggle selection
  const handleTableClick = (table) => {
    setSelectedTables(prev => {
      const isSelected = prev.some(t => t.BarTableId === table.BarTableId);
      if (isSelected) {
        return prev.filter(t => t.BarTableId !== table.BarTableId);
      } else {
        return [...prev, table];
      }
    });
  };

  // Handle mark paid
  const handleMarkPaid = async (bookingId) => {
    try {
      setUpdatingBooking(bookingId);
      await bookingApi.markPaid(bookingId);
      addToast("Đã đánh dấu thanh toán", "success");
      await fetchTables(); // Refetch để cập nhật
    } catch (error) {
      console.error("Error marking paid:", error);
      addToast("Lỗi khi đánh dấu thanh toán", "error");
    } finally {
      setUpdatingBooking(null);
    }
  };

  // Handle end booking
  const handleEndBooking = async (bookingId) => {
    try {
      setUpdatingBooking(bookingId);
      await bookingApi.endBooking(bookingId);
      addToast("Đã cập nhật trạng thái thành Ended", "success");
      await fetchTables(); // Refetch để cập nhật
    } catch (error) {
      console.error("Error ending booking:", error);
      addToast("Lỗi khi cập nhật trạng thái", "error");
    } finally {
      setUpdatingBooking(null);
    }
  };

  // Handle status update
  const handleUpdateStatus = async (newStatus) => {
    if (selectedTables.length === 0) {
      addToast("Vui lòng chọn ít nhất một bàn", "warning");
      return;
    }

    try {
      setUpdatingStatus(true);
      
      // Update each selected table
      const updatePromises = selectedTables.map(async (table) => {
        const status = newStatus === 'active' ? 'Active' : 'Maintenance';
        await barPageApi.updateBarTable(table.BarTableId, {
          status: status,
          tableName: table.TableName,
          depositPrice: table.DepositPrice,
          tableClassificationId: table.TableClassificationId
        });
      });

      await Promise.all(updatePromises);
      
      addToast(`Đã cập nhật trạng thái ${selectedTables.length} bàn thành công`, "success");
      setSelectedTables([]);
      
      // Refetch tables
      await fetchTables();
    } catch (error) {
      console.error("Error updating table status:", error);
      addToast("Lỗi khi cập nhật trạng thái bàn", "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
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
          Quản lý bàn
        </h1>
        <p style={{ color: '#6b7280' }}>Chọn ngày và quản lý trạng thái các bàn</p>
      </div>

      {/* Selected tables summary and action buttons */}
      {selectedTables.length > 0 && (
        <div style={{
          background: 'rgba(var(--primary), 0.1)',
          border: '2px solid rgb(var(--primary))',
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
            <div style={{ fontWeight: '600', color: 'rgb(var(--primary))', marginBottom: '4px' }}>
              Đã chọn {selectedTables.length} bàn
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgb(var(--primary))' }}>
              Chọn hành động để thay đổi trạng thái
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedTables([])}
              style={{
                padding: '10px 20px',
                border: '1px solid rgb(var(--primary))',
                borderRadius: '8px',
                background: 'rgb(var(--card))',
                color: 'rgb(var(--primary))',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Bỏ chọn tất cả
            </button>
            <button
              onClick={() => handleUpdateStatus('active')}
              disabled={updatingStatus}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                background: 'rgb(var(--success))',
                color: 'rgb(var(--white))',
                cursor: updatingStatus ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: updatingStatus ? 0.6 : 1
              }}
            >
              {updatingStatus ? 'Đang cập nhật...' : 'Đặt trạng thái: Hoạt động'}
            </button>
            <button
              onClick={() => handleUpdateStatus('maintenance')}
              disabled={updatingStatus}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                background: 'rgb(var(--muted-foreground))',
                color: 'rgb(var(--white))',
                cursor: updatingStatus ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: updatingStatus ? 0.6 : 1
              }}
            >
              {updatingStatus ? 'Đang cập nhật...' : 'Đặt trạng thái: Bảo trì'}
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
            style={{
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          />
        </div>
      </div>

      {/* Bookings List */}
      {bookings.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: '#1f2937' }}>
            Danh sách đặt bàn ({bookings.length})
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px'
          }}>
            {bookings.map((booking) => {
              const scheduleStatus = booking.scheduleStatus || booking.ScheduleStatus;
              const paymentStatus = booking.paymentStatus || booking.PaymentStatus;
              const bookingDate = booking.bookingDate || booking.BookingDate;
              const detailSchedule = booking.detailSchedule || booking.DetailSchedule;
              const isProcessing = updatingBooking === booking.BookedScheduleId;

              // Lấy danh sách bàn từ detailSchedule
              let tableList = [];
              if (detailSchedule?.Table) {
                let tableMap = detailSchedule.Table;
                if (tableMap instanceof Map) {
                  tableMap = Object.fromEntries(tableMap);
                }
                if (tableMap && typeof tableMap.toObject === 'function') {
                  tableMap = tableMap.toObject();
                }
                tableList = Object.keys(tableMap || {}).map(key => {
                  const tableInfo = tableMap[key];
                  return {
                    id: key,
                    name: tableInfo?.TableName || key,
                    price: tableInfo?.Price || 0
                  };
                });
              }

              // Tìm thông tin bàn từ danh sách tables để lấy tên đầy đủ
              const enrichedTableList = tableList.map((tableItem, index) => {
                const fullTableInfo = tables.find(t => 
                  t.BarTableId?.toLowerCase() === tableItem.id?.toLowerCase()
                );
                // Ưu tiên: fullTableInfo.TableName > tableItem.name > "Bàn " + (index + 1)
                const displayName = fullTableInfo?.TableName || tableItem.name || `Bàn ${index + 1}`;
                return {
                  ...tableItem,
                  fullName: displayName,
                  tableTypeName: fullTableInfo?.TableTypeName || null
                };
              });

              return (
                <div
                  key={booking.BookedScheduleId}
                  style={{
                    background: 'rgb(var(--card))',
                    borderRadius: '8px',
                    padding: '14px',
                    border: '1px solid rgba(var(--border), 0.5)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.2s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(var(--border), 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(var(--border), 0.5)';
                  }}
                >
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ 
                      fontSize: '0.7rem', 
                      color: '#9ca3af', 
                      marginBottom: '6px',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      lineHeight: '1.3'
                    }}>
                      {booking.BookedScheduleId || booking.bookedScheduleId || 'N/A'}
                    </div>
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: '#6b7280', 
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{ fontSize: '0.75rem' }}>📅</span>
                      <span>{bookingDate ? new Date(bookingDate).toLocaleDateString('vi-VN') : 'N/A'}</span>
                    </div>
                    {enrichedTableList.length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: '600', 
                          color: '#9ca3af', 
                          marginBottom: '5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px'
                        }}>
                          Bàn ({enrichedTableList.length})
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: '4px'
                        }}>
                          {enrichedTableList.map((tableItem, idx) => (
                            <div
                              key={tableItem.id || idx}
                              style={{
                                padding: '4px 8px',
                                background: 'rgba(var(--muted), 0.3)',
                                borderRadius: '3px',
                                fontSize: '0.7rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                border: '1px solid rgba(var(--border), 0.2)',
                                minWidth: '28px'
                              }}
                            >
                              <span style={{ fontWeight: '600', color: '#374151' }}>
                                {idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {detailSchedule?.Note && (
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#6b7280', 
                        marginTop: '6px',
                        padding: '5px 8px',
                        background: 'rgba(var(--muted), 0.2)',
                        borderRadius: '4px',
                        borderLeft: '2px solid rgb(var(--primary))',
                        lineHeight: '1.4'
                      }}>
                        <span style={{ fontSize: '0.7rem' }}>📝 </span>
                        {detailSchedule.Note}
                      </div>
                    )}
                  </div>

                  {/* Status badges */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      background: scheduleStatus === 'Ended' 
                        ? 'rgba(var(--muted-foreground), 0.1)' 
                        : scheduleStatus === 'Confirmed'
                        ? 'rgba(var(--success), 0.1)'
                        : 'rgba(var(--warning), 0.1)',
                      color: scheduleStatus === 'Ended'
                        ? 'rgb(var(--muted-foreground))'
                        : scheduleStatus === 'Confirmed'
                        ? 'rgb(var(--success))'
                        : 'rgb(var(--warning))'
                    }}>
                      {scheduleStatus === 'Ended' ? 'Đã kết thúc' : scheduleStatus === 'Confirmed' ? 'Đã xác nhận' : scheduleStatus}
                    </span>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      background: paymentStatus === 'Paid'
                        ? 'rgba(var(--success), 0.1)'
                        : 'rgba(var(--warning), 0.1)',
                      color: paymentStatus === 'Paid'
                        ? 'rgb(var(--success))'
                        : 'rgb(var(--warning))'
                    }}>
                      {paymentStatus === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {paymentStatus !== 'Paid' && scheduleStatus !== 'Ended' && (
                      <button
                        onClick={() => handleMarkPaid(booking.BookedScheduleId)}
                        disabled={isProcessing}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '4px',
                          background: 'rgb(var(--success))',
                          color: 'rgb(var(--white))',
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          fontWeight: '600',
                          fontSize: '0.75rem',
                          opacity: isProcessing ? 0.6 : 1,
                          transition: 'opacity 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isProcessing) {
                            e.currentTarget.style.opacity = '0.9';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = isProcessing ? '0.6' : '1';
                        }}
                      >
                        {isProcessing ? 'Đang xử lý...' : 'Đã thanh toán'}
                      </button>
                    )}
                    {scheduleStatus !== 'Ended' && (
                      <button
                        onClick={() => handleEndBooking(booking.BookedScheduleId)}
                        disabled={isProcessing}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '4px',
                          background: 'rgb(var(--muted-foreground))',
                          color: 'rgb(var(--white))',
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          fontWeight: '600',
                          fontSize: '0.75rem',
                          opacity: isProcessing ? 0.6 : 1,
                          transition: 'opacity 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isProcessing) {
                            e.currentTarget.style.opacity = '0.9';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = isProcessing ? '0.6' : '1';
                        }}
                      >
                        {isProcessing ? 'Đang xử lý...' : 'Cập nhật'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Tables Grid - 4 bàn 1 hàng */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px'
      }}>
        <AnimatePresence>
          {filteredTables.map((table) => {
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
                  background: isSelected ? 'rgba(var(--primary), 0.1)' : 'rgb(var(--card))',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: isSelected
                    ? '0 4px 12px rgba(var(--primary), 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: isSelected
                    ? '2px solid rgb(var(--primary))'
                    : '2px solid transparent',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = isSelected
                    ? '0 4px 12px rgba(var(--primary), 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.1)';
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
                    background: 'rgb(var(--primary))',
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
                    color: '#6b7280',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    margin: '0 0 8px 0'
                  }}>
                    {table.TableTypeName}
                  </p>
                )}
                {table.DepositPrice !== null && table.DepositPrice !== undefined && Number(table.DepositPrice) > 0 && (
                  <p style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: 'rgb(var(--success))',
                    margin: '8px 0 0 0'
                  }}>
                    {Number(table.DepositPrice).toLocaleString('vi-VN')} đ
                  </p>
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
    </div>
  );
}

