// src/api/barPageApi.js
import axiosClient from "./axiosClient";

const barPageApi = {
  // Landing page featured bars
  getFeatured(params = {}) {
    return axiosClient.get("/bar", { params });
  },

  // Step 1: Tạo mới Bar Page (không upload file)
  create(payload) {
    return axiosClient.post("/bar/register", payload);
  },

  // Step 2: Upload avatar/background cho Bar Page
  upload(formData) {
    return axiosClient.post("/bar/upload", formData);
  },

  // Step 3: Lấy Bar Page theo AccountId
  getBarPageByAccountId(accountId) {
    return axiosClient.get(`/bar/account/${accountId}`);
  },

  // Step 4: Lấy Bar Page theo  ID
  getBarPageById(barPageId) {
    return axiosClient.get(`/bar/${barPageId}`);
  },

  // Update Bar Page
  updateBarPage(barPageId, payload) {
    return axiosClient.put(`/bar/${barPageId}`, payload);
  },

  // Step 5: Xóa Bar Page
  delete(barPageId) {
    return axiosClient.delete(`/bar/${barPageId}`);
  },


  // Table Classification APIs
  createTableTypes({ barPageId, tableTypes }) {
    return axiosClient.post("/table-classification/", {
      barPageId,
      tableTypes
    });
  },
  getTableTypes(barPageId) {
    return axiosClient.get(`/table-classification/bar/${barPageId}`);
  },
  updateTableTypes(tableClassificationId,payload) {
    return axiosClient.put(`/table-classification/${tableClassificationId}`,payload);
  },
  removeTableTypes(tableClassificationId) {
    return axiosClient.delete(`/table-classification/${tableClassificationId}`);
  },



  // Bar Table APIs
  createTables(tables) {
    return axiosClient.post("/bar-table/multiple", tables);
  },

  getTablesByBar(barId) {
    return axiosClient.get(`/bar-table/bar/${barId}`);
  },

  updateBarTable(tableId, payload) {
    return axiosClient.put(`/bar-table/${tableId}`, payload);
  },


  deleteBarTable(tableId) {
    return axiosClient.delete(`/bar-table/${tableId}`);
  },

};

export default barPageApi;
