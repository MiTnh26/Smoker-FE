// src/api/refundRequestApi.js
import axiosClient from "./axiosClient";

const refundRequestApi = {
  // Người dùng yêu cầu hoàn tiền
  createRefundRequest: (bookingId, reason) =>
    axiosClient.post(`/booking/${bookingId}/request-refund`, { reason }),

  // Kế toán xem danh sách yêu cầu hoàn tiền
  getRefundRequests: (params) =>
    axiosClient.get("/accountant/refund-requests", { params }),

  // Kế toán gán refund request cho mình
  assignRefundRequest: (refundRequestId) =>
    axiosClient.post(`/accountant/refund-requests/${refundRequestId}/assign`),

  // Kế toán xử lý hoàn tiền (upload minh chứng)
  processRefund: (refundRequestId, data) =>
    axiosClient.post(`/accountant/refund-requests/${refundRequestId}/process`, data),
};

export default refundRequestApi;
