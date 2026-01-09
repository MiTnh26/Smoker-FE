import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  TicketPercent,
  Calendar,
  DollarSign,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff
} from "lucide-react";
import adminApi from "../../../api/adminApi";
import { ToastContainer } from "../../../components/common/Toast";
import { SkeletonCard } from "../../../components/common/Skeleton";

export default function VoucherManager() {
  const { t } = useTranslation();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Form states
  const [formData, setFormData] = useState({
    voucherName: "",
    voucherCode: "",
    discountPercentage: 3,
    maxUsage: 100,
    minComboValue: 1000000,
    startDate: "",
    endDate: "",
    status: "ACTIVE"
  });

  // Load vouchers
  const loadVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await adminApi.getVouchers(params);

      if (response.success) {
        setVouchers(response.data || []);
      } else {
        addToast(response.message || "Không thể tải danh sách voucher", "error");
      }
    } catch (error) {
      console.error("❌ Error loading vouchers:", error);
      console.error("❌ Error details:", error.response?.data);
      addToast(error.response?.data?.message || "Không thể tải danh sách voucher", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  // Toast management
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      voucherName: "",
      voucherCode: "",
      discountPercentage: 3,
      maxUsage: 100,
      minComboValue: 1000000,
      startDate: "",
      endDate: "",
      status: "ACTIVE"
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    try {
      // Validate form
      if (!formData.voucherName.trim() || !formData.voucherCode.trim()) {
        addToast("Vui lòng điền đầy đủ thông tin", "error");
        return;
      }

      if (formData.discountPercentage < 3 || formData.discountPercentage > 5) {
        addToast("Phần trăm giảm giá phải từ 3-5%", "error");
        return;
      }

      const response = await adminApi.createVoucher(formData);
      if (response.success) {
        addToast("Tạo voucher thành công!");
        setShowCreateModal(false);
        resetForm();
        loadVouchers();
      } else {
        addToast(response.message || "Không thể tạo voucher", "error");
      }
    } catch (error) {
      console.error("Error creating voucher:", error);
      addToast(error.response?.data?.message || "Lỗi khi tạo voucher", "error");
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();

    try {
      if (!selectedVoucher) return;

      const response = await adminApi.updateVoucher(selectedVoucher.VoucherId, formData);
      if (response.success) {
        addToast("Cập nhật voucher thành công!");
        setShowEditModal(false);
        setSelectedVoucher(null);
        resetForm();
        loadVouchers();
      } else {
        addToast(response.message || "Không thể cập nhật voucher", "error");
      }
    } catch (error) {
      console.error("Error updating voucher:", error);
      addToast(error.response?.data?.message || "Lỗi khi cập nhật voucher", "error");
    }
  };

  const handleDelete = async (voucherId) => {
    if (!window.confirm("Bạn có chắc muốn xóa voucher này?")) return;

    try {
      const response = await adminApi.deleteVoucher(voucherId);
      if (response.success) {
        addToast("Xóa voucher thành công!");
        loadVouchers();
      } else {
        addToast(response.message || "Không thể xóa voucher", "error");
      }
    } catch (error) {
      console.error("Error deleting voucher:", error);
      addToast(error.response?.data?.message || "Lỗi khi xóa voucher", "error");
    }
  };

  const openEditModal = (voucher) => {
    setSelectedVoucher(voucher);
    setFormData({
      voucherName: voucher.VoucherName || "",
      voucherCode: voucher.VoucherCode || "",
      discountPercentage: voucher.DiscountPercentage || 3,
      maxUsage: voucher.MaxUsage || 100,
      minComboValue: voucher.MinComboValue || 1000000,
      startDate: voucher.StartDate ? new Date(voucher.StartDate).toISOString().split('T')[0] : "",
      endDate: voucher.EndDate ? new Date(voucher.EndDate).toISOString().split('T')[0] : "",
      status: voucher.Status || "ACTIVE"
    });
    setShowEditModal(true);
  };

  // Filter vouchers
  const filteredVouchers = vouchers.filter(voucher => {
    const matchesSearch = voucher.VoucherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         voucher.VoucherCode?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "ACTIVE": return "text-green-600 bg-green-100";
      case "INACTIVE": return "text-red-600 bg-red-100";
      case "EXPIRED": return "text-gray-600 bg-gray-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "ACTIVE": return <CheckCircle size={16} />;
      case "INACTIVE": return <XCircle size={16} />;
      case "EXPIRED": return <AlertCircle size={16} />;
      default: return <AlertCircle size={16} />;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TicketPercent className="text-primary" size={32} />
            <h1 className="text-3xl font-bold text-foreground">Quản lý Voucher</h1>
          </div>
          <p className="text-muted-foreground">
            Tạo và quản lý các voucher giảm giá cho hệ thống
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="Tìm kiếm voucher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Không hoạt động</option>
              <option value="EXPIRED">Đã hết hạn</option>
            </select>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} />
            Tạo Voucher
          </button>
        </div>

        {/* Voucher List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVouchers.map((voucher) => (
              <motion.div
                key={voucher.VoucherId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TicketPercent className="text-primary" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{voucher.VoucherName}</h3>
                      <p className="text-sm text-muted-foreground font-mono">{voucher.VoucherCode}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(voucher.Status)}`}>
                    {getStatusIcon(voucher.Status)}
                    {voucher.Status}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign size={16} className="text-muted-foreground" />
                    <span>Giảm {voucher.DiscountPercentage}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users size={16} className="text-muted-foreground" />
                    <span>{voucher.UsedCount || 0}/{voucher.MaxUsage} lượt</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={16} className="text-muted-foreground" />
                    <span>{new Date(voucher.StartDate).toLocaleDateString('vi-VN')} - {new Date(voucher.EndDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Tối thiểu: {voucher.MinComboValue?.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(voucher)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    <Edit size={16} />
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(voucher.VoucherId)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/80 transition-colors"
                  >
                    <Trash2 size={16} />
                    Xóa
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredVouchers.length === 0 && (
          <div className="text-center py-12">
            <TicketPercent className="mx-auto text-muted-foreground" size={48} />
            <h3 className="text-lg font-semibold mt-4">Chưa có voucher nào</h3>
            <p className="text-muted-foreground mb-4">Tạo voucher đầu tiên để bắt đầu</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Tạo Voucher
            </button>
          </div>
        )}

        {/* Create Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <VoucherModal
              title="Tạo Voucher Mới"
              formData={formData}
              onSubmit={handleCreate}
              onClose={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              onChange={handleInputChange}
              submitText="Tạo Voucher"
            />
          )}

          {/* Edit Modal */}
          {showEditModal && (
            <VoucherModal
              title="Chỉnh sửa Voucher"
              formData={formData}
              onSubmit={handleEdit}
              onClose={() => {
                setShowEditModal(false);
                setSelectedVoucher(null);
                resetForm();
              }}
              onChange={handleInputChange}
              submitText="Cập nhật"
            />
          )}
        </AnimatePresence>

        {/* Toasts */}
        <ToastContainer toasts={toasts} />
      </div>
    </div>
  );
}

// Voucher Modal Component
function VoucherModal({ title, formData, onSubmit, onClose, onChange, submitText }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-card rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">{title}</h2>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tên Voucher</label>
            <input
              type="text"
              name="voucherName"
              value={formData.voucherName}
              onChange={onChange}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mã Voucher</label>
            <input
              type="text"
              name="voucherCode"
              value={formData.voucherCode}
              onChange={onChange}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Giảm giá (%)</label>
              <input
                type="number"
                name="discountPercentage"
                value={formData.discountPercentage}
                onChange={onChange}
                min="3"
                max="5"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Số lượt tối đa</label>
              <input
                type="number"
                name="maxUsage"
                value={formData.maxUsage}
                onChange={onChange}
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Giá trị combo tối thiểu (VND)</label>
            <input
              type="number"
              name="minComboValue"
              value={formData.minComboValue}
              onChange={onChange}
              min="1000000"
              step="100000"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={onChange}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ngày kết thúc</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={onChange}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Trạng thái</label>
            <select
              name="status"
              value={formData.status}
              onChange={onChange}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Không hoạt động</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {submitText}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
