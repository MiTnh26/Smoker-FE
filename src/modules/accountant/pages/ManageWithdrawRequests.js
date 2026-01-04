import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { QRPay, BanksObject } from 'vietnam-qr-pay-pure-js';
import { 
  DollarSign, Eye, AlertCircle, Loader2, 
  Search, Calendar, CheckCircle2, XCircle, CreditCard, Clock, X, Copy, Upload
} from 'lucide-react';
import accountantApi from '../../../api/accountantApi';
import { cn } from '../../../utils/cn';
import { useImageUpload } from '../../../hooks/useImageUpload';

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
  const [selectedNoteOption, setSelectedNoteOption] = useState(''); // Option ghi chú được chọn
  const [processing, setProcessing] = useState(false);
  const [transferProofImage, setTransferProofImage] = useState(''); // Link hình bill chuyển khoản
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // 6 option ghi chú fix cứng
  const noteOptions = {
    approve: [
      'Đã xác nhận chuyển khoản thành công',
      'Đã kiểm tra và duyệt yêu cầu',
      'Đã chuyển khoản theo yêu cầu',
      'Giao dịch đã được xử lý',
      'Đã hoàn tất chuyển khoản',
      'Yêu cầu đã được duyệt và chuyển tiền'
    ],
    reject: [
      'Thông tin tài khoản không chính xác',
      'Số tiền vượt quá số dư khả dụng',
      'Yêu cầu không hợp lệ',
      'Thiếu thông tin cần thiết',
      'Vi phạm quy định rút tiền',
      'Yêu cầu không đáp ứng điều kiện'
    ]
  };
  
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

  // Hook để upload hình bill
  const { upload: uploadImage, uploading: imageUploading } = useImageUpload({
    endpoint: '/posts/upload',
    maxSize: 5 * 1024 * 1024, // 5MB
    onSuccess: (url) => {
      setTransferProofImage(url);
      setUploadingImage(false);
    },
  });

  const handleImageUpload = async (file) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh hợp lệ.');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước file không được vượt quá 5MB.');
      return;
    }
    
    setUploadingImage(true);
    setError(null);
    
    try {
      await uploadImage(file);
    } catch (err) {
      setError(err.message || 'Upload ảnh thất bại. Vui lòng thử lại.');
      setUploadingImage(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    try {
      setProcessing(true);
      // Ghi chú fix cứng cho duyệt
      const fixedNote = 'Giao dịch đã xử lý';
      const response = await accountantApi.approveWithdrawRequest(selectedRequest.id, { 
        note: fixedNote,
        transferProofImage: transferProofImage || null
      });
      
      if (response?.status === 'success') {
        await loadRequests();
        setShowActionModal(false);
        setShowDetailModal(false);
        setNote('');
        setSelectedNoteOption('');
        setTransferProofImage('');
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
        setSelectedNoteOption('');
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
    setSelectedNoteOption('');
    setTransferProofImage('');
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
    
    // SQL Server trả về datetime string dạng 'YYYY-MM-DD HH:mm:ss.mmm'
    // Database đã lưu đúng giờ Việt Nam (GMT+7), cần parse thủ công để không bị convert timezone
    if (typeof dateString === 'string') {
      // Kiểm tra format datetime từ SQL Server
      const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        // Tạo date object với timezone local (không dùng timeZone option để tránh double conversion)
        const localDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second || 0)
        );
        // Format không dùng timeZone để giữ nguyên giờ đã parse
        return localDate.toLocaleString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
    
    // Fallback: parse như bình thường
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
      
      // Tạo description với tên chủ tài khoản
      const description = accountHolderName 
        ? `${accountHolderName} - Smoker chuyen khoan ${amount} dong`
        : `Smoker chuyen khoan ${amount} dong`;
      
      // Tạo QR code theo chuẩn VietQR
      const qrPay = new QRPay({
        bankBin: bankBin,
        bankNumber: accountNumber,
        amount: amount,
        description: description
      });
      
      return qrPay.build();
    } catch (error) {
      console.error('Error generating VietQR:', error);
      // Fallback: format đơn giản với tên chủ tài khoản
      const fallbackContent = accountHolderName
        ? `${accountNumber}|${amount}|${accountHolderName}|Smoker chuyen khoan ${amount} dong`
        : `${accountNumber}|${amount}|Smoker chuyen khoan ${amount} dong`;
      return fallbackContent;
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
                      {request.accountHolderName && (
                        <span className={cn("ml-1 text-foreground font-medium")}>- {request.accountHolderName}</span>
                      )}
                      {!request.accountHolderName && (
                        <span className={cn("ml-1 text-muted-foreground italic")}>- Chưa có tên chủ tài khoản</span>
                      )}
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
                      "px-3 py-1.5 rounded-lg text-sm font-medium",
                      "bg-yellow-500 text-white hover:bg-yellow-600",
                      "transition-colors duration-200"
                    )}
                  >
                    <Eye size={16} className={cn("inline mr-1")} />
                    Xử lý yêu cầu
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className={cn("fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4")}>
          <div className={cn(
            "bg-card rounded-2xl w-full max-w-3xl",
            "border border-border/30 shadow-2xl",
            "flex flex-col",
            "max-h-[95vh]",
            "overflow-hidden"
          )}>
            {/* Fixed Header */}
            <div className={cn(
              "flex items-center justify-between px-6 py-5",
              "border-b border-border/30",
              "bg-card/95 backdrop-blur-sm",
              "flex-shrink-0"
            )}>
              <h2 className={cn("text-2xl font-bold text-foreground")}>
                Chi tiết yêu cầu rút tiền
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedRequest(null);
                }}
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center",
                  "hover:bg-muted/80 transition-colors",
                  "text-muted-foreground hover:text-foreground"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className={cn(
              "flex-1 overflow-y-auto px-6 py-5",
              "scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent"
            )}>
              <div className={cn("space-y-5")}>
              {/* Thông tin yêu cầu */}
              <div className={cn("p-5 rounded-xl bg-muted/40 border border-border/20")}>
                <h3 className={cn("text-base font-bold mb-4 text-foreground")}>Thông tin yêu cầu</h3>
                <div className={cn("space-y-3")}>
                  <div className={cn("flex items-center justify-between py-2")}>
                    <span className={cn("text-sm text-muted-foreground")}>Số tiền:</span>
                    <span className={cn("text-xl font-bold text-primary")}>
                      {Number(selectedRequest.amount).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className={cn("flex items-center justify-between py-2 border-t border-border/20")}>
                    <span className={cn("text-sm text-muted-foreground")}>Trạng thái:</span>
                    <div>{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                  <div className={cn("flex items-center justify-between py-2 border-t border-border/20")}>
                    <span className={cn("text-sm text-muted-foreground")}>Ngày yêu cầu:</span>
                    <span className={cn("text-sm font-medium")}>{formatDate(selectedRequest.requestedAt)}</span>
                  </div>
                  {selectedRequest.reviewedAt && (
                    <div className={cn("flex items-center justify-between py-2 border-t border-border/20")}>
                      <span className={cn("text-sm text-muted-foreground")}>Ngày xử lý:</span>
                      <span className={cn("text-sm font-medium")}>{formatDate(selectedRequest.reviewedAt)}</span>
                    </div>
                  )}
                  {selectedRequest.note && (
                    <div className={cn("flex items-start justify-between py-2 border-t border-border/20 gap-3")}>
                      <span className={cn("text-sm text-muted-foreground flex-shrink-0")}>Ghi chú:</span>
                      <span className={cn("text-sm font-medium text-right")}>{selectedRequest.note}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Thông tin ngân hàng */}
              <div className={cn("p-5 rounded-xl bg-muted/40 border border-border/20")}>
                <h3 className={cn("text-base font-bold mb-4 text-foreground")}>Thông tin ngân hàng</h3>
                <div className={cn("space-y-3")}>
                  <div className={cn("flex items-center justify-between py-2")}>
                    <span className={cn("text-sm text-muted-foreground")}>Ngân hàng:</span>
                    <span className={cn("text-sm font-semibold")}>{selectedRequest.bankName}</span>
                  </div>
                  <div className={cn("flex items-center justify-between py-2 border-t border-border/20")}>
                    <span className={cn("text-sm text-muted-foreground")}>Số tài khoản:</span>
                    <span className={cn("text-sm font-semibold font-mono")}>{selectedRequest.accountNumber}</span>
                  </div>
                  <div className={cn("flex items-center justify-between py-2 border-t border-border/20")}>
                    <span className={cn("text-sm text-muted-foreground")}>Tên chủ tài khoản:</span>
                    <span className={cn("text-sm font-semibold text-right")}>
                      {selectedRequest.accountHolderName || "Chưa có thông tin"}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code - Hiển thị cho tất cả các trạng thái */}
              <div className={cn("p-5 rounded-xl bg-muted/40 border border-border/20")}>
                <h3 className={cn("text-base font-bold mb-4 text-foreground")}>QR Code chuyển khoản</h3>
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

              {/* Hình bill chuyển khoản - Chỉ hiển thị khi đã duyệt và có hình */}
              {selectedRequest.status === 'approved' && selectedRequest.transferProofImage && (
                <div className={cn("p-5 rounded-xl bg-muted/40 border border-border/20")}>
                  <h3 className={cn("text-base font-bold mb-4 text-foreground")}>Hình bill chuyển khoản</h3>
                  <div className={cn("flex flex-col items-center gap-3")}>
                    <img
                      src={selectedRequest.transferProofImage}
                      alt="Bill chuyển khoản"
                      className={cn(
                        "w-2/3 h-auto max-h-96 object-contain rounded-lg border border-border/20",
                        "cursor-pointer hover:opacity-90 transition-opacity"
                      )}
                      onClick={() => {
                        // Mở ảnh trong tab mới để xem full size
                        window.open(selectedRequest.transferProofImage, '_blank');
                      }}
                    />
                    <p className={cn("text-xs text-muted-foreground text-center")}>
                      Click vào ảnh để xem kích thước đầy đủ
                    </p>
                  </div>
                </div>
              )}

              </div>
            </div>

            {/* Fixed Footer với nút action */}
            {selectedRequest.status === 'pending' && (
              <div className={cn(
                "px-6 py-4 border-t border-border/30",
                "bg-card/95 backdrop-blur-sm",
                "flex gap-3 flex-shrink-0"
              )}>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openActionModal(selectedRequest, 'approve');
                  }}
                  className={cn(
                    "flex-1 px-5 py-3 rounded-xl font-semibold text-base",
                    "bg-green-500 text-white hover:bg-green-600",
                    "transition-all duration-200",
                    "shadow-lg shadow-green-500/20 hover:shadow-green-500/30",
                    "active:scale-[0.98]"
                  )}
                >
                  Duyệt
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openActionModal(selectedRequest, 'reject');
                  }}
                  className={cn(
                    "flex-1 px-5 py-3 rounded-xl font-semibold text-base",
                    "bg-red-500 text-white hover:bg-red-600",
                    "transition-all duration-200",
                    "shadow-lg shadow-red-500/20 hover:shadow-red-500/30",
                    "active:scale-[0.98]"
                  )}
                >
                  Từ chối
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && selectedRequest && (
        <div className={cn("fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4")}>
          <div className={cn(
            "bg-card rounded-2xl w-full max-w-lg",
            "border border-border/30 shadow-2xl",
            "flex flex-col",
            "max-h-[95vh]",
            "overflow-hidden"
          )}>
            {/* Fixed Header */}
            <div className={cn(
              "flex items-center justify-between px-6 py-5",
              "border-b border-border/30",
              "bg-card/95 backdrop-blur-sm",
              "flex-shrink-0"
            )}>
              <h2 className={cn("text-2xl font-bold text-foreground")}>
                {actionType === 'approve' && 'Duyệt yêu cầu rút tiền'}
                {actionType === 'reject' && 'Từ chối yêu cầu rút tiền'}
              </h2>
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setNote('');
                  setSelectedNoteOption('');
                  setTransferProofImage('');
                  setError(null);
                }}
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center",
                  "hover:bg-muted/80 transition-colors",
                  "text-muted-foreground hover:text-foreground"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className={cn(
              "flex-1 overflow-y-auto px-6 py-5",
              "scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent"
            )}>
              {/* Thông tin yêu cầu */}
              <div className={cn("mb-5 p-4 rounded-xl bg-muted/40 border border-border/20")}>
                <div className={cn("space-y-2")}>
                  <div className={cn("flex items-center justify-between")}>
                    <span className={cn("text-sm text-muted-foreground")}>Số tiền:</span>
                    <span className={cn("text-lg font-bold text-primary")}>
                      {Number(selectedRequest.amount).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className={cn("flex items-start justify-between gap-2")}>
                    <span className={cn("text-sm text-muted-foreground flex-shrink-0")}>Ngân hàng:</span>
                    <span className={cn("text-sm font-medium text-foreground text-right")}>
                      {selectedRequest.bankName} - {selectedRequest.accountNumber}
                      {selectedRequest.accountHolderName && (
                        <span className={cn("block text-xs text-muted-foreground mt-1")}>
                          ({selectedRequest.accountHolderName})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ghi chú - Chỉ hiển thị khi từ chối */}
              {actionType === 'reject' && (
                <div className={cn("mb-5")}>
                  <label className={cn("block text-sm font-semibold mb-3 text-foreground")}>
                    Lý do từ chối <span className={cn("text-red-500")}>*</span>
                  </label>
                  
                  {/* Dropdown với 6 option ghi chú */}
                  <select
                    value={selectedNoteOption}
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      setSelectedNoteOption(selectedValue);
                      if (selectedValue) {
                        setNote(selectedValue);
                      }
                    }}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl mb-3",
                      "border border-border/30",
                      "bg-background text-foreground",
                      "outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                      "transition-all duration-200"
                    )}
                  >
                    <option value="">-- Chọn ghi chú có sẵn (tùy chọn) --</option>
                    {noteOptions.reject?.map((option, index) => (
                      <option key={index} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  
                  {/* Input thủ công */}
                  <textarea
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      // Nếu người dùng nhập thủ công, reset dropdown
                      if (selectedNoteOption && e.target.value !== selectedNoteOption) {
                        setSelectedNoteOption('');
                      }
                    }}
                    placeholder="Hoặc nhập lý do từ chối thủ công..."
                    className={cn(
                      "w-full px-4 py-3 rounded-xl",
                      "border border-border/30",
                      "bg-background text-foreground",
                      "outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                      "transition-all duration-200",
                      "resize-none"
                    )}
                    rows={4}
                    required
                  />
                </div>
              )}

              {/* Upload hình bill - Chỉ hiển thị khi approve */}
              {actionType === 'approve' && (
                <div className={cn("mb-5")}>
                  <label className={cn("block text-sm font-semibold mb-3 text-foreground")}>
                    Hình bill chuyển khoản <span className={cn("text-muted-foreground text-xs font-normal")}>(tùy chọn)</span>
                  </label>
                  {uploadingImage || imageUploading ? (
                    <div className={cn("flex items-center gap-2 text-primary")}>
                      <Loader2 className={cn("w-4 h-4 animate-spin")} />
                      <p className={cn("text-sm")}>Đang upload ảnh...</p>
                    </div>
                  ) : transferProofImage ? (
                    <div className={cn("space-y-3")}>
                      <div className={cn("relative rounded-xl overflow-hidden border border-border/30 flex justify-center")}>
                        <img
                          src={transferProofImage}
                          alt="Bill chuyển khoản"
                          className={cn("w-2/3 h-auto max-h-96 object-contain bg-muted/20")}
                        />
                      </div>
                      <button
                        onClick={() => setTransferProofImage('')}
                        className={cn(
                          "w-full px-4 py-2 rounded-lg text-sm font-medium",
                          "text-red-500 hover:text-red-600 hover:bg-red-500/10",
                          "border border-red-500/30 hover:border-red-500/50",
                          "transition-all duration-200"
                        )}
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          handleImageUpload(file);
                        }
                      }}
                      disabled={uploadingImage || imageUploading}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl",
                        "border border-border/30",
                        "bg-background text-foreground",
                        "outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                        "transition-all duration-200",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "file:mr-4 file:py-2 file:px-4 file:rounded-lg",
                        "file:border-0 file:text-sm file:font-semibold",
                        "file:bg-primary/10 file:text-primary",
                        "file:cursor-pointer file:hover:bg-primary/20"
                      )}
                    />
                  )}
                </div>
              )}

              {error && (
                <div className={cn("mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm")}>
                  <div className={cn("flex items-start gap-2")}>
                    <AlertCircle className={cn("w-5 h-5 flex-shrink-0 mt-0.5")} />
                    <span>{error}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer với nút action */}
            <div className={cn(
              "px-6 py-4 border-t border-border/30",
              "bg-card/95 backdrop-blur-sm",
              "flex gap-3 flex-shrink-0"
            )}>
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setNote('');
                  setSelectedNoteOption('');
                  setTransferProofImage('');
                  setError(null);
                }}
                disabled={processing}
                className={cn(
                  "flex-1 px-5 py-3 rounded-xl font-semibold text-base",
                  "bg-muted/80 text-muted-foreground hover:bg-muted",
                  "border border-border/30",
                  "transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "active:scale-[0.98]"
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
                  "flex-1 px-5 py-3 rounded-xl font-semibold text-base",
                  actionType === 'reject'
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-green-500 text-white hover:bg-green-600",
                  "transition-all duration-200",
                  "shadow-lg",
                  actionType === 'reject'
                    ? "shadow-red-500/20 hover:shadow-red-500/30"
                    : "shadow-green-500/20 hover:shadow-green-500/30",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
                  "active:scale-[0.98]",
                  "flex items-center justify-center gap-2"
                )}
              >
                {processing ? (
                  <>
                    <Loader2 className={cn("w-5 h-5 animate-spin")} />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  'Xác nhận'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

