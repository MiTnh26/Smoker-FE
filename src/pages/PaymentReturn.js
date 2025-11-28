import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '../utils/cn';
import axiosClient from '../api/axiosClient';

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'failed', 'pending'
  const [purchaseInfo, setPurchaseInfo] = useState(null);
  const [countdown, setCountdown] = useState(5);
  
  const type = searchParams.get('type');
  const purchaseId = searchParams.get('purchaseId');
  const code = searchParams.get('code'); // PayOS code: '00' = success
  const status = searchParams.get('status'); // PayOS status: 'PAID' = success
  const cancel = searchParams.get('cancel'); // 'true' = cancelled

  useEffect(() => {
    // Check if this is cancel page or user cancelled
    if (window.location.pathname === '/payment-cancel' || cancel === 'true') {
      setPaymentStatus('failed');
      setLoading(false);
      return;
    }

    if (!purchaseId || type !== 'ad-purchase') {
      setPaymentStatus('failed');
      setLoading(false);
      return;
    }

    // Kiểm tra payment status từ URL params trước (PayOS trả về)
    // Nếu code=00 và status=PAID thì thanh toán thành công
    if (code === '00' && status === 'PAID') {
      // Thanh toán thành công theo PayOS, nhưng cần verify với database
      checkPaymentStatus(true); // true = force success nếu URL params OK
    } else {
      // Kiểm tra payment status từ database
      checkPaymentStatus(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseId, type, code, status, cancel]);

  useEffect(() => {
    if (paymentStatus === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (paymentStatus === 'success' && countdown === 0) {
      // Redirect về trang quản lý sự kiện
      navigate('/bar/events');
    }
  }, [paymentStatus, countdown, navigate]);

  const checkPaymentStatus = async (forceSuccess = false) => {
    try {
      setLoading(true);
      
      console.log('[PaymentReturn] checkPaymentStatus called:', {
        forceSuccess,
        code,
        status,
        purchaseId
      });
      
      // Lấy orderCode từ URL
      const orderCode = searchParams.get('orderCode');
      
      // Build params object để pass đến backend
      const params = {};
      if (code) params.code = code;
      if (status) params.status = status;
      if (orderCode) params.orderCode = orderCode;
      
      // Nếu URL params cho thấy thành công (code=00, status=PAID), hiển thị success ngay
      if (forceSuccess && code === '00' && status === 'PAID') {
        console.log('[PaymentReturn] Payment appears successful from URL params, fetching purchase info...');
        // Lấy thông tin purchase để hiển thị - PASS PARAMS để trigger update
        try {
          console.log('[PaymentReturn] Calling API with params:', params);
          const response = await axiosClient.get(`/ads/purchases/${purchaseId}`, { params });
          console.log('[PaymentReturn] API response received:', response.data);
          if (response.data?.success && response.data?.data) {
            setPurchaseInfo(response.data.data);
            // Kiểm tra lại payment status từ response
            if (response.data.data.PaymentStatus === 'paid') {
              setPaymentStatus('success');
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error('[PaymentReturn] Error fetching purchase info:', err);
          console.error('[PaymentReturn] Error details:', err.response?.data);
        }
        
        setPaymentStatus('success');
        setLoading(false);
        return;
      }
      
      // Lấy thông tin purchase từ backend (có thể trigger update nếu có payment params)
      // Pass payment params để backend có thể update nếu webhook chưa đến
      console.log('[PaymentReturn] Checking payment status with params:', {
        purchaseId,
        code,
        status,
        orderCode,
        allParams: Object.fromEntries(searchParams.entries())
      });
      
      console.log('[PaymentReturn] Calling API with params:', params);
      
      const response = await axiosClient.get(`/ads/purchases/${purchaseId}`, {
        params: Object.keys(params).length > 0 ? params : {}
      });
      
      console.log('[PaymentReturn] API response:', {
        success: response.data?.success,
        paymentStatus: response.data?.data?.PaymentStatus,
        status: response.data?.data?.Status
      });
      
      if (response.data?.success && response.data?.data) {
        const purchase = response.data.data;
        setPurchaseInfo(purchase);
        
        // Kiểm tra payment status
        if (purchase.PaymentStatus === 'paid') {
          setPaymentStatus('success');
        } else if (purchase.PaymentStatus === 'failed' || purchase.Status === 'cancelled') {
          // Nếu database chưa update nhưng URL params cho thấy thành công, vẫn hiển thị success
          if (code === '00' && status === 'PAID') {
            setPaymentStatus('success');
          } else {
            setPaymentStatus('failed');
          }
        } else {
          // Nếu chưa có status trong database
          // Kiểm tra URL params từ PayOS
          if (code === '00' && status === 'PAID') {
            // PayOS đã confirm thành công, backend sẽ update khi call API này
            // Retry một lần nữa để lấy purchase đã update
            setTimeout(async () => {
              try {
                const retryResponse = await axiosClient.get(`/ads/purchases/${purchaseId}`);
                if (retryResponse.data?.success && retryResponse.data?.data) {
                  const updatedPurchase = retryResponse.data.data;
                  setPurchaseInfo(updatedPurchase);
                  if (updatedPurchase.PaymentStatus === 'paid') {
                    setPaymentStatus('success');
                    return;
                  }
                }
              } catch (err) {
                console.warn('Retry check failed:', err);
              }
              // Nếu vẫn chưa update, hiển thị success dựa trên URL params
              setPaymentStatus('success');
            }, 1000);
          } else {
            // Chưa có thông tin, đợi webhook update
            setPaymentStatus('pending');
            // Retry sau vài giây để check lại database (webhook có thể đã update)
            setTimeout(() => checkPaymentStatus(false), 3000);
          }
        }
      } else {
        // Nếu không lấy được purchase nhưng URL params cho thấy thành công
        if (code === '00' && status === 'PAID') {
          setPaymentStatus('success');
        } else {
          setPaymentStatus('failed');
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      // Nếu có lỗi nhưng URL params cho thấy thành công, vẫn hiển thị success
      if (code === '00' && status === 'PAID') {
        setPaymentStatus('success');
      } else {
        setPaymentStatus('failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToEvents = () => {
    navigate('/bar/events');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Đang kiểm tra trạng thái thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Success */}
        {paymentStatus === 'success' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h1>
            <p className="text-gray-600 mb-6">
              Yêu cầu quảng cáo của bạn đã được gửi đến admin. 
              Admin sẽ set lên Revive và thông báo lại cho bạn.
            </p>
            
            {purchaseInfo && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gói quảng cáo:</span>
                    <span className="font-medium text-gray-900">{purchaseInfo.PackageName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số lượt xem:</span>
                    <span className="font-medium text-gray-900">
                      {parseInt(purchaseInfo.Impressions || 0).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Giá trị:</span>
                    <span className="font-medium text-gray-900">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(purchaseInfo.Price || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={handleGoToEvents}
                className={cn(
                  "w-full px-6 py-3 rounded-lg font-medium text-white transition-colors",
                  "bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                )}
              >
                <span>Về trang quản lý sự kiện</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-xs text-gray-500">
                Tự động chuyển hướng sau {countdown} giây...
              </p>
            </div>
          </div>
        )}

        {/* Failed */}
        {paymentStatus === 'failed' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thất bại</h1>
            <p className="text-gray-600 mb-6">
              Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại hoặc liên hệ hỗ trợ.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleGoToEvents}
                className={cn(
                  "w-full px-6 py-3 rounded-lg font-medium text-white transition-colors",
                  "bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                )}
              >
                <span>Về trang quản lý sự kiện</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Pending */}
        {paymentStatus === 'pending' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-12 h-12 text-yellow-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Đang xử lý thanh toán</h1>
            <p className="text-gray-600 mb-6">
              Đang kiểm tra trạng thái thanh toán. Vui lòng đợi trong giây lát...
            </p>
            
            <button
              onClick={handleGoToEvents}
              className={cn(
                "w-full px-6 py-3 rounded-lg font-medium transition-colors",
                "border border-gray-300 text-gray-700 hover:bg-gray-50"
              )}
            >
              Về trang quản lý sự kiện
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

