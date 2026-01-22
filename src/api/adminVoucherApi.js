// src/api/adminVoucherApi.js
import axiosClient from "./axiosClient";

const adminVoucherApi = {
  // Admin xem danh sách voucher do bar tạo kèm thống kê (có thể filter theo barPageId)
  getBarVouchersWithStats: (barPageId) => {
    const params = barPageId ? { barPageId } : {};
    return axiosClient.get("/admin/vouchers/bar-vouchers", { params });
  },

  // Admin lấy danh sách các bar đã tạo voucher (để filter)
  getBarsWithVouchers: () =>
    axiosClient.get("/admin/vouchers/bar-vouchers/bars"),

  // DEPRECATED: Admin xem danh sách voucher do bar tạo chờ duyệt
  getBarVouchersPending: () =>
    axiosClient.get("/admin/vouchers/bar-vouchers/pending"),

  // DEPRECATED: Admin duyệt voucher từ bar
  approveBarVoucher: (voucherId) =>
    axiosClient.post(`/admin/vouchers/${voucherId}/approve-bar`),

  // DEPRECATED: Admin từ chối voucher từ bar
  rejectBarVoucher: (voucherId, rejectedReason) =>
    axiosClient.post(`/admin/vouchers/${voucherId}/reject-bar`, { rejectedReason }),
};

export default adminVoucherApi;
