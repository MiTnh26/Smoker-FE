import axiosClient from "./axiosClient";

const barEventApi = {
  // Lấy event của bar hiện tại
  getEventsByBarId: (barPageId, params = {}) =>
    axiosClient.get(`/events/bar/${barPageId}`, { params }),

  // Lấy tất cả event (dùng cho tab "Các bar khác")
  getAllEvents: (params = {}) =>
    axiosClient.get("/events/getall", { params }),

  // Tìm kiếm event
  searchEvents: (params = {}) =>
    axiosClient.get("/events/search", { params }),

  // Lấy chi tiết event
  getEventDetail: (eventId) =>
    axiosClient.get(`/events/detail/${eventId}`),

  // Tạo event mới
  createEvent: (formData) =>
    axiosClient.post("/events", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Sửa event
// barEventApi.js - sửa lại updateEvent
updateEvent: (eventId, formData) => {
  // Nếu là FormData (có file), gửi với multipart
  if (formData instanceof FormData) {
    return axiosClient.put(`/events/${eventId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } else {
    // Nếu là JSON object, gửi với application/json
    return axiosClient.put(`/events/${eventId}`, formData);
  }
},

  // Xóa event
  deleteEvent: (eventId) =>
    axiosClient.delete(`/events/${eventId}`),

  // Ẩn / Hiện event
  toggleEventStatus: (eventId) =>
    axiosClient.patch(`/events/toggle/${eventId}`),

  // Gửi yêu cầu quảng cáo event
  createEventAdvertisement: (data) =>
    axiosClient.post("/event-advertisements", data),
};

export default barEventApi;