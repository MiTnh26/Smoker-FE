import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../utils/cn";
import accountantApi from "../../../api/accountantApi";
import { DollarSign, Clock, CheckCircle, XCircle, TrendingUp, ArrowRight } from "lucide-react";

function StatCard({ title, value, icon: Icon, color = "primary" }) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-green-500/10 text-green-500",
    warning: "bg-yellow-500/10 text-yellow-500",
    danger: "bg-red-500/10 text-red-500",
  };

  return (
    <div className={cn(
      "rounded-lg p-4",
      "bg-card border-[0.5px] border-border/20",
      "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
    )}>
      <div className={cn("flex items-center justify-between mb-2")}>
        <p className={cn("m-0 text-sm text-muted-foreground")}>{title}</p>
        {Icon && (
          <div className={cn("p-2 rounded-lg", colorClasses[color])}>
            <Icon size={20} />
          </div>
        )}
      </div>
      <h3 className={cn("m-0 text-2xl font-bold text-foreground")}>{value}</h3>
    </div>
  );
}

export default function AccountantDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingWithdraws: 0,
    approvedWithdraws: 0,
    totalWithdrawAmount: 0,
    pendingRefunds: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Load withdraw requests
      const withdrawRes = await accountantApi.getWithdrawRequests({ limit: 1000 });
      
      // Parse response - same format as ManageWithdrawRequests
      // Backend returns: { status: "success", data: { requests: [...] } }
      // Axios wraps: { data: { status: "success", data: { requests: [...] } } }
      let withdraws = [];
      if (withdrawRes?.status === 'success' && withdrawRes?.data?.requests) {
        withdraws = Array.isArray(withdrawRes.data.requests) ? withdrawRes.data.requests : [];
      } else if (withdrawRes?.data?.status === 'success' && withdrawRes?.data?.data?.requests) {
        withdraws = Array.isArray(withdrawRes.data.data.requests) ? withdrawRes.data.data.requests : [];
      } else if (Array.isArray(withdrawRes?.data)) {
        withdraws = withdrawRes.data;
      }
      
      // Load refund requests
      const refundRes = await accountantApi.getRefundRequests({ limit: 1000 });
      console.log("[AccountantDashboard] Refund response:", refundRes);
      
      let refunds = [];
      if (refundRes?.success && refundRes?.data) {
        refunds = Array.isArray(refundRes.data) ? refundRes.data : [];
      } else if (refundRes?.data) {
        refunds = Array.isArray(refundRes.data) ? refundRes.data : [];
      } else if (Array.isArray(refundRes)) {
        refunds = refundRes;
      }

      const pendingWithdraws = withdraws.filter(r => r.status === 'pending' || r.Status === 'pending').length;
      const approvedWithdraws = withdraws.filter(r => r.status === 'approved' || r.Status === 'approved').length;
      const totalWithdrawAmount = withdraws
        .filter(r => {
          const status = r.status || r.Status;
          return status === 'pending' || status === 'approved';
        })
        .reduce((sum, r) => sum + (parseFloat(r.amount || r.Amount) || 0), 0);
      
      const pendingRefunds = refunds.filter(r => 
        (r.refundStatus === 'Pending' || r.RefundStatus === 'Pending')
      ).length;

      setStats({
        pendingWithdraws,
        approvedWithdraws,
        totalWithdrawAmount,
        pendingRefunds,
      });
    } catch (e) {
      console.error("Failed to load accountant stats", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6")}>
      <h1 className={cn("text-2xl md:text-3xl font-bold text-foreground mb-6")}>
        Dashboard Kế toán
      </h1>

      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6")}>
        <div className={cn("relative")}>
          <StatCard
            title="Yêu cầu rút tiền chờ duyệt"
            value={loading ? "—" : stats.pendingWithdraws}
            icon={Clock}
            color="warning"
          />
          <button
            onClick={() => navigate("/accountant/withdraw-requests?status=pending")}
            className={cn(
              "absolute bottom-4 right-4",
              "px-3 py-1.5 rounded-lg text-xs font-medium",
              "bg-warning/10 text-warning hover:bg-warning/20",
              "flex items-center gap-1.5 transition-all"
            )}
          >
            Xem chi tiết
            <ArrowRight size={14} />
          </button>
        </div>
        <div className={cn("relative")}>
          <StatCard
            title="Yêu cầu rút tiền đã duyệt"
            value={loading ? "—" : stats.approvedWithdraws}
            icon={CheckCircle}
            color="success"
          />
          <button
            onClick={() => navigate("/accountant/withdraw-requests?status=approved")}
            className={cn(
              "absolute bottom-4 right-4",
              "px-3 py-1.5 rounded-lg text-xs font-medium",
              "bg-green-500/10 text-green-500 hover:bg-green-500/20",
              "flex items-center gap-1.5 transition-all"
            )}
          >
            Xem chi tiết
            <ArrowRight size={14} />
          </button>
        </div>
        <StatCard
          title="Tổng tiền cần xử lý"
          value={loading ? "—" : `${Number(stats.totalWithdrawAmount).toLocaleString('vi-VN')} đ`}
          icon={DollarSign}
          color="primary"
        />
        <div className={cn("relative")}>
          <StatCard
            title="Yêu cầu hoàn tiền chờ xử lý"
            value={loading ? "—" : stats.pendingRefunds}
            icon={TrendingUp}
            color="warning"
          />
          <button
            onClick={() => navigate("/accountant/refund-requests")}
            className={cn(
              "absolute bottom-4 right-4",
              "px-3 py-1.5 rounded-lg text-xs font-medium",
              "bg-warning/10 text-warning hover:bg-warning/20",
              "flex items-center gap-1.5 transition-all"
            )}
          >
            Xem chi tiết
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={cn("mb-6 grid grid-cols-1 md:grid-cols-2 gap-4")}>
        <button
          onClick={() => navigate("/accountant/withdraw-requests")}
          className={cn(
            "p-6 rounded-xl border border-border/20 bg-card",
            "hover:border-primary/20 hover:shadow-md transition-all",
            "text-left"
          )}
        >
          <div className={cn("flex items-center justify-between")}>
            <div>
              <h3 className={cn("text-lg font-semibold mb-2")}>
                Quản lý yêu cầu rút tiền
              </h3>
              <p className={cn("text-sm text-muted-foreground")}>
                Duyệt hoặc từ chối yêu cầu rút tiền từ người dùng
              </p>
            </div>
            <div className={cn("p-3 rounded-lg bg-primary/10")}>
              <DollarSign className={cn("w-6 h-6 text-primary")} />
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate("/accountant/refund-requests")}
          className={cn(
            "p-6 rounded-xl border border-border/20 bg-card",
            "hover:border-primary/20 hover:shadow-md transition-all",
            "text-left"
          )}
        >
          <div className={cn("flex items-center justify-between")}>
            <div>
              <h3 className={cn("text-lg font-semibold mb-2")}>
                Quản lý yêu cầu hoàn tiền
              </h3>
              <p className={cn("text-sm text-muted-foreground")}>
                Xử lý yêu cầu hoàn tiền cho các booking
              </p>
            </div>
            <div className={cn("p-3 rounded-lg bg-warning/10")}>
              <TrendingUp className={cn("w-6 h-6 text-warning")} />
            </div>
          </div>
        </button>
      </div>

      <div className={cn("mt-6 bg-card rounded-xl p-6 border border-border/20")}>
        <h2 className={cn("text-lg font-semibold mb-4")}>
          Hướng dẫn sử dụng
        </h2>
        <ul className={cn("space-y-2 text-sm text-muted-foreground")}>
          <li>• Xem và duyệt yêu cầu rút tiền từ người dùng</li>
          <li>• Xử lý yêu cầu hoàn tiền cho các booking</li>
          <li>• Đánh dấu đã chuyển tiền sau khi hoàn tất giao dịch</li>
        </ul>
      </div>
    </div>
  );
}

