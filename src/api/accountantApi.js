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
    axiosClient.get("/accountant/refund-requests", { params }),
  assignRefundRequest: (refundRequestId) =>
    axiosClient.post(`/accountant/refund-requests/${refundRequestId}/assign`),
  processRefund: (refundRequestId, data) =>
    axiosClient.post(`/accountant/refund-requests/${refundRequestId}/process`, data),
};

export default accountantApi;

