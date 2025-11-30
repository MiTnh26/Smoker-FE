import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '../utils/cn';
import axiosClient from '../api/axiosClient';
import bookingApi from '../api/bookingApi';

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'failed', 'pending'
  const [purchaseInfo, setPurchaseInfo] = useState(null);
  const [bookingInfo, setBookingInfo] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(null); // Số tiền đã thanh toán từ PayOS
  const [countdown, setCountdown] = useState(5);
  
  const type = searchParams.get('type');
  const purchaseId = searchParams.get('purchaseId');
  const bookingId = searchParams.get('bookingId');
  const orderCode = searchParams.get('orderCode');
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

    // Xử lý booking payment (DJ/Dancer hoặc table booking)
    if ((type === 'booking' || type === 'table-booking') && bookingId) {
      // Kiểm tra payment status từ URL params trước (PayOS trả về)
      // Nếu code=00 và status=PAID thì thanh toán thành công
      if (code === '00' && status === 'PAID') {
        // Thanh toán thành công theo PayOS, nhưng cần verify với database
        checkBookingPaymentStatus(true); // true = force success nếu URL params OK
      } else if (!code && !status) {
        // Không có URL params (có thể redirect từ app), kiểm tra database trực tiếp
        // Nếu webhook đã update thì sẽ thấy Paid
        checkBookingPaymentStatus(false);
      } else {
        // Có URL params nhưng không phải success, kiểm tra database
        checkBookingPaymentStatus(false);
      }
      return;
    }

    // Xử lý ad-purchase payment (giữ nguyên logic cũ)
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
      // Redirect về trang home hoặc newsfeed tùy vào trạng thái đăng nhập
      try {
        const sessionRaw = localStorage.getItem("session");
        if (sessionRaw) {
          const session = JSON.parse(sessionRaw);
          if (session && (session.account || session.activeEntity)) {
            // User đã đăng nhập, navigate đến newsfeed
            navigate('/customer/newsfeed', { replace: true });
            return;
          }
        }
      } catch (error) {
        console.error('[PaymentReturn] Error checking session:', error);
      }
      // User chưa đăng nhập, navigate đến trang home
      navigate('/', { replace: true });
    }
  }, [paymentStatus, countdown, navigate]);

  // Hàm kiểm tra payment status cho booking
  const checkBookingPaymentStatus = async (forceSuccess = false) => {
    try {
      setLoading(true);
      
      console.log('[PaymentReturn] checkBookingPaymentStatus called:', {
        forceSuccess,
        code,
        status,
        bookingId,
        orderCode
      });
      
      // Nếu URL params cho thấy thành công (code=00, status=PAID), cập nhật database ngay
      if (forceSuccess && code === '00' && status === 'PAID') {
        console.log('[PaymentReturn] Payment appears successful from URL params, updating database...');
        
        try {
          // Gọi API checkPaymentStatus để cập nhật database ngay lập tức (không chờ webhook)
          console.log('[PaymentReturn] Calling checkPaymentStatus API to update database...');
          const checkResponse = await bookingApi.checkPaymentStatus(bookingId);
          console.log('[PaymentReturn] checkPaymentStatus API called successfully');
          
          // Lấy payment amount từ response nếu có
          if (checkResponse?.data?.paymentAmount) {
            setPaymentAmount(checkResponse.data.paymentAmount);
          }
          
          // Đợi một chút để database update xong, rồi lấy lại booking info
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Lấy thông tin booking đã được cập nhật
          const response = await bookingApi.getMyBookings({ limit: 1000 });
          const bookings = response?.data?.data || response?.data || [];
          const booking = bookings.find(b => {
            const bId = b.BookedScheduleId || b.bookedScheduleId;
            return bId && (bId.toString() === bookingId?.toString() || bId === bookingId);
          });
          
          if (booking) {
            setBookingInfo(booking);
            const paymentStatusValue = booking.PaymentStatus || booking.paymentStatus;
            console.log('[PaymentReturn] Updated payment status:', paymentStatusValue);
            
            // Hiển thị success
            setPaymentStatus('success');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('[PaymentReturn] Error updating payment status:', err);
          // Nếu có lỗi nhưng URL params vẫn cho thấy success, vẫn hiển thị success
          setPaymentStatus('success');
          setLoading(false);
          return;
        }
        
        // Fallback: nếu không tìm thấy booking, vẫn hiển thị success dựa trên URL params
        setPaymentStatus('success');
        setLoading(false);
        return;
      }
      
      // Lấy thông tin booking từ backend
      console.log('[PaymentReturn] Checking payment status for booking:', bookingId);
      
      const response = await bookingApi.getMyBookings({ limit: 1000 });
      const bookings = response?.data?.data || response?.data || [];
      // So sánh bookingId (có thể là string hoặc UUID)
      const booking = bookings.find(b => {
        const bId = b.BookedScheduleId || b.bookedScheduleId;
        return bId && (bId.toString() === bookingId?.toString() || bId === bookingId);
      });
      
      if (booking) {
        setBookingInfo(booking);
        
        // Kiểm tra payment status - chấp nhận Paid (đã cọc)
        const paymentStatusValue = booking.PaymentStatus || booking.paymentStatus;
        if (paymentStatusValue === 'Paid') {
          setPaymentStatus('success');
        } else if (paymentStatusValue === 'Failed') {
          // Nếu database chưa update nhưng URL params cho thấy thành công, vẫn hiển thị success
          if (code === '00' && status === 'PAID') {
            setPaymentStatus('success');
          } else {
            setPaymentStatus('failed');
          }
        } else {
          // Nếu chưa có status trong database hoặc vẫn là Pending
          // Kiểm tra URL params từ PayOS
          if (code === '00' && status === 'PAID') {
            // PayOS đã confirm thành công, gọi API để cập nhật database ngay (không chờ webhook)
            console.log('[PaymentReturn] Payment success detected, calling checkPaymentStatus to update database...');
            try {
              const checkResponse = await bookingApi.checkPaymentStatus(bookingId);
              console.log('[PaymentReturn] checkPaymentStatus API called successfully');
              
              // Lấy payment amount từ response nếu có
              if (checkResponse?.data?.paymentAmount) {
                setPaymentAmount(checkResponse.data.paymentAmount);
              }
              
              // Đợi một chút để database update xong, rồi lấy lại booking info
              await new Promise(resolve => setTimeout(resolve, 500));
              
              const retryResponse = await bookingApi.getMyBookings({ limit: 1000 });
              const retryBookings = retryResponse?.data?.data || retryResponse?.data || [];
              const updatedBooking = retryBookings.find(b => {
                const bId = b.BookedScheduleId || b.bookedScheduleId;
                return bId && (bId.toString() === bookingId?.toString() || bId === bookingId);
              });
              if (updatedBooking) {
                setBookingInfo(updatedBooking);
                const updatedPaymentStatus = updatedBooking.PaymentStatus || updatedBooking.paymentStatus;
                if (updatedPaymentStatus === 'Paid') {
                  setPaymentStatus('success');
                  setLoading(false);
                  return;
                }
              }
            } catch (err) {
              console.error('[PaymentReturn] Error calling checkPaymentStatus:', err);
              // Nếu có lỗi nhưng URL params vẫn cho thấy success, vẫn hiển thị success
            }
            // Fallback: hiển thị success dựa trên URL params
            setPaymentStatus('success');
            setLoading(false);
            return;
          } else {
            // Không có URL params hoặc không phải success
            // Nếu paymentStatusValue là Pending và không có URL params success, đánh dấu là failed
            setPaymentStatus('failed');
            setLoading(false);
          }
        }
      } else {
        // Nếu không lấy được booking nhưng URL params cho thấy thành công
        if (code === '00' && status === 'PAID') {
          setPaymentStatus('success');
        } else {
          setPaymentStatus('failed');
        }
      }
    } catch (error) {
      console.error('Error checking booking payment status:', error);
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

  const handleGoToHome = () => {
    // Kiểm tra xem user có đăng nhập không trước khi navigate
    try {
      const sessionRaw = localStorage.getItem("session");
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        if (session && (session.account || session.activeEntity)) {
          // User đã đăng nhập, navigate đến newsfeed
          navigate('/customer/newsfeed', { replace: true });
          return;
        }
      }
    } catch (error) {
      console.error('[PaymentReturn] Error checking session:', error);
    }
    // User chưa đăng nhập, navigate đến trang home
    navigate('/', { replace: true });
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
              {type === 'booking' 
                ? 'Booking của bạn đã được thanh toán thành công. Vui lòng chờ performer xác nhận booking.'
                : type === 'table-booking'
                ? 'Đặt bàn của bạn đã được thanh toán cọc thành công. Vui lòng đến quán đúng giờ đã đặt.'
                : 'Yêu cầu quảng cáo của bạn đã được gửi đến admin. Admin sẽ set lên Revive và thông báo lại cho bạn.'}
            </p>
            
            {/* Booking Info */}
            {(type === 'booking' || type === 'table-booking') && bookingInfo && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loại:</span>
                    <span className="font-medium text-gray-900">{bookingInfo.Type || bookingInfo.type || 'Performer'}</span>
                  </div>
                  {(paymentAmount !== null || bookingInfo.TotalAmount !== undefined) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {type === 'table-booking' ? 'Tiền cọc đã thanh toán:' : 'Số tiền cọc:'}
                      </span>
                      <span className="font-medium text-gray-900">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND'
                        }).format(paymentAmount || bookingInfo.TotalAmount || bookingInfo.totalAmount || 0)}
                      </span>
                    </div>
                  )}
                  {bookingInfo.BookingDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ngày:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(bookingInfo.BookingDate || bookingInfo.bookingDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Purchase Info */}
            {type === 'ad-purchase' && purchaseInfo && (
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
                onClick={handleGoToHome}
                className={cn(
                  "w-full px-6 py-3 rounded-lg font-medium text-white transition-colors",
                  "bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                )}
              >
                <span>Về trang chủ</span>
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
                onClick={handleGoToHome}
                className={cn(
                  "w-full px-6 py-3 rounded-lg font-medium text-white transition-colors",
                  "bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                )}
              >
                <span>Về trang chủ</span>
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
              onClick={handleGoToHome}
              className={cn(
                "w-full px-6 py-3 rounded-lg font-medium transition-colors",
                "border border-gray-300 text-gray-700 hover:bg-gray-50"
              )}
            >
              Về trang chủ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

