import axiosClient from "./axiosClient";
const userReviewApi = {
  // Lấy tất cả review
  getAll: () => axiosClient.get("/user-reviews"),
  // Lấy review theo business (DJ/Dancer)
  getByBusiness: (businessAccountId) =>
    axiosClient.get(`/user-reviews/business/${businessAccountId}`),
  // Lấy review theo id
  getById: (id) => axiosClient.get(`/user-reviews/${id}`),
  // Tạo review mới
  create: (data) => axiosClient.post("/user-reviews", data),
  // Cập nhật review
  update: (id, data) => axiosClient.put(`/user-reviews/${id}`, data),
  // Xóa review
  remove: (id) => axiosClient.delete(`/user-reviews/${id}`),
};

export default userReviewApi;
