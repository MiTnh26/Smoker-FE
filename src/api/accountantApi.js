import axiosClient from "./axiosClient";

const accountantApi = {
  // Withdraw Requests Management
  getWithdrawRequests: (params) => 
    axiosClient.get("/admin/wallet/withdraw-requests", { params }),
  getWithdrawRequestById: (withdrawRequestId) => 
    axiosClient.get(`/admin/wallet/withdraw-requests/${withdrawRequestId}`),
  approveWithdrawRequest: (withdrawRequestId, data) => 
    axiosClient.post(`/admin/wallet/withdraw-requests/${withdrawRequestId}/approve`, data),
  rejectWithdrawRequest: (withdrawRequestId, data) => 
    axiosClient.post(`/admin/wallet/withdraw-requests/${withdrawRequestId}/reject`, data),

  // Refund Requests Management
  getRefundRequests: (params) => 
    axiosClient.get("/admin/refund-requests", { params }),
  updateRefundStatus: (bookedScheduleId, refundStatus) => 
    axiosClient.patch(`/admin/refund-requests/${bookedScheduleId}/status`, { refundStatus }),
};

export default accountantApi;

