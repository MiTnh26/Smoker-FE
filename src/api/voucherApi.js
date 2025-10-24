import axiosClient from "./axiosClient";

const voucherApi = {
  // Voucher APIs
  getVouchers(barPageId) {
    return axiosClient.get(`/voucher/bar/${barPageId}`);
  },
  getVoucherById(voucherId) {
    return axiosClient.get(`/voucher/${voucherId}`);
  },
  createVoucher(payload) {
    return axiosClient.post("/voucher", payload);
  },
  updateVoucher(voucherId, payload) {
    return axiosClient.put(`/voucher/${voucherId}`, payload);
  },
  deleteVoucher(voucherId) {
    return axiosClient.delete(`/voucher/${voucherId}`);
  },

  // Voucher Apply APIs
  getVoucherApplies() {
    return axiosClient.get("/voucher-apply");
  },
  getVoucherApplyById(id) {
    return axiosClient.get(`/voucher-apply/${id}`);
  },
  createVoucherApply(payload) {
    return axiosClient.post("/voucher-apply", payload);
  },
  updateVoucherApply(id, payload) {
    return axiosClient.put(`/voucher-apply/${id}`, payload);
  },
  deleteVoucherApply(id) {
    return axiosClient.delete(`/voucher-apply/${id}`);
  },
};

export default voucherApi;
