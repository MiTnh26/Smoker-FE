// src/api/comboApi.js
import axiosClient from "./axiosClient";

const comboApi = {
  // ✅ Lấy tất cả combo của 1 quán
  getCombosByBar(barPageId) {
    return axiosClient.get(`/combo/bar/${barPageId}`);
  },

  // ✅ Lấy chi tiết combo theo ID
  getComboById(comboId) {
    return axiosClient.get(`/combo/${comboId}`);
  },

  // ✅ Tạo combo mới
  createCombo(payload) {
    // payload: { barPageId, comboName, items, price, description, status }
    return axiosClient.post("/combo", payload);
  },

  // ✅ Cập nhật combo
  updateCombo(comboId, payload) {
    return axiosClient.put(`/combo/${comboId}`, payload);
  },

  // ✅ Xóa combo
  deleteCombo(comboId) {
    return axiosClient.delete(`/combo/${comboId}`);
  },
};

export default comboApi;
