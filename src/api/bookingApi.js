// src/api/bookingApi.js
import axiosClient from "./axiosClient";

const bookingApi = {
  // API từ code hiện tại
  createRequest: (payload) => axiosClient.post("/booking/request", payload),
  getMyBookings: (params) => axiosClient.get("/booking/my", { params }),
  updateStatus: (id, action) => axiosClient.post(`/booking/${id}/${action}`),
  
  // API cho DJ/Dancer booking requests
  confirmDJBooking: (id) => axiosClient.patch(`/booking/${id}/confirm`),
  cancelDJBooking: (id) => axiosClient.patch(`/booking/${id}/cancel`),
  rejectDJBooking: (id) => axiosClient.patch(`/booking/${id}/reject`),
  
  // API mới cho booking tables với combo
  getBookingsByBarAndDate: (barId, date) =>
    axiosClient.get(`/booking/bar/${barId}`, { params: { date } }),

  // API mới cho combo-based booking
  createBookingWithCombo: (bookingData) =>
    axiosClient.post("/bookingtable/with-combo", bookingData),

  createBooking: (bookingData) =>
    axiosClient.post("/bookingtable", bookingData), // Backward compatibility

  getBarDetails: (barId) =>
    axiosClient.get(`/bar-pages/${barId}`),

  // Booking management APIs
  confirmBooking: (id) =>
    axiosClient.patch(`/bookingtable/${id}/confirm`),

  confirmBookingByQR: (qrData) =>
    axiosClient.post("/bookingtable/confirm-by-qr", { qrData }),

  cancelBooking: (id) =>
    axiosClient.patch(`/bookingtable/${id}/cancel`),

  requestRefund: (id, reason, evidenceUrls) =>
    axiosClient.post(`/bookingtable/${id}/request-refund`, { reason, evidenceUrls }),

  getBookingsByBooker: (bookerId, params) =>
    axiosClient.get(`/bookingtable/booker/${bookerId}`, { params }),

  getBookingsByReceiver: (receiverId, params) =>
    axiosClient.get(`/bookingtable/receiver/${receiverId}`, { params }),

  // Combo & Voucher APIs
  getAvailableCombos: (barId) =>
    axiosClient.get(`/bookingtable/bar/${barId}/available-combos`),

  getAvailableVouchers: (barPageId, minComboValue = 0) =>
    axiosClient.get("/bookingtable/available-vouchers", {
      params: { barPageId, minComboValue }
    }),

  validateBookingData: (data) =>
    axiosClient.post("/bookingtable/validate-booking-data", data),

  // Bar management APIs
  getUnconfirmedBookings: (barId, params) =>
    axiosClient.get(`/bookingtable/bar/${barId}/unconfirmed`, { params }),

  getConfirmedBookings: (barId, params) =>
    axiosClient.get(`/bookingtable/bar/${barId}/confirmed`, { params }),

  // QR Code APIs
  getBookingQRCode: (bookingId) =>
    axiosClient.get(`/bookingtable/${bookingId}/qr-code`),

  scanQRCode: (qrData) =>
    axiosClient.post("/bookingtable/scan-qr", { qrData }),
  
  // API cho DJ/Dancer bookings (not bookingtable)
  getDJBookingsByReceiver: (receiverId, params) => 
    axiosClient.get(`/booking/receiver/${receiverId}`, { params }),
  
  getDJBookingsByBooker: (bookerId, params) => 
    axiosClient.get(`/booking/booker/${bookerId}`, { params }),
  
  // API chính để lấy tất cả bookings (BarTable, DJ, Dancer) với receiverInfo đã join
  getAllBookingsByBooker: (bookerId, params) => 
    axiosClient.get(`/booking/booker/${bookerId}`, { params }),

  // Tạo payment link cho booking
  createPayment: (bookingId, depositAmount) => 
    axiosClient.post(`/booking/${bookingId}/create-payment`, { depositAmount }),

  // Lấy payment link cho booking (tái sử dụng nếu có)
  getPaymentLink: (bookingId) => 
    axiosClient.get(`/booking/${bookingId}/get-payment-link`),

  // Tạo payment link cho table booking (cọc)
  createTablePayment: (bookingId, depositAmount) => 
    axiosClient.post(`/bookingtable/${bookingId}/create-payment`, { depositAmount }),

  // Tạo payment link cho table booking (combo full payment) - truyền số tiền sau giảm từ FE
  createTableFullPayment: (bookingId, { amount, discountPercentages } = {}) =>
    axiosClient.post(`/bookingtable/${bookingId}/create-full-payment`, { amount, discountPercentages }),

  // API mới cho luồng booking với voucher
  createBookingWithVoucher: (bookingData) =>
    axiosClient.post("/bookingtable/with-voucher", bookingData),

  // Bar confirm/reject booking
  confirmBookingByBar: (bookingId) =>
    axiosClient.post(`/bookingtable/bar/bookings/${bookingId}/confirm`),

  rejectBookingByBar: (bookingId, rejectionReason) =>
    axiosClient.post(`/bookingtable/bar/bookings/${bookingId}/reject`, { rejectionReason }),

  getPendingBookings: () =>
    axiosClient.get("/bookingtable/bar/bookings/pending"),

  // Refund request
  requestRefundForBooking: (bookingId, reason) =>
    axiosClient.post(`/booking/${bookingId}/request-refund`, { reason }),

  // Lấy payment link cho table booking (tái sử dụng nếu có)
  getTablePaymentLink: (bookingId) => 
    axiosClient.get(`/bookingtable/${bookingId}/get-payment-link`),

  // Kiểm tra và cập nhật payment status từ PayOS (nếu webhook không được gọi)
  checkPaymentStatus: (bookingId) => 
    axiosClient.post(`/booking/${bookingId}/check-payment`),

  // DJ/Dancer xác nhận đã giao dịch xong
  completeTransaction: (bookingId) => 
    axiosClient.post(`/booking/${bookingId}/complete-transaction`),

  // Đánh dấu đã thanh toán cho table booking
  markPaid: (bookingId) =>
    axiosClient.patch(`/bookingtable/${bookingId}/mark-paid`),

  // Cập nhật status thành Ended cho table booking
  endBooking: (bookingId) =>
    axiosClient.patch(`/bookingtable/${bookingId}/end`),

  // Lấy chi tiết booking theo ID
  getBookingById: (bookingId) =>
    axiosClient.get(`/bookingtable/${bookingId}`),

  // Đánh dấu khách hàng đã tới quán
  markBookingArrived: (bookingId) =>
    axiosClient.patch(`/bookingtable/${bookingId}/mark-arrived`),

  // Lấy voucher theo code (public endpoint)
  getVoucherByCode: (code) =>
    axiosClient.get(`/admin/vouchers/code/${code}`)
};

export default bookingApi;