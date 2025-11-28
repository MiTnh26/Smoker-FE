import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, CheckCircle2, XCircle, Eye, TrendingUp, DollarSign, Package, AlertCircle } from 'lucide-react';
import adminApi from '../../../api/adminApi';
import { cn } from '../../../utils/cn';
import AddEditPackageModal from '../components/AddEditPackageModal';

export default function ManageAdPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [stats, setStats] = useState(null);

  // Load packages
  const loadPackages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getAdPackages();
      
      if (response.success && response.data) {
        setPackages(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.message || 'Không thể tải danh sách gói quảng cáo');
      }
    } catch (err) {
      console.error('Error loading packages:', err);
      setError(err.response?.data?.message || err.message || 'Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  // Load stats
  const loadStats = async () => {
    try {
      const response = await adminApi.getAdPackageStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  useEffect(() => {
    loadPackages();
    loadStats();
  }, []);

  // Handle create
  const handleCreate = () => {
    setEditingPackage(null);
    setShowModal(true);
  };

  // Handle edit
  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setShowModal(true);
  };

  // Handle delete
  const handleDelete = async (pkg) => {
    if (!window.confirm(`Bạn có chắc muốn xóa gói "${pkg.PackageName}"?`)) {
      return;
    }

    setDeletingId(pkg.PackageId);
    try {
      const response = await adminApi.deleteAdPackage(pkg.PackageId);
      if (response.success || response.data?.success) {
        await loadPackages();
        await loadStats();
      } else {
        alert(response.message || response.data?.message || 'Xóa gói thất bại');
      }
    } catch (err) {
      console.error('Error deleting package:', err);
      alert(err.response?.data?.message || err.message || 'Lỗi khi xóa gói');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowModal(false);
    setEditingPackage(null);
  };

  // Handle save success
  const handleSaveSuccess = async () => {
    await loadPackages();
    await loadStats();
    handleModalClose();
  };

  // Format số tiền
  const formatPrice = (price) => {
    const numPrice = typeof price === 'number' ? price : parseFloat(price) || 0;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(numPrice);
  };

  // Format số lượt xem
  const formatNumber = (num) => {
    const numValue = typeof num === 'number' ? num : parseInt(num) || 0;
    return new Intl.NumberFormat('vi-VN').format(numValue);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý gói quảng cáo</h1>
          <p className="text-gray-600 mt-1">Quản lý các gói quảng cáo cho BarPage</p>
        </div>
        <button
          onClick={handleCreate}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white",
            "bg-blue-600 hover:bg-blue-700 transition-colors"
          )}
        >
          <Plus className="w-5 h-5" />
          Thêm gói mới
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng gói</p>
                <p className="text-2xl font-bold text-gray-900">{stats.TotalPackages || 0}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Gói đang hoạt động</p>
                <p className="text-2xl font-bold text-green-600">{stats.ActivePackages || 0}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng đã bán</p>
                <p className="text-2xl font-bold text-purple-600">{formatNumber(stats.TotalSoldCount || stats.TotalSold || 0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng doanh thu</p>
                <p className="text-2xl font-bold text-orange-600">{formatPrice(stats.OverallRevenue || 0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Packages Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12 bg-white rounded-lg border border-gray-200">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-600">Đang tải...</span>
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">Chưa có gói quảng cáo nào</p>
          <button
            onClick={handleCreate}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white",
              "bg-blue-600 hover:bg-blue-700 transition-colors"
            )}
          >
            <Plus className="w-5 h-5" />
            Thêm gói đầu tiên
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Tên gói
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Mã gói
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Lượt xem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Giá
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Đã bán
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Doanh thu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Thứ tự
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packages.map((pkg) => (
                  <tr key={pkg.PackageId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{pkg.PackageName}</div>
                        {pkg.Description && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-xs">
                            {pkg.Description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-mono">{pkg.PackageCode}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <Eye className="w-4 h-4 text-gray-400" />
                        {formatNumber(pkg.Impressions)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatPrice(pkg.Price)}
                        {pkg.OriginalPrice && pkg.OriginalPrice > pkg.Price && (
                          <span className="text-xs text-gray-400 line-through ml-2">
                            {formatPrice(pkg.OriginalPrice)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatNumber(pkg.SoldCount != null ? pkg.SoldCount : 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        {formatPrice(pkg.TotalRevenue != null ? pkg.TotalRevenue : 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          pkg.IsActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        )}
                      >
                        {pkg.IsActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Hoạt động
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Không hoạt động
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{pkg.DisplayOrder || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(pkg)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="Sửa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pkg)}
                          disabled={deletingId === pkg.PackageId}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Xóa"
                        >
                          {deletingId === pkg.PackageId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <AddEditPackageModal
          package={editingPackage}
          onClose={handleModalClose}
          onSuccess={handleSaveSuccess}
        />
      )}
    </div>
  );
}

