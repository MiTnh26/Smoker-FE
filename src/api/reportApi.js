import axiosClient from "./axiosClient";
const reportApi = {
  // Tạo report mới
  createReport: (data) => {
    // data: { ReporterId, ReporterRole, TargetType, TargetId, Reason, ... }
    return axiosClient.post("/api/report/", data);
  },
  // Lấy tất cả report (admin)
  getAllReports: () => {
    return axiosClient.get("/api/report/");
  },
  // Lấy report theo đối tượng bị report
  getReportsByTarget: (targetType, targetId) => {
    return axiosClient.get(`/api/report/target/${targetType}/${targetId}`);
  },
  // Cập nhật trạng thái report
  updateReportStatus: (reportId, status) => {
    return axiosClient.patch(`/api/report/${reportId}/status`, { status });
  },
  // Lấy report do 1 user gửi
  getReportsByReporter: (reporterId) => {
    return axiosClient.get(`/api/report/reporter/${reporterId}`);
  }
};

export default reportApi;