import axiosClient from "./axiosClient";

const bankInfoApi = {
  // ➕ Tạo BankInfo mới
  create(payload) {
    return axiosClient.post("/bank-info", payload);
  },

  // 📖 Lấy BankInfo theo ID
  getById(bankInfoId) {
    return axiosClient.get(`/bank-info/${bankInfoId}`);
  },

  // 📖 Lấy BankInfo theo AccountId
  getByAccountId(accountId) {
    return axiosClient.get(`/bank-info/account/${accountId}`);
  },

  // 📖 Lấy BankInfo theo BarPageId
  getByBarPageId(barPageId) {
    return axiosClient.get(`/bank-info/bar/${barPageId}`);
  },

  // ✏️ Cập nhật BankInfo
  update(bankInfoId, payload) {
    return axiosClient.put(`/bank-info/${bankInfoId}`, payload);
  },

  // 🗑️ Xóa BankInfo
  delete(bankInfoId) {
    return axiosClient.delete(`/bank-info/${bankInfoId}`);
  },
};

export default bankInfoApi;

