import React, { useState, useEffect } from 'react';
import { 
  X, Loader2, AlertCircle, CheckCircle2, Info, ExternalLink, Package, Store, Calendar,
  Copy, Check, Image as ImageIcon, FileText, Link as LinkIcon, Download
} from 'lucide-react';
import adminApi from '../../../api/adminApi';
import { cn } from '../../../utils/cn';

export default function ApproveEventAdModal({ purchase, onClose, onSuccess }) {
  // Auto-generate redirect URL based on EntityAccountId (preferred) or BarPageId (fallback)
  const getRedirectUrl = () => {
    // Use EntityAccountId if available (preferred for ProfilePage)
    if (purchase?.BarEntityAccountId) {
      return `${window.location.origin}/profile/${purchase.BarEntityAccountId}`;
    }
    // Fallback to BarPageId if EntityAccountId not available
    if (purchase?.BarPageId) {
      return `${window.location.origin}/bar/${purchase.BarPageId}`;
    }
    return purchase?.EventRedirectUrl || '';
  };

  const [form, setForm] = useState({
    reviveBannerId: '',
    reviveCampaignId: '',
    reviveZoneId: '',
    pricingModel: 'CPM',
    bidAmount: '',
    redirectUrl: getRedirectUrl()
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState(null); // Track which field was copied

  // Update redirect URL when purchase changes
  useEffect(() => {
    if (purchase) {
      const autoUrl = getRedirectUrl();
      setForm(prev => ({
        ...prev,
        redirectUrl: prev.redirectUrl || autoUrl // Only set if empty
      }));
    }
  }, [purchase]);

  // Copy to clipboard function
  const copyToClipboard = async (text, fieldName) => {
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  // Download image function
  const downloadImage = async (imageUrl, fileName) => {
    if (!imageUrl) return;
    
    try {
      // Fetch image as blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get file extension from URL or default to jpg
      const urlParts = imageUrl.split('.');
      const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'jpg';
      const safeFileName = fileName || `event-image-${purchase?.EventId || Date.now()}.${extension}`;
      
      link.download = safeFileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Show success feedback
      setCopiedField('imageDownload');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to download image:', err);
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  // Validate form
  const validateForm = () => {
    if (!form.reviveBannerId.trim()) {
      setError('Revive Banner ID là bắt buộc');
      return false;
    }
    if (!form.reviveCampaignId.trim()) {
      setError('Revive Campaign ID là bắt buộc');
      return false;
    }
    if (!form.reviveZoneId.trim()) {
      setError('Revive Zone ID là bắt buộc');
      return false;
    }
    if (!form.pricingModel) {
      setError('Pricing Model là bắt buộc');
      return false;
    }
    if (!form.bidAmount || parseFloat(form.bidAmount) <= 0) {
      setError('Bid Amount phải lớn hơn 0');
      return false;
    }
    if (!form.redirectUrl.trim()) {
      setError('Redirect URL là bắt buộc');
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
        reviveBannerId: form.reviveBannerId.trim(),
        reviveCampaignId: form.reviveCampaignId.trim(),
        reviveZoneId: form.reviveZoneId.trim(),
        pricingModel: form.pricingModel,
        bidAmount: parseFloat(form.bidAmount),
        redirectUrl: form.redirectUrl.trim()
      };

      const response = await adminApi.approveEventPurchase(purchase.PurchaseId, data);

      if (response.success || response.data?.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        setError(response.message || response.data?.message || 'Duyệt quảng cáo thất bại');
      }
    } catch (err) {
      console.error('Error approving purchase:', err);
      setError(err.response?.data?.message || err.message || 'Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  // Format số tiền
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price || 0);
  };

  // Component for copyable field
  const CopyableField = ({ label, value, icon: Icon, fieldName }) => {
    if (!value) return null;
    
    const isCopied = copiedField === fieldName;
    
    return (
      <div className="p-3 bg-white rounded-lg border border-gray-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {Icon && <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              <label className="text-xs font-medium text-gray-600">{label}</label>
            </div>
            <p className="text-sm text-gray-900 break-words font-mono">{value}</p>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(value, fieldName)}
            className={cn(
              "p-2 rounded-lg transition-colors flex-shrink-0",
              isCopied
                ? "bg-green-100 text-green-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
            title={isCopied ? "Đã copy!" : "Copy"}
          >
            {isCopied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    );
  };

  if (!purchase) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Duyệt quảng cáo Event</h2>
              <p className="text-sm text-gray-600 mt-0.5">Copy thông tin để set lên Revive</p>
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
          {/* Event Info - Copyable Fields */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Thông tin Event (Tải ảnh hoặc Copy thông tin)
            </h3>
            
            <div className="space-y-3">
              {/* Event Image */}
              {purchase.EventPicture && (
                <>
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <ImageIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <label className="text-xs font-medium text-gray-600">Ảnh Event</label>
                        </div>
                        <p className="text-xs text-gray-500 break-words font-mono mb-2">{purchase.EventPicture}</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => downloadImage(purchase.EventPicture, `${purchase.EventName || 'event'}-image.jpg`)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                              copiedField === 'imageDownload'
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            )}
                            title="Tải ảnh về"
                          >
                            {copiedField === 'imageDownload' ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Đã tải!</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Tải ảnh</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(purchase.EventPicture, 'imageUrl')}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                              copiedField === 'imageUrl'
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            )}
                            title="Copy URL ảnh"
                          >
                            {copiedField === 'imageUrl' ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Đã copy!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy URL</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mb-2">
                    <img
                      src={purchase.EventPicture}
                      alt={purchase.EventName}
                      className="w-full max-h-64 object-cover rounded-lg border border-gray-200 shadow-sm"
                    />
                  </div>
                </>
              )}

              {/* Event Title */}
              <CopyableField
                label="Tiêu đề Event"
                value={purchase.EventName}
                icon={FileText}
                fieldName="title"
              />

              {/* Event Description */}
              {purchase.EventDescription && (
                <CopyableField
                  label="Mô tả Event"
                  value={purchase.EventDescription}
                  icon={FileText}
                  fieldName="description"
                />
              )}

              {/* Bar Name */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Store className="w-4 h-4 text-gray-400" />
                  <label className="text-xs font-medium text-gray-600">Quán bar</label>
                </div>
                <p className="text-sm text-gray-900 font-medium">{purchase.BarName}</p>
              </div>

              {/* Package Info */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-gray-400" />
                  <label className="text-xs font-medium text-gray-600">Gói quảng cáo</label>
                </div>
                <p className="text-sm text-gray-900">
                  {purchase.PackageName} - {parseInt(purchase.Impressions || 0).toLocaleString('vi-VN')} lượt xem - {formatPrice(purchase.Price)}
                </p>
              </div>
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
                <p className="text-sm font-medium text-green-800">Duyệt quảng cáo thành công!</p>
                <p className="text-xs text-green-700 mt-1">Quảng cáo đã được kích hoạt và BarPage sẽ nhận được thông báo.</p>
              </div>
            </div>
          )}

          {/* Info Alert */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Hướng dẫn:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Tải ảnh Event về hoặc copy URL ảnh, copy Title và Description</li>
                  <li>Đăng nhập vào Revive Ad Server và tạo Banner/Campaign với thông tin đã copy (upload ảnh đã tải hoặc dùng URL)</li>
                  <li>Nhập thông tin Revive (Banner ID, Campaign ID, Zone ID, Pricing Model, Bid Amount) vào form bên dưới</li>
                  <li>Kiểm tra Redirect URL (tự động điền sẵn link tới quán bar) và chỉnh sửa nếu cần</li>
                  <li>Nhấn "Xác nhận duyệt" để kích hoạt quảng cáo</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Form Fields - Revive Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Thông tin Revive Ad Server</h3>

            {/* Revive Banner ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Revive Banner ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="reviveBannerId"
                value={form.reviveBannerId}
                onChange={handleChange}
                placeholder="Ví dụ: 123"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                required
                disabled={loading || success}
              />
            </div>

            {/* Revive Campaign ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Revive Campaign ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="reviveCampaignId"
                value={form.reviveCampaignId}
                onChange={handleChange}
                placeholder="Ví dụ: 456"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                required
                disabled={loading || success}
              />
            </div>

            {/* Revive Zone ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Revive Zone ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="reviveZoneId"
                value={form.reviveZoneId}
                onChange={handleChange}
                placeholder="Ví dụ: 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                required
                disabled={loading || success}
              />
            </div>

            {/* Pricing Model & Bid Amount Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pricing Model <span className="text-red-500">*</span>
                </label>
                <select
                  name="pricingModel"
                  value={form.pricingModel}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                  disabled={loading || success}
                >
                  <option value="CPM">CPM (Cost Per Mille - per 1000 impressions)</option>
                  <option value="CPC">CPC (Cost Per Click)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bid Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="bidAmount"
                  value={form.bidAmount}
                  onChange={handleChange}
                  placeholder="2.00"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                  disabled={loading || success}
                />
                <p className="text-xs text-gray-500 mt-1">Giá đấu thầu cho {form.pricingModel}</p>
              </div>
            </div>

            {/* Redirect URL - Auto-filled and copyable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Redirect URL <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 ml-2">(Tự động điền - Link tới quán bar)</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  name="redirectUrl"
                  value={form.redirectUrl}
                  onChange={handleChange}
                  placeholder={`${window.location.origin}/bar/[barPageId]`}
                  className="w-full pl-3 pr-20 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                  disabled={loading || success}
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(form.redirectUrl, 'redirectUrl')}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors",
                    copiedField === 'redirectUrl'
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                  title={copiedField === 'redirectUrl' ? "Đã copy!" : "Copy URL"}
                  disabled={loading || success}
                >
                  {copiedField === 'redirectUrl' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                URL chuyển hướng khi user click vào quảng cáo (tự động link tới profile quán bar)
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p className="font-medium">Tổng giá trị: {formatPrice(purchase.Price)}</p>
              <p className="text-xs">{parseInt(purchase.Impressions || 0).toLocaleString('vi-VN')} lượt xem</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading || success}
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
                    <span>Đang xử lý...</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Thành công!</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác nhận duyệt</span>
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
