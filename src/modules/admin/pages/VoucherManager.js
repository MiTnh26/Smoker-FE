import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  TicketPercent,
  DollarSign,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Building2,
  Search,
  ArrowUpDown,
} from "lucide-react";
import adminVoucherApi from "../../../api/adminVoucherApi";
import { ToastContainer } from "../../../components/common/Toast";
import { SkeletonCard } from "../../../components/common/Skeleton";

export default function VoucherManager() {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState([]);
  const [bars, setBars] = useState([]);
  const [loadingBars, setLoadingBars] = useState(false);
  const [expandedBars, setExpandedBars] = useState(new Set());
  const [barVouchersMap, setBarVouchersMap] = useState({}); // { barPageId: [vouchers] }
  const [loadingVouchers, setLoadingVouchers] = useState({}); // { barPageId: true/false }
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("revenue-desc"); // "revenue-desc", "revenue-asc", "name-asc", "name-desc"

  const loadBars = useCallback(async () => {
    try {
      setLoadingBars(true);
      const response = await adminVoucherApi.getBarsWithVouchers();
      console.log("[VoucherManager] loadBars - Response:", response);
      if (response?.success) {
        setBars(response.data || []);
      }
    } catch (error) {
      console.error("❌ Error loading bars:", error);
      addToast(error.response?.data?.message || "Không thể tải danh sách quán bar", "error");
    } finally {
      setLoadingBars(false);
    }
  }, []);

  const loadBarVouchers = useCallback(async (barPageId) => {
    // Nếu đã load rồi thì không load lại
    if (barVouchersMap[barPageId]) {
      return;
    }

    try {
      setLoadingVouchers(prev => ({ ...prev, [barPageId]: true }));
      const response = await adminVoucherApi.getBarVouchersWithStats(barPageId);
      console.log("[VoucherManager] loadBarVouchers - Response received:", response);
      
      if (response?.success) {
        setBarVouchersMap(prev => ({
          ...prev,
          [barPageId]: response.data || []
        }));
      } else {
        addToast(response?.message || "Không thể tải danh sách voucher", "error");
      }
    } catch (error) {
      console.error("❌ Error loading bar vouchers:", error);
      addToast(error.response?.data?.message || error.message || "Không thể tải danh sách voucher", "error");
    } finally {
      setLoadingVouchers(prev => ({ ...prev, [barPageId]: false }));
    }
  }, [barVouchersMap]);

  useEffect(() => {
    loadBars();
  }, [loadBars]);

  const toggleBar = (barPageId) => {
    const newExpanded = new Set(expandedBars);
    if (newExpanded.has(barPageId)) {
      newExpanded.delete(barPageId);
    } else {
      newExpanded.add(barPageId);
      // Load vouchers khi expand
      loadBarVouchers(barPageId);
    }
    setExpandedBars(newExpanded);
  };

  // Toast management
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  // Filter và sort bars
  const filteredAndSortedBars = React.useMemo(() => {
    let filtered = bars;
    
    // Filter theo search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = bars.filter(bar => 
        bar.BarName?.toLowerCase().includes(term)
      );
    }
    
    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "revenue-desc":
          return (Number(b.TotalSystemProfit) || 0) - (Number(a.TotalSystemProfit) || 0);
        case "revenue-asc":
          return (Number(a.TotalSystemProfit) || 0) - (Number(b.TotalSystemProfit) || 0);
        case "name-asc":
          return (a.BarName || "").localeCompare(b.BarName || "");
        case "name-desc":
          return (b.BarName || "").localeCompare(a.BarName || "");
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [bars, searchTerm, sortBy]);

  // Tính tổng doanh thu hệ thống từ tất cả bars (sau khi filter)
  const totalSystemProfit = filteredAndSortedBars.reduce((sum, bar) => sum + (Number(bar.TotalSystemProfit) || 0), 0);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <ToastContainer toasts={toasts} />
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TicketPercent className="text-primary" size={32} />
            <h1 className="text-3xl font-bold text-foreground">Quản lý Voucher từ Bar</h1>
          </div>
          <p className="text-muted-foreground">
            Xem danh sách voucher do quán bar tạo và thống kê doanh thu
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tổng doanh thu hệ thống</p>
                <p className="text-2xl font-bold text-primary">
                  {totalSystemProfit.toLocaleString('vi-VN')} đ
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="text-primary" size={24} />
              </div>
            </div>
          </div>

        </div>

        {/* Search and Sort Controls */}
        <div className="mb-6 bg-card border border-border rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên quán bar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="text-muted-foreground" size={20} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="revenue-desc">Doanh thu: Cao → Thấp</option>
                <option value="revenue-asc">Doanh thu: Thấp → Cao</option>
                <option value="name-asc">Tên: A → Z</option>
                <option value="name-desc">Tên: Z → A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bar List with Expandable Vouchers */}
        <BarListWithVouchers
          bars={filteredAndSortedBars}
          loading={loadingBars}
          expandedBars={expandedBars}
          barVouchersMap={barVouchersMap}
          loadingVouchers={loadingVouchers}
          onToggleBar={toggleBar}
        />
      </div>
    </div>
  );
}

// Bar List with Expandable Vouchers Component
function BarListWithVouchers({ bars, loading, expandedBars, barVouchersMap, loadingVouchers, onToggleBar }) {
  if (loading) {
  return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6">
            <SkeletonCard />
          </div>
        ))}
          </div>
    );
  }

  if (bars.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-xl border border-border">
        <Building2 size={48} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Không có quán bar nào đã tạo voucher</p>
            </div>
    );
  }

  return (
    <div className="space-y-4">
      {bars.map((bar) => {
        const isExpanded = expandedBars.has(bar.BarPageId);
        const vouchers = barVouchersMap[bar.BarPageId] || [];
        const isLoading = loadingVouchers[bar.BarPageId];

        return (
          <motion.div
            key={bar.BarPageId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            {/* Bar Header */}
            <button
              onClick={() => onToggleBar(bar.BarPageId)}
              className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="text-primary" size={24} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold mb-1">{bar.BarName}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{bar.TotalVouchers} voucher</span>
                    <span>•</span>
                    {(() => {
                      const vouchers = barVouchersMap[bar.BarPageId] || [];
                      const totalUsed = vouchers.reduce((sum, v) => sum + (Number(v.UsedCount) || 0), 0);
                      const totalMaxUsage = vouchers.reduce((sum, v) => sum + (Number(v.MaxUsage) || 0), 0);
                      return (
                        <span>
                          Đã sử dụng: {totalUsed} / {totalMaxUsage} lượt
                        </span>
                      );
                    })()}
                    <span>•</span>
                    <span className="text-primary font-semibold">
                      Doanh thu: {Number(bar.TotalSystemProfit || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              </div>
              {isExpanded ? (
                <ChevronDown className="text-muted-foreground" size={24} />
              ) : (
                <ChevronRight className="text-muted-foreground" size={24} />
              )}
            </button>

            {/* Vouchers List (Expandable) */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 border-t border-border">
                    {isLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {[...Array(3)].map((_, i) => (
                          <SkeletonCard key={i} />
                        ))}
                      </div>
                    ) : vouchers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <TicketPercent size={32} className="mx-auto mb-2 opacity-50" />
                        <p>Chưa có voucher nào</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {vouchers.map((voucher) => (
                          <motion.div
                            key={voucher.VoucherId}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-background border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="mb-1">
                                  <span className="text-xs text-muted-foreground">Tên voucher: </span>
                                  <span className="font-semibold text-sm">{voucher.VoucherName}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground">Mã voucher: </span>
                                  <span className="text-xs font-mono font-semibold">{voucher.VoucherCode}</span>
                                </div>
                              </div>
                              {(() => {
                                const usedCount = Number(voucher.UsedCount) || 0;
                                const maxUsage = Number(voucher.MaxUsage) || 0;
                                const isActive = usedCount < maxUsage;
                                
                                return (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    isActive
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {isActive ? 'Hoạt động' : 'Hết lượt sử dụng'}
                                  </span>
                                );
                              })()}
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Giá trị gốc:</span>
                                <span className="font-semibold">
                                  {(voucher.OriginalValue || 0).toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Đã sử dụng:</span>
                                <span className="font-semibold">
                                  {voucher.UsedCount || 0} / {voucher.MaxUsage} lượt
                                </span>
                              </div>
                              <div className="pt-2 border-t border-border flex items-center justify-between">
                                <span className="text-muted-foreground">Doanh thu hệ thống:</span>
                                <span className="font-semibold text-primary">
                                  {Number(voucher.TotalSystemProfit || 0).toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
          </div>
      </motion.div>
              )}
            </AnimatePresence>
    </motion.div>
        );
      })}
    </div>
  );
}
