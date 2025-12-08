import axiosClient from "./axiosClient";

const adminApi = {
  getStats: () => axiosClient.get("/admin/stats"),
  getUsers: (params) => axiosClient.get("/admin/users", { params }),
  getPendingRegistrations: () => axiosClient.get("/admin/registrations/pending"),
  updateUserStatus: (id, status) => axiosClient.patch(`/admin/users/${id}/status`, { status }),
  updateUserRole: (id, role) => axiosClient.patch(`/admin/users/${id}/role`, { role }),
  updateBusinessStatus: (businessId, status) => axiosClient.patch(`/admin/business/${businessId}/status`, { status }),
  updateBarStatus: (barId, status) => axiosClient.patch(`/admin/bar/${barId}/status`, { status }),
  getUserBusinesses: (accountId) => axiosClient.get(`/admin/users/${accountId}/businesses`),

  // Ad Packages Management
  getAdPackages: () => axiosClient.get("/admin/ads/packages"),
  getAdPackageById: (packageId) => axiosClient.get(`/admin/ads/packages/${packageId}`),
  createAdPackage: (data) => axiosClient.post("/admin/ads/packages", data),
  updateAdPackage: (packageId, data) => axiosClient.put(`/admin/ads/packages/${packageId}`, data),
  deleteAdPackage: (packageId) => axiosClient.delete(`/admin/ads/packages/${packageId}`),
  getAdPackageStats: () => axiosClient.get("/admin/ads/packages/stats"),

  // Event Purchases Management
  getPendingEventPurchases: (params) => axiosClient.get("/admin/ads/event-purchases/pending", { params }),
  getAllEventPurchases: (params) => axiosClient.get("/admin/ads/event-purchases", { params }),
  approveEventPurchase: (purchaseId, data) => axiosClient.post(`/admin/ads/event-purchases/${purchaseId}/approve`, data),

  // Pause Requests Management
  getPauseRequests: (params) => axiosClient.get("/admin/ads/pause-requests", { params }),
  getPauseRequestById: (pauseRequestId) => axiosClient.get(`/admin/ads/pause-requests/${pauseRequestId}`),
  approvePauseRequest: (pauseRequestId, data) => axiosClient.post(`/admin/ads/pause-requests/${pauseRequestId}/approve`, data),
  rejectPauseRequest: (pauseRequestId, data) => axiosClient.post(`/admin/ads/pause-requests/${pauseRequestId}/reject`, data),
  completePauseRequest: (pauseRequestId) => axiosClient.post(`/admin/ads/pause-requests/${pauseRequestId}/complete`),

  // Resume Requests Management
  getResumeRequests: (params) => axiosClient.get("/admin/ads/resume-requests", { params }),
  getResumeRequestById: (resumeRequestId) => axiosClient.get(`/admin/ads/resume-requests/${resumeRequestId}`),
  approveResumeRequest: (resumeRequestId, data) => axiosClient.post(`/admin/ads/resume-requests/${resumeRequestId}/approve`, data),
  rejectResumeRequest: (resumeRequestId, data) => axiosClient.post(`/admin/ads/resume-requests/${resumeRequestId}/reject`, data),
  completeResumeRequest: (resumeRequestId) => axiosClient.post(`/admin/ads/resume-requests/${resumeRequestId}/complete`),

  // Refund Requests Management
  getRefundRequests: (params) => axiosClient.get("/admin/refund-requests", { params }),
  updateRefundStatus: (bookedScheduleId, refundStatus) => 
    axiosClient.patch(`/admin/refund-requests/${bookedScheduleId}/status`, { refundStatus }),
};

export default adminApi;

