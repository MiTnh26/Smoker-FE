// src/api/bookingApi.js
import axiosClient from "./axiosClient";

const bookingApi = {
  // API từ code hiện tại
  createRequest: (payload) => axiosClient.post("/booking/request", payload),
  getMyBookings: (params) => axiosClient.get("/booking/my", { params }),
  updateStatus: (id, action) => axiosClient.post(`/booking/${id}/${action}`),
  
  // API mới cho booking tables
  getBookingsByBarAndDate: (barId, date) => 
    axiosClient.get(`/booking/bar/${barId}`, { params: { date } }),
  
  createBooking: (bookingData) =>
    axiosClient.post("/booking-tables", bookingData),
  
  getBarDetails: (barId) =>
    axiosClient.get(`/bar-pages/${barId}`),

  // Thêm các API mới cho booking tables
  confirmBooking: (id) => 
    axiosClient.patch(`/booking-tables/${id}/confirm`),
  
  cancelBooking: (id) => 
    axiosClient.patch(`/booking-tables/${id}/cancel`),
  
  getBookingsByBooker: (bookerId, params) => 
    axiosClient.get(`/booking-tables/booker/${bookerId}`, { params }),
  
  getBookingsByReceiver: (receiverId, params) => 
    axiosClient.get(`/booking-tables/receiver/${receiverId}`, { params })
};

export default bookingApi;