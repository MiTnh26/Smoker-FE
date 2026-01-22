import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  DollarSign, Eye, Loader2, Search, Calendar, User, X, 
  CheckCircle2, CreditCard, Building2, FileText, AlertCircle, Upload, Image as ImageIcon
} from 'lucide-react';
import accountantApi from '../../../api/accountantApi';
import bankInfoApi from '../../../api/bankInfoApi';
import { uploadPostMedia } from '../../../api/postApi';
import { cn } from '../../../utils/cn';

export default function ManageRefundRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bankInfo, setBankInfo] = useState(null);
  const [loadingBankInfo, setLoadingBankInfo] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(false);
  const [transferProofImage, setTransferProofImage] = useState('');
  const [transferProofFile, setTransferProofFile] = useState(null);
  const [transferProofPreview, setTransferProofPreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [transferNote, setTransferNote] = useState('');
  const fileInputRef = useRef(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Lấy tất cả refund requests với status = 'pending'
      const params = {
        status: 'pending',
        limit: 100,
        offset: 0
      };
      
      const response = await accountantApi.getRefundRequests(params);
      
      if (response.data?.success && response.data?.data) {
        setRequests(Array.isArray(response.data.data) ? response.data.data : []);
      } else if (response.success && response.data) {
        setRequests(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.data?.message || response.message || 'Không thể tải danh sách yêu cầu hoàn tiền');
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

  // Load bank info khi mở modal xử lý
  const loadBankInfo = async (userId) => {
    if (!userId) {
      console.log('[ManageRefundRequests] No userId provided for bank info');
      setBankInfo(null);
      return;
    }
    
    try {
      setLoadingBankInfo(true);
      console.log('[ManageRefundRequests] Loading bank info for userId:', userId);
      const response = await bankInfoApi.getByAccountId(userId);
      console.log('[ManageRefundRequests] Bank info API response:', response);
      
      if (response.data?.success && response.data?.data) {
        console.log('[ManageRefundRequests] Bank info found:', response.data.data);
        setBankInfo(response.data.data);
      } else if (response.data?.data) {
        // Response có data nhưng không có success field
        console.log('[ManageRefundRequests] Bank info found (no success field):', response.data.data);
        setBankInfo(response.data.data);
      } else if (response.data) {
        console.log('[ManageRefundRequests] Bank info found (direct data):', response.data);
        setBankInfo(response.data);
      } else {
        console.log('[ManageRefundRequests] No bank info found');
        setBankInfo(null);
      }
    } catch (err) {
      console.error('[ManageRefundRequests] Error loading bank info:', err);
      console.error('[ManageRefundRequests] Error response:', err.response?.data);
      // Nếu là 404, không phải lỗi nghiêm trọng - chỉ là user chưa có bank info
      if (err.response?.status === 404) {
        console.log('[ManageRefundRequests] User chưa có thông tin ngân hàng');
      }
      setBankInfo(null);
    } finally {
      setLoadingBankInfo(false);
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('images', file);
    
    try {
      const res = await uploadPostMedia(formData);
      const responseData = res.data || res;
      const files = responseData.data || responseData;
      
      if (files && Array.isArray(files) && files.length > 0) {
        const uploadedFile = files[0];
        return uploadedFile.url || uploadedFile.path || uploadedFile.secure_url;
      }
      throw new Error("Upload failed - no URL in response");
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error(error.response?.data?.message || error.message || "Không thể upload ảnh");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước file không được vượt quá 5MB');
      return;
    }

    setTransferProofFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setTransferProofPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload image
    try {
      setUploadingImage(true);
      const imageUrl = await uploadImage(file);
      setTransferProofImage(imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Lỗi khi upload ảnh. Vui lòng thử lại.');
      setTransferProofFile(null);
      setTransferProofPreview(null);
      setTransferProofImage('');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setTransferProofFile(null);
    setTransferProofPreview(null);
    setTransferProofImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenProcessModal = async (request) => {
    console.log('[ManageRefundRequests] Opening process modal for request:', request);
    setSelectedRequest(request);
    setTransferProofImage('');
    setTransferProofFile(null);
    setTransferProofPreview(null);
    setTransferNote('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowProcessModal(true);
    // Load bank info của user
    if (request.UserId) {
      console.log('[ManageRefundRequests] Request UserId:', request.UserId);
      await loadBankInfo(request.UserId);
    } else {
      console.log('[ManageRefundRequests] No UserId in request');
      setBankInfo(null);
    }
  };

  const handleProcessRefund = async () => {
    if (!selectedRequest) return;
    
    if (!transferProofImage || !transferProofImage.trim()) {
      alert('Vui lòng upload ảnh minh chứng chuyển khoản');
      return;
    }

    if (!window.confirm('Xác nhận đã hoàn tiền cho người dùng?')) {
      return;
    }

    try {
      setProcessingRefund(true);
      const response = await accountantApi.processRefund(selectedRequest.RefundRequestId, {
        transferProofImage: transferProofImage.trim(),
        transferNote: transferNote.trim() || null
      });

      if (response.data?.success || response.success) {
        alert('Đã xử lý hoàn tiền thành công');
        setShowProcessModal(false);
        setSelectedRequest(null);
        setBankInfo(null);
        setTransferProofFile(null);
        setTransferProofPreview(null);
        setTransferProofImage('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        await loadRequests();
      } else {
        alert(response.data?.message || response.message || 'Xử lý hoàn tiền thất bại');
      }
    } catch (err) {
      console.error('Error processing refund:', err);
      alert(err.response?.data?.message || err.message || 'Lỗi khi xử lý hoàn tiền');
    } finally {
      setProcessingRefund(false);
    }
  };

  // Filter requests based on search
  const filteredRequests = useMemo(() => {
    let filtered = requests;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.UserName?.toLowerCase().includes(query) ||
        r.UserEmail?.toLowerCase().includes(query) ||
        r.BookedScheduleId?.toLowerCase().includes(query) ||
        r.RefundRequestId?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [requests, searchQuery]);

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

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { label: 'Chờ xử lý', color: 'bg-yellow-500/10 text-yellow-500' },
      'processing': { label: 'Đang xử lý', color: 'bg-blue-500/10 text-blue-500' },
      'completed': { label: 'Đã hoàn tiền', color: 'bg-green-500/10 text-green-500' },
      'rejected': { label: 'Đã từ chối', color: 'bg-red-500/10 text-red-500' }
    };
    
    const statusInfo = statusMap[status?.toLowerCase()] || { label: status || '—', color: 'bg-gray-500/10 text-gray-500' };
    
    return (
      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", statusInfo.color)}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className={cn("w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6")}>
      <div className={cn("bg-card rounded-xl p-6 border border-border/20 mb-6")}>
        <h1 className={cn("text-2xl md:text-3xl font-bold text-foreground mb-2")}>
          Quản lý yêu cầu hoàn tiền
        </h1>
        <p className={cn("text-sm text-muted-foreground")}>
          Danh sách các yêu cầu hoàn tiền đang chờ xử lý
        </p>
      </div>

      {/* Search */}
      <div className={cn("mb-6")}>
        <div className={cn("relative")}>
          <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground")} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tên, email, ID booking..."
            className={cn(
              "w-full pl-10 pr-4 py-2 rounded-lg",
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
              key={request.RefundRequestId}
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
                      {formatCurrency(request.Amount)}
                    </span>
                    {getStatusBadge(request.Status)}
                  </div>
                  
                  <div className={cn("text-sm text-muted-foreground space-y-1")}>
                    <div className={cn("flex items-center gap-2")}>
                      <User className={cn("w-4 h-4")} />
                      <span>Người đặt: {request.UserName || '—'}</span>
                      {request.UserEmail && (
                        <span className={cn("text-xs")}>({request.UserEmail})</span>
                      )}
                    </div>
                    <div className={cn("flex items-center gap-2")}>
                      <Calendar className={cn("w-4 h-4")} />
                      <span>Ngày booking: {formatDate(request.BookingDate)}</span>
                    </div>
                    <div className={cn("text-xs text-muted-foreground/70")}>
                      Yêu cầu lúc: {formatDate(request.RequestedAt)}
                    </div>
                  </div>
                </div>

                <div className={cn("flex gap-2")}>
                  {request.Status === 'pending' && (
                    <button
                      onClick={() => handleOpenProcessModal(request)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium",
                        "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
                        "hover:from-green-600 hover:to-emerald-600 shadow-md hover:shadow-lg",
                        "transition-all duration-200 flex items-center gap-2"
                      )}
                    >
                      <CheckCircle2 size={16} />
                      Xử lý yêu cầu hoàn tiền
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Process Refund Modal */}
      {showProcessModal && selectedRequest && (
        <div className={cn("fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4")}>
          <div className={cn("bg-card rounded-xl p-6 max-w-2xl w-full border border-border/20 max-h-[90vh] overflow-y-auto")}>
            <div className={cn("flex items-center justify-between mb-6")}>
              <h2 className={cn("text-xl font-semibold")}>
                Xử lý yêu cầu hoàn tiền
              </h2>
              <button
                onClick={() => {
                  setShowProcessModal(false);
                  setSelectedRequest(null);
                  setBankInfo(null);
                  setTransferProofImage('');
                  setTransferProofFile(null);
                  setTransferProofPreview(null);
                  setTransferNote('');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className={cn("w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted")}
              >
                <X className={cn("w-5 h-5")} />
              </button>
            </div>

            {/* Chi tiết yêu cầu hoàn tiền */}
            <div className={cn("mb-6 space-y-4")}>
              <div className={cn("p-4 rounded-lg bg-muted/30")}>
                <h3 className={cn("text-sm font-semibold mb-3 flex items-center gap-2")}>
                  <FileText size={16} className={cn("text-primary")} />
                  Chi tiết yêu cầu hoàn tiền
                </h3>
                <div className={cn("space-y-2 text-sm")}>
                  <div className={cn("flex justify-between")}>
                    <span className={cn("text-muted-foreground")}>Số tiền hoàn:</span>
                    <span className={cn("font-semibold text-lg text-primary")}>
                      {formatCurrency(selectedRequest.Amount)}
                    </span>
                  </div>
                  <div className={cn("flex justify-between")}>
                    <span className={cn("text-muted-foreground")}>Người đặt:</span>
                    <span>{selectedRequest.UserName || '—'}</span>
                  </div>
                  {selectedRequest.UserEmail && (
                    <div className={cn("flex justify-between")}>
                      <span className={cn("text-muted-foreground")}>Email:</span>
                      <span>{selectedRequest.UserEmail}</span>
                    </div>
                  )}
                  <div className={cn("flex justify-between")}>
                    <span className={cn("text-muted-foreground")}>Ngày booking:</span>
                    <span>{formatDate(selectedRequest.BookingDate)}</span>
                  </div>
                  <div className={cn("flex justify-between")}>
                    <span className={cn("text-muted-foreground")}>Yêu cầu lúc:</span>
                    <span>{formatDate(selectedRequest.RequestedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Thông tin ngân hàng */}
              <div className={cn("p-4 rounded-lg bg-muted/30")}>
                <h3 className={cn("text-sm font-semibold mb-3 flex items-center gap-2")}>
                  <CreditCard size={16} className={cn("text-primary")} />
                  Thông tin ngân hàng người nhận
                </h3>
                {loadingBankInfo ? (
                  <div className={cn("flex items-center justify-center py-4")}>
                    <Loader2 className={cn("w-5 h-5 animate-spin text-muted-foreground")} />
                  </div>
                ) : bankInfo ? (
                  <div className={cn("space-y-2 text-sm")}>
                    <div className={cn("flex justify-between")}>
                      <span className={cn("text-muted-foreground")}>Tên ngân hàng:</span>
                      <span>{bankInfo.BankName || '—'}</span>
                    </div>
                    <div className={cn("flex justify-between")}>
                      <span className={cn("text-muted-foreground")}>Số tài khoản:</span>
                      <span className={cn("font-mono")}>{bankInfo.AccountNumber || '—'}</span>
                    </div>
                    {bankInfo.Branch && (
                      <div className={cn("flex justify-between")}>
                        <span className={cn("text-muted-foreground")}>Chi nhánh:</span>
                        <span>{bankInfo.Branch}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={cn("text-sm text-muted-foreground flex items-center gap-2")}>
                    <AlertCircle size={16} />
                    Người dùng chưa cập nhật thông tin ngân hàng
                  </div>
                )}
              </div>

              {/* Form xử lý */}
              <div className={cn("p-4 rounded-lg bg-muted/30")}>
                <h3 className={cn("text-sm font-semibold mb-3")}>
                  Thông tin chuyển khoản
                </h3>
                <div className={cn("space-y-4")}>
                  <div>
                    <label className={cn("block text-sm font-medium mb-1")}>
                      Ảnh minh chứng chuyển khoản <span className={cn("text-destructive")}>*</span>
                    </label>
                    {transferProofPreview ? (
                      <div className={cn("space-y-2")}>
                        <div className={cn("relative")}>
                          <img
                            src={transferProofPreview}
                            alt="Preview"
                            className={cn("w-full max-w-md h-auto rounded-lg border border-border/20")}
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className={cn(
                              "absolute top-2 right-2 w-8 h-8 rounded-full",
                              "bg-destructive text-white flex items-center justify-center",
                              "hover:bg-destructive/90 transition-colors"
                            )}
                          >
                            <X size={16} />
                          </button>
                        </div>
                        {uploadingImage && (
                          <div className={cn("flex items-center gap-2 text-sm text-muted-foreground")}>
                            <Loader2 size={16} className={cn("animate-spin")} />
                            <span>Đang upload ảnh...</span>
                          </div>
                        )}
                        {transferProofImage && !uploadingImage && (
                          <div className={cn("text-xs text-muted-foreground")}>
                            ✓ Đã upload thành công
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className={cn("hidden")}
                          id="transfer-proof-upload"
                        />
                        <label
                          htmlFor="transfer-proof-upload"
                          className={cn(
                            "flex flex-col items-center justify-center",
                            "w-full h-32 border-2 border-dashed rounded-lg",
                            "border-border/20 hover:border-primary/40",
                            "cursor-pointer transition-colors",
                            "bg-muted/30 hover:bg-muted/50"
                          )}
                        >
                          {uploadingImage ? (
                            <>
                              <Loader2 size={24} className={cn("animate-spin text-muted-foreground mb-2")} />
                              <span className={cn("text-sm text-muted-foreground")}>Đang upload...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={24} className={cn("text-muted-foreground mb-2")} />
                              <span className={cn("text-sm text-muted-foreground")}>
                                Click để chọn ảnh hoặc kéo thả vào đây
                              </span>
                              <span className={cn("text-xs text-muted-foreground/70 mt-1")}>
                                PNG, JPG, JPEG (tối đa 5MB)
                              </span>
                            </>
                          )}
                        </label>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={cn("block text-sm font-medium mb-1")}>
                      Ghi chú (tùy chọn)
                    </label>
                    <textarea
                      value={transferNote}
                      onChange={(e) => setTransferNote(e.target.value)}
                      placeholder="Nhập ghi chú về việc chuyển khoản..."
                      rows={3}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg",
                        "border-[0.5px] border-border/20",
                        "bg-background text-foreground",
                        "outline-none focus:border-primary/40 resize-none"
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={cn("flex gap-3")}>
              <button
                onClick={() => {
                  setShowProcessModal(false);
                  setSelectedRequest(null);
                  setBankInfo(null);
                  setTransferProofImage('');
                  setTransferNote('');
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
                onClick={handleProcessRefund}
                disabled={processingRefund || !transferProofImage.trim()}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg font-medium",
                  "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
                  "hover:from-green-600 hover:to-emerald-600",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2"
                )}
              >
                {processingRefund ? (
                  <>
                    <Loader2 size={16} className={cn("animate-spin")} />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Xác nhận đã hoàn tiền
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
