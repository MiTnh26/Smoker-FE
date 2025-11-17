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
};

export default adminApi;

