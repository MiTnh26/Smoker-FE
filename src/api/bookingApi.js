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
  
  // API mới cho booking tables
  getBookingsByBarAndDate: (barId, date) => 
    axiosClient.get(`/booking/bar/${barId}`, { params: { date } }),
  
  createBooking: (bookingData) =>
    axiosClient.post("/bookingtable", bookingData),
  
  getBarDetails: (barId) =>
    axiosClient.get(`/bar-pages/${barId}`),

  // Thêm các API mới cho booking tables
  confirmBooking: (id) => 
    axiosClient.patch(`/bookingtable/${id}/confirm`),
  
  cancelBooking: (id) => 
    axiosClient.patch(`/bookingtable/${id}/cancel`),
  
  getBookingsByBooker: (bookerId, params) => 
    axiosClient.get(`/bookingtable/booker/${bookerId}`, { params }),
  
  getBookingsByReceiver: (receiverId, params) => 
    axiosClient.get(`/bookingtable/receiver/${receiverId}`, { params }),
  
  // API cho DJ/Dancer bookings (not bookingtable)
  getDJBookingsByReceiver: (receiverId, params) => 
    axiosClient.get(`/booking/receiver/${receiverId}`, { params }),
  
  getDJBookingsByBooker: (bookerId, params) => 
    axiosClient.get(`/booking/booker/${bookerId}`, { params }),

  // Tạo payment link cho booking
  createPayment: (bookingId, depositAmount) => 
    axiosClient.post(`/booking/${bookingId}/create-payment`, { depositAmount }),

  // Tạo payment link cho table booking (cọc)
  createTablePayment: (bookingId, depositAmount) => 
    axiosClient.post(`/bookingtable/${bookingId}/create-payment`, { depositAmount }),

  // Kiểm tra và cập nhật payment status từ PayOS (nếu webhook không được gọi)
  checkPaymentStatus: (bookingId) => 
    axiosClient.post(`/booking/${bookingId}/check-payment`),

  // DJ/Dancer xác nhận đã giao dịch xong
  completeTransaction: (bookingId) => 
    axiosClient.post(`/booking/${bookingId}/complete-transaction`)
};

export default bookingApi;