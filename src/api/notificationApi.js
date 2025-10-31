import axiosClient from "./axiosClient";

const notificationApi = {
  // Lấy danh sách notifications
  getNotifications: (params) => {
    return axiosClient.get("/notifications", { params });
  },

  // Đánh dấu đã đọc
  markAsRead: (notificationId) => {
    return axiosClient.put(`/notifications/${notificationId}/read`);
  },

  // Đánh dấu tất cả đã đọc
  markAllAsRead: () => {
    return axiosClient.put("/notifications/read-all");
  },

  // Lấy số lượng chưa đọc
  getUnreadCount: () => {
    return axiosClient.get("/notifications/unread-count");
  },

  // Tạo notification mới
  createNotification: (data) => {
    return axiosClient.post("/notifications", data);
  },
};

export default notificationApi;

