import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, CheckCircle2, XCircle, Eye, Package, Store, Calendar, AlertCircle, Loader2, 
  ExternalLink, Search, Filter, TrendingUp, DollarSign, Zap, PlayCircle, CheckCircle
} from 'lucide-react';
import adminApi from '../../../api/adminApi';
import { cn } from '../../../utils/cn';
import ApproveEventAdModal from '../components/ApproveEventAdModal';

const STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả', icon: Filter, color: 'gray' },
  { value: 'pending', label: 'Chờ duyệt', icon: Clock, color: 'yellow' },
  { value: 'active', label: 'Đang chạy', icon: PlayCircle, color: 'green' },
  { value: 'completed', label: 'Hoàn thành', icon: CheckCircle, color: 'blue' },
  { value: 'cancelled', label: 'Đã hủy', icon: XCircle, color: 'red' },
];

export default function ManageEventAdApprovals() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
    cancelled: 0
  });

  // Load purchases with filter
  const loadPurchases = async () => {
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
      
      const response = await adminApi.getAllEventPurchases(params);
      
      if (response.success && response.data) {
        setPurchases(Array.isArray(response.data) ? response.data : []);
        if (response.total !== undefined) {
          updateStats(response.data);
        }
      } else {
        setError(response.message || 'Không thể tải danh sách yêu cầu quảng cáo');
      }
    } catch (err) {
      console.error('Error loading purchases:', err);
      setError(err.response?.data?.message || err.message || 'Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from purchases
  const updateStats = (data) => {
    const newStats = {
      total: data.length,
      pending: data.filter(p => p.Status === 'pending').length,
      active: data.filter(p => p.Status === 'active').length,
      completed: data.filter(p => p.Status === 'completed').length,
      cancelled: data.filter(p => p.Status === 'cancelled').length
    };
    setStats(newStats);
  };

  useEffect(() => {
    loadPurchases();
  }, [statusFilter]);

  // Filter purchases by search query
  const filteredPurchases = useMemo(() => {
    if (!searchQuery.trim()) return purchases;
    
    const query = searchQuery.toLowerCase();
    return purchases.filter(purchase => 
      purchase.EventName?.toLowerCase().includes(query) ||
      purchase.BarName?.toLowerCase().includes(query) ||
      purchase.AccountEmail?.toLowerCase().includes(query) ||
      purchase.PackageName?.toLowerCase().includes(query)
    );
  }, [purchases, searchQuery]);

  // Handle approve button click
  const handleApprove = (purchase) => {
    setSelectedPurchase(purchase);
    setShowApproveModal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowApproveModal(false);
    setSelectedPurchase(null);
  };

  // Handle approve success
  const handleApproveSuccess = async () => {
    await loadPurchases();
    handleModalClose();
  };

  // Format số tiền
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price || 0);
  };

  // Format số lượt xem
  const formatNumber = (num) => {
    return new Intl.NumberFormat('vi-VN').format(num || 0);
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge config
  const getStatusBadge = (status) => {
    const configs = {
      pending: { icon: Clock, bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Chờ duyệt' },
      active: { icon: PlayCircle, bg: 'bg-green-100', text: 'text-green-800', label: 'Đang chạy' },
      completed: { icon: CheckCircle2, bg: 'bg-blue-100', text: 'text-blue-800', label: 'Hoàn thành' },
      cancelled: { icon: XCircle, bg: 'bg-red-100', text: 'text-red-800', label: 'Đã hủy' },
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium", config.bg, config.text)}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý quảng cáo Event</h1>
        <p className="text-gray-600 mt-1">Duyệt và theo dõi quảng cáo cho các sự kiện của BarPage</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Tổng số</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Filter className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-yellow-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Chờ duyệt</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-green-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Đang chạy</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <PlayCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Hoàn thành</p>
              <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Đã hủy</p>
              <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên event, quán bar, email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = statusFilter === filter.value;
            
            return (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                  isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                <Icon className="w-4 h-4" />
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Purchases List */}
      {loading ? (
        <div className="flex justify-center items-center py-12 bg-white rounded-lg border border-gray-200">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-600">Đang tải...</span>
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          {statusFilter === 'all' ? (
            <>
              <Filter className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Không có yêu cầu quảng cáo nào</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-600">
                Không có yêu cầu nào với trạng thái "{STATUS_FILTERS.find(f => f.value === statusFilter)?.label}"
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPurchases.map((purchase) => (
            <div
              key={purchase.PurchaseId}
              className={cn(
                "bg-white rounded-lg border-2 shadow-sm overflow-hidden transition-all hover:shadow-lg",
                purchase.Status === 'pending' && "border-yellow-300",
                purchase.Status === 'active' && "border-green-300",
                purchase.Status === 'completed' && "border-blue-300",
                purchase.Status === 'cancelled' && "border-red-300"
              )}
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Event Image */}
                  {purchase.EventPicture && (
                    <div className="flex-shrink-0">
                      <img
                        src={purchase.EventPicture}
                        alt={purchase.EventName}
                        className="w-full lg:w-48 h-48 object-cover rounded-lg border border-gray-200 shadow-sm"
                      />
                    </div>
                  )}

                  {/* Event Info */}
                  <div className="flex-1 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{purchase.EventName}</h3>
                          {getStatusBadge(purchase.Status)}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Store className="w-4 h-4" />
                            <span className="font-medium">{purchase.BarName}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Package className="w-4 h-4" />
                            <span>{purchase.PackageName}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4" />
                            <span>{formatNumber(purchase.Impressions)} lượt xem</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-semibold text-green-600">{formatPrice(purchase.Price)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {purchase.EventDescription && (
                      <div>
                        <p className="text-sm text-gray-700 line-clamp-2">{purchase.EventDescription}</p>
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 border-t border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Event ID</p>
                        <p className="text-xs font-mono text-gray-900 truncate">{purchase.EventId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Ngày mua</p>
                        <p className="text-xs text-gray-900">{formatDate(purchase.PurchasedAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Email quán bar</p>
                        <p className="text-xs text-gray-900 truncate">{purchase.AccountEmail || 'N/A'}</p>
                      </div>
                      {purchase.UserAdId && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">UserAd ID</p>
                          <p className="text-xs font-mono text-gray-900 truncate">{purchase.UserAdId}</p>
                        </div>
                      )}
                      {purchase.UserAdStatus && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Trạng thái Ad</p>
                          <p className="text-xs text-gray-900 capitalize">{purchase.UserAdStatus}</p>
                        </div>
                      )}
                      {purchase.EventRedirectUrl && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">URL chuyển hướng</p>
                          <a
                            href={purchase.EventRedirectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 truncate"
                          >
                            Xem link
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    {purchase.Status === 'pending' && (
                      <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleApprove(purchase)}
                          className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white",
                            "bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                          )}
                        >
                          <Eye className="w-4 h-4" />
                          Duyệt và cấu hình
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedPurchase && (
        <ApproveEventAdModal
          purchase={selectedPurchase}
          onClose={handleModalClose}
          onSuccess={handleApproveSuccess}
        />
      )}
    </div>
  );
}
