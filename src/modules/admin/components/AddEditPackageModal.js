import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2, Package } from 'lucide-react';
import adminApi from '../../../api/adminApi';
import { cn } from '../../../utils/cn';

export default function AddEditPackageModal({ package: pkg, onClose, onSuccess }) {
  const isEditing = !!pkg;
  
  const [form, setForm] = useState({
    packageName: '',
    packageCode: '',
    impressions: '',
    price: '',
    originalPrice: '',
    description: '',
    isActive: true,
    displayOrder: 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Load package data if editing
  useEffect(() => {
    if (isEditing && pkg) {
      setForm({
        packageName: pkg.PackageName || '',
        packageCode: pkg.PackageCode || '',
        impressions: pkg.Impressions?.toString() || '',
        price: pkg.Price?.toString() || '',
        originalPrice: pkg.OriginalPrice?.toString() || '',
        description: pkg.Description || '',
        isActive: pkg.IsActive !== undefined ? pkg.IsActive : true,
        displayOrder: pkg.DisplayOrder || 0
      });
    }
  }, [isEditing, pkg]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError(null);
  };

  // Validate form
  const validateForm = () => {
    if (!form.packageName.trim()) {
      setError('Tên gói là bắt buộc');
      return false;
    }
    if (!form.packageCode.trim()) {
      setError('Mã gói là bắt buộc');
      return false;
    }
    if (!form.impressions || parseInt(form.impressions) <= 0) {
      setError('Số lượt xem phải lớn hơn 0');
      return false;
    }
    if (!form.price || parseFloat(form.price) <= 0) {
      setError('Giá phải lớn hơn 0');
      return false;
    }
    if (form.originalPrice && parseFloat(form.originalPrice) <= parseFloat(form.price)) {
      setError('Giá gốc phải lớn hơn giá bán');
      return false;
    }
    return true;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const data = {
        packageName: form.packageName.trim(),
        packageCode: form.packageCode.trim(),
        impressions: parseInt(form.impressions),
        price: parseFloat(form.price),
        originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
        description: form.description.trim() || null,
        isActive: form.isActive,
        displayOrder: parseInt(form.displayOrder) || 0
      };

      let response;
      if (isEditing) {
        response = await adminApi.updateAdPackage(pkg.PackageId, data);
      } else {
        response = await adminApi.createAdPackage(data);
      }

      if (response.success || response.data?.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1000);
      } else {
        setError(response.message || response.data?.message || 'Lưu gói thất bại');
      }
    } catch (err) {
      console.error('Error saving package:', err);
      setError(err.response?.data?.message || err.message || 'Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  // Format số tiền preview
  const formatPrice = (price) => {
    if (!price) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Sửa gói quảng cáo' : 'Thêm gói quảng cáo mới'}
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {isEditing ? 'Cập nhật thông tin gói quảng cáo' : 'Tạo gói quảng cáo mới cho hệ thống'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">
                {isEditing ? 'Cập nhật gói thành công!' : 'Tạo gói thành công!'}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* Package Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên gói <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="packageName"
                value={form.packageName}
                onChange={handleChange}
                placeholder="Ví dụ: Gói 1.000 lượt xem"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
                disabled={loading}
              />
            </div>

            {/* Package Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã gói <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="packageCode"
                value={form.packageCode}
                onChange={handleChange}
                placeholder="Ví dụ: package_1k"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                required
                disabled={loading || isEditing} // Không cho sửa code khi đang edit
              />
              {isEditing && (
                <p className="text-xs text-gray-500 mt-1">Mã gói không thể thay đổi</p>
              )}
            </div>

            {/* Impressions & Price Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số lượt xem <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="impressions"
                  value={form.impressions}
                  onChange={handleChange}
                  placeholder="1000"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giá (VND) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="50000"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                  disabled={loading}
                />
                {form.price && (
                  <p className="text-xs text-gray-500 mt-1">{formatPrice(form.price)}</p>
                )}
              </div>
            </div>

            {/* Original Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giá gốc (VND) <span className="text-gray-400 text-xs">(tùy chọn - cho discount)</span>
              </label>
              <input
                type="number"
                name="originalPrice"
                value={form.originalPrice}
                onChange={handleChange}
                placeholder="60000"
                min="0"
                step="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                disabled={loading}
              />
              {form.originalPrice && (
                <p className="text-xs text-gray-500 mt-1">
                  Giá gốc: {formatPrice(form.originalPrice)}
                  {parseFloat(form.originalPrice) > parseFloat(form.price || 0) && (
                    <span className="text-red-600 ml-2">
                      (Giảm: {formatPrice(parseFloat(form.originalPrice) - parseFloat(form.price || 0))})
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả <span className="text-gray-400 text-xs">(tùy chọn)</span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Mô tả về gói quảng cáo này..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                disabled={loading}
              />
            </div>

            {/* Display Order & Active Status Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thứ tự hiển thị
                </label>
                <input
                  type="number"
                  name="displayOrder"
                  value={form.displayOrder}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Số nhỏ hơn sẽ hiển thị trước</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng thái
                </label>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="text-sm text-gray-700">Hoạt động</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {form.isActive ? 'Gói sẽ hiển thị cho BarPage' : 'Gói sẽ bị ẩn'}
                </p>
              </div>
            </div>

            {/* Preview */}
            {form.packageName && form.price && form.impressions && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">Xem trước:</p>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Tên:</span> {form.packageName}</p>
                  <p><span className="font-medium">Giá:</span> {formatPrice(form.price)}</p>
                  <p><span className="font-medium">Lượt xem:</span> {parseInt(form.impressions).toLocaleString('vi-VN')}</p>
                  {form.originalPrice && parseFloat(form.originalPrice) > parseFloat(form.price) && (
                    <p className="text-green-600">
                      <span className="font-medium">Giảm giá:</span> {formatPrice(parseFloat(form.originalPrice) - parseFloat(form.price))}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors",
                "border border-gray-300 text-gray-700 hover:bg-gray-50",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Hủy
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || success}
              className={cn(
                "px-6 py-2 rounded-lg font-medium text-white transition-colors",
                "bg-blue-600 hover:bg-blue-700",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center gap-2"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Thành công!</span>
                </>
              ) : (
                <span>{isEditing ? 'Cập nhật' : 'Tạo gói'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

