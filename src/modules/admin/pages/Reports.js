import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";
import { AlertCircle, CheckCircle, Filter, Info, Loader2, RefreshCw, XCircle, Search, Trash2, Ban, Eye } from "lucide-react";
import reportApi from "../../../api/reportApi";
import PostDetailModalForAdmin from "../../feeds/components/modals/PostDetailModalForAdmin";

const TYPE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "post", label: "Post" },
  { value: "Account", label: "Account" },
  { value: "BarPage", label: "BarPage" },
  { value: "BusinessAccount", label: "BusinessAccount" },
];

export default function Reports() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    search: "",
  });
  const [detail, setDetail] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [viewingDetail, setViewingDetail] = useState(null); // { type: 'post' | 'account', data: {...} }
  const [loadingDetail, setLoadingDetail] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const displayStatus = (status) => {
    const normalized = String(status || "Pending");
    return t(`admin.reports.status.${normalized.toLowerCase()}`, { defaultValue: normalized });
  };

  const displayTargetStatus = (status) => {
    if (!status) return "-";
    const normalized = String(status).toLowerCase();
    return t(`admin.reports.targetStatus.${normalized}`, { defaultValue: status });
  };

  const statusOptions = useMemo(() => ([
    { value: "", label: t("common.all", { defaultValue: "Tất cả" }) },
    { value: "Pending", label: displayStatus("Pending") },
    { value: "Review", label: displayStatus("Review") },
    { value: "Resolve", label: displayStatus("Resolve") },
  ]), [t]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await reportApi.getAllReports({
        page,
        limit,
        status: filters.status || undefined,
        targetType: filters.type || undefined,
        search: filters.search || undefined,
      });
      const payload = res?.data || res;
      setReports(payload?.data || payload?.items || payload || []);
      setTotal(payload?.pagination?.total || payload?.total || 0);
    } catch (err) {
      console.error("[AdminReports] Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId, status) => {
    // Prevent downgrading from Resolve back to Review/Pending
    const current = reports.find(r => (r.ReportId || r.reportId) === reportId);
    const currentStatus = current?.Status || current?.status;
    if (currentStatus) {
      if (currentStatus === status) return;
      if (currentStatus === "Resolve" && status === "Review") return;
    }
    try {
      setUpdatingId(reportId);
      await reportApi.updateReportStatus(reportId, status);
      await fetchReports();
      if (detail && (detail.ReportId === reportId || detail.reportId === reportId)) {
        setDetail({ ...detail, Status: status });
      }
    } catch (err) {
      console.error("[AdminReports] Update status failed", err);
      alert("Cập nhật thất bại");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewDetail = async (reportId) => {
    try {
      const res = await reportApi.getReportById(reportId);
      const data = res?.data || res;
      setDetail(data);
      
    } catch (err) {
      console.error("[AdminReports] Detail fetch failed", err);
      alert("Không tải được chi tiết report");
    }
  };

  const handleAction = async (reportId, action) => {
    if (!window.confirm(`Bạn có chắc muốn ${action === "delete_post" ? "xóa bài viết" : action === "ban_account" ? "cấm tài khoản" : action === "resolve" ? "đánh dấu đã xử lý" : "bỏ qua"}?`)) {
      return;
    }
    try {
      setUpdatingId(reportId);
      // adminNote is not sent to backend (Description belongs to user)
      await reportApi.handleReportAction(reportId, action);
      await fetchReports();
      if (detail && (detail.ReportId === reportId || detail.reportId === reportId)) {
        const res = await reportApi.getReportById(reportId);
        const data = res?.data || res;
        setDetail(data);
      }
      alert("Thao tác thành công!");
    } catch (err) {
      console.error("[AdminReports] Action failed", err);
      alert(err.response?.data?.message || "Thao tác thất bại");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewTargetDetail = async () => {
    if (!detail) return;
    const { TargetType, TargetId, originalTargetId, rawDescription, Description, isLegacyPostReport, hasValidPostId, originalPostId } = detail;
    
    try {
      setLoadingDetail(true);
      
      if (TargetType === "post" || TargetType === "Post") {
        // Helper: try to extract original ObjectId from rawDescription JSON or string
        const extractOriginalPostId = () => {
          if (originalPostId) return originalPostId;
          try {
            const parsed = rawDescription ? JSON.parse(rawDescription) : (Description ? JSON.parse(Description) : null);
            if (parsed?.originalPostId) return parsed.originalPostId;
          } catch {
            // not JSON, try regex 24-hex inside rawDescription
            const descText = (rawDescription || Description);
            if (descText && typeof descText === "string") {
              const match = descText.match(/[0-9a-fA-F]{24}/);
              if (match) return match[0];
            }
          }
          return null;
        };
        // Check if this is a legacy report without valid post ID
        if (isLegacyPostReport || (hasValidPostId === false)) {
          // Show a more user-friendly message and allow viewing report details without post
          const shouldContinue = window.confirm(
            "⚠️ Report này được tạo trước khi hệ thống hỗ trợ lưu Post ID.\n\n" +
            "Không thể tải chi tiết bài viết, nhưng bạn vẫn có thể xem thông tin report.\n\n" +
            "Bạn có muốn tiếp tục xem thông tin report không?"
          );
          if (!shouldContinue) {
            setLoadingDetail(false);
            return;
          }
          // Show report info without post detail
          setViewingDetail({ 
            type: "legacy_post_report", 
            data: {
              message: "Không thể tải chi tiết bài viết cho report này.",
              reason: "Report được tạo trước khi hệ thống hỗ trợ lưu Post ID.",
              suggestion: "Vui lòng tạo lại report nếu cần xem chi tiết bài viết."
            }
          });
          setLoadingDetail(false);
          return;
        }
        
        // Use originalTargetId if available (for posts that were normalized to GUID)
        // If originalTargetId is not available, try to extract from rawDescription
        let postId = originalTargetId || TargetId || extractOriginalPostId();
        
        // If TargetId is GUID, try to use originalPostId from rawDescription
        const isGuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(postId));
        if (isGuidFormat) {
          const extracted = extractOriginalPostId();
          if (extracted) {
            postId = extracted;
          }
        }
        
        // Check if postId is valid ObjectId format
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(String(postId).trim());
        if (!isValidObjectId) {
          // Fallback to legacy report handling
          const shouldContinue = window.confirm(
            "⚠️ Không thể tải chi tiết bài viết: Post ID không hợp lệ.\n\n" +
            "Report này có thể được tạo trước khi hệ thống hỗ trợ lưu post ID.\n\n" +
            "Bạn có muốn tiếp tục xem thông tin report không?"
          );
          if (!shouldContinue) {
            setLoadingDetail(false);
            return;
          }
          setViewingDetail({ 
            type: "legacy_post_report", 
            data: {
              message: "Không thể tải chi tiết bài viết cho report này.",
              reason: "Post ID không hợp lệ hoặc report được tạo trước khi hệ thống hỗ trợ lưu Post ID.",
              suggestion: "Vui lòng tạo lại report nếu cần xem chi tiết bài viết."
            }
          });
          setLoadingDetail(false);
          return;
        }
        
        // Set viewingDetail with postId - PostDetailModal will handle fetching
        setViewingDetail({ type: "post", postId: postId });
      } else if (["Account", "BarPage", "BusinessAccount"].includes(TargetType)) {
        // Use targetInfo already populated
        setViewingDetail({ 
          type: "account", 
          data: {
            ...detail.targetInfo,
            targetType: TargetType,
            targetId: TargetId
          }
        });
      }
    } catch (err) {
      console.error("[AdminReports] Failed to load target detail", err);
      const errorMsg = err.response?.data?.message || err.message || "Không thể tải chi tiết đối tượng";
      alert(errorMsg);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.status, filters.type]);

  return (
    <div className={cn("w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6")}>
      <div className={cn("flex items-center justify-between gap-3 mb-6 flex-wrap")}>
        <div className="flex items-center gap-3">
          <AlertCircle className={cn("w-6 h-6 text-primary")} />
          <h1 className={cn("text-2xl md:text-3xl font-bold text-foreground")}>
            {t("admin.reports.title", { defaultValue: "Quản lý báo cáo" })}
          </h1>
        </div>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md",
            "border border-border/30 text-foreground hover:bg-muted/40"
          )}
          onClick={fetchReports}
          disabled={loading}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          {t("common.refresh", { defaultValue: "Làm mới" })}
        </button>
      </div>

      <div className={cn("rounded-lg p-4 bg-card border-[0.5px] border-border/20 mb-4 flex flex-wrap gap-3 items-end")}>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Filter className="w-3 h-3" /> {t("admin.reports.filters.status", { defaultValue: "Trạng thái" })}
          </span>
          <select
            className="border border-border/50 bg-background rounded-md px-3 py-2 text-sm"
            value={filters.status}
            onChange={(e) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, status: e.target.value }));
            }}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Filter className="w-3 h-3" /> {t("admin.reports.filters.type", { defaultValue: "Loại" })}
          </span>
          <select
            className="border border-border/50 bg-background rounded-md px-3 py-2 text-sm"
            value={filters.type}
            onChange={(e) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, type: e.target.value }));
            }}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Search className="w-3 h-3" /> Lý do/Nội dung
          </span>
          <div className="relative">
            <input
              className="w-full border border-border/50 bg-background rounded-md px-3 py-2 text-sm pr-10"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  fetchReports();
                }
              }}
              placeholder="Nhập từ khóa..."
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setPage(1);
                fetchReports();
              }}
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className={cn("rounded-lg bg-card border-[0.5px] border-border/20 overflow-hidden")}>
        <div className={cn("grid grid-cols-12 px-4 py-3 text-sm font-semibold text-muted-foreground border-b border-border/20")}>
          <div className="col-span-3">{t("admin.reports.table.target", { defaultValue: "Đối tượng" })}</div>
          <div className="col-span-3">{t("admin.reports.table.reporter", { defaultValue: "Người báo cáo" })}</div>
          <div className="col-span-2">{t("admin.reports.table.type", { defaultValue: "Loại" })}</div>
          <div className="col-span-2">{t("admin.reports.table.status", { defaultValue: "Trạng thái" })}</div>
          <div className="col-span-2 text-right">{t("admin.reports.table.actions", { defaultValue: "Thao tác" })}</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("common.loading", { defaultValue: "Đang tải..." })}
          </div>
        ) : reports.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            {t("admin.reports.empty", { defaultValue: "Không có báo cáo" })}
          </div>
        ) : (
          reports.map((r) => (
            <div key={r.ReportId || r.reportId} className="grid grid-cols-12 px-4 py-3 border-b border-border/10 text-sm items-center">
              <div className="col-span-3">
                <div className="font-semibold text-foreground">
                  {(() => {
                    // Safely extract target name/content, handling both simple objects and full post objects
                    if (r.targetInfo) {
                      if (typeof r.targetInfo === 'object' && !Array.isArray(r.targetInfo)) {
                        // If targetInfo is a full post object with nested structure, extract name/title
                        if (r.targetInfo.name) return String(r.targetInfo.name);
                        if (r.targetInfo.title) return String(r.targetInfo.title);
                        if (typeof r.targetInfo.content === 'string') {
                          return r.targetInfo.content.substring(0, 50);
                        }
                        // If it's a full post object, don't render it directly
                        if (r.targetInfo.id || r.targetInfo._id) {
                          return r.TargetType || r.targetType || 'Post';
                        }
                      }
                    }
                    return String(r.TargetType || r.targetType || '-');
                  })()}
                </div>
                <div className="text-muted-foreground text-xs break-all">{String(r.TargetId || r.targetId || '-')}</div>
                <div className="text-muted-foreground text-xs line-clamp-2">{String(r.Reason || r.reason || '-')}</div>
              </div>
              <div className="col-span-3">
                <div className="text-foreground text-xs">
                  {r.reporterInfo?.name || `Reporter: ${String(r.ReporterRole || r.reporterRole || '-')}`}
                </div>
                <div className="text-muted-foreground text-xs break-all">{String(r.ReporterId || r.reporterId || '-')}</div>
              </div>
              <div className="col-span-2">
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                  "bg-muted/40 text-foreground"
                )}>
                  {r.TargetType || r.targetType || "-"}
                </span>
              </div>
              <div className="col-span-2">
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                  (r.Status === "Resolve" || r.status === "Resolve") ? "bg-emerald-100 text-emerald-700" :
                  (r.Status === "Review" || r.status === "Review") ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-700"
                )}>
                  {displayStatus(r.Status || r.status || "Pending")}
                </span>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  className="px-3 py-1 rounded-md border text-xs hover:bg-muted/50"
                  onClick={() => handleViewDetail(r.ReportId || r.reportId)}
                >
                  <Info className="w-4 h-4" />
                </button>
                {!(r.Status === "Resolve" || r.status === "Resolve") && (
                  <button
                    type="button"
                    className="px-3 py-1 rounded-md border text-xs hover:bg-muted/50"
                    disabled={updatingId === (r.ReportId || r.reportId)}
                    onClick={() => handleUpdateStatus(r.ReportId || r.reportId, "Resolve")}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                {!(r.Status === "Resolve" || r.status === "Resolve" || r.Status === "Review" || r.status === "Review") && (
                  <button
                    type="button"
                    className="px-3 py-1 rounded-md border text-xs hover:bg-muted/50"
                    disabled={updatingId === (r.ReportId || r.reportId)}
                    onClick={() => handleUpdateStatus(r.ReportId || r.reportId, "Review")}
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
        <span>Trang {page}/{totalPages} — {total} báo cáo</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1 rounded-md border text-xs hover:bg-muted/50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            Trước
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded-md border text-xs hover:bg-muted/50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Sau
          </button>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setDetail(null)}>
          <div
            className="bg-card rounded-lg border border-border/20 w-full max-w-xl md:max-w-2xl p-5 md:p-6 my-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Chi tiết báo cáo</h3>
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setDetail(null)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 text-sm">
              {/* Target Info */}
              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-foreground">
                    {t("admin.reports.detail.targetTitle", { defaultValue: "Đối tượng bị báo cáo:" })}
                  </div>
                  <button
                    type="button"
                    onClick={handleViewTargetDetail}
                    disabled={loadingDetail}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      "bg-primary/10 text-primary hover:bg-primary/20",
                      "flex items-center gap-2 disabled:opacity-50"
                    )}
                  >
                    {loadingDetail ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Đang tải...
                      </>
                    ) : (
                      <>
                        <Eye size={14} />
                        Xem chi tiết
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-muted-foreground">
                      {t("admin.reports.detail.type", { defaultValue: "Loại:" })}
                    </span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                      {detail.TargetType || detail.targetType}
                    </span>
                  </div>
                  {detail.targetInfo && (
                    <>
                      {detail.targetInfo.name && (
                        <div><span className="font-medium text-muted-foreground">Tên:</span> <span className="text-foreground">{detail.targetInfo.name}</span></div>
                      )}
                      {detail.targetInfo.content && typeof detail.targetInfo.content === 'string' && (
                        <div>
                          <span className="font-medium text-muted-foreground">Nội dung:</span>
                          <div className="mt-1 p-2 bg-background rounded text-xs line-clamp-3">{detail.targetInfo.content}</div>
                        </div>
                      )}
                      {detail.targetInfo.status && (
                        <div>
                          <span className="font-medium text-muted-foreground">
                            {t("admin.reports.detail.status", { defaultValue: "Trạng thái:" })}
                          </span>{" "}
                          <span className="text-foreground">
                            {displayTargetStatus(detail.targetInfo.status)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="text-xs text-muted-foreground break-all font-mono">ID: {detail.TargetId || detail.targetId}</div>
                </div>
              </div>

              {/* Reporter Info */}
              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="font-semibold mb-2 text-foreground">
                  {t("admin.reports.detail.reporterTitle", { defaultValue: "Người báo cáo:" })}
                </div>
                <div className="space-y-1.5">
                  {detail.reporterInfo && (
                    <>
                      <div>
                        <span className="font-medium text-muted-foreground">
                          {t("admin.reports.detail.name", { defaultValue: "Tên:" })}
                        </span>{" "}
                        <span className="text-foreground">{detail.reporterInfo.name}</span>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">
                          {t("admin.reports.detail.role", { defaultValue: "Vai trò:" })}
                        </span>{" "}
                        <span className="text-foreground">
                          {detail.reporterInfo.role || detail.ReporterRole || detail.reporterRole}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="text-xs text-muted-foreground break-all font-mono">ID: {detail.ReporterId || detail.reporterId}</div>
                </div>
              </div>

              {/* Reason & Description */}
              <div>
                <div className="font-semibold mb-2">
                  {t("admin.reports.detail.reason", { defaultValue: "Lý do báo cáo:" })}
                </div>
                <div className="pl-4 p-2 bg-muted/30 rounded-md">{detail.Reason || detail.reason}</div>
              </div>
              {detail.Description && (
                <div>
                  <div className="font-semibold mb-2">
                    {t("admin.reports.detail.description", { defaultValue: "Mô tả từ người dùng:" })}
                  </div>
                  <div className="pl-4 p-2 bg-muted/30 rounded-md whitespace-pre-wrap">{detail.Description}</div>
                </div>
              )}

              {/* Status & Metadata */}
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div>
                  <div className="font-semibold mb-1 text-foreground">
                    {t("admin.reports.detail.statusLabel", { defaultValue: "Trạng thái:" })}
                  </div>
                  {(() => {
                    const statusRaw = detail.Status || detail.status || "Pending";
                    const isResolve = statusRaw === "Resolve";
                    const isReview = statusRaw === "Review";
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium",
                          isResolve
                            ? "bg-emerald-100 text-emerald-700"
                            : isReview
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        )}
                      >
                        {displayStatus(statusRaw)}
                      </span>
                    );
                  })()}
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  <div>{t("admin.reports.detail.createdAt", { defaultValue: "Tạo lúc:" })}</div>
                  <div className="font-medium">{new Date(detail.CreatedAt || detail.createdAt).toLocaleString("vi-VN")}</div>
                </div>
              </div>

              {detail.historyReports && detail.historyReports.length > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="font-semibold mb-1 text-blue-700 dark:text-blue-300">
                    {t("admin.reports.detail.historyTitle", { defaultValue: "Lịch sử báo cáo:" })}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    {t("admin.reports.detail.historyText", {
                      defaultValue: "Có {{count}} báo cáo khác cho cùng đối tượng này",
                      count: detail.historyReports.length,
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-border/20">
                <div className="font-semibold mb-3 text-foreground">
                  {t("admin.reports.detail.actions", { defaultValue: "Thao tác:" })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(detail.TargetType === "post" || detail.TargetType === "Post") && detail.Status !== "Resolve" && (
                    <button
                      type="button"
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        "bg-red-600 text-white hover:bg-red-700",
                        "flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                        updatingId === (detail.ReportId || detail.reportId) && "opacity-70"
                      )}
                      disabled={updatingId === (detail.ReportId || detail.reportId)}
                      onClick={() => handleAction(detail.ReportId || detail.reportId, "delete_post")}
                    >
                      <Trash2 size={16} />
                      {t("admin.reports.actions.deletePost", { defaultValue: "Xóa bài viết" })}
                    </button>
                  )}
                  {["Account", "BarPage", "BusinessAccount"].includes(detail.TargetType) && detail.Status !== "Resolve" && (
                    <button
                      type="button"
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        "bg-red-600 text-white hover:bg-red-700",
                        "flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                        updatingId === (detail.ReportId || detail.reportId) && "opacity-70"
                      )}
                      disabled={updatingId === (detail.ReportId || detail.reportId)}
                      onClick={() => handleAction(detail.ReportId || detail.reportId, "ban_account")}
                    >
                      <Ban size={16} />
                      {t("admin.reports.actions.banAccount", { defaultValue: "Cấm tài khoản" })}
                    </button>
                  )}
                  <button
                    type="button"
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      "bg-emerald-600 text-white hover:bg-emerald-700",
                      "flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                      updatingId === (detail.ReportId || detail.reportId) && "opacity-70"
                    )}
                    disabled={updatingId === (detail.ReportId || detail.reportId) || detail.Status === "Resolve"}
                    onClick={() => handleAction(detail.ReportId || detail.reportId, "resolve")}
                  >
                    <CheckCircle size={16} />
                    {t("admin.reports.actions.markResolved", { defaultValue: "Đánh dấu đã xử lý" })}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Detail Modal for Admin - Read-only view */}
      {viewingDetail && viewingDetail.type === "post" && viewingDetail.postId && (
        <PostDetailModalForAdmin
          open={true}
          postId={viewingDetail.postId}
          onClose={() => setViewingDetail(null)}
          title="Chi tiết bài viết"
        />
      )}

      {/* Other Detail Modal (Account, Legacy Report) */}
      {viewingDetail && viewingDetail.type !== "post" && (
        <div className="fixed inset-0 z-[1300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setViewingDetail(null)}>
          <div
            className="bg-card rounded-lg border border-border/20 w-full max-w-3xl p-5 md:p-6 my-6 shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  {viewingDetail.type === "legacy_post_report" 
                    ? "Thông tin Report" 
                    : `Chi tiết ${viewingDetail.type === "account" ? "tài khoản" : ""}`}
                </h3>
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setViewingDetail(null)}
              >
                ✕
              </button>
            </div>

            {viewingDetail.type === "legacy_post_report" && viewingDetail.data && (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-yellow-600 dark:text-yellow-400 text-xl">⚠️</div>
                    <div className="flex-1">
                      <div className="font-semibold mb-2 text-yellow-900 dark:text-yellow-100">
                        {viewingDetail.data.message}
                      </div>
                      <div className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                        <strong>Lý do:</strong> {viewingDetail.data.reason}
                      </div>
                      <div className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Gợi ý:</strong> {viewingDetail.data.suggestion}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-muted/20 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Bạn vẫn có thể xem và xử lý report này, nhưng không thể xem chi tiết bài viết được report.
                  </div>
                </div>
              </div>
            )}

            {viewingDetail.type === "account" && viewingDetail.data && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/20 rounded-lg">
                  <div className="font-semibold mb-3 text-foreground">Thông tin tài khoản:</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground w-24">Loại:</span>
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                        {viewingDetail.data.targetType}
                      </span>
                    </div>
                    {viewingDetail.data.name && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground w-24">Tên:</span>
                        <span className="text-foreground">{viewingDetail.data.name}</span>
                      </div>
                    )}
                    {viewingDetail.data.role && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground w-24">Vai trò:</span>
                        <span className="text-foreground">{viewingDetail.data.role}</span>
                      </div>
                    )}
                    {viewingDetail.data.status && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground w-24">Trạng thái:</span>
                        <span className={cn(
                          "px-2 py-1 rounded text-sm font-medium",
                          viewingDetail.data.status === "Banned" ? "bg-red-100 text-red-700" :
                          viewingDetail.data.status === "active" ? "bg-emerald-100 text-emerald-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {displayTargetStatus(viewingDetail.data.status)}
                        </span>
                      </div>
                    )}
                    {viewingDetail.data.avatar && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground w-24">Avatar:</span>
                        <img 
                          src={viewingDetail.data.avatar} 
                          alt="Avatar" 
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground w-24">ID:</span>
                      <span className="text-xs text-muted-foreground break-all font-mono">{viewingDetail.data.targetId}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
      </div>
        </div>
      )}
    </div>
  );
}
