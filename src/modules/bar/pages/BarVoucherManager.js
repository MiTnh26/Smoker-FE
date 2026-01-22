import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  TicketPercent,
  Calendar,
  DollarSign,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import barVoucherApi from '../../../api/barVoucherApi';
import { ToastContainer } from '../../../components/common/Toast';

export default function BarVoucherManager() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4; // 2x2 grid
  const [formData, setFormData] = useState({
    voucherName: '',
    voucherCode: '',
    discountPercentage: 3,
    maxUsage: 100,
    minComboValue: 1000000,
    startDate: '',
    endDate: '',
    originalValue: 500000
  });

  useEffect(() => {
    loadVouchers();
  }, []);

  // Toast management
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const response = await barVoucherApi.getMyVouchers();
      // axiosClient đã unwrap response.data, nên response trực tiếp là data
      if (response?.success) {
        const data = response.data || [];
        setVouchers(data);
        // Reset to page 1 if current page is out of range
        const totalPages = Math.ceil(data.length / itemsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(1);
        }
      } else {
        addToast(response?.message || 'Không thể tải danh sách voucher', 'error');
      }
    } catch (error) {
      console.error('Error loading vouchers:', error);
      addToast(error.response?.data?.message || error.message || 'Không thể tải danh sách voucher', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxUsage' 
        ? parseInt(value) || 0
        : name === 'originalValue'
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.voucherName || !formData.voucherCode || !formData.maxUsage || !formData.originalValue) {
      addToast('Vui lòng điền đầy đủ thông tin', 'error');
      return;
    }

    try {
      const response = await barVoucherApi.createVoucher(formData);
      // axiosClient đã unwrap response.data, nên response trực tiếp là data
      if (response?.success) {
        addToast('Voucher đã được tạo và gửi cho admin', 'success');
        setShowCreateModal(false);
        resetForm();
        setCurrentPage(1); // Reset to first page after creating new voucher
        loadVouchers();
      } else {
        addToast(response?.message || 'Không thể tạo voucher', 'error');
      }
    } catch (error) {
      console.error('Error creating voucher:', error);
      addToast(error.response?.data?.message || error.message || 'Không thể tạo voucher', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      voucherName: '',
      voucherCode: '',
      maxUsage: 100,
      originalValue: 500000
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { label: 'Chờ duyệt', color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-300' },
      approved: { label: 'Đã duyệt', color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-300' },
      rejected: { label: 'Từ chối', color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300' },
      active: { label: 'Hoạt động', color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-300' },
      expired: { label: 'Hết hạn', color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-300' },
    };
    return configs[status] || configs.pending;
  };

  return (
    <div className={cn("p-6 space-y-6")}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <div className={cn(
        "bg-card rounded-xl border border-border p-6 mb-6",
        "shadow-sm"
      )}>
        <div className={cn("flex items-center justify-between flex-wrap gap-4")}>
          <div>
            <h1 className={cn("text-2xl font-bold text-foreground mb-1")}>
              Quản lý Voucher
            </h1>
            <p className={cn("text-sm text-muted-foreground")}>
              Tạo voucher và gửi cho admin
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className={cn(
              "px-6 py-3 rounded-xl text-sm font-semibold",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "flex items-center gap-2 shadow-lg hover:shadow-xl transition-all",
              "transform hover:scale-105"
            )}
          >
            <Plus size={20} />
            Tạo voucher mới
          </button>
        </div>
      </div>

      {/* Vouchers List */}
      {loading ? (
        <div className={cn("text-center py-12")}>
          <div className={cn("inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary")} />
        </div>
      ) : vouchers.length === 0 ? (
        <div className={cn("text-center py-12 bg-card rounded-xl border border-border")}>
          <TicketPercent size={48} className={cn("mx-auto text-muted-foreground mb-4")} />
          <p className={cn("text-muted-foreground")}>Chưa có voucher nào</p>
        </div>
      ) : (
        <>
          {/* Paginated Vouchers */}
          <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6")}>
            {(() => {
              const startIndex = (currentPage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              const paginatedVouchers = vouchers.slice(startIndex, endIndex);
              
              return paginatedVouchers.map((voucher) => {
            const statusConfig = getStatusConfig(voucher.VoucherStatus || voucher.voucherStatus);
            const usedCount = voucher.UsedCount || 0;
            const maxUsage = voucher.MaxUsage || voucher.maxUsage || 0;
            const isActive = usedCount < maxUsage;
            
            return (
              <motion.div
                key={voucher.VoucherId || voucher.voucherId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                className={cn(
                  "bg-card rounded-xl border border-border p-6",
                  "hover:shadow-xl transition-all duration-300",
                  "relative overflow-hidden min-h-[320px] flex flex-col"
                )}
              >
                {/* Decorative gradient */}
                <div className={cn(
                  "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10",
                  isActive ? "bg-primary" : "bg-gray-400"
                )} />
                
                <div className={cn("relative z-10 flex flex-col flex-1")}>
                  {/* Header */}
                  <div className={cn("mb-5")}>
                    <div className={cn("flex items-start justify-between mb-3")}>
                      <div className={cn("flex items-center gap-3 flex-1 min-w-0")}>
                        <div className={cn(
                          "p-2.5 rounded-lg flex-shrink-0",
                          isActive ? "bg-primary/10" : "bg-gray-100"
                        )}>
                          <TicketPercent 
                            size={22} 
                            className={isActive ? "text-primary" : "text-gray-400"} 
                          />
                        </div>
                        <div className={cn("flex-1 min-w-0")}>
                          <h3 className={cn(
                            "text-lg font-bold text-foreground mb-1",
                            "break-words"
                          )}>
                            {voucher.VoucherName || voucher.voucherName}
                          </h3>
                          <p className={cn(
                            "text-xs text-muted-foreground font-mono",
                            "break-all"
                          )}>
                            {voucher.VoucherCode || voucher.voucherCode}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-semibold border-2 flex-shrink-0 ml-2",
                        isActive 
                          ? "bg-green-50 text-green-700 border-green-200" 
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      )}>
                        {isActive ? "Hoạt động" : "Hết lượt"}
                      </span>
                    </div>
                  </div>

                  {/* Info Cards */}
                  <div className={cn("space-y-3 mb-5 flex-1")}>
                    <div className={cn(
                      "flex items-center justify-between p-4 rounded-xl",
                      "bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20"
                    )}>
                      <div className={cn("flex items-center gap-3")}>
                        <div className={cn("p-2 bg-primary/10 rounded-lg")}>
                          <DollarSign size={20} className={cn("text-primary")} />
                        </div>
                        <div>
                          <p className={cn("text-xs text-muted-foreground mb-0.5")}>Giá trị gốc</p>
                          <p className={cn("text-lg font-bold text-foreground")}>
                            {(voucher.OriginalValue || voucher.originalValue || 0).toLocaleString('vi-VN')} đ
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className={cn(
                      "flex items-center justify-between p-4 rounded-xl",
                      "bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200/30"
                    )}>
                      <div className={cn("flex items-center gap-3")}>
                        <div className={cn("p-2 bg-blue-100 rounded-lg")}>
                          <Users size={20} className={cn("text-blue-600")} />
                        </div>
                        <div>
                          <p className={cn("text-xs text-muted-foreground mb-0.5")}>Đã sử dụng</p>
                          <p className={cn("text-lg font-bold text-foreground")}>
                            {usedCount} / {maxUsage} lượt
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className={cn("mt-auto")}>
                    <div className={cn("flex items-center justify-between text-sm mb-2")}>
                      <span className={cn("text-muted-foreground font-medium")}>Tiến độ sử dụng</span>
                      <span className={cn("font-bold text-foreground")}>
                        {Math.round((usedCount / maxUsage) * 100) || 0}%
                      </span>
                    </div>
                    <div className={cn("w-full h-2.5 bg-muted rounded-full overflow-hidden")}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((usedCount / maxUsage) * 100, 100)}%` }}
                        transition={{ duration: 0.5 }}
                        className={cn(
                          "h-full rounded-full transition-all",
                          isActive ? "bg-gradient-to-r from-primary to-primary/80" : "bg-gray-400"
                        )}
                      />
                    </div>
                  </div>

                  {/* Rejected Reason */}
                  {voucher.RejectedReason && (
                    <div className={cn(
                      "mt-4 p-4 rounded-xl border-2 border-red-200",
                      "bg-red-50 text-sm text-red-700"
                    )}>
                      <div className={cn("flex items-start gap-2")}>
                        <AlertCircle size={18} className={cn("mt-0.5 flex-shrink-0")} />
                        <div>
                          <strong>Lý do từ chối:</strong>
                          <p className={cn("mt-1")}>{voucher.RejectedReason}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
            });
            })()}
          </div>

          {/* Pagination */}
          {vouchers.length > itemsPerPage && (
            <div className={cn("flex items-center justify-center gap-2 mt-6")}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={cn(
                  "px-3 py-2 rounded-lg border border-border",
                  "flex items-center gap-1 text-sm font-medium",
                  "transition-all",
                  currentPage === 1
                    ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                    : "bg-card text-foreground hover:bg-muted hover:border-primary"
                )}
              >
                <ChevronLeft size={18} />
                Trước
              </button>

              {/* Page Numbers */}
              <div className={cn("flex items-center gap-1")}>
                {(() => {
                  const totalPages = Math.ceil(vouchers.length / itemsPerPage);
                  const pages = [];
                  
                  // Show first page
                  if (currentPage > 2) {
                    pages.push(1);
                    if (currentPage > 3) pages.push('...');
                  }
                  
                  // Show pages around current page
                  for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
                    pages.push(i);
                  }
                  
                  // Show last page
                  if (currentPage < totalPages - 1) {
                    if (currentPage < totalPages - 2) pages.push('...');
                    pages.push(totalPages);
                  }
                  
                  return pages.map((page, index) => {
                    if (page === '...') {
                      return (
                        <span key={`ellipsis-${index}`} className={cn("px-2 text-muted-foreground")}>
                          ...
                        </span>
                      );
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "min-w-[40px] px-3 py-2 rounded-lg border text-sm font-medium",
                          "transition-all",
                          currentPage === page
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:bg-muted hover:border-primary"
                        )}
                      >
                        {page}
                      </button>
                    );
                  });
                })()}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(vouchers.length / itemsPerPage), prev + 1))}
                disabled={currentPage >= Math.ceil(vouchers.length / itemsPerPage)}
                className={cn(
                  "px-3 py-2 rounded-lg border border-border",
                  "flex items-center gap-1 text-sm font-medium",
                  "transition-all",
                  currentPage >= Math.ceil(vouchers.length / itemsPerPage)
                    ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                    : "bg-card text-foreground hover:bg-muted hover:border-primary"
                )}
              >
                Sau
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className={cn("fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4")}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn("bg-card rounded-2xl p-8 max-w-2xl w-full border-2 border-border shadow-2xl max-h-[90vh] overflow-y-auto")}
            >
              <div className={cn("flex items-center justify-between mb-6 pb-4 border-b border-border")}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TicketPercent className="text-primary" size={24} />
                  </div>
                  <h2 className={cn("text-2xl font-bold text-foreground")}>Tạo voucher mới</h2>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className={cn(
                    "p-2 rounded-lg text-muted-foreground hover:text-foreground",
                    "hover:bg-muted transition-colors"
                  )}
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className={cn("space-y-6")}>
                <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6")}>
                  <div className={cn("space-y-2")}>
                    <label className={cn("block text-sm font-semibold text-foreground")}>
                      Tên voucher <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="voucherName"
                      value={formData.voucherName}
                      onChange={handleInputChange}
                      required
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border-2 border-border",
                        "bg-background text-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                        "transition-all"
                      )}
                      placeholder="Ví dụ: Voucher giảm giá"
                    />
                  </div>

                  <div className={cn("space-y-2")}>
                    <label className={cn("block text-sm font-semibold text-foreground")}>
                      Mã voucher <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="voucherCode"
                      value={formData.voucherCode}
                      onChange={handleInputChange}
                      required
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border-2 border-border font-mono",
                        "bg-background text-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                        "transition-all"
                      )}
                      placeholder="Ví dụ: VOUCHER123"
                    />
                  </div>

                  <div className={cn("space-y-2")}>
                    <label className={cn("block text-sm font-semibold text-foreground")}>
                      Giá trị gốc (VNĐ) <span className="text-red-500">*</span>
                    </label>
                    <div className={cn("relative")}>
                      <DollarSign 
                        size={20} 
                        className={cn("absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground")} 
                      />
                      <input
                        type="number"
                        name="originalValue"
                        value={formData.originalValue}
                        onChange={handleInputChange}
                        required
                        min="0"
                        step="1000"
                        className={cn(
                          "w-full pl-12 pr-4 py-3 rounded-xl border-2 border-border",
                          "bg-background text-foreground",
                          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                          "transition-all"
                        )}
                        placeholder="500000"
                      />
                    </div>
                  </div>

                  <div className={cn("space-y-2")}>
                    <label className={cn("block text-sm font-semibold text-foreground")}>
                      Số lượt sử dụng tối đa <span className="text-red-500">*</span>
                    </label>
                    <div className={cn("relative")}>
                      <Users 
                        size={20} 
                        className={cn("absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground")} 
                      />
                      <input
                        type="number"
                        name="maxUsage"
                        value={formData.maxUsage}
                        onChange={handleInputChange}
                        required
                        min="1"
                        className={cn(
                          "w-full pl-12 pr-4 py-3 rounded-xl border-2 border-border",
                          "bg-background text-foreground",
                          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                          "transition-all"
                        )}
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>

                <div className={cn("flex gap-4 pt-6 border-t border-border")}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className={cn(
                      "flex-1 px-6 py-3 rounded-xl text-sm font-semibold",
                      "bg-muted text-foreground hover:bg-muted/80",
                      "transition-all"
                    )}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className={cn(
                      "flex-1 px-6 py-3 rounded-xl text-sm font-semibold",
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                      "flex items-center justify-center gap-2 shadow-lg hover:shadow-xl",
                      "transition-all transform hover:scale-105"
                    )}
                  >
                    <Send size={18} />
                    Gửi cho admin
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
