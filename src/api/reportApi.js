import axiosClient from "./axiosClient";
const reportApi = {
  // Tạo report mới
  createReport: (data) => {
    // data: { ReporterId, ReporterRole, TargetType, TargetId, Reason, ... }
    return axiosClient.post("/report/", data);
  },
  // Lấy tất cả report (admin)
  getAllReports: () => {
    return axiosClient.get("/report/");
  },
  // Lấy report theo đối tượng bị report
  getReportsByTarget: (targetType, targetId) => {
    return axiosClient.get(`/report/target/${targetType}/${targetId}`);
  },
  // Cập nhật trạng thái report
  updateReportStatus: (reportId, status) => {
    return axiosClient.patch(`/report/${reportId}/status`, { status });
  },
  // Lấy report do 1 user gửi
  getReportsByReporter: (reporterId) => {
    return axiosClient.get(`/report/reporter/${reporterId}`);
  }
};

export default reportApi;