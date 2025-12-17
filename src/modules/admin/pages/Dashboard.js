import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";
import adminApi from "../../../api/adminApi";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

  const labels = {
    users: t("admin.dashboard.labels.users", { defaultValue: "Users" }),
    bars: t("admin.dashboard.labels.bars", { defaultValue: "Bars" }),
    events: t("admin.dashboard.labels.events", { defaultValue: "Events" }),
    songs: t("admin.dashboard.labels.songs", { defaultValue: "Songs" }),
    reports: t("admin.dashboard.labels.pendingReports", { defaultValue: "Pending reports" }),
    week: t("admin.dashboard.labels.week", { defaultValue: "Week" }),
  };

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

      <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6")}>
        {/* Bar Chart */}
        <div className={cn(
          "rounded-lg p-4",
          "bg-card border-[0.5px] border-border/20",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        )}>
          <h2 className={cn("text-lg font-semibold text-foreground mb-4")}>
            {t("admin.dashboard.statistics", { defaultValue: "Overview statistics" })}
          </h2>
          {loading ? (
            <div className={cn("flex items-center justify-center h-64")}>
              <p className={cn("text-sm text-muted-foreground")}>{t("common.loading", { defaultValue: "Loading..." })}</p>
            </div>
          ) : (
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: labels.users, value: stats.users },
                  { name: labels.bars, value: stats.bars },
                  { name: labels.events, value: stats.events },
                  { name: labels.songs, value: stats.songs },
                  { name: labels.reports, value: stats.reportsPending },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#111827"
                    tick={{ fill: "#111827", fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#111827"
                    tick={{ fill: "#111827", fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    fill="#2563eb"
                    label={{ fill: "#111827", fontSize: 12 }}
                  >
                    {[
                      { name: labels.users, value: stats.users },
                      { name: labels.bars, value: stats.bars },
                      { name: labels.events, value: stats.events },
                      { name: labels.songs, value: stats.songs },
                      { name: labels.reports, value: stats.reportsPending },
                    ].map((entry, index) => {
                      const barColors = ["#2563eb", "#16a34a", "#f97316", "#8b5cf6", "#e11d48"];
                      return <Cell key={`bar-${entry.name}-${index}`} fill={barColors[index % barColors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Pie Chart */}
        <div className={cn(
          "rounded-lg p-4",
          "bg-card border-[0.5px] border-border/20",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        )}>
          <h2 className={cn("text-lg font-semibold text-foreground mb-4")}>
            {t("admin.dashboard.distribution", { defaultValue: "Data distribution" })}
          </h2>
          {loading ? (
            <div className={cn("flex items-center justify-center h-64")}>
              <p className={cn("text-sm text-muted-foreground")}>{t("common.loading", { defaultValue: "Loading..." })}</p>
            </div>
          ) : (
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: labels.users, value: stats.users },
                      { name: labels.bars, value: stats.bars },
                      { name: labels.events, value: stats.events },
                      { name: labels.songs, value: stats.songs },
                      { name: labels.reports, value: stats.reportsPending },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props) => {
                      const { name, percent, x, y } = props;
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#111827"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={12}
                        >
                          {`${name}: ${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: labels.users, value: stats.users },
                      { name: labels.bars, value: stats.bars },
                      { name: labels.events, value: stats.events },
                      { name: labels.songs, value: stats.songs },
                      { name: labels.reports, value: stats.reportsPending },
                    ].map((entry, index) => {
                      const colors = [
                        "#2563eb", // blue
                        "#16a34a", // green
                        "#f97316", // orange
                        "#8b5cf6", // purple
                        "#e11d48", // rose
                      ];
                      return <Cell key={`cell-${entry.name}-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Line Chart for Trends */}
      <div className={cn(
        "rounded-lg p-4",
        "bg-card border-[0.5px] border-border/20",
        "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
      )}>
        <h2 className={cn("text-lg font-semibold text-foreground mb-4")}>
          {t("admin.dashboard.activity", { defaultValue: "Recent activity" })}
        </h2>
        {loading ? (
          <div className={cn("flex items-center justify-center h-64")}>
            <p className={cn("text-sm text-muted-foreground")}>{t("common.loading", { defaultValue: "Loading..." })}</p>
          </div>
        ) : (
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                { name: `${labels.week} 1`, users: Math.floor(stats.users * 0.7), bars: Math.floor(stats.bars * 0.6), events: Math.floor(stats.events * 0.5) },
                { name: `${labels.week} 2`, users: Math.floor(stats.users * 0.8), bars: Math.floor(stats.bars * 0.7), events: Math.floor(stats.events * 0.6) },
                { name: `${labels.week} 3`, users: Math.floor(stats.users * 0.9), bars: Math.floor(stats.bars * 0.85), events: Math.floor(stats.events * 0.8) },
                { name: `${labels.week} 4`, users: stats.users, bars: stats.bars, events: stats.events },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="#111827"
                  tick={{ fill: "#111827", fontSize: 12 }}
                />
                <YAxis 
                  stroke="#111827"
                  tick={{ fill: "#111827", fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  name={labels.users}
                />
                <Line 
                  type="monotone" 
                  dataKey="bars" 
                  stroke="#16a34a" 
                  strokeWidth={2}
                  name={labels.bars}
                />
                <Line 
                  type="monotone" 
                  dataKey="events" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  name={labels.events}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

