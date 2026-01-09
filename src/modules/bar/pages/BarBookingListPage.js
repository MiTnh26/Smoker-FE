import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, X, Calendar, Clock, DollarSign, User, CheckCircle, AlertCircle, Package, Table, FileText, Phone, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import bookingApi from '../../../api/bookingApi';
import barPageApi from '../../../api/barPageApi';
import barTableApi from '../../../api/barTableApi';
import QRScanner from '../../../components/common/QRScanner';
import publicProfileApi from '../../../api/publicProfileApi';

/**
 * Bar Booking List Page
 * Route: /bar/bookings
 * Tự động resolve barPageId từ session (giống như BarDashboardPage)
 */
export default function BarBookingListPage() {
  const navigate = useNavigate();
  const [barPageId, setBarPageId] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'confirmed'
  const [bookings, setBookings] = useState([]);
  const [confirmedBookings, setConfirmedBookings] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receiverId, setReceiverId] = useState(null);
  const [updatingBooking, setUpdatingBooking] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loadingBookingDetail, setLoadingBookingDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Confirmed', 'Arrived', 'Ended'

  // Resolve barPageId from session
  useEffect(() => {
    const resolveBarPageId = async () => {
      try {
        const session = JSON.parse(localStorage.getItem("session") || "{}");
        const activeEntity = session.activeEntity || {};
        const entities = session.entities || [];
        
        console.log('[BarBookingListPage] Session data:', {
          activeEntity,
          entities: entities.length,
          activeEntityId: activeEntity.id,
          activeEntityType: activeEntity.type
        });

        const current = entities.find(e => 
          String(e.id) === String(activeEntity.id) && e.type === "BarPage"
        ) || activeEntity;

        let resolvedBarPageId = null;

        if (current?.type === "BarPage" && current?.id) {
          resolvedBarPageId = current.id;
        } else if (current?.EntityAccountId || current?.entityAccountId || activeEntity?.EntityAccountId || activeEntity?.entityAccountId) {
          const entityAccountId = current?.EntityAccountId || current?.entityAccountId || activeEntity?.EntityAccountId || activeEntity?.entityAccountId;
          try {
            const publicProfileRes = await publicProfileApi.getByEntityId(entityAccountId);
            const rawData = publicProfileRes?.data || {};
            resolvedBarPageId = rawData.targetId || rawData.BarPageId || rawData.barPageId;
          } catch (err) {
            console.error('[BarBookingListPage] Error resolving barPageId from EntityAccountId:', err);
          }
        }

        if (resolvedBarPageId) {
          console.log('[BarBookingListPage] Resolved barPageId:', resolvedBarPageId);
          setBarPageId(resolvedBarPageId);
          setIsOwnProfile(true);
        } else {
          console.error('[BarBookingListPage] Could not resolve barPageId');
          setError('Không tìm thấy thông tin quán bar');
          setLoading(false);
        }
      } catch (err) {
        console.error('[BarBookingListPage] Error resolving barPageId:', err);
        setError('Lỗi khi tải thông tin quán bar');
        setLoading(false);
      }
    };

    resolveBarPageId();
  }, []);

  // Status configuration
  const getStatusConfig = (status) => {
    const configs = {
      Pending: { label: "Chờ xác nhận", color: "rgb(var(--warning))", bg: "rgba(var(--warning), 0.1)" },
      Confirmed: { label: "Đã xác nhận", color: "rgb(var(--success))", bg: "rgba(var(--success), 0.1)" },
      Arrived: { label: "Đã tới quán", color: "rgb(var(--primary))", bg: "rgba(var(--primary), 0.1)" },
      Completed: { label: "Hoàn thành", color: "rgb(var(--primary))", bg: "rgba(var(--primary), 0.1)" },
      Canceled: { label: "Đã hủy", color: "rgb(var(--danger))", bg: "rgba(var(--danger), 0.1)" },
      Rejected: { label: "Từ chối", color: "rgb(var(--danger))", bg: "rgba(var(--danger), 0.1)" },
      Ended: { label: "Đã kết thúc", color: "rgb(var(--muted-foreground))", bg: "rgba(var(--muted-foreground), 0.1)" },
    };
    return configs[status] || configs.Pending;
  };

  // Fetch receiverId from barPageId
  useEffect(() => {
    const fetchReceiverId = async () => {
      if (!barPageId) return;
      try {
        const barDetails = await barPageApi.getBarPageById(barPageId);
        const entityAccountId = barDetails.data?.data?.EntityAccountId || barDetails.data?.EntityAccountId;
        if (entityAccountId) {
          setReceiverId(entityAccountId);
        }
      } catch (err) {
        console.error('Error fetching bar details:', err);
      }
    };
    fetchReceiverId();
  }, [barPageId]);

  // Fetch tables
  useEffect(() => {
    const fetchTables = async () => {
      if (!barPageId) return;
      try {
        const res = await barTableApi.getTablesByBar(barPageId);
        const tablesData = res.data?.data || res.data || [];
        setTables(tablesData);
      } catch (err) {
        console.error('Error fetching tables:', err);
      }
    };
    fetchTables();
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
      
      // Filter by date if provided
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

  // Fetch pending bookings (Paid + Pending)
  const fetchBookings = useCallback(async () => {
    if (!receiverId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const bookingsData = await fetchBookingsForDate(selectedDate);
      
      // Filter: BarTable bookings với paymentStatus = 'Paid' và scheduleStatus = 'Pending'
      const pendingBookings = bookingsData.filter(b => {
        const type = b.Type || b.type;
        const scheduleStatus = b.scheduleStatus || b.ScheduleStatus;
        const paymentStatus = b.paymentStatus || b.PaymentStatus;
      
        // Chỉ hiển thị: BarTable + Paid + Pending
        return type === "BarTable" 
          && (paymentStatus === 'Paid' || paymentStatus === 'Done')
          && scheduleStatus === 'Pending'
          && scheduleStatus !== "Rejected" 
          && scheduleStatus !== "Canceled";
      });
        
      // Sort by date (newest first)
      const sorted = pendingBookings.sort((a, b) => {
        const dateA = new Date(a.bookingDate || a.BookingDate || 0);
        const dateB = new Date(b.bookingDate || b.BookingDate || 0);
        return dateB - dateA;
      });

      setBookings(sorted);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Không thể tải danh sách đặt bàn. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [receiverId, selectedDate, fetchBookingsForDate]);

  // Fetch confirmed bookings (Confirmed, Arrived, Ended) với date filter
  const fetchConfirmedBookings = useCallback(async () => {
    if (!receiverId) return;

    try {
      const bookingsData = await fetchBookingsForDate(selectedDate);
      
      // Filter: BarTable bookings với:
      // 1. paymentStatus = 'Paid' và scheduleStatus = 'Confirmed'
      // 2. scheduleStatus = 'Arrived'
      // 3. scheduleStatus = 'Ended'
      const confirmedBookings = bookingsData.filter(b => {
        const type = b.Type || b.type;
        const scheduleStatus = b.scheduleStatus || b.ScheduleStatus;
        const paymentStatus = b.paymentStatus || b.PaymentStatus;
        
        // Loại bỏ Rejected và Canceled
        if (scheduleStatus === "Rejected" || scheduleStatus === "Canceled") {
          return false;
        }
        
        // Chỉ hiển thị BarTable bookings
        if (type !== "BarTable") {
          return false;
        }
        
        // Hiển thị nếu:
        // 1. Confirmed và đã thanh toán (Paid)
        // 2. Arrived (bất kỳ payment status)
        // 3. Ended (bất kỳ payment status)
        return (scheduleStatus === 'Confirmed' && (paymentStatus === 'Paid' || paymentStatus === 'Done'))
          || scheduleStatus === 'Arrived'
          || scheduleStatus === 'Ended';
      });
      
      // Sort by date (newest first)
      const sorted = confirmedBookings.sort((a, b) => {
        const dateA = new Date(a.bookingDate || a.BookingDate || 0);
        const dateB = new Date(b.bookingDate || b.BookingDate || 0);
        return dateB - dateA;
      });

      setConfirmedBookings(sorted);
    } catch (err) {
      console.error('Error fetching confirmed bookings:', err);
    }
  }, [receiverId, selectedDate, fetchBookingsForDate]);

  // QR Scanner handlers
  const handleQRScanSuccess = async (scanResult) => {
    console.log('QR Scan successful:', scanResult);
    
    // Lấy bookingId từ response
    // scanResult có thể là response.data.data hoặc response.data tùy theo cách Axios unwrap
    const bookingId = scanResult?.bookingId || 
                      scanResult?.data?.bookingId || 
                      scanResult?.data?.data?.bookingId;
    
    // Đóng scanner ngay lập tức
    setQrScannerOpen(false);
    
    // Refresh danh sách booking trước
    await Promise.all([
      fetchConfirmedBookings(),
      fetchBookings()
    ]);
    
    if (bookingId) {
      // Tự động mở modal chi tiết booking sau khi quét QR thành công
      // Delay một chút để đảm bảo danh sách đã refresh và UI đã update
      setTimeout(async () => {
        try {
          await handleViewBookingDetail(bookingId);
          
          // Chuyển sang tab phù hợp dựa trên trạng thái mới của booking
          const bookingStatus = scanResult?.newStatus || scanResult?.data?.newStatus;
          if (bookingStatus === 'Confirmed' || bookingStatus === 'Arrived') {
            setActiveTab('confirmed');
          } else if (bookingStatus === 'Pending') {
            setActiveTab('pending');
          }
        } catch (error) {
          console.error('Error opening booking detail:', error);
        }
      }, 500);
    }
  };

  const handleQRScanError = (error) => {
    console.error('QR Scan error:', error);
  };

  useEffect(() => {
    if (receiverId) {
      fetchBookings();
      fetchConfirmedBookings();
    }
  }, [receiverId, selectedDate, fetchBookings, fetchConfirmedBookings]);

  const handleMarkPaid = async (bookingId) => {
    try {
      setUpdatingBooking(bookingId);
      await bookingApi.markPaid(bookingId);
      // Refresh cả 2 danh sách
      await Promise.all([fetchBookings(), fetchConfirmedBookings()]);
    } catch (err) {
      console.error('Error marking paid:', err);
      alert('Không thể cập nhật trạng thái thanh toán');
    } finally {
      setUpdatingBooking(null);
    }
  };

  const handleEndBooking = async (bookingId) => {
    try {
      setUpdatingBooking(bookingId);
      await bookingApi.endBooking(bookingId);
      // Refresh cả 2 danh sách
      await Promise.all([fetchBookings(), fetchConfirmedBookings()]);
      // Refresh modal nếu đang mở
      if (detailModalOpen && selectedBooking?.BookedScheduleId === bookingId) {
        await handleViewBookingDetail(bookingId);
      }
    } catch (err) {
      console.error('Error ending booking:', err);
      alert('Không thể cập nhật trạng thái');
    } finally {
      setUpdatingBooking(null);
    }
  };

  const handleConfirmBooking = async (bookingId) => {
    try {
      setUpdatingBooking(bookingId);
      await bookingApi.confirmBooking(bookingId);
      // Refresh cả 2 danh sách
      await Promise.all([fetchBookings(), fetchConfirmedBookings()]);
      // Refresh modal nếu đang mở
      if (detailModalOpen && selectedBooking?.BookedScheduleId === bookingId) {
        await handleViewBookingDetail(bookingId);
      }
    } catch (err) {
      console.error('Error confirming booking:', err);
      alert('Không thể xác nhận booking');
    } finally {
      setUpdatingBooking(null);
    }
  };

  const handleMarkArrived = async (bookingId) => {
    try {
      setUpdatingBooking(bookingId);
      const response = await bookingApi.markBookingArrived(bookingId);
      // Refresh cả 2 danh sách
      await Promise.all([fetchBookings(), fetchConfirmedBookings()]);
      // Refresh modal nếu đang mở
      if (detailModalOpen && selectedBooking?.BookedScheduleId === bookingId) {
        await handleViewBookingDetail(bookingId);
      }
    } catch (err) {
      console.error('Error marking arrived:', err);
      alert('Không thể cập nhật trạng thái');
    } finally {
      setUpdatingBooking(null);
    }
  };

  const handleViewBookingDetail = async (bookingId) => {
    setLoadingBookingDetail(true);
    try {
      const response = await bookingApi.getBookingById(bookingId);
      const bookingData = response.data?.data || response.data || response;
      setSelectedBooking(bookingData);
      setDetailModalOpen(true);
    } catch (err) {
      console.error('Error fetching booking detail:', err);
      alert('Không thể tải chi tiết booking');
    } finally {
      setLoadingBookingDetail(false);
    }
  };

  if (!barPageId && loading) {
    return (
      <div className={cn('flex items-center justify-center min-h-screen')}>
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-12 text-destructive')}>
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center min-h-screen')}>
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-4" size={32} />
          <p className="text-muted-foreground">Đang tải danh sách đặt bàn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-6 p-6')}>
      {/* Header */}
      <div className={cn('mb-4')}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg shadow-lg">
            <Table size={28} className="text-white" />
          </div>
        <h1 className={cn('text-3xl font-bold text-foreground')}>
          Quản lý đặt bàn
        </h1>
        </div>
        <p className={cn('text-muted-foreground mt-2')}>
          Quản lý và xác nhận các đặt bàn của quán bar
        </p>
      </div>

      {/* Date Filter - Áp dụng cho cả 2 tab */}
      <div className={cn('bg-card rounded-xl p-4 border border-border/20 shadow-md')}>
        <div className={cn('flex items-center justify-between gap-4 flex-wrap')}>
          <div className={cn('flex items-center gap-3')}>
            <Calendar size={20} className="text-muted-foreground" />
            <label className={cn('text-sm font-semibold text-foreground whitespace-nowrap')}>
              Lọc theo ngày:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={cn(
                'px-4 py-2 border-2 border-border rounded-xl',
                'text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
                'bg-background text-foreground shadow-sm'
              )}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={cn('bg-card rounded-xl p-4 border border-border/20 shadow-md')}>
        <div className={cn('flex items-center gap-4 flex-wrap')}>
          <button
            onClick={() => {
              setActiveTab('pending');
              setStatusFilter('all'); // Reset filter khi chuyển tab
            }}
            className={cn(
              'px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2',
              activeTab === 'pending'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <AlertCircle size={18} />
            <span>Chờ xác nhận</span>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs',
              activeTab === 'pending' ? 'bg-white/20' : 'bg-muted-foreground/20'
            )}>
              {bookings.length}
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab('confirmed');
              setStatusFilter('all'); // Reset filter khi chuyển tab
            }}
            className={cn(
              'px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2',
              activeTab === 'confirmed'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <CheckCircle size={18} />
            <span>Đã xác nhận</span>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs',
              activeTab === 'confirmed' ? 'bg-white/20' : 'bg-muted-foreground/20'
            )}>
              {confirmedBookings.length}
            </span>
          </button>
          {activeTab === 'pending' && (
            <button
              onClick={() => setQrScannerOpen(true)}
              className={cn(
                'ml-auto px-6 py-3 rounded-xl font-semibold',
                'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
                'hover:from-blue-600 hover:to-indigo-600 shadow-lg hover:shadow-xl',
                'transition-all duration-200'
              )}
            >
              Quét QR
            </button>
          )}
        </div>
      </div>

      {/* Pending Bookings Tab */}
      {activeTab === 'pending' && (
        <div className={cn('bg-card rounded-xl p-6 border border-border/20 shadow-md')}>
          <div className={cn('mb-6')}>
            <h2 className={cn('text-2xl font-bold text-foreground mb-1')}>
              Danh sách đặt bàn chờ xác nhận
            </h2>
            <p className={cn('text-sm text-muted-foreground')}>
              Tổng số: <span className="font-semibold text-primary">{bookings.length}</span> đặt bàn (Đã thanh toán, chờ xác nhận)
            </p>
        </div>
        
        {bookings.length === 0 ? (
          <div className={cn(
              'text-center py-16',
              'bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/20 p-8'
          )}>
              <Table size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold text-muted-foreground mb-2">Chưa có đặt bàn nào</p>
              <p className="text-sm text-muted-foreground">Chọn ngày khác để xem đặt bàn</p>
          </div>
        ) : (
            <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-4')}>
            {bookings.map((booking) => {
            const scheduleStatus = booking.scheduleStatus || booking.ScheduleStatus;
            const paymentStatus = booking.paymentStatus || booking.PaymentStatus;
            const bookingDate = booking.bookingDate || booking.BookingDate;
            const detailSchedule = booking.detailSchedule || booking.DetailSchedule;
            const isProcessing = updatingBooking === booking.BookedScheduleId;

            // Get table list from detailSchedule
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

            // Enrich table list with full table info
            const enrichedTableList = tableList.map((tableItem, index) => {
              const fullTableInfo = tables.find(t => 
                t.BarTableId?.toLowerCase() === tableItem.id?.toLowerCase()
              );
              const displayName = fullTableInfo?.TableName || tableItem.name || `Bàn ${index + 1}`;
              return {
                ...tableItem,
                fullName: displayName,
                tableTypeName: fullTableInfo?.TableTypeName || null
              };
            });

            // Get combo info
            const combo = detailSchedule?.Combo || {};
            const comboName = combo.ComboName || combo.comboName || 'Combo đặt bàn';
            const comboPrice = combo.Price || combo.price || 0;

            return (
              <motion.div
                key={booking.BookedScheduleId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className={cn(
                  'bg-gradient-to-br from-white to-blue-50 rounded-xl border-2 border-blue-100',
                  'p-5 shadow-md hover:shadow-xl transition-all duration-300',
                  'flex flex-col gap-4'
                )}
              >
                {/* Header - Status badges */}
                <div className={cn('flex items-center justify-end gap-2')}>
                  <span className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold border',
                    scheduleStatus === 'Ended'
                      ? 'bg-gray-100 text-gray-600 border-gray-300'
                      : scheduleStatus === 'Confirmed'
                      ? 'bg-green-100 text-green-600 border-green-300'
                      : scheduleStatus === 'Arrived'
                      ? 'bg-blue-100 text-blue-600 border-blue-300'
                      : 'bg-yellow-100 text-yellow-600 border-yellow-300'
                  )}>
                    {getStatusConfig(scheduleStatus).label}
                  </span>
                  <span className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold border',
                    paymentStatus === 'Paid' || paymentStatus === 'Done'
                      ? 'bg-green-100 text-green-600 border-green-300'
                      : 'bg-yellow-100 text-yellow-600 border-yellow-300'
                  )}>
                    {paymentStatus === 'Paid' || paymentStatus === 'Done' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                  </span>
                  </div>
                  
                {/* Info Grid */}
                <div className={cn('grid grid-cols-2 gap-3')}>
                  {/* Date */}
                  <div className={cn('flex items-center gap-2 p-2 bg-muted/30 rounded-lg')}>
                    <Calendar size={16} className="text-blue-500" />
                    <div>
                      <p className={cn('text-xs text-muted-foreground')}>Ngày đặt</p>
                      <p className={cn('text-sm font-semibold text-foreground')}>
                        {bookingDate ? new Date(bookingDate).toLocaleDateString('vi-VN') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Price */}
                  <div className={cn('flex items-center gap-2 p-2 bg-muted/30 rounded-lg')}>
                    <DollarSign size={16} className="text-green-500" />
                    <div>
                      <p className={cn('text-xs text-muted-foreground')}>Giá combo</p>
                      <p className={cn('text-sm font-semibold text-green-600')}>
                        {comboPrice.toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                  </div>
                  </div>
                  
                  {/* Tables */}
                  {enrichedTableList.length > 0 && (
                  <div className={cn('p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100')}>
                    <div className={cn('flex items-center gap-2 mb-2')}>
                      <Table size={16} className="text-purple-500" />
                      <span className={cn('text-sm font-semibold text-foreground')}>Bàn đã chọn:</span>
                    </div>
                    <div className={cn('flex flex-wrap gap-2')}>
                        {enrichedTableList.map((tableItem, idx) => (
                          <span
                            key={tableItem.id || idx}
                            className={cn(
                            'px-3 py-1.5 bg-white rounded-lg text-sm font-medium',
                            'border-2 border-purple-200 text-purple-700 shadow-sm'
                            )}
                          >
                          {tableItem.fullName || tableItem.name || `Bàn ${idx + 1}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Note */}
                  {detailSchedule?.Note && (
                  <div className={cn('p-3 bg-muted/30 rounded-lg border border-border/20')}>
                    <div className={cn('flex items-center gap-2 mb-1')}>
                      <FileText size={14} className="text-muted-foreground" />
                      <span className={cn('text-xs font-semibold text-muted-foreground')}>Ghi chú:</span>
                    </div>
                    <p className={cn('text-sm text-foreground')}>{detailSchedule.Note}</p>
                </div>
                )}

                {/* Action buttons */}
                {isOwnProfile && (
                  <div className={cn('flex items-center gap-2 pt-3 border-t border-border/20')}>
                    {paymentStatus !== 'Paid' && paymentStatus !== 'Done' && scheduleStatus !== 'Ended' && (
                      <button
                        onClick={() => handleMarkPaid(booking.BookedScheduleId)}
                        disabled={isProcessing}
                        className={cn(
                          'flex-1 px-4 py-2 rounded-lg text-sm font-medium',
                          'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
                          'hover:from-green-600 hover:to-emerald-600 shadow-md hover:shadow-lg',
                          'transition-all duration-200',
                          'disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                        )}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 size={16} className="animate-spin text-white" />
                            <span className="text-white">Đang xử lý...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} className="text-white" />
                            <span className="text-white">Đánh dấu đã thanh toán</span>
                          </>
                        )}
                      </button>
                    )}
                    {(paymentStatus === 'Paid' || paymentStatus === 'Done') && scheduleStatus !== 'Ended' && (
                      <button
                        onClick={() => handleViewBookingDetail(booking.BookedScheduleId)}
                        disabled={isProcessing || loadingBookingDetail}
                        className={cn(
                          'flex-1 px-4 py-2 rounded-lg text-sm font-medium',
                          'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
                          'hover:from-blue-600 hover:to-indigo-600 shadow-md hover:shadow-lg',
                          'transition-all duration-200',
                          'disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                        )}
                      >
                        {isProcessing || loadingBookingDetail ? (
                          <>
                            <Loader2 size={16} className="animate-spin text-white" />
                            <span className="text-white">Đang tải...</span>
                          </>
                        ) : (
                          <>
                            <FileText size={16} className="text-white" />
                            <span className="text-white">Xem chi tiết</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
            })}
          </div>
        )}
      </div>
      )}

      {/* Confirmed Bookings Tab */}
      {activeTab === 'confirmed' && (() => {
        // Filter confirmed bookings theo status
        const filteredConfirmedBookings = statusFilter === 'all' 
          ? confirmedBookings 
          : confirmedBookings.filter(b => {
              const scheduleStatus = b.scheduleStatus || b.ScheduleStatus;
              return scheduleStatus === statusFilter;
            });

        return (
        <div className={cn('bg-card rounded-xl p-6 border border-border/20 shadow-md')}>
          <div className={cn('mb-6')}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={cn('text-2xl font-bold text-foreground mb-1')}>
                  Danh sách đặt bàn đã xác nhận
            </h2>
                <p className={cn('text-sm text-muted-foreground')}>
                  Tổng số: <span className="font-semibold text-primary">{filteredConfirmedBookings.length}</span> đặt bàn
                  {statusFilter !== 'all' && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Đã lọc: {getStatusConfig(statusFilter).label})
                    </span>
                  )}
                </p>
              </div>
          </div>

            {/* Status Filter */}
            <div className={cn('flex items-center gap-2 flex-wrap mb-4')}>
              <span className={cn('text-sm font-semibold text-foreground')}>Lọc theo trạng thái:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  statusFilter === 'all'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Tất cả
              </button>
              <button
                onClick={() => setStatusFilter('Confirmed')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  statusFilter === 'Confirmed'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Đã xác nhận
              </button>
              <button
                onClick={() => setStatusFilter('Arrived')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  statusFilter === 'Arrived'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Đã tới quán
              </button>
              <button
                onClick={() => setStatusFilter('Ended')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  statusFilter === 'Ended'
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Đã kết thúc
              </button>
            </div>
          </div>

          {filteredConfirmedBookings.length === 0 ? (
            <div className={cn(
              'text-center py-16',
              'bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/20 p-8'
            )}>
              <CheckCircle size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold text-muted-foreground mb-2">
                {statusFilter === 'all' 
                  ? 'Chưa có booking nào được xác nhận'
                  : `Chưa có booking nào với trạng thái "${getStatusConfig(statusFilter).label}"`
                }
              </p>
              <p className="text-sm text-muted-foreground">
                {statusFilter === 'all' 
                  ? 'Sử dụng nút "Quét QR" để xác nhận khách hàng đến quán'
                  : 'Thử chọn trạng thái khác hoặc chọn "Tất cả"'
                }
              </p>
            </div>
          ) : (
            <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-4')}>
              {filteredConfirmedBookings.map((booking) => {
                const bookingDetails = booking;
                const statusConfig = getStatusConfig(booking.scheduleStatus || booking.ScheduleStatus);
                const detailSchedule = booking.detailSchedule || booking.DetailSchedule;

                // Get table list from detailSchedule
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

                // Enrich table list with full table info
                const enrichedTableList = tableList.map((tableItem, index) => {
                  const fullTableInfo = tables.find(t => 
                    t.BarTableId?.toLowerCase() === tableItem.id?.toLowerCase()
                  );
                  const displayName = fullTableInfo?.TableName || tableItem.name || `Bàn ${index + 1}`;
                  return {
                    ...tableItem,
                    fullName: displayName,
                    tableTypeName: fullTableInfo?.TableTypeName || null
                  };
                });

                return (
                  <motion.div
                    key={booking.BookedScheduleId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    className={cn(
                      'bg-gradient-to-br from-white to-green-50 rounded-xl border-2 border-green-100',
                      'p-5 shadow-md hover:shadow-xl transition-all duration-300'
                    )}
                  >
                    {/* Header - Status badge */}
                    <div className={cn('flex items-center justify-end mb-4')}>
                          <span
                            className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold border"
                            )}
                            style={{
                              color: statusConfig.color,
                              backgroundColor: statusConfig.bg,
                              borderColor: statusConfig.color
                            }}
                          >
                            {statusConfig.label}
                          </span>
                        </div>

                    <div className={cn('grid grid-cols-2 gap-3 mb-3')}>
                      <div className={cn('flex items-center gap-2 p-2 bg-muted/30 rounded-lg')}>
                        <User size={16} className="text-blue-500" />
                        <div>
                          <p className={cn('text-xs text-muted-foreground')}>Người đặt</p>
                          <p className={cn('text-sm font-semibold text-foreground')}>
                            {bookingDetails.BookerName || 'N/A'}
                          </p>
                          </div>
                          </div>
                      <div className={cn('flex items-center gap-2 p-2 bg-muted/30 rounded-lg')}>
                        <DollarSign size={16} className="text-green-500" />
                        <div>
                          <p className={cn('text-xs text-muted-foreground')}>Tổng tiền</p>
                          <p className={cn('text-sm font-semibold text-green-600')}>
                            {bookingDetails.TotalAmount?.toLocaleString('vi-VN')} đ
                          </p>
                        </div>
                      </div>
                      <div className={cn('flex items-center gap-2 p-2 bg-muted/30 rounded-lg')}>
                        <Calendar size={16} className="text-purple-500" />
                        <div>
                          <p className={cn('text-xs text-muted-foreground')}>Ngày đặt</p>
                          <p className={cn('text-sm font-semibold text-foreground')}>
                            {new Date(bookingDetails.BookingDate).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                          </div>
                          {bookingDetails.ConfirmedAt && (
                        <div className={cn('flex items-center gap-2 p-2 bg-muted/30 rounded-lg')}>
                          <Clock size={16} className="text-orange-500" />
                          <div>
                            <p className={cn('text-xs text-muted-foreground')}>Xác nhận lúc</p>
                            <p className={cn('text-sm font-semibold text-foreground')}>
                              {new Date(bookingDetails.ConfirmedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                            </div>
                          )}
                        </div>

                    {/* Tables */}
                    {enrichedTableList.length > 0 && (
                      <div className={cn('p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100 mb-3')}>
                        <div className={cn('flex items-center gap-2 mb-2')}>
                          <Table size={16} className="text-purple-500" />
                          <span className={cn('text-sm font-semibold text-foreground')}>Bàn đã chọn:</span>
                      </div>
                        <div className={cn('flex flex-wrap gap-2')}>
                          {enrichedTableList.map((tableItem, idx) => (
                            <span
                              key={tableItem.id || idx}
                              className={cn(
                                'px-3 py-1.5 bg-white rounded-lg text-sm font-medium',
                                'border-2 border-purple-200 text-purple-700 shadow-sm'
                              )}
                            >
                              {tableItem.fullName || tableItem.name || `Bàn ${idx + 1}`}
                            </span>
                          ))}
                    </div>
                  </div>
                    )}

                    {/* Action Button */}
                    <div className={cn('flex items-center gap-2 pt-3 mt-3 border-t border-border/20')}>
                      <button
                        onClick={() => handleViewBookingDetail(booking.BookedScheduleId)}
                        disabled={loadingBookingDetail}
                        className={cn(
                          'flex-1 px-4 py-2 rounded-lg text-sm font-medium',
                          'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
                          'hover:from-blue-600 hover:to-indigo-600 shadow-md hover:shadow-lg',
                          'transition-all duration-200',
                          'disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                        )}
                      >
                        {loadingBookingDetail ? (
                          <>
                            <Loader2 size={16} className="animate-spin text-white" />
                            <span className="text-white">Đang tải...</span>
                          </>
                        ) : (
                          <>
                            <FileText size={16} className="text-white" />
                            <span className="text-white">Xem chi tiết</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
        );
      })()}

      {/* QR Scanner Modal */}
      {qrScannerOpen && (
        <div className={cn(
          'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'
        )}>
          <div className={cn('bg-card rounded-xl shadow-2xl max-w-md w-full')}>
            <QRScanner
              onScanSuccess={handleQRScanSuccess}
              onScanError={handleQRScanError}
              onClose={() => setQrScannerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      <BookingDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
        isProcessing={updatingBooking === selectedBooking?.BookedScheduleId}
        onConfirm={handleConfirmBooking}
        onMarkArrived={handleMarkArrived}
        onEndBooking={handleEndBooking}
        getStatusConfig={getStatusConfig}
        tables={tables}
      />

    </div>
  );
}

// Booking Detail Modal Component
const BookingDetailModal = ({ 
  open, 
  onClose, 
  booking, 
  isProcessing = false,
  onConfirm,
  onMarkArrived,
  onEndBooking,
  getStatusConfig,
  tables = []
}) => {
  // Parse booking data
  const detailSchedule = booking?.detailSchedule || booking?.DetailSchedule;
  const paymentStatus = booking?.paymentStatus || booking?.PaymentStatus;
  const scheduleStatus = booking?.scheduleStatus || booking?.ScheduleStatus;
  const bookingDate = booking?.bookingDate || booking?.BookingDate;
  
  // Calculate amounts
  const originalAmount = useMemo(() => {
    if (!booking) return 0;
    const fromBooking = booking?.OriginalPrice ?? booking?.originalPrice;
    if (fromBooking !== undefined && fromBooking !== null && !Number.isNaN(Number(fromBooking))) {
      return Number(fromBooking);
    }
    const comboPrice = detailSchedule?.Combo?.Price ?? detailSchedule?.Combo?.price;
    if (comboPrice !== undefined && comboPrice !== null && !Number.isNaN(Number(comboPrice))) {
      return Number(comboPrice);
    }
    return booking?.TotalAmount ?? booking?.totalAmount ?? 0;
  }, [booking, detailSchedule]);

  const discountPercent = useMemo(() => {
    if (!booking) return 0;
    const fromBooking = booking?.DiscountPercentages ?? booking?.discountPercentages;
    if (fromBooking !== undefined && fromBooking !== null && !Number.isNaN(Number(fromBooking))) {
      return Number(fromBooking);
    }
    return detailSchedule?.Voucher?.DiscountPercentage ?? detailSchedule?.Voucher?.discountPercentage ?? 0;
  }, [booking, detailSchedule]);

  const finalAmount = useMemo(() => {
    if (!booking) return 0;
    const fromBooking = booking?.TotalAmount ?? booking?.totalAmount;
    if (fromBooking !== undefined && fromBooking !== null && !Number.isNaN(Number(fromBooking))) {
      return Number(fromBooking);
    }
    return Math.max(0, originalAmount - Math.floor((originalAmount * discountPercent) / 100));
  }, [booking, originalAmount, discountPercent]);

  const discountAmount = useMemo(() => {
    return originalAmount - finalAmount;
  }, [originalAmount, finalAmount]);

  if (!open || !booking) return null;

  const statusConfig = getStatusConfig(scheduleStatus);
  const bookingId = booking.BookedScheduleId || booking.bookedScheduleId;

  // Get table list from multiple sources
  let tableList = [];
  
  // Try to get from detailSchedule.Table
  if (detailSchedule?.Table) {
    let tableMap = detailSchedule.Table;
    if (tableMap instanceof Map) {
      tableMap = Object.fromEntries(tableMap);
    } else if (tableMap && typeof tableMap.toObject === 'function') {
      tableMap = tableMap.toObject();
    }
    if (tableMap && typeof tableMap === 'object') {
      tableList = Object.keys(tableMap || {}).map(key => {
        const tableInfo = tableMap[key];
        return {
      id: key,
          name: tableInfo?.TableName || tableInfo?.name || key,
          price: tableInfo?.Price || tableInfo?.price || 0
        };
      });
    }
  }
  
  // Fallback: Try to get from booking.Table or booking.tableList
  if (tableList.length === 0) {
    const bookingTable = booking?.Table || booking?.table;
    const bookingTableList = booking?.tableList || booking?.TableList;
    
    if (bookingTable) {
      let tableMap = bookingTable;
      if (tableMap instanceof Map) {
        tableMap = Object.fromEntries(tableMap);
      } else if (tableMap && typeof tableMap.toObject === 'function') {
        tableMap = tableMap.toObject();
      }
      if (tableMap && typeof tableMap === 'object') {
        tableList = Object.keys(tableMap || {}).map(key => {
          const tableInfo = tableMap[key];
          return {
            id: key,
            name: tableInfo?.TableName || tableInfo?.name || key,
            price: tableInfo?.Price || tableInfo?.price || 0
          };
        });
      }
    } else if (Array.isArray(bookingTableList) && bookingTableList.length > 0) {
      tableList = bookingTableList.map((table, index) => ({
        id: table?.BarTableId || table?.id || table?.TableId || `table-${index}`,
        name: table?.TableName || table?.name || `Bàn ${index + 1}`,
        price: table?.Price || table?.price || 0
      }));
    }
  }

  // Enrich table list with full table info
  const enrichedTableList = tableList.map((tableItem, index) => {
    const fullTableInfo = tables.find(t => {
      const tableId = t.BarTableId || t.id || t.TableId;
      return tableId?.toLowerCase() === tableItem.id?.toLowerCase();
    });
    const displayName = fullTableInfo?.TableName || tableItem.name || `Bàn ${index + 1}`;
    return {
      ...tableItem,
      fullName: displayName,
      tableTypeName: fullTableInfo?.TableTypeName || null
    };
  });

  // Combo info
  const combo = detailSchedule?.Combo || {};
  const voucher = detailSchedule?.Voucher || {};

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div
      className={cn("fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4")}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={cn(
          "w-full max-w-3xl bg-card text-card-foreground rounded-2xl",
          "border-2 border-border/20 shadow-2xl",
        "p-6 relative max-h-[90vh] overflow-y-auto"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
              <FileText size={20} className="text-white" />
            </div>
          <h3 className={cn("text-2xl font-bold text-foreground")}>
            Chi tiết đặt bàn
          </h3>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-full hover:bg-muted transition-colors",
              "text-muted-foreground hover:text-foreground"
            )}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={cn("space-y-4")}>
          {/* Status Badges */}
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <span className="text-sm font-semibold text-foreground">Trạng thái:</span>
            <span
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold border shadow-sm"
              )}
              style={{
                color: statusConfig.color,
                backgroundColor: statusConfig.bg,
                borderColor: statusConfig.color
              }}
            >
              {statusConfig.label}
            </span>
            <span
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold border shadow-sm",
                paymentStatus === 'Paid' || paymentStatus === 'Done'
                  ? "bg-green-100 text-green-600 border-green-300"
                  : "bg-yellow-100 text-yellow-600 border-yellow-300"
              )}
            >
              {paymentStatus === 'Paid' || paymentStatus === 'Done' ? 'Đã thanh toán' : 'Chưa thanh toán'}
            </span>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Booking Date */}
            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Calendar className="text-white" size={20} />
              </div>
            <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Ngày đặt</p>
                <p className="font-bold text-foreground">
                {formatDate(bookingDate)}
              </p>
            </div>
          </div>

          {/* Booker Info */}
            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
              <div className="p-2 bg-blue-500 rounded-lg">
                <User className="text-white" size={20} />
              </div>
            <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Người đặt</p>
                <p className="font-bold text-foreground">
                {booking.BookerName || booking.bookerName || 'N/A'}
              </p>
              </div>
            </div>
          </div>

          {/* Combo Info */}
          {combo && (combo.ComboName || combo.comboName) && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-100 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Package size={18} className="text-purple-500" />
                <p className="text-sm font-bold text-foreground">Thông tin combo</p>
              </div>
              <div className="space-y-3">
                <div className="p-2 bg-white/50 rounded-lg">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Tên combo</p>
                  <p className="text-sm font-bold text-foreground">
                    {combo.ComboName || combo.comboName}
                  </p>
                </div>
                {combo.Price !== undefined && (
                  <div className="p-2 bg-white/50 rounded-lg">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Giá combo</p>
                    <p className="text-sm font-bold text-green-600">
                      {Number(combo.Price || combo.price || 0).toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                )}
                {combo.Description && (
                  <div className="p-2 bg-white/50 rounded-lg">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Mô tả</p>
                    <p className="text-sm text-foreground">{combo.Description || combo.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Voucher Info */}
          {voucher && (voucher.VoucherName || voucher.voucherName) && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border/30">
              <p className="text-sm font-semibold text-foreground mb-2">Voucher đã áp dụng:</p>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Mã voucher: </span>
                  <span className="text-sm font-semibold text-foreground">
                    {voucher.VoucherCode || voucher.voucherCode || voucher.VoucherName || voucher.voucherName}
                  </span>
                </div>
                {discountPercent > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Giảm giá: </span>
                    <span className="text-sm font-semibold text-success">
                      {discountPercent}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tables */}
          {enrichedTableList.length > 0 ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-100 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Table size={18} className="text-purple-500" />
                <p className="text-sm font-bold text-foreground">Bàn đã chọn</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {enrichedTableList.map((table, idx) => (
                  <span
                    key={table.id || idx}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium bg-white",
                      "border-2 border-purple-200 text-purple-700 shadow-sm"
                    )}
                  >
                    {table.fullName || table.name || `Bàn ${table.id || idx + 1}`}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 mb-4">
              <div className="flex items-center gap-2">
                <Table size={18} className="text-gray-400" />
                <p className="text-sm font-medium text-gray-500">Chưa có thông tin bàn</p>
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-100 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={18} className="text-green-500" />
              <p className="text-sm font-bold text-foreground">Thông tin thanh toán</p>
            </div>
            <div className="space-y-3">
              <div className="p-2 bg-white/50 rounded-lg flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Giá gốc:</span>
                <span className="text-sm font-bold text-foreground">
                  {originalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="p-2 bg-white/50 rounded-lg flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">Giảm giá:</span>
                  <span className="text-sm font-bold text-green-600">
                      -{discountAmount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
              )}
              <div className="p-3 bg-white/70 rounded-lg flex justify-between items-center border-2 border-green-200">
                <span className="text-base font-bold text-foreground">Tổng tiền thanh toán:</span>
                <span className="text-lg font-bold text-green-600">
                  {finalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>

          {/* Note */}
          {detailSchedule?.Note && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-100 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={18} className="text-blue-500" />
                <p className="text-sm font-bold text-foreground">Ghi chú</p>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{detailSchedule.Note}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-border/30">
            {(paymentStatus === 'Paid' || paymentStatus === 'Done') && scheduleStatus === 'Pending' && (
              <button
                onClick={() => onConfirm(bookingId)}
                disabled={isProcessing}
                className={cn(
                  "flex-1 px-4 py-3 rounded-xl text-sm font-semibold",
                  "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
                  "hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl",
                  "transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span className="text-white">Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} className="text-white" />
                    <span className="text-white">Xác nhận booking</span>
                  </>
                )}
              </button>
            )}
            {(paymentStatus === 'Paid' || paymentStatus === 'Done') && scheduleStatus === 'Confirmed' && (
              <>
              <button
                onClick={() => onMarkArrived(bookingId)}
                disabled={isProcessing}
                className={cn(
                    "flex-1 px-4 py-3 rounded-xl text-sm font-semibold",
                    "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
                    "hover:from-blue-600 hover:to-indigo-600 shadow-lg hover:shadow-xl",
                    "transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                    "flex items-center justify-center gap-2"
                )}
              >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" />
                      <span className="text-white">Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} className="text-white" />
                      <span className="text-white">Đánh dấu đã tới quán</span>
                    </>
                  )}
              </button>
                <button
                  onClick={() => onEndBooking(bookingId)}
                  disabled={isProcessing}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-xl text-sm font-semibold",
                    "bg-gradient-to-r from-gray-500 to-gray-600 text-white",
                    "hover:from-gray-600 hover:to-gray-700 shadow-lg hover:shadow-xl",
                    "transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" />
                      <span className="text-white">Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <X size={16} className="text-white" />
                      <span className="text-white">Kết thúc booking</span>
                    </>
                  )}
                </button>
              </>
            )}
            {(paymentStatus === 'Paid' || paymentStatus === 'Done') && scheduleStatus === 'Arrived' && (
              <button
                onClick={() => onEndBooking(bookingId)}
                disabled={isProcessing}
                className={cn(
                  "flex-1 px-4 py-3 rounded-xl text-sm font-semibold",
                  "bg-gradient-to-r from-gray-500 to-gray-600 text-white",
                  "hover:from-gray-600 hover:to-gray-700 shadow-lg hover:shadow-xl",
                  "transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span className="text-white">Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <X size={16} className="text-white" />
                    <span className="text-white">Kết thúc booking</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

