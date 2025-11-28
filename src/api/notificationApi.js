import axiosClient from "./axiosClient";

const notificationApi = {
  // Lấy danh sách notifications
  getNotifications: (params = {}) => {
    return axiosClient.get("/notifications", { params });
  },

  // Đánh dấu đã đọc
  markAsRead: (notificationId, entityAccountId) => {
    const params = entityAccountId ? { entityAccountId } : {};
    return axiosClient.put(`/notifications/${notificationId}/read`, null, { params });
  },

  // Đánh dấu tất cả đã đọc
  markAllAsRead: (entityAccountId) => {
    const params = entityAccountId ? { entityAccountId } : {};
    return axiosClient.put("/notifications/read-all", null, { params });
  },

  // Lấy số lượng chưa đọc
  getUnreadCount: (entityAccountId) => {
<<<<<<< HEAD
    const params = entityAccountId ? { entityAccountId } : {};
    return axiosClient.get("/notifications/unread-count", { params });
=======
    return axiosClient.get("/notifications/unread-count", {
      params: entityAccountId ? { entityAccountId } : {}
    });
>>>>>>> dotu
  },

  // Tạo notification mới
  createNotification: (data) => {
    return axiosClient.post("/notifications", data);
  },

  // Tạo test notification (for testing)
  createTestNotification: (type) => {
    return axiosClient.post("/notifications/test", { type });
  },
};

export default notificationApi;

