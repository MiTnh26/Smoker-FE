import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2, X, Calendar, Clock, DollarSign, User, CheckCircle, AlertCircle } from 'lucide-react';
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
  const { t } = useTranslation();
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

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!receiverId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const bookingsData = await fetchBookingsForDate(selectedDate);
      
      // Filter only BarTable bookings and exclude Rejected and Canceled
      const barTableBookings = bookingsData.filter(b => {
        const type = b.Type || b.type;
        const scheduleStatus = b.scheduleStatus || b.ScheduleStatus;
        // Exclude Rejected and Canceled bookings
        return type === "BarTable" && scheduleStatus !== "Rejected" && scheduleStatus !== "Canceled";
      });
      
      // Sort: non-Ended bookings first, then by date (newest first)
      const sorted = barTableBookings.sort((a, b) => {
        const statusA = a.scheduleStatus || a.ScheduleStatus;
        const statusB = b.scheduleStatus || b.ScheduleStatus;
        const isEndedA = statusA === 'Ended';
        const isEndedB = statusB === 'Ended';
        
        // If one is Ended and the other is not, non-Ended comes first
        if (isEndedA !== isEndedB) {
          return isEndedA ? 1 : -1;
        }
        
        // If both have same Ended status, sort by date (newest first)
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

  // Fetch confirmed bookings
  const fetchConfirmedBookings = useCallback(async () => {
    if (!barPageId) return;

    try {
      const response = await bookingApi.getConfirmedBookings(barPageId);
      if (response.data?.success) {
        setConfirmedBookings(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching confirmed bookings:', err);
    }
  }, [barPageId]);

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
    }
    if (barPageId) {
      fetchConfirmedBookings();
    }
  }, [receiverId, selectedDate, fetchBookings, barPageId, fetchConfirmedBookings]);

  const handleMarkPaid = async (bookingId) => {
    try {
      setUpdatingBooking(bookingId);
      await bookingApi.markPaid(bookingId);
      await fetchBookings();
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
      await fetchBookings();
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
      await fetchBookings();
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
      await fetchBookings();
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
      <div className={cn('text-center py-12 text-muted-foreground')}>
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-6 p-6')}>
      <div className={cn('mb-4')}>
        <h1 className={cn('text-3xl font-bold text-foreground')}>
          Quản lý đặt bàn
        </h1>
        <p className={cn('text-muted-foreground mt-2')}>
          Quản lý và xác nhận các đặt bàn của quán bar
        </p>
      </div>

      {/* Tabs */}
      <div className={cn('bg-card rounded-lg p-4 border-[0.5px] border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]')}>
        <div className={cn('flex items-center gap-4 mb-4')}>
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'px-4 py-2 rounded-lg font-semibold transition-colors',
              activeTab === 'pending'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            Chờ xác nhận ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('confirmed')}
            className={cn(
              'px-4 py-2 rounded-lg font-semibold transition-colors',
              activeTab === 'confirmed'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            Đã xác nhận ({confirmedBookings.length})
          </button>
          {activeTab === 'confirmed' && (
            <button
              onClick={() => setQrScannerOpen(true)}
              className={cn(
                'ml-auto px-4 py-2 rounded-lg font-semibold',
                'bg-success text-success-foreground hover:bg-success/90',
                'transition-colors'
              )}
            >
              📱 Quét QR
            </button>
          )}
        </div>
      </div>

      {/* Pending Bookings Tab */}
      {activeTab === 'pending' && (
        <div className={cn('bg-card rounded-lg p-6 border-[0.5px] border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]')}>
          <div className={cn('mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4')}>
            <h2 className={cn('text-xl font-bold')}>
              Danh sách đặt bàn chờ xác nhận ({bookings.length})
            </h2>
          
          {/* Date filter */}
          <div className={cn('flex items-center gap-2')}>
            <label className={cn('text-sm font-semibold text-foreground whitespace-nowrap')}>
              Ngày:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={cn(
                'px-3 py-2 border border-border rounded-lg',
                'text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'bg-background text-foreground'
              )}
            />
          </div>
        </div>
        
        {bookings.length === 0 ? (
          <div className={cn(
            'text-center py-12 text-muted-foreground',
            'bg-muted/30 rounded-lg border border-border/20 p-8'
          )}>
            Chưa có đặt bàn nào
          </div>
        ) : (
          <div className={cn('flex flex-col gap-4')}>
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

            return (
              <div
                key={booking.BookedScheduleId}
                className={cn(
                  'bg-card rounded-lg border border-border/20 p-3',
                  'shadow-sm hover:shadow-md transition-shadow',
                  'flex items-center justify-between gap-3'
                )}
              >
                {/* Left side - Main info */}
                <div className={cn('flex flex-col gap-1.5 flex-1 min-w-0')}>
                  {/* Booking ID */}
                  <div className={cn('text-[0.7rem] text-muted-foreground font-mono break-all leading-tight')}>
                    {booking.BookedScheduleId || booking.bookedScheduleId || 'N/A'}
                  </div>
                  
                  {/* Date */}
                  <div className={cn('flex items-center gap-1.5 text-sm text-foreground')}>
                    <span>📅</span>
                    <span>{bookingDate ? new Date(bookingDate).toLocaleDateString('vi-VN') : 'N/A'}</span>
                  </div>
                  
                  {/* Tables */}
                  {enrichedTableList.length > 0 && (
                    <div className={cn('flex items-center gap-2 flex-wrap')}>
                      <span className={cn('text-xs text-muted-foreground')}>Bàn:</span>
                      <div className={cn('flex flex-wrap gap-1')}>
                        {enrichedTableList.map((tableItem, idx) => (
                          <span
                            key={tableItem.id || idx}
                            className={cn(
                              'px-2 py-0.5 bg-muted/30 rounded text-xs',
                              'border border-border/20'
                            )}
                          >
                            {idx + 1}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Status badges */}
                  <div className={cn('flex gap-2 flex-wrap')}>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-semibold',
                      scheduleStatus === 'Ended'
                        ? 'bg-muted-foreground/10 text-muted-foreground'
                        : scheduleStatus === 'Confirmed'
                        ? 'bg-green-500/10 text-green-500'
                        : scheduleStatus === 'Arrived'
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-yellow-500/10 text-yellow-500'
                    )}>
                      {getStatusConfig(scheduleStatus).label}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-semibold',
                      paymentStatus === 'Paid' || paymentStatus === 'Done'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-yellow-500/10 text-yellow-500'
                    )}>
                      {paymentStatus === 'Paid' || paymentStatus === 'Done' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </span>
                  </div>
                  
                  {/* Note */}
                  {detailSchedule?.Note && (
                    <div className={cn('text-xs text-muted-foreground truncate')}>
                      <span>📝 </span>
                      {detailSchedule.Note}
                    </div>
                  )}
                </div>

                {/* Right side - Action buttons */}
                {isOwnProfile && (
                  <div className={cn('flex items-center gap-2 flex-shrink-0')}>
                    {paymentStatus !== 'Paid' && paymentStatus !== 'Done' && scheduleStatus !== 'Ended' && (
                      <button
                        onClick={() => handleMarkPaid(booking.BookedScheduleId)}
                        disabled={isProcessing}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium',
                          'bg-green-500/10 text-green-500 hover:bg-green-500/20',
                          'transition-colors',
                          'disabled:opacity-60 disabled:cursor-not-allowed'
                        )}
                      >
                        {isProcessing ? 'Đang xử lý...' : 'Đã thanh toán'}
                      </button>
                    )}
                    {/* Only show "Chi tiết" button after payment is confirmed */}
                    {(paymentStatus === 'Paid' || paymentStatus === 'Done') && scheduleStatus !== 'Ended' && (
                      <button
                        onClick={() => handleViewBookingDetail(booking.BookedScheduleId)}
                        disabled={isProcessing || loadingBookingDetail}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium',
                          'bg-primary/10 text-primary hover:bg-primary/20',
                          'transition-colors',
                          'disabled:opacity-60 disabled:cursor-not-allowed'
                        )}
                      >
                        {isProcessing || loadingBookingDetail ? 'Đang tải...' : 'Chi tiết'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>
      )}

      {/* Confirmed Bookings Tab */}
      {activeTab === 'confirmed' && (
        <div className={cn('bg-card rounded-lg p-6 border-[0.5px] border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]')}>
          <div className={cn('mb-4')}>
            <h2 className={cn('text-xl font-bold')}>
              Danh sách đặt bàn đã xác nhận ({confirmedBookings.length})
            </h2>
          </div>

          {confirmedBookings.length === 0 ? (
            <div className={cn(
              'text-center py-12 text-muted-foreground',
              'bg-muted/30 rounded-lg border border-border/20 p-8'
            )}>
              <div className="text-4xl mb-4">📋</div>
              <p className="text-lg font-semibold mb-2">Chưa có booking nào được xác nhận</p>
              <p className="text-sm">Sử dụng nút "Quét QR" để xác nhận khách hàng đến quán</p>
            </div>
          ) : (
            <div className={cn('space-y-4')}>
              {confirmedBookings.map((booking) => {
                const bookingDetails = booking;
                const statusConfig = getStatusConfig(booking.scheduleStatus || booking.ScheduleStatus);

                return (
                  <div key={booking.BookedScheduleId} className={cn(
                    'p-4 rounded-lg border border-border/20',
                    'bg-card hover:bg-muted/30 transition-colors'
                  )}>
                    <div className={cn('flex items-start justify-between gap-4')}>
                      <div className={cn('flex-1')}>
                        <div className={cn('flex items-center gap-2 mb-2')}>
                          <h3 className={cn('font-semibold text-lg')}>
                            {bookingDetails.ComboName || 'Combo đặt bàn'}
                          </h3>
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-semibold",
                              "border"
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

                        <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-3')}>
                          <div className={cn('flex items-center gap-2')}>
                            <span>👤</span>
                            <span>{bookingDetails.BookerName || 'N/A'}</span>
                          </div>
                          <div className={cn('flex items-center gap-2')}>
                            <span>💰</span>
                            <span>{bookingDetails.TotalAmount?.toLocaleString('vi-VN')} đ</span>
                          </div>
                          <div className={cn('flex items-center gap-2')}>
                            <span>📅</span>
                            <span>{new Date(bookingDetails.BookingDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                          {bookingDetails.ConfirmedAt && (
                            <div className={cn('flex items-center gap-2')}>
                              <span>✅</span>
                              <span>Đã xác nhận lúc {new Date(bookingDetails.ConfirmedAt).toLocaleTimeString('vi-VN')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
  getStatusConfig
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

  // Get table list
  let tableList = [];
  if (detailSchedule?.Table) {
    let tableMap = detailSchedule.Table;
    if (tableMap instanceof Map) {
      tableMap = Object.fromEntries(tableMap);
    } else if (tableMap && typeof tableMap.toObject === 'function') {
      tableMap = tableMap.toObject();
    }
    tableList = Object.entries(tableMap || {}).map(([key, tableInfo]) => ({
      id: key,
      name: tableInfo?.TableName || key,
    }));
  }

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
      <div className={cn(
        "w-full max-w-3xl bg-card text-card-foreground rounded-xl",
        "border border-border/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
        "p-6 relative max-h-[90vh] overflow-y-auto"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className={cn("text-2xl font-bold text-foreground")}>
            Chi tiết đặt bàn
          </h3>
          <button
            onClick={onClose}
            className={cn(
              "p-1 rounded-full hover:bg-muted transition-colors",
              "text-muted-foreground hover:text-foreground"
            )}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={cn("space-y-4")}>
          {/* Booking ID */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mã đặt bàn:</span>
            <span className="text-sm font-mono font-semibold text-foreground">
              {bookingId || 'N/A'}
            </span>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-foreground">Trạng thái:</span>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-sm font-semibold border"
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
                "px-3 py-1 rounded-full text-sm font-semibold border",
                paymentStatus === 'Paid' || paymentStatus === 'Done'
                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                  : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
              )}
            >
              {paymentStatus === 'Paid' || paymentStatus === 'Done' ? 'Đã thanh toán' : 'Chưa thanh toán'}
            </span>
          </div>

          {/* Booking Date */}
          <div className="flex items-start gap-3">
            <Calendar className="mt-1 text-muted-foreground" size={20} />
            <div>
              <p className="text-sm text-muted-foreground">Ngày đặt</p>
              <p className="font-semibold text-foreground">
                {formatDate(bookingDate)}
              </p>
            </div>
          </div>

          {/* Booker Info */}
          <div className="flex items-start gap-3">
            <User className="mt-1 text-muted-foreground" size={20} />
            <div>
              <p className="text-sm text-muted-foreground">Người đặt</p>
              <p className="font-semibold text-foreground">
                {booking.BookerName || booking.bookerName || 'N/A'}
              </p>
            </div>
          </div>

          {/* Combo Info */}
          {combo && (combo.ComboName || combo.comboName) && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border/30">
              <p className="text-sm font-semibold text-foreground mb-2">Thông tin combo:</p>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Tên combo: </span>
                  <span className="text-sm font-semibold text-foreground">
                    {combo.ComboName || combo.comboName}
                  </span>
                </div>
                {combo.Price !== undefined && (
                  <div>
                    <span className="text-sm text-muted-foreground">Giá combo: </span>
                    <span className="text-sm font-semibold text-foreground">
                      {Number(combo.Price || combo.price || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                )}
                {combo.Description && (
                  <div>
                    <span className="text-sm text-muted-foreground">Mô tả: </span>
                    <span className="text-sm text-foreground">{combo.Description || combo.description}</span>
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
          {tableList.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Danh sách bàn:</p>
              <div className="flex flex-wrap gap-2">
                {tableList.map((table) => (
                  <span
                    key={table.id}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm bg-muted/50 text-foreground",
                      "border border-border/30"
                    )}
                  >
                    {table.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border/30">
            <p className="text-sm font-semibold text-foreground mb-3">Thông tin thanh toán:</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Giá gốc:</span>
                <span className="text-sm font-semibold text-foreground">
                  {originalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              {discountAmount > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Giảm giá:</span>
                    <span className="text-sm font-semibold text-success">
                      -{discountAmount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-border/30">
                <span className="text-base font-bold text-foreground">Tổng tiền thanh toán:</span>
                <span className="text-lg font-bold text-success">
                  {finalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>

          {/* Note */}
          {detailSchedule?.Note && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border/30">
              <p className="text-sm font-semibold text-foreground mb-2">Ghi chú:</p>
              <p className="text-sm text-foreground">{detailSchedule.Note}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-border/30">
            {(paymentStatus === 'Paid' || paymentStatus === 'Done') && scheduleStatus === 'Pending' && (
              <button
                onClick={() => onConfirm(bookingId)}
                disabled={isProcessing}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold",
                  "bg-success text-success-foreground hover:bg-success/90",
                  "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isProcessing ? 'Đang xử lý...' : 'Xác nhận booking'}
              </button>
            )}
            {(paymentStatus === 'Paid' || paymentStatus === 'Done') && scheduleStatus === 'Confirmed' && (
              <button
                onClick={() => onMarkArrived(bookingId)}
                disabled={isProcessing}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isProcessing ? 'Đang xử lý...' : 'Đánh dấu đã tới quán'}
              </button>
            )}
            {(paymentStatus === 'Paid' || paymentStatus === 'Done') && (scheduleStatus === 'Confirmed' || scheduleStatus === 'Arrived') && (
              <button
                onClick={() => onEndBooking(bookingId)}
                disabled={isProcessing}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold",
                  "bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20",
                  "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isProcessing ? 'Đang xử lý...' : 'Kết thúc booking'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

