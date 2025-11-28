import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";
import { BarChart3, Users, FileText, AlertCircle, TrendingUp } from "lucide-react";

export default function Reports() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  return (
    <div className={cn("w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6")}>
      <div className={cn("flex items-center gap-3 mb-6")}>
        <BarChart3 className={cn("w-6 h-6 text-primary")} />
        <h1 className={cn("text-2xl md:text-3xl font-bold text-foreground")}>
          {t("admin.reports.title", { defaultValue: "Báo cáo & Thống kê" })}
        </h1>
      </div>

      <div className={cn("rounded-lg p-6 bg-card border-[0.5px] border-border/20")}>
        <p className={cn("text-muted-foreground")}>
          Trang báo cáo và thống kê đang được phát triển. Vui lòng quay lại sau.
        </p>
      </div>
    </div>
  );
}
