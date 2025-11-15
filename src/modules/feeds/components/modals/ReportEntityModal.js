import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import reportApi from "../../../../api/reportApi";
import { useAuth } from "../../../../hooks/useAuth";
import { cn } from "../../../../utils/cn";

const DEFAULT_REASON_KEY = "spam";

export default function ReportEntityModal({
  open,
  entityId,
  entityType,
  entityName,
  onClose,
  onSubmitted,
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reasonKey, setReasonKey] = useState(DEFAULT_REASON_KEY);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const session = useMemo(() => {
    try {
      const raw = localStorage.getItem("session");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("[ReportEntityModal] Failed to parse session", error);
      return null;
    }
  }, []);

  const isGuid = (value) =>
    typeof value === "string" &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      value.trim()
    );

  const normalizeGuid = (value) => {
    if (!value || typeof value !== "string") return null;
    const trimmed = value.trim();
    return isGuid(trimmed) ? trimmed.toLowerCase() : null;
  };

  const reporterRole =
    user?.role ||
    session?.account?.role ||
    session?.account?.Role ||
    session?.activeEntity?.role ||
    "customer";

  const reporterEntityAccountId =
    (session?.activeEntity?.EntityAccountId ||
      session?.activeEntity?.entityAccountId ||
      session?.account?.EntityAccountId ||
      session?.account?.entityAccountId ||
      null)?.toString()?.toLowerCase() || null;

  const reporterCandidates = [
    user?.accountId,
    user?.id,
    session?.account?.AccountId,
    session?.account?.accountId,
    session?.account?.id,
    session?.accountId,
    session?.tokenAccountId,
    session?.activeEntity?.AccountId,
    session?.activeEntity?.accountId,
  ].filter((value) => {
    if (!value) return false;
    const valueStr = String(
      typeof value === "object" && value !== null && value.AccountId
        ? value.AccountId
        : value
    ).toLowerCase();
    return !reporterEntityAccountId || valueStr !== reporterEntityAccountId;
  });

  const normalizeCandidateList = (candidates) =>
    candidates
      .filter(Boolean)
      .map((value) => {
        if (typeof value === "string") return value;
        if (typeof value === "object" && value !== null) {
          if (value.AccountId) return value.AccountId;
          if (value.id) return value.id;
        }
        return null;
      })
      .filter(Boolean)
      .map((value) => normalizeGuid(String(value)))
      .find(Boolean);

  const targetOwnerGuid = normalizeGuid(entityId);
  const reasonOptions = useMemo(
    () => [
      { value: "spam", label: t("modal.reportReasonOptions.spam") },
      { value: "violence", label: t("modal.reportReasonOptions.violence") },
      { value: "harassment", label: t("modal.reportReasonOptions.harassment") },
      { value: "adult", label: t("modal.reportReasonOptions.adult") },
      { value: "fraud", label: t("modal.reportReasonOptions.fraud") },
      { value: "other", label: t("modal.reportReasonOptions.other") },
    ],
    [t]
  );
  const selectedReason = reasonOptions.find((item) => item.value === reasonKey)?.label || "";

  useEffect(() => {
    if (open) {
      setReasonKey(DEFAULT_REASON_KEY);
      setDetails("");
      setSubmitting(false);
    }
  }, [open]);

  const resolveTargetType = () => {
    const type = (entityType || "").toString().toUpperCase();
    if (type === "BAR" || type.includes("BARPAGE")) return "BarPage";
    if (
      type.includes("BUSINESS") ||
      type.includes("DJ") ||
      type.includes("DANCER")
    )
      return "BusinessAccount";
    return "Account";
  };

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reasonKey) {
      alert(t("modal.reportReasonRequired"));
      return;
    }
    try {
      const reporterGuid = normalizeCandidateList(reporterCandidates);
      if (!reporterGuid) {
        throw new Error("Không xác định được tài khoản người báo cáo");
      }
      if (!targetOwnerGuid) {
        throw new Error("Không xác định được tài khoản bị báo cáo");
      }

      setSubmitting(true);

      const payload = {
        ReporterId: reporterGuid,
        ReporterRole: reporterRole,
        TargetType: resolveTargetType(),
        TargetId: targetOwnerGuid,
        TargetOwnerId: targetOwnerGuid,
        Reason: selectedReason || reasonKey,
        Description: details.trim(),
        Status: "Pending",
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
      };

      await reportApi.createReport(payload);
      onSubmitted?.({
        entityId,
        reason: selectedReason || reasonKey,
        details: details.trim(),
      });
      onClose?.();
    } catch (error) {
      alert(error?.response?.data?.message || error.message || "Gửi báo cáo thất bại");
      console.error("Report entity failed", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[1000]",
        "flex items-center justify-center p-4"
      )}
    >
      <button
        type="button"
        className={cn(
          "absolute inset-0 w-full h-full z-0",
          "bg-black/75 backdrop-blur-xl cursor-default"
        )}
        aria-label={t("modal.cancel")}
        onClick={onClose}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose?.();
          }
        }}
        tabIndex={-1}
      />
      <dialog
        open
        className={cn(
          "w-full max-w-[520px] bg-card text-card-foreground relative z-10",
          "rounded-lg border-[0.5px] border-border/20 shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
          "overflow-hidden"
        )}
      >
        <div
          className={cn(
            "p-5 border-b border-border/30 font-semibold text-lg",
            "bg-card/80 backdrop-blur-sm relative z-10"
          )}
        >
          🚩 {t("modal.reportUserTitle", { name: entityName || "" })}
        </div>
        <form
          onSubmit={handleSubmit}
          className={cn("p-5 flex flex-col gap-4 relative z-10")}
        >
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">
              {t("modal.reportReason")}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {reasonOptions.map((option) => {
                const isActive = option.value === reasonKey;
                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => setReasonKey(option.value)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-left text-sm transition-all duration-200",
                      "border border-border/30 bg-background hover:border-primary/60",
                      isActive && "border-primary bg-primary/10 text-primary font-semibold"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <textarea
            placeholder={t("modal.reportDetailsPlaceholder")}
            rows={5}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className={cn(
              "w-full resize-y bg-background text-foreground",
              "border-[0.5px] border-border/20 rounded-lg p-4",
              "font-inherit text-base leading-6 outline-none",
              "transition-all duration-200",
              "focus:border-primary focus:ring-2 focus:ring-primary/10",
              "placeholder:text-muted-foreground/60"
            )}
          />
          <div
            className={cn(
              "flex gap-2 justify-end pt-4 border-t border-border/30 mt-2"
            )}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium",
                "cursor-pointer transition-all duration-200",
                "bg-muted/30 text-foreground",
                "hover:bg-muted/50",
                "active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              )}
            >
              {t("modal.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || !reasonKey}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium",
                "cursor-pointer transition-all duration-200 border-none",
                "bg-danger text-primary-foreground",
                "hover:opacity-90",
                "active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              )}
            >
              {submitting ? t("modal.sending") : t("modal.sendReport")}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

ReportEntityModal.propTypes = {
  open: PropTypes.bool,
  entityId: PropTypes.string,
  entityType: PropTypes.string,
  entityName: PropTypes.string,
  onClose: PropTypes.func,
  onSubmitted: PropTypes.func,
};

