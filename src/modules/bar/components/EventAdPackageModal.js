import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, Megaphone, Zap, TrendingUp, Eye } from 'lucide-react';
import { adService } from '../../../services/adService';
import { cn } from '../../../utils/cn';

/**
 * Modal chọn gói quảng cáo cho Event
 * 
 * Flow:
 * 1. Hiển thị danh sách gói quảng cáo active
 * 2. BarPage chọn gói và xác nhận
 * 3. Gửi purchase request với eventId, packageId, price, impressions, packageName
 * 4. Thanh toán (tạm thời giả sử thành công - sẽ tích hợp PayOS sau)
 * 5. Gửi notification cho admin với thông tin Event
 */
export default function EventAdPackageModal({ event, barPageId, onClose, onSuccess }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Lấy danh sách gói quảng cáo
  useEffect(() => {
    const loadPackages = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await adService.getPackages();
        
        if (response.success && response.data) {
          setPackages(Array.isArray(response.data) ? response.data : []);
        } else {
          setError(response.message || 'Không thể tải danh sách gói quảng cáo');
        }
      } catch (err) {
        console.error('Error loading packages:', err);
        setError('Lỗi kết nối server');
      } finally {
        setLoading(false);
      }
    };

    if (event) {
      loadPackages();
    }
  }, [event]);

  // Xử lý mua gói
  const handlePurchase = async () => {
    if (!selectedPackage || !event) {
      setError('Vui lòng chọn gói quảng cáo');
      return;
    }

    setPurchasing(true);
    setError(null);

    try {
      const purchaseData = {
        eventId: event.EventId,
        packageId: selectedPackage.PackageId,
        price: parseFloat(selectedPackage.Price),
        impressions: parseInt(selectedPackage.Impressions),
        packageName: selectedPackage.PackageName
      };

      console.log('Purchasing package:', purchaseData);

      // Gọi API purchase để tạo PayOS payment link
      const response = await adService.purchasePackage(purchaseData);

      if (response.success || response.data?.success) {
        const paymentUrl = response.data?.paymentUrl || response.data?.data?.paymentUrl;
        
        if (paymentUrl) {
          // Redirect đến PayOS payment page
          window.location.href = paymentUrl;
        } else {
          setError('Không nhận được payment URL từ server');
        }
      } else {
        setError(response.message || response.data?.message || 'Mua gói quảng cáo thất bại');
      }
    } catch (err) {
      console.error('Error purchasing package:', err);
      setError(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi mua gói quảng cáo');
    } finally {
      setPurchasing(false);
    }
  };

  // Format số tiền
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Format số lượt xem
  const formatImpressions = (impressions) => {
    return new Intl.NumberFormat('vi-VN').format(impressions);
  };

  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Megaphone className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Chọn gói quảng cáo</h2>
              <p className="text-sm text-gray-600 mt-0.5">Cho event: {event.EventName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={purchasing}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Event Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Thông tin Event</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Tên:</span> {event.EventName}</p>
              {event.Description && (
                <p><span className="font-medium">Mô tả:</span> {event.Description.substring(0, 100)}{event.Description.length > 100 ? '...' : ''}</p>
              )}
              {event.Picture && (
                <div className="mt-2">
                  <img 
                    src={event.Picture} 
                    alt={event.EventName}
                    className="w-32 h-20 object-cover rounded border border-gray-200"
                  />
                </div>
              )}
            </div>
          </div>

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
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Mua gói quảng cáo thành công!</p>
                <p className="text-xs text-green-700 mt-1">
                  Yêu cầu đã được gửi đến admin. Admin sẽ set lên Revive và thông báo lại cho bạn.
                </p>
              </div>
            </div>
          )}

          {/* Packages List */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              <span className="ml-2 text-gray-600">Đang tải gói quảng cáo...</span>
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Không có gói quảng cáo nào khả dụng</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.PackageId === pkg.PackageId;
                const hasDiscount = pkg.OriginalPrice && pkg.OriginalPrice > pkg.Price;
                const discountPercent = hasDiscount 
                  ? Math.round(((pkg.OriginalPrice - pkg.Price) / pkg.OriginalPrice) * 100)
                  : 0;

                return (
                  <div
                    key={pkg.PackageId}
                    onClick={() => !purchasing && !success && setSelectedPackage(pkg)}
                    className={cn(
                      "relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-300",
                      isSelected
                        ? "border-purple-500 bg-purple-50 shadow-lg scale-[1.02]"
                        : "border-gray-200 bg-white hover:border-purple-300 hover:shadow-md"
                    )}
                  >
                    {/* Badge */}
                    {hasDiscount && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                        -{discountPercent}%
                      </div>
                    )}

                    {/* Package Info */}
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{pkg.PackageName}</h3>
                        {pkg.Description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{pkg.Description}</p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-purple-600">
                          {formatPrice(pkg.Price)}
                        </span>
                        {hasDiscount && (
                          <span className="text-sm text-gray-400 line-through">
                            {formatPrice(pkg.OriginalPrice)}
                          </span>
                        )}
                      </div>

                      {/* Impressions */}
                      <div className="flex items-center gap-2 text-gray-700">
                        <Eye className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {formatImpressions(pkg.Impressions)} lượt xem
                        </span>
                      </div>

                      {/* Features */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>Hiển thị trên Newsfeed</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>Tối ưu đấu giá</span>
                        </div>
                      </div>

                      {/* Selected Indicator */}
                      {isSelected && (
                        <div className="absolute bottom-3 right-3">
                          <CheckCircle2 className="w-6 h-6 text-purple-600" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              {selectedPackage && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Đã chọn:</span>{' '}
                  <span className="text-purple-600 font-semibold">
                    {selectedPackage.PackageName} - {formatPrice(selectedPackage.Price)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={purchasing || success}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-colors",
                  "border border-gray-300 text-gray-700 hover:bg-gray-50",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Hủy
              </button>
              <button
                onClick={handlePurchase}
                disabled={!selectedPackage || purchasing || success}
                className={cn(
                  "px-6 py-2 rounded-lg font-medium text-white transition-colors",
                  "bg-purple-600 hover:bg-purple-700",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center gap-2"
                )}
              >
                {purchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Thành công!</span>
                  </>
                ) : (
                  <>
                    <Megaphone className="w-4 h-4" />
                    <span>Xác nhận mua</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

