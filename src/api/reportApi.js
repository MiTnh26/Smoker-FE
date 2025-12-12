import axiosClient from "./axiosClient";
const reportApi = {
  // Tạo report mới
  createReport: (data) => {
    // data: { ReporterId, ReporterRole, TargetType, TargetId, Reason, ... }
    return axiosClient.post("/reports", data);
  },
  // Lấy tất cả report (admin) với filter/pagination
  getAllReports: (params = {}) => {
    return axiosClient.get("/reports", { params });
  },
  // Lấy report theo id (detail)
  getReportById: (reportId) => {
    return axiosClient.get(`/reports/${reportId}`);
  },
  // Lấy report theo đối tượng bị report
  getReportsByTarget: (targetType, targetId) => {
    return axiosClient.get(`/reports/target/${targetType}/${targetId}`);
  },
  // Cập nhật trạng thái report
  updateReportStatus: (reportId, status) => {
    return axiosClient.patch(`/reports/${reportId}/status`, { status });
  },
  // Xử lý hành động admin (delete post, ban account, etc.)
  handleReportAction: (reportId, action) => {
    return axiosClient.post(`/reports/${reportId}/actions`, { action });
  },
  // Lấy report do 1 user gửi
  getReportsByReporter: (reporterId) => {
    return axiosClient.get(`/reports/reporter/${reporterId}`);
  }
};

export default reportApi;