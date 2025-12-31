// Copy từ ManageRefundRequests của admin nhưng dành cho kế toán
import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, Eye, AlertCircle, Loader2, 
  Search, Calendar, User, MapPin, Star, Image as ImageIcon, X, CheckCircle2, CreditCard
} from 'lucide-react';
import accountantApi from '../../../api/accountantApi';
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
      
      const response = await accountantApi.getRefundRequests(params);
      
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

  // Filter requests based on search
  const filteredRequests = useMemo(() => {
    let filtered = requests;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.booker?.Name?.toLowerCase().includes(query) ||
        r.receiver?.Name?.toLowerCase().includes(query) ||
        r.BookedScheduleId?.toLowerCase().includes(query)
      );
    }
    
    if (searchDate) {
      filtered = filtered.filter(r => {
        const bookingDate = new Date(r.BookingDate || r.created_at);
        const searchDateObj = new Date(searchDate);
        return bookingDate.toDateString() === searchDateObj.toDateString();
      });
    }
    
    return filtered;
  }, [requests, searchQuery, searchDate]);

  const handleUpdateRefundStatus = async (bookedScheduleId, refundStatus) => {
    try {
      setProcessingRefund(true);
      const response = await accountantApi.updateRefundStatus(bookedScheduleId, refundStatus);
      
      if (response.success) {
        await loadRequests();
        setShowRefundModal(false);
        setSelectedRequest(null);
      } else {
        setError(response.message || 'Cập nhật trạng thái thất bại');
      }
    } catch (err) {
      console.error('Error updating refund status:', err);
      setError(err.response?.data?.message || err.message || 'Cập nhật trạng thái thất bại');
    } finally {
      setProcessingRefund(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className={cn("w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6")}>
      <h1 className={cn("text-2xl md:text-3xl font-bold text-foreground mb-6")}>
        Quản lý yêu cầu hoàn tiền
      </h1>

      {/* Search and Filter */}
      <div className={cn("mb-6 flex gap-4 flex-wrap")}>
        <div className={cn("flex-1 min-w-[200px]")}>
          <div className={cn("relative")}>
            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground")} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên, ID..."
              className={cn(
                "w-full pl-10 pr-4 py-2 rounded-lg",
                "border-[0.5px] border-border/20",
                "bg-background text-foreground",
                "outline-none focus:border-primary/40"
              )}
            />
          </div>
        </div>
        <div className={cn("min-w-[200px]")}>
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className={cn(
              "w-full px-4 py-2 rounded-lg",
              "border-[0.5px] border-border/20",
              "bg-background text-foreground",
              "outline-none focus:border-primary/40"
            )}
          />
        </div>
      </div>

      {error && (
        <div className={cn("mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm")}>
          {error}
        </div>
      )}

      {loading ? (
        <div className={cn("flex items-center justify-center py-12")}>
          <Loader2 className={cn("w-8 h-8 animate-spin text-muted-foreground")} />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className={cn("text-center py-12 text-muted-foreground")}>
          Không có yêu cầu hoàn tiền nào
        </div>
      ) : (
        <div className={cn("space-y-4")}>
          {filteredRequests.map((request) => (
            <div
              key={request.BookedScheduleId}
              className={cn(
                "p-4 rounded-lg border border-border/20 bg-card",
                "hover:border-primary/20 transition-all"
              )}
            >
              <div className={cn("flex items-start justify-between")}>
                <div className={cn("flex-1")}>
                  <div className={cn("flex items-center gap-3 mb-2")}>
                    <DollarSign className={cn("w-5 h-5 text-primary")} />
                    <span className={cn("text-lg font-semibold")}>
                      {formatCurrency(request.depositAmount || request.TotalAmount)}
                    </span>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium",
                      request.RefundStatus === 'Pending' 
                        ? "bg-yellow-500/10 text-yellow-500"
                        : request.RefundStatus === 'Finished'
                        ? "bg-green-500/10 text-green-500"
                        : "bg-gray-500/10 text-gray-500"
                    )}>
                      {request.RefundStatus === 'Pending' ? 'Chờ xử lý' : 
                       request.RefundStatus === 'Finished' ? 'Đã hoàn tiền' : 
                       request.RefundStatus || '—'}
                    </span>
                  </div>
                  
                  <div className={cn("text-sm text-muted-foreground space-y-1")}>
                    <div>
                      <User className={cn("inline w-4 h-4 mr-1")} />
                      Người đặt: {request.booker?.Name || '—'}
                    </div>
                    <div>
                      <Calendar className={cn("inline w-4 h-4 mr-1")} />
                      Ngày booking: {formatDate(request.BookingDate)}
                    </div>
                    <div>
                      Loại: {request.Type}
                    </div>
                  </div>
                </div>

                <div className={cn("flex gap-2")}>
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowDetailModal(true);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm",
                      "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <Eye size={16} className={cn("inline mr-1")} />
                    Chi tiết
                  </button>
                  
                  {request.RefundStatus === 'Pending' && (
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRefundModal(true);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm",
                        "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                      )}
                    >
                      Xử lý hoàn tiền
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedRequest && (
        <div className={cn("fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4")}>
          <div className={cn("bg-card rounded-xl p-6 max-w-md w-full border border-border/20")}>
            <div className={cn("flex items-center justify-between mb-4")}>
              <h2 className={cn("text-xl font-semibold")}>
                Xử lý hoàn tiền
              </h2>
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setSelectedRequest(null);
                }}
                className={cn("w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted")}
              >
                <X className={cn("w-5 h-5")} />
              </button>
            </div>
            
            <div className={cn("mb-4 space-y-2")}>
              <p className={cn("text-sm")}>
                <span className={cn("text-muted-foreground")}>Số tiền hoàn: </span>
                <span className={cn("font-semibold")}>
                  {formatCurrency(selectedRequest.depositAmount || selectedRequest.TotalAmount)}
                </span>
              </p>
              <p className={cn("text-sm")}>
                <span className={cn("text-muted-foreground")}>Người đặt: </span>
                {selectedRequest.booker?.Name || '—'}
              </p>
            </div>

            <div className={cn("flex gap-3")}>
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setSelectedRequest(null);
                }}
                disabled={processingRefund}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg font-medium",
                  "bg-muted text-muted-foreground hover:bg-muted/80",
                  "disabled:opacity-50"
                )}
              >
                Hủy
              </button>
              <button
                onClick={() => handleUpdateRefundStatus(selectedRequest.BookedScheduleId, 'Finished')}
                disabled={processingRefund}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg font-medium",
                  "bg-green-500 text-white hover:bg-green-600",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {processingRefund ? 'Đang xử lý...' : 'Xác nhận hoàn tiền'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

