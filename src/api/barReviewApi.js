import axiosClient from "./axiosClient";
const barReviewApi = {
  // Lấy tất cả review
  getAll: () => axiosClient.get("/bar-reviews"),
  // Lấy review theo id
  getById: (id) => axiosClient.get(`/bar-reviews/${id}`),
  // Tạo review mới
  create: (data) => axiosClient.post("/bar-reviews", data),
  // Cập nhật review
  update: (id, data) => axiosClient.put(`/bar-reviews/${id}`, data),
  // Xóa review
  remove: (id) => axiosClient.delete(`/bar-reviews/${id}`),
};

export default barReviewApi;
