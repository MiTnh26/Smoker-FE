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
    axiosClient.get(`/bookingtable/receiver/${receiverId}`, { params })
};

export default bookingApi;