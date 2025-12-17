import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import bookingApi from '../../../api/bookingApi';
import barPageApi from '../../../api/barPageApi';
import barTableApi from '../../../api/barTableApi';

export default function BarBookingList({ barPageId, isOwnProfile }) {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receiverId, setReceiverId] = useState(null);
  const [updatingBooking, setUpdatingBooking] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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

  useEffect(() => {
    if (receiverId) {
      fetchBookings();
    }
  }, [receiverId, selectedDate, fetchBookings]);

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
    } catch (err) {
      console.error('Error ending booking:', err);
      alert('Không thể cập nhật trạng thái');
    } finally {
      setUpdatingBooking(null);
    }
  };

  if (loading) {
    return (
      <div className={cn('text-center py-12 text-muted-foreground')}>
        {t('common.loading')}
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

  return (
    <div className={cn('flex flex-col gap-6')}>
      <div className={cn('bg-card rounded-lg p-6 border-[0.5px] border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]')}>
        <div className={cn('mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4')}>
          <h2 className={cn('text-xl font-bold')}>
            Danh sách đặt bàn ({bookings.length})
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
                        : 'bg-yellow-500/10 text-yellow-500'
                    )}>
                      {scheduleStatus === 'Ended' ? 'Đã kết thúc' : scheduleStatus === 'Confirmed' ? 'Đã xác nhận' : scheduleStatus}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-semibold',
                      paymentStatus === 'Paid'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-yellow-500/10 text-yellow-500'
                    )}>
                      {paymentStatus === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
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
                    {paymentStatus !== 'Paid' && scheduleStatus !== 'Ended' && (
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
                    {/* Only show "Cập nhật" button after payment is confirmed */}
                    {paymentStatus === 'Paid' && scheduleStatus !== 'Ended' && (
                      <button
                        onClick={() => handleEndBooking(booking.BookedScheduleId)}
                        disabled={isProcessing}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium',
                          'bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20',
                          'transition-colors',
                          'disabled:opacity-60 disabled:cursor-not-allowed'
                        )}
                      >
                        {isProcessing ? 'Đang xử lý...' : 'Cập nhật'}
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
    </div>
  );
}

