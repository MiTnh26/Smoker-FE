// src/api/barVoucherApi.js
import axiosClient from "./axiosClient";

const barVoucherApi = {
  // Bar tạo voucher và gửi cho admin
  createVoucher: (voucherData) =>
    axiosClient.post("/bar/vouchers", voucherData),

  // Bar xem danh sách voucher đã tạo
  getMyVouchers: () =>
    axiosClient.get("/bar/vouchers"),
};

export default barVoucherApi;
