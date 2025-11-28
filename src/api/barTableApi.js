// src/api/barTableApi.js
import axiosClient from "./axiosClient";

const barTableApi = {
  // Lấy danh sách bàn theo barId
  getTablesByBar(barId) {
    return axiosClient.get(`/bar-table/bar/${barId}`);
  }
};

export default barTableApi;
