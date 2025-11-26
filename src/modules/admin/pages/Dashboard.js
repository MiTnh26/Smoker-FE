import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";
import adminApi from "../../../api/adminApi";

function StatCard({ title, value, hint }) {
  return (
    <div className={cn(
      "rounded-lg p-4",
      "bg-card border-[0.5px] border-border/20",
      "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
    )}>
      <p className={cn("m-0 text-sm text-muted-foreground")}>{title}</p>
      <h3 className={cn("m-0 mt-1 text-2xl font-bold text-foreground")}>{value}</h3>
      {hint && <p className={cn("m-0 mt-1 text-xs text-muted-foreground")}>{hint}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ users: 0, bars: 0, events: 0, songs: 0, reportsPending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await adminApi.getStats();
        const data = res?.data || res || {};
        setStats({
          users: data.users || 0,
          bars: data.bars || 0,
          events: data.events || 0,
          songs: data.songs || 0,
          reportsPending: data.reportsPending || 0,
        });
      } catch (e) {
        console.error("Failed to load admin stats", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className={cn("w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6")}> 
      <h1 className={cn("text-2xl md:text-3xl font-bold text-foreground mb-4")}>
        {t("admin.dashboard.title", { defaultValue: "Admin Dashboard" })}
      </h1>

      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6")}> 
        <StatCard title={t("admin.dashboard.totalUsers", { defaultValue: "Total Users" })} value={loading ? "—" : stats.users} />
        <StatCard title={t("admin.dashboard.totalBars", { defaultValue: "Total Bars" })} value={loading ? "—" : stats.bars} />
        <StatCard title={t("admin.dashboard.totalEvents", { defaultValue: "Total Events" })} value={loading ? "—" : stats.events} />
        <StatCard title={t("admin.dashboard.songs", { defaultValue: "Songs" })} value={loading ? "—" : stats.songs} />
        <StatCard title={t("admin.dashboard.pendingReports", { defaultValue: "Pending Reports" })} value={loading ? "—" : stats.reportsPending} />
      </div>

      <div className={cn(
        "rounded-lg p-4",
        "bg-card border-[0.5px] border-border/20",
        "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
      )}>
        <h2 className={cn("text-lg font-semibold text-foreground mb-2")}>{t("admin.dashboard.activity", { defaultValue: "Recent Activity" })}</h2>
        <p className={cn("text-sm text-muted-foreground")}>{t("admin.dashboard.activityHint", { defaultValue: "Charts and activity logs will be displayed here." })}</p>
      </div>
    </div>
  );
}

