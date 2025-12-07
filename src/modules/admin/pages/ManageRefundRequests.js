import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, Eye, AlertCircle, Loader2, 
  Search, Calendar, User, MapPin, Star, Image as ImageIcon, X, CheckCircle2, CreditCard
} from 'lucide-react';
import adminApi from '../../../api/adminApi';
import bankInfoApi from '../../../api/bankInfoApi';
import { cn } from '../../../utils/cn';

export default function ManageRefundRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [bankInfo, setBankInfo] = useState(null);
  const [loadingBankInfo, setLoadingBankInfo] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(false);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        limit: 100,
        offset: 0
      };
      
      const response = await adminApi.getRefundRequests(params);
      
      if (response.success && response.data) {
        setRequests(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.message || 'Không thể tải danh sách yêu cầu hoàn tiền');
      }
    } catch (err) {
      console.error('Error loading refund requests:', err);
      setError(err.response?.data?.message || err.message || 'Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    let filtered = requests;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req => 
        req.booker?.Name?.toLowerCase().includes(query) ||
        req.receiver?.Name?.toLowerCase().includes(query) ||
        req.BookedScheduleId?.toLowerCase().includes(query)
      );
    }
    
    // Filter by date
    if (searchDate) {
      filtered = filtered.filter(req => {
        const bookingDate = req.BookingDate || req.bookingDate;
        if (!bookingDate) return false;
        
        const reqDate = new Date(bookingDate);
        reqDate.setHours(0, 0, 0, 0);
        const filterDate = new Date(searchDate);
        filterDate.setHours(0, 0, 0, 0);
        
        return reqDate.getTime() === filterDate.getTime();
      });
    }
    
    return filtered;
  }, [requests, searchQuery, searchDate]);
  
  // Separate into Pending and Finished
  const pendingRequests = useMemo(() => {
    return filteredRequests.filter(req => {
      const refundStatus = req.RefundStatus || req.refundStatus || req.StatusRefund || req.statusRefund;
      return refundStatus !== 'Finished' && refundStatus !== 'finished';
    });
  }, [filteredRequests]);
  
  const finishedRequests = useMemo(() => {
    return filteredRequests.filter(req => {
      const refundStatus = req.RefundStatus || req.refundStatus || req.StatusRefund || req.statusRefund;
      return refundStatus === 'Finished' || refundStatus === 'finished';
    });
  }, [filteredRequests]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0 đ';
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  const getTypeLabel = (type) => {
    const labels = {
      'BarTable': 'Đặt bàn',
      'DJ': 'DJ',
      'Dancer': 'Dancer'
    };
    return labels[type] || type;
  };

  const handleRefundClick = async (request) => {
    setSelectedRequest(request);
    setShowRefundModal(true);
    setBankInfo(null);
    setLoadingBankInfo(true);
    
    try {
      // Lấy AccountId từ booker
      const accountId = request.booker?.AccountId;
      if (!accountId) {
        setError('Không tìm thấy AccountId của khách hàng');
        setLoadingBankInfo(false);
        return;
      }
      
      // Fetch bank info
      const response = await bankInfoApi.getByAccountId(accountId);
      if (response.data) {
        setBankInfo(response.data);
      } else {
        setError('Khách hàng chưa có thông tin ngân hàng');
      }
    } catch (err) {
      console.error('Error loading bank info:', err);
      if (err.response?.status === 404) {
        setError('Khách hàng chưa có thông tin ngân hàng');
      } else {
        setError(err.response?.data?.message || err.message || 'Lỗi khi tải thông tin ngân hàng');
      }
    } finally {
      setLoadingBankInfo(false);
    }
  };

  const handleConfirmRefund = async () => {
    if (!selectedRequest) return;
    
    if (!window.confirm('Bạn có chắc chắn muốn hoàn tiền cho yêu cầu này?')) {
      return;
    }
    
    setProcessingRefund(true);
    try {
      const response = await adminApi.updateRefundStatus(
        selectedRequest.BookedScheduleId,
        'Finished'
      );
      
      if (response.success) {
        alert('Đã cập nhật trạng thái hoàn tiền thành công!');
        setShowRefundModal(false);
        setSelectedRequest(null);
        setBankInfo(null);
        loadRequests(); // Reload danh sách
      } else {
        alert(response.message || 'Cập nhật trạng thái thất bại');
      }
    } catch (err) {
      console.error('Error updating refund status:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
    } finally {
      setProcessingRefund(false);
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-20')}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn('w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6')}>
      {/* Header */}
      <div className={cn('flex items-center justify-between mb-6')}>
        <div>
          <h1 className={cn('text-2xl md:text-3xl font-bold text-foreground mb-1')}>
            Yêu cầu hoàn tiền
          </h1>
          <p className={cn('text-sm text-muted-foreground')}>
            Quản lý các yêu cầu hoàn tiền từ khách hàng
          </p>
        </div>
      </div>

      {/* Search */}
      <div className={cn('mb-6')}>
        <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
          <div className={cn('relative')}>
            <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground')} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên khách hàng, người nhận, hoặc Booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-2 rounded-lg border border-border',
                'bg-background text-foreground text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary'
              )}
            />
          </div>
          <div className={cn('relative')}>
            <Calendar className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground')} />
            <input
              type="date"
              placeholder="Tìm kiếm theo ngày..."
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-2 rounded-lg border border-border',
                'bg-background text-foreground text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary'
              )}
            />
          </div>
        </div>
        {(searchQuery || searchDate) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSearchDate('');
            }}
            className={cn('mt-2 text-sm text-primary hover:underline')}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className={cn('mb-6 p-4 rounded-lg bg-red-50 border border-red-200')}>
          <div className={cn('flex items-center gap-2 text-red-800')}>
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className={cn('text-center py-16 bg-card rounded-xl border border-border')}>
          <DollarSign className={cn('w-12 h-12 mx-auto mb-3 text-muted-foreground/50')} />
          <p className={cn('text-muted-foreground')}>
            {(searchQuery || searchDate) ? 'Không tìm thấy yêu cầu nào' : 'Chưa có yêu cầu hoàn tiền nào'}
          </p>
        </div>
      ) : (
        <div className={cn('space-y-8')}>
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div>
              <h2 className={cn('text-xl font-bold text-foreground mb-4')}>
                Chưa được hoàn ({pendingRequests.length})
              </h2>
              <div className={cn('flex flex-col gap-4')}>
                {pendingRequests.map((request) => {
            const refundStatus = request.RefundStatus || request.refundStatus || request.StatusRefund || request.statusRefund;
            const isFinished = refundStatus === 'Finished' || refundStatus === 'finished';
            
                  return (
                    <div
                      key={request.BookedScheduleId}
                      style={{
                        background: 'rgb(var(--card))',
                        borderRadius: '8px',
                        padding: '14px',
                        border: '1px solid rgb(var(--border))',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.2s ease-in-out',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.08)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                          <div style={{
                            fontSize: '0.7rem',
                            color: '#9ca3af',
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            lineHeight: '1.2',
                            minWidth: '120px'
                          }}>
                            {request.BookedScheduleId || 'N/A'}
                          </div>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            background: 'rgba(234, 179, 8, 0.1)',
                            color: 'rgb(234, 179, 8)',
                            border: '1px solid rgba(234, 179, 8, 0.2)'
                          }}>
                            {getTypeLabel(request.Type)}
                          </span>
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span style={{ color: '#9ca3af' }}>Khách hàng: </span>
                            <span style={{ fontWeight: '600', color: '#374151' }}>
                              {request.booker?.Name || 'N/A'}
                            </span>
                          </div>
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span style={{ color: '#9ca3af' }}>Người nhận: </span>
                            <span style={{ fontWeight: '600', color: '#374151' }}>
                              {request.receiver?.Name || 'N/A'}
                            </span>
                          </div>
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <Calendar size={14} style={{ color: '#9ca3af' }} />
                            <span>{formatDate(request.BookingDate)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailModal(true);
                            }}
                            style={{
                              padding: '6px 12px',
                              border: 'none',
                              borderRadius: '4px',
                              background: 'rgb(var(--primary))',
                              color: 'rgb(var(--white))',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'background-color 0.2s ease-in-out'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--primary-hover))'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--primary))'}
                          >
                            <Eye size={14} />
                            Chi tiết
                          </button>
                          {!isFinished && (
                            <button
                              onClick={() => handleRefundClick(request)}
                              style={{
                                padding: '6px 12px',
                                border: 'none',
                                borderRadius: '4px',
                                background: 'rgb(22, 163, 74)',
                                color: 'rgb(var(--white))',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'background-color 0.2s ease-in-out'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(21, 128, 61)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(22, 163, 74)'}
                            >
                              <DollarSign size={14} />
                              Hoàn tiền
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Finished Requests */}
          {finishedRequests.length > 0 && (
            <div>
              <h2 className={cn('text-xl font-bold text-foreground mb-4')}>
                Đã được hoàn ({finishedRequests.length})
              </h2>
              <div className={cn('flex flex-col gap-4')}>
                {finishedRequests.map((request) => {
                  const refundStatus = request.RefundStatus || request.refundStatus || request.StatusRefund || request.statusRefund;
                  const isFinished = refundStatus === 'Finished' || refundStatus === 'finished';
                  
                  return (
                    <div
                      key={request.BookedScheduleId}
                      style={{
                        background: 'rgb(var(--card))',
                        borderRadius: '8px',
                        padding: '14px',
                        border: '1px solid rgb(var(--border))',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.2s ease-in-out',
                        cursor: 'pointer',
                        opacity: 0.85
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.08)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                          <div style={{
                            fontSize: '0.7rem',
                            color: '#9ca3af',
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            lineHeight: '1.2',
                            minWidth: '120px'
                          }}>
                            {request.BookedScheduleId || 'N/A'}
                          </div>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            background: 'rgba(234, 179, 8, 0.1)',
                            color: 'rgb(234, 179, 8)',
                            border: '1px solid rgba(234, 179, 8, 0.2)'
                          }}>
                            {getTypeLabel(request.Type)}
                          </span>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            background: 'rgba(var(--success), 0.1)',
                            color: 'rgb(var(--success))',
                            border: '1px solid rgba(var(--success), 0.2)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CheckCircle2 size={12} />
                            Đã hoàn tiền
                          </span>
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span style={{ color: '#9ca3af' }}>Khách hàng: </span>
                            <span style={{ fontWeight: '600', color: '#374151' }}>
                              {request.booker?.Name || 'N/A'}
                            </span>
                          </div>
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span style={{ color: '#9ca3af' }}>Người nhận: </span>
                            <span style={{ fontWeight: '600', color: '#374151' }}>
                              {request.receiver?.Name || 'N/A'}
                            </span>
                          </div>
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <Calendar size={14} style={{ color: '#9ca3af' }} />
                            <span>{formatDate(request.BookingDate)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailModal(true);
                            }}
                            style={{
                              padding: '6px 12px',
                              border: 'none',
                              borderRadius: '4px',
                              background: 'rgb(var(--primary))',
                              color: 'rgb(var(--white))',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'background-color 0.2s ease-in-out'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--primary-hover))'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--primary))'}
                          >
                            <Eye size={14} />
                            Chi tiết
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className={cn('fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4')}>
          <div className={cn('bg-background rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto')}>
            <div className={cn('flex items-center justify-between mb-4')}>
              <h3 className={cn('text-xl font-semibold text-foreground')}>
                Chi tiết yêu cầu hoàn tiền
              </h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedRequest(null);
                }}
                className={cn('p-1 hover:bg-muted rounded transition-colors')}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className={cn('space-y-6')}>
              {/* Booking Info */}
              <div>
                <h4 className={cn('text-lg font-semibold text-foreground mb-3')}>Thông tin booking</h4>
                <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
                  <div>
                    <label className={cn('block text-sm font-medium text-muted-foreground mb-1')}>Booking ID</label>
                    <p className={cn('text-base text-foreground font-mono')}>{selectedRequest.BookedScheduleId}</p>
                  </div>
                  <div>
                    <label className={cn('block text-sm font-medium text-muted-foreground mb-1')}>Loại</label>
                    <p className={cn('text-base text-foreground')}>{getTypeLabel(selectedRequest.Type)}</p>
                  </div>
                  <div>
                    <label className={cn('block text-sm font-medium text-muted-foreground mb-1')}>Khách hàng</label>
                    <p className={cn('text-base text-foreground')}>{selectedRequest.booker?.Name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className={cn('block text-sm font-medium text-muted-foreground mb-1')}>Người nhận</label>
                    <p className={cn('text-base text-foreground')}>{selectedRequest.receiver?.Name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className={cn('block text-sm font-medium text-muted-foreground mb-1')}>Ngày đặt</label>
                    <p className={cn('text-base text-foreground')}>{formatDate(selectedRequest.BookingDate)}</p>
                  </div>
                  {selectedRequest.detailSchedule?.Location && (
                    <div className={cn('md:col-span-2')}>
                      <label className={cn('block text-sm font-medium text-muted-foreground mb-1')}>
                        <MapPin className={cn('w-4 h-4 inline mr-1')} />
                        Địa chỉ
                      </label>
                      <p className={cn('text-base text-foreground')}>
                        {selectedRequest.detailSchedule.Location}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Details */}
              {selectedRequest.review && (
                <div>
                  <h4 className={cn('text-lg font-semibold text-foreground mb-3')}>Chi tiết đánh giá</h4>
                  <div className={cn('bg-muted/50 rounded-lg p-4 border border-border')}>
                    <div className={cn('flex items-center gap-2 mb-3')}>
                      <Star className={cn('w-5 h-5 text-yellow-500 fill-yellow-500')} />
                      <span className={cn('text-lg font-semibold text-foreground')}>
                        {selectedRequest.review.star || selectedRequest.review.starValue}/5
                      </span>
                    </div>
                    
                    {selectedRequest.review.reviewer && (
                      <div className={cn('flex items-center gap-2 mb-3')}>
                        <User className={cn('w-4 h-4 text-muted-foreground')} />
                        <span className={cn('text-sm text-foreground')}>
                          {selectedRequest.review.reviewer.userName || 'N/A'}
                        </span>
                      </div>
                    )}

                    {selectedRequest.review.content && (
                      <div className={cn('mb-3')}>
                        <label className={cn('block text-sm font-medium text-muted-foreground mb-1')}>Nội dung</label>
                        <p className={cn('text-base text-foreground')}>{selectedRequest.review.content}</p>
                      </div>
                    )}

                    {selectedRequest.review.bookingDate && (
                      <div className={cn('mb-3')}>
                        <label className={cn('block text-sm font-medium text-muted-foreground mb-1')}>
                          <Calendar className={cn('w-4 h-4 inline mr-1')} />
                          Ngày đặt
                        </label>
                        <p className={cn('text-base text-foreground')}>
                          {formatDate(selectedRequest.review.bookingDate)}
                        </p>
                      </div>
                    )}

                    {selectedRequest.review.tableName && (
                      <div className={cn('mb-3')}>
                        <label className={cn('block text-sm font-medium text-muted-foreground mb-1')}>Bàn</label>
                        <p className={cn('text-base text-foreground')}>{selectedRequest.review.tableName}</p>
                      </div>
                    )}

                    {/* Review Images */}
                    {(selectedRequest.review.picture || selectedRequest.review.feedbackContent) && (
                      <div className={cn('mt-4')}>
                        <label className={cn('block text-sm font-medium text-muted-foreground mb-2')}>
                          <ImageIcon className={cn('w-4 h-4 inline mr-1')} />
                          Hình ảnh đánh giá
                        </label>
                        <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
                          {selectedRequest.review.picture && (
                            <div>
                              <img
                                src={selectedRequest.review.picture}
                                alt="Review"
                                className={cn('w-full h-auto rounded-lg border border-border')}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          {selectedRequest.review.feedbackContent && (
                            <div>
                              {selectedRequest.review.feedbackContent.startsWith('http') ? (
                                <img
                                  src={selectedRequest.review.feedbackContent}
                                  alt="Feedback"
                                  className={cn('w-full h-auto rounded-lg border border-border')}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <p className={cn('text-base text-foreground')}>
                                  {selectedRequest.review.feedbackContent}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!selectedRequest.review && (
                <div className={cn('text-center py-8 bg-muted/50 rounded-lg border border-border')}>
                  <AlertCircle className={cn('w-12 h-12 mx-auto mb-3 text-muted-foreground/50')} />
                  <p className={cn('text-muted-foreground')}>Chưa có đánh giá cho booking này</p>
                </div>
              )}
            </div>

            <div className={cn('flex gap-3 justify-end mt-6')}>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedRequest(null);
                }}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-muted text-foreground hover:bg-muted/80 transition-colors'
                )}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedRequest && (
        <div className={cn('fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4')}>
          <div className={cn('bg-background rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto')}>
            <div className={cn('flex items-center justify-between mb-4')}>
              <h3 className={cn('text-xl font-semibold text-foreground')}>
                Hoàn tiền
              </h3>
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setSelectedRequest(null);
                  setBankInfo(null);
                  setError(null);
                }}
                className={cn('p-1 hover:bg-muted rounded transition-colors')}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className={cn('space-y-6')}>
              {/* Booking Info */}
              <div>
                <h4 className={cn('text-lg font-semibold text-foreground mb-3')}>Thông tin booking</h4>
                <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
                  <div>
                    <label className={cn('block text-sm font-medium text-muted-foreground mb-1')}>Khách hàng</label>
                    <p className={cn('text-base text-foreground')}>{selectedRequest.booker?.Name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className={cn('block text-sm font-medium text-muted-foreground mb-1')}>Số tiền hoàn</label>
                    <p className={cn('text-base text-foreground font-semibold')}>
                      {selectedRequest.depositAmount 
                        ? formatCurrency(selectedRequest.depositAmount)
                        : formatCurrency(selectedRequest.TotalAmount)
                      }
                    </p>
                    {selectedRequest.depositAmount && (
                      <p className={cn('text-xs text-muted-foreground mt-1')}>
                        (Số tiền cọc đã thanh toán)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bank Info */}
              <div>
                <h4 className={cn('text-lg font-semibold text-foreground mb-3 flex items-center gap-2')}>
                  <CreditCard className="w-5 h-5" />
                  Thông tin ngân hàng
                </h4>
                {loadingBankInfo ? (
                  <div className={cn('flex items-center justify-center py-8')}>
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : bankInfo ? (
                  <div className={cn('bg-muted/50 rounded-lg p-4 border border-border')}>
                    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
                      <div>
                        <label className={cn('block text-sm font-medium text-muted-foreground mb-1')}>Ngân hàng</label>
                        <p className={cn('text-base text-foreground font-semibold')}>
                          {bankInfo.BankName || bankInfo.bankName || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className={cn('block text-sm font-medium text-muted-foreground mb-1')}>Số tài khoản</label>
                        <p className={cn('text-base text-foreground font-semibold font-mono')}>
                          {bankInfo.AccountNumber || bankInfo.accountNumber || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={cn('bg-yellow-50 border border-yellow-200 rounded-lg p-4')}>
                    <div className={cn('flex items-center gap-2 text-yellow-800')}>
                      <AlertCircle className="w-5 h-5" />
                      <p>Khách hàng chưa có thông tin ngân hàng. Vui lòng yêu cầu khách hàng cập nhật thông tin ngân hàng trước khi hoàn tiền.</p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className={cn('p-4 rounded-lg bg-red-50 border border-red-200')}>
                  <div className={cn('flex items-center gap-2 text-red-800')}>
                    <AlertCircle className="w-5 h-5" />
                    <p>{error}</p>
                  </div>
                </div>
              )}
            </div>

            <div className={cn('flex gap-3 justify-end mt-6')}>
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setSelectedRequest(null);
                  setBankInfo(null);
                  setError(null);
                }}
                disabled={processingRefund}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-muted text-foreground hover:bg-muted/80 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmRefund}
                disabled={processingRefund || !bankInfo}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-green-600 text-white hover:bg-green-700 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center gap-2'
                )}
              >
                {processingRefund ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Xác nhận hoàn tiền
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

