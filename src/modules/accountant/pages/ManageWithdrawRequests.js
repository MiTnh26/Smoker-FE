import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { QRPay, BanksObject } from 'vietnam-qr-pay-pure-js';
import { 
  DollarSign, Eye, AlertCircle, Loader2, 
  Search, Calendar, CheckCircle2, XCircle, CreditCard, Clock, X, Copy
} from 'lucide-react';
import accountantApi from '../../../api/accountantApi';
import { cn } from '../../../utils/cn';

export default function ManageWithdrawRequests() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Đọc status từ URL query params, mặc định là 'all'
  const statusFromUrl = searchParams.get('status') || 'all';
  const [statusFilter, setStatusFilter] = useState(statusFromUrl); // 'all' | 'pending' | 'approved' | 'rejected'
  
  // Cập nhật statusFilter khi URL thay đổi
  useEffect(() => {
    const status = searchParams.get('status') || 'all';
    setStatusFilter(status);
  }, [searchParams]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        limit: 100,
        ...(statusFilter !== 'all' && { status: statusFilter })
      };
      
      const response = await accountantApi.getWithdrawRequests(params);
      
      if (response?.status === 'success' && response.data) {
        setRequests(Array.isArray(response.data.requests) ? response.data.requests : []);
      } else {
        setError(response?.message || 'Không thể tải danh sách yêu cầu rút tiền');
      }
    } catch (err) {
      console.error('Error loading withdraw requests:', err);
      setError(err.response?.data?.message || err.message || 'Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    try {
      setProcessing(true);
      const response = await accountantApi.approveWithdrawRequest(selectedRequest.id, { note });
      
      if (response?.status === 'success') {
        await loadRequests();
        setShowActionModal(false);
        setShowDetailModal(false);
        setNote('');
        setSelectedRequest(null);
      } else {
        setError(response?.message || 'Duyệt yêu cầu thất bại');
      }
    } catch (err) {
      console.error('Error approving request:', err);
      setError(err.response?.data?.message || err.message || 'Duyệt yêu cầu thất bại');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !note.trim()) {
      setError('Vui lòng nhập lý do từ chối');
      return;
    }
    
    try {
      setProcessing(true);
      const response = await accountantApi.rejectWithdrawRequest(selectedRequest.id, { note });
      
      if (response?.status === 'success') {
        await loadRequests();
        setShowActionModal(false);
        setShowDetailModal(false);
        setNote('');
        setSelectedRequest(null);
      } else {
        setError(response?.message || 'Từ chối yêu cầu thất bại');
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError(err.response?.data?.message || err.message || 'Từ chối yêu cầu thất bại');
    } finally {
      setProcessing(false);
    }
  };


  const openActionModal = (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
    setNote('');
    setError(null);
    setShowActionModal(true);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'Chờ duyệt', color: 'bg-yellow-500/10 text-yellow-500', icon: Clock },
      approved: { label: 'Đã duyệt (Đã chuyển tiền)', color: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
      rejected: { label: 'Đã từ chối', color: 'bg-red-500/10 text-red-500', icon: XCircle },
    };
    
    const statusInfo = statusMap[status] || statusMap.pending;
    const Icon = statusInfo.icon;
    
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", statusInfo.color)}>
        <Icon size={14} />
        {statusInfo.label}
      </span>
    );
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

  // Generate QR code content for bank transfer (VietQR chuẩn)
  const generateTransferQR = (bankName, accountNumber, accountHolderName, amount) => {
    try {
      // Lấy BIN code của ngân hàng
      const bankBin = getBankBin(bankName);
      
      // Tạo QR code theo chuẩn VietQR
      const qrPay = new QRPay({
        bankBin: bankBin,
        bankNumber: accountNumber,
        amount: amount,
        description: `Smoker chuyen khoan ${amount} dong`
      });
      
      return qrPay.build();
    } catch (error) {
      console.error('Error generating VietQR:', error);
      // Fallback: format đơn giản
      return `${accountNumber}|${amount}|Smoker chuyen khoan ${amount} dong`;
    }
  };

  // Lấy BIN code của ngân hàng
  const getBankBin = (bankName) => {
    // Sử dụng BanksObject từ thư viện nếu có
    if (BanksObject) {
      // Tìm bank trong BanksObject
      const bankNameUpper = bankName.toUpperCase();
      for (const [key, value] of Object.entries(BanksObject)) {
        if (bankNameUpper.includes(key.toUpperCase()) || key.toUpperCase().includes(bankNameUpper)) {
          return value.bin;
        }
      }
    }
    
    // Map tên ngân hàng sang BIN code (fallback)
    const bankBinMap = {
      'Vietcombank': '970436',
      'VCB': '970436',
      'VietinBank': '970415',
      'CTG': '970415',
      'BIDV': '970418',
      'Techcombank': '970407',
      'TCB': '970407',
      'VPBank': '970432',
      'VPB': '970432',
      'ACB': '970416',
      'Sacombank': '970403',
      'STB': '970403',
      'MBBank': '970422',
      'MBB': '970422',
      'TPBank': '970423',
      'TPB': '970423',
      'SHB': '970443',
      'VIB': '970441',
      'MSB': '970426',
      'HD Bank': '970454',
      'SeABank': '970440',
      'Eximbank': '970431',
      'Agribank': '970405',
      'PVcomBank': '970412',
      'OceanBank': '970414',
      'DongABank': '970406'
    };
    
    // Tìm BIN code từ tên ngân hàng
    const bankNameUpper = bankName.toUpperCase();
    for (const [key, value] of Object.entries(bankBinMap)) {
      if (bankNameUpper.includes(key.toUpperCase())) {
        return value;
      }
    }
    
    // Mặc định: Vietcombank
    return '970436';
  };

  // Copy thông tin chuyển khoản
  const copyTransferInfo = (request) => {
    const info = [
      `Ngân hàng: ${request.bankName}`,
      `Số tài khoản: ${request.accountNumber}`,
      request.accountHolderName ? `Chủ tài khoản: ${request.accountHolderName}` : '',
      `Số tiền: ${Number(request.amount).toLocaleString('vi-VN')} đ`,
      `Nội dung: Smoker chuyển khoản ${Number(request.amount).toLocaleString('vi-VN')} đ`
    ].filter(Boolean).join('\n');
    
    navigator.clipboard.writeText(info).then(() => {
      alert('Đã copy thông tin chuyển khoản!');
    }).catch(() => {
      alert('Không thể copy, vui lòng copy thủ công');
    });
  };

  return (
    <div className={cn("w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6")}>
      <div className={cn("flex items-center justify-between mb-6")}>
        <h1 className={cn("text-2xl md:text-3xl font-bold text-foreground")}>
          Quản lý yêu cầu rút tiền
        </h1>
      </div>

      {/* Filter */}
      <div className={cn("mb-4 flex gap-2")}>
        <button
          onClick={() => {
            setStatusFilter('all');
            setSearchParams({});
          }}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            statusFilter === 'all'
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Tất cả
        </button>
        <button
          onClick={() => {
            setStatusFilter('pending');
            setSearchParams({ status: 'pending' });
          }}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            statusFilter === 'pending'
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Chờ duyệt
        </button>
        <button
          onClick={() => {
            setStatusFilter('approved');
            setSearchParams({ status: 'approved' });
          }}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            statusFilter === 'approved'
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Đã duyệt
        </button>
        <button
          onClick={() => {
            setStatusFilter('rejected');
            setSearchParams({ status: 'rejected' });
          }}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            statusFilter === 'rejected'
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Đã từ chối
        </button>
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
      ) : requests.length === 0 ? (
        <div className={cn("text-center py-12 text-muted-foreground")}>
          Không có yêu cầu rút tiền nào
        </div>
      ) : (
        <div className={cn("space-y-4")}>
          {requests.map((request) => (
            <div
              key={request.id}
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
                      {Number(request.amount).toLocaleString('vi-VN')} đ
                    </span>
                    {getStatusBadge(request.status)}
                  </div>
                  
                  <div className={cn("text-sm text-muted-foreground space-y-1")}>
                    <div>
                      <CreditCard className={cn("inline w-4 h-4 mr-1")} />
                      <span className={cn("font-medium")}>{request.bankName}</span> - {request.accountNumber}
                      {request.accountHolderName && ` - ${request.accountHolderName}`}
                    </div>
                    <div>
                      <Calendar className={cn("inline w-4 h-4 mr-1")} />
                      Yêu cầu: {formatDate(request.requestedAt)}
                    </div>
                    {request.reviewedAt && (
                      <div>
                        Đã xử lý: {formatDate(request.reviewedAt)}
                      </div>
                    )}
                    {request.note && (
                      <div>
                        Ghi chú: {request.note}
                      </div>
                    )}
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
                  
                  {request.status === 'pending' && (
                    <>
                      <button
                        onClick={() => openActionModal(request, 'approve')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm",
                          "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                        )}
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() => openActionModal(request, 'reject')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm",
                          "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                        )}
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                  
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className={cn("fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4")}>
          <div className={cn("bg-card rounded-xl p-6 max-w-2xl w-full border border-border/20 max-h-[90vh] overflow-y-auto")}>
            <div className={cn("flex items-center justify-between mb-6")}>
              <h2 className={cn("text-xl font-semibold")}>
                Chi tiết yêu cầu rút tiền
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedRequest(null);
                }}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  "hover:bg-muted transition-colors"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className={cn("space-y-4")}>
              {/* Thông tin yêu cầu */}
              <div className={cn("p-4 rounded-lg bg-muted/30")}>
                <h3 className={cn("font-semibold mb-3")}>Thông tin yêu cầu</h3>
                <div className={cn("space-y-2 text-sm")}>
                  <div className={cn("flex justify-between")}>
                    <span className={cn("text-muted-foreground")}>Số tiền:</span>
                    <span className={cn("font-semibold text-lg text-primary")}>
                      {Number(selectedRequest.amount).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className={cn("flex justify-between")}>
                    <span className={cn("text-muted-foreground")}>Trạng thái:</span>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  <div className={cn("flex justify-between")}>
                    <span className={cn("text-muted-foreground")}>Ngày yêu cầu:</span>
                    <span>{formatDate(selectedRequest.requestedAt)}</span>
                  </div>
                  {selectedRequest.reviewedAt && (
                    <div className={cn("flex justify-between")}>
                      <span className={cn("text-muted-foreground")}>Ngày xử lý:</span>
                      <span>{formatDate(selectedRequest.reviewedAt)}</span>
                    </div>
                  )}
                  {selectedRequest.note && (
                    <div className={cn("flex justify-between")}>
                      <span className={cn("text-muted-foreground")}>Ghi chú:</span>
                      <span>{selectedRequest.note}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Thông tin ngân hàng */}
              <div className={cn("p-4 rounded-lg bg-muted/30")}>
                <h3 className={cn("font-semibold mb-3")}>Thông tin ngân hàng</h3>
                <div className={cn("space-y-2 text-sm")}>
                  <div className={cn("flex justify-between")}>
                    <span className={cn("text-muted-foreground")}>Ngân hàng:</span>
                    <span className={cn("font-medium")}>{selectedRequest.bankName}</span>
                  </div>
                  <div className={cn("flex justify-between")}>
                    <span className={cn("text-muted-foreground")}>Số tài khoản:</span>
                    <span className={cn("font-medium")}>{selectedRequest.accountNumber}</span>
                  </div>
                  {selectedRequest.accountHolderName && (
                    <div className={cn("flex justify-between")}>
                      <span className={cn("text-muted-foreground")}>Tên chủ tài khoản:</span>
                      <span className={cn("font-medium")}>{selectedRequest.accountHolderName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Code - Hiển thị cho tất cả các trạng thái */}
              <div className={cn("p-4 rounded-lg bg-muted/30")}>
                <h3 className={cn("font-semibold mb-3")}>QR Code chuyển khoản</h3>
                <div className={cn("flex flex-col items-center gap-4")}>
                  <div className={cn("p-4 bg-white rounded-lg")}>
                    <QRCodeSVG
                      value={generateTransferQR(
                        selectedRequest.bankName,
                        selectedRequest.accountNumber,
                        selectedRequest.accountHolderName,
                        selectedRequest.amount
                      )}
                      size={200}
                      level="H"
                    />
                  </div>
                  <div className={cn("text-center text-sm text-muted-foreground space-y-2")}>
                    <p className={cn("text-xs text-muted-foreground mb-2")}>
                      Quét QR code hoặc copy thông tin bên dưới
                    </p>
                    <div className={cn("mt-2 p-3 bg-background rounded-lg text-xs text-left border border-border/20 relative")}>
                      <button
                        onClick={() => copyTransferInfo(selectedRequest)}
                        className={cn(
                          "absolute top-2 right-2 p-1.5 rounded hover:bg-muted transition-colors",
                          "text-muted-foreground hover:text-foreground"
                        )}
                        title="Copy thông tin"
                      >
                        <Copy size={14} />
                      </button>
                      <p className={cn("mb-1")}><strong>Ngân hàng:</strong> {selectedRequest.bankName}</p>
                      <p className={cn("mb-1")}><strong>Số tài khoản:</strong> {selectedRequest.accountNumber}</p>
                      {selectedRequest.accountHolderName && (
                        <p className={cn("mb-1")}><strong>Chủ tài khoản:</strong> {selectedRequest.accountHolderName}</p>
                      )}
                      <p className={cn("mb-1")}><strong>Số tiền:</strong> {Number(selectedRequest.amount).toLocaleString('vi-VN')} đ</p>
                      <p><strong>Nội dung:</strong> Smoker chuyển khoản {Number(selectedRequest.amount).toLocaleString('vi-VN')} đ</p>
                    </div>
                    <p className={cn("text-xs text-muted-foreground mt-2")}>
                      Lưu ý: Nếu QR code không quét được, vui lòng copy thông tin và nhập thủ công vào app ngân hàng
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && selectedRequest && (
        <div className={cn("fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4")}>
          <div className={cn("bg-card rounded-xl p-6 max-w-md w-full border border-border/20")}>
            <h2 className={cn("text-xl font-semibold mb-4")}>
              {actionType === 'approve' && 'Duyệt yêu cầu rút tiền'}
              {actionType === 'reject' && 'Từ chối yêu cầu rút tiền'}
            </h2>
            
            <div className={cn("mb-4")}>
              <p className={cn("text-sm text-muted-foreground mb-2")}>
                Số tiền: <span className={cn("font-semibold text-foreground")}>
                  {Number(selectedRequest.amount).toLocaleString('vi-VN')} đ
                </span>
              </p>
              <p className={cn("text-sm text-muted-foreground")}>
                Ngân hàng: {selectedRequest.bankName} - {selectedRequest.accountNumber}
                {selectedRequest.accountHolderName && ` (${selectedRequest.accountHolderName})`}
              </p>
            </div>

            {(actionType === 'approve' || actionType === 'reject') && (
              <div className={cn("mb-4")}>
                <label className={cn("block text-sm font-medium mb-2")}>
                  {actionType === 'reject' ? 'Lý do từ chối *' : 'Ghi chú'}
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={actionType === 'reject' ? 'Nhập lý do từ chối...' : 'Nhập ghi chú (tùy chọn)...'}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg",
                    "border-[0.5px] border-border/20",
                    "bg-background text-foreground",
                    "outline-none focus:border-primary/40"
                  )}
                  rows={3}
                  required={actionType === 'reject'}
                />
              </div>
            )}


            <div className={cn("flex gap-3")}>
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setNote('');
                  setError(null);
                }}
                disabled={processing}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg font-medium",
                  "bg-muted text-muted-foreground hover:bg-muted/80",
                  "disabled:opacity-50"
                )}
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (actionType === 'approve') handleApprove();
                  else if (actionType === 'reject') handleReject();
                }}
                disabled={processing || (actionType === 'reject' && !note.trim())}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg font-medium",
                  actionType === 'reject'
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-green-500 text-white hover:bg-green-600",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {processing ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

