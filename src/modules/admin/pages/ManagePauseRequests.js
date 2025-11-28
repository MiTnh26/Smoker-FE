import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, CheckCircle2, XCircle, Eye, AlertCircle, Loader2, 
  Search, Filter, Pause, CheckCircle, X, ExternalLink
} from 'lucide-react';
import adminApi from '../../../api/adminApi';
import { cn } from '../../../utils/cn';

const STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả', icon: Filter, color: 'gray' },
  { value: 'pending', label: 'Chờ duyệt', icon: Clock, color: 'yellow' },
  { value: 'approved', label: 'Đã duyệt', icon: CheckCircle2, color: 'green' },
  { value: 'rejected', label: 'Từ chối', icon: XCircle, color: 'red' },
  { value: 'completed', label: 'Hoàn tất', icon: CheckCircle, color: 'blue' },
];

const REASON_LABELS = {
  'temporary_pause': 'Tạm dừng tạm thời',
  'content_update': 'Cập nhật nội dung',
  'budget_exhausted': 'Hết ngân sách',
  'campaign_end': 'Kết thúc chiến dịch',
  'other': 'Khác'
};

export default function ManagePauseRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        limit: 100,
        offset: 0
      };
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const response = await adminApi.getPauseRequests(params);
      
      if (response.success && response.data) {
        setRequests(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.message || 'Không thể tải danh sách yêu cầu');
      }
    } catch (err) {
      console.error('Error loading pause requests:', err);
      setError(err.response?.data?.message || err.message || 'Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    
    const query = searchQuery.toLowerCase();
    return requests.filter(req => 
      req.AdTitle?.toLowerCase().includes(query) ||
      req.BarName?.toLowerCase().includes(query) ||
      req.AccountEmail?.toLowerCase().includes(query)
    );
  }, [requests, searchQuery]);

  const handleApprove = async (requestId) => {
    if (!window.confirm('Bạn đã pause banner trên Revive chưa? Sau khi duyệt, quảng cáo sẽ bị tạm dừng.')) {
      return;
    }
    
    setProcessing(true);
    try {
      const response = await adminApi.approvePauseRequest(requestId, {
        adminNote: adminNote || null,
        revivePaused: true
      });
      
      if (response.success) {
        alert('Yêu cầu đã được duyệt thành công!');
        setAdminNote('');
        setShowDetailModal(false);
        setSelectedRequest(null);
        loadRequests();
      } else {
        alert(response.message || 'Duyệt yêu cầu thất bại');
      }
    } catch (err) {
      console.error('Error approving pause request:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId) => {
    if (!adminNote.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    
    setProcessing(true);
    try {
      const response = await adminApi.rejectPauseRequest(requestId, {
        adminNote
      });
      
      if (response.success) {
        alert('Yêu cầu đã bị từ chối');
        setAdminNote('');
        setShowDetailModal(false);
        setSelectedRequest(null);
        loadRequests();
      } else {
        alert(response.message || 'Từ chối yêu cầu thất bại');
      }
    } catch (err) {
      console.error('Error rejecting pause request:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async (requestId) => {
    setProcessing(true);
    try {
      const response = await adminApi.completePauseRequest(requestId);
      
      if (response.success) {
        alert('Yêu cầu đã được hoàn tất');
        setShowDetailModal(false);
        setSelectedRequest(null);
        loadRequests();
      } else {
        alert(response.message || 'Hoàn tất yêu cầu thất bại');
      }
    } catch (err) {
      console.error('Error completing pause request:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      approved: { label: 'Đã duyệt', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
      rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
      completed: { label: 'Hoàn tất', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border',
        config.color
      )}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
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
            Yêu cầu tạm dừng quảng cáo
          </h1>
          <p className={cn('text-sm text-muted-foreground')}>
            Quản lý các yêu cầu tạm dừng quảng cáo từ BarPage
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className={cn('flex flex-col md:flex-row gap-4 mb-6')}>
        {/* Status Filters */}
        <div className={cn('flex flex-wrap gap-2')}>
          {STATUS_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground border border-border hover:bg-muted'
                )}
              >
                <Icon className="w-4 h-4" />
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className={cn('flex-1 md:max-w-xs')}>
          <div className={cn('relative')}>
            <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground')} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên quảng cáo, quán bar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-2 rounded-lg border border-border',
                'bg-background text-foreground text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary'
              )}
            />
          </div>
        </div>
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
          <Pause className={cn('w-12 h-12 mx-auto mb-3 text-muted-foreground/50')} />
          <p className={cn('text-muted-foreground')}>
            {statusFilter === 'all' ? 'Chưa có yêu cầu nào' : `Không có yêu cầu ở trạng thái "${STATUS_FILTERS.find(f => f.value === statusFilter)?.label}"`}
          </p>
        </div>
      ) : (
        <div className={cn('space-y-4')}>
          {filteredRequests.map((request) => (
            <div
              key={request.PauseRequestId}
              className={cn('bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow')}
            >
              <div className={cn('flex items-start justify-between')}>
                <div className={cn('flex-1')}>
                  <div className={cn('flex items-center gap-3 mb-3')}>
                    <h3 className={cn('text-lg font-semibold text-foreground')}>
                      {request.AdTitle || 'N/A'}
                    </h3>
                    {getStatusBadge(request.Status)}
                  </div>

                  <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4 text-sm')}>
                    <div>
                      <span className={cn('text-muted-foreground')}>Quán bar:</span>
                      <span className={cn('ml-2 font-medium text-foreground')}>{request.BarName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className={cn('text-muted-foreground')}>Email:</span>
                      <span className={cn('ml-2 font-medium text-foreground')}>{request.AccountEmail || 'N/A'}</span>
                    </div>
                    <div>
                      <span className={cn('text-muted-foreground')}>Lý do:</span>
                      <span className={cn('ml-2 font-medium text-foreground')}>
                        {REASON_LABELS[request.Reason] || request.Reason || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className={cn('text-muted-foreground')}>Ngày tạo:</span>
                      <span className={cn('ml-2 font-medium text-foreground')}>
                        {request.CreatedAt ? new Date(request.CreatedAt).toLocaleString('vi-VN') : 'N/A'}
                      </span>
                    </div>
                    {request.ReviveBannerId && (
                      <div>
                        <span className={cn('text-muted-foreground')}>Revive Banner ID:</span>
                        <span className={cn('ml-2 font-medium text-foreground')}>{request.ReviveBannerId}</span>
                      </div>
                    )}
                  </div>

                  {request.RequestNote && (
                    <div className={cn('mt-3 p-3 bg-muted/50 rounded-lg')}>
                      <p className={cn('text-sm text-foreground')}>
                        <span className={cn('font-medium')}>Ghi chú từ BarPage: </span>
                        {request.RequestNote}
                      </p>
                    </div>
                  )}

                  {request.AdminNote && (
                    <div className={cn('mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg')}>
                      <p className={cn('text-sm text-blue-900')}>
                        <span className={cn('font-medium')}>Ghi chú từ Admin: </span>
                        {request.AdminNote}
                      </p>
                    </div>
                  )}
                </div>

                <div className={cn('flex flex-col gap-2 ml-4')}>
                  {request.Status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setAdminNote('');
                          setShowDetailModal(true);
                        }}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium',
                          'bg-blue-600 text-white hover:bg-blue-700 transition-colors',
                          'flex items-center gap-2'
                        )}
                      >
                        <Eye className="w-4 h-4" />
                        Xem & Xử lý
                      </button>
                    </>
                  )}
                  {request.Status === 'approved' && !request.RevivePaused && (
                    <button
                      onClick={() => handleComplete(request.PauseRequestId)}
                      disabled={processing}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium',
                        'bg-green-600 text-white hover:bg-green-700 transition-colors',
                        'flex items-center gap-2 disabled:opacity-50'
                      )}
                    >
                      {processing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Hoàn tất
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className={cn('fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4')}>
          <div className={cn('bg-background rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto')}>
            <div className={cn('flex items-center justify-between mb-4')}>
              <h3 className={cn('text-xl font-semibold text-foreground')}>
                Chi tiết yêu cầu tạm dừng
              </h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedRequest(null);
                  setAdminNote('');
                }}
                className={cn('p-1 hover:bg-muted rounded transition-colors')}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className={cn('space-y-4 mb-6')}>
              <div>
                <label className={cn('block text-sm font-medium text-foreground mb-1')}>Quảng cáo</label>
                <p className={cn('text-base text-foreground')}>{selectedRequest.AdTitle}</p>
              </div>

              <div>
                <label className={cn('block text-sm font-medium text-foreground mb-1')}>Quán bar</label>
                <p className={cn('text-base text-foreground')}>{selectedRequest.BarName}</p>
              </div>

              <div>
                <label className={cn('block text-sm font-medium text-foreground mb-1')}>Lý do</label>
                <p className={cn('text-base text-foreground')}>
                  {REASON_LABELS[selectedRequest.Reason] || selectedRequest.Reason || 'N/A'}
                </p>
              </div>

              {selectedRequest.RequestNote && (
                <div>
                  <label className={cn('block text-sm font-medium text-foreground mb-1')}>Ghi chú từ BarPage</label>
                  <p className={cn('text-base text-foreground')}>{selectedRequest.RequestNote}</p>
                </div>
              )}

              {selectedRequest.ReviveBannerId && (
                <div>
                  <label className={cn('block text-sm font-medium text-foreground mb-1')}>Revive Banner ID</label>
                  <div className={cn('flex items-center gap-2')}>
                    <p className={cn('text-base text-foreground font-mono')}>{selectedRequest.ReviveBannerId}</p>
                    <a
                      href={`${window.location.origin.replace(':3000', '')}/revive/www/admin/banner-edit.php?bannerid=${selectedRequest.ReviveBannerId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn('text-primary hover:underline flex items-center gap-1')}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Mở Revive
                    </a>
                  </div>
                </div>
              )}

              <div>
                <label className={cn('block text-sm font-medium text-foreground mb-2')}>
                  Ghi chú từ Admin
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  placeholder="Nhập ghi chú (bắt buộc khi từ chối)..."
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border border-border',
                    'bg-background text-foreground text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary',
                    'resize-none'
                  )}
                />
              </div>
            </div>

            <div className={cn('flex gap-3 justify-end')}>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedRequest(null);
                  setAdminNote('');
                }}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-muted text-foreground hover:bg-muted/80 transition-colors'
                )}
              >
                Hủy
              </button>
              <button
                onClick={() => handleReject(selectedRequest.PauseRequestId)}
                disabled={processing || !adminNote.trim()}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-red-600 text-white hover:bg-red-700 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center gap-2'
                )}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Từ chối
              </button>
              <button
                onClick={() => handleApprove(selectedRequest.PauseRequestId)}
                disabled={processing}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-green-600 text-white hover:bg-green-700 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center gap-2'
                )}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Duyệt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

