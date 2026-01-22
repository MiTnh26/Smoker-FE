// src/api/voucherDistributionApi.js
import axiosClient from "./axiosClient";

const voucherDistributionApi = {
  // Admin phân phối voucher cho người dùng khi đặt bàn
  distributeVoucher: (distributionData) =>
    axiosClient.post("/admin/voucher-distributions", distributionData),

  // Lấy danh sách distributions
  getDistributions: (params) =>
    axiosClient.get("/admin/voucher-distributions", { params }),
};

export default voucherDistributionApi;
