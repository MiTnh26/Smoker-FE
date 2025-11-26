import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";
import adminApi from "../../../api/adminApi";

export default function ManageApprovals() {
  const { t } = useTranslation();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  async function fetchPendingRegistrations() {
    setLoading(true);
    try {
      const res = await adminApi.getPendingRegistrations();
      if (res?.success) {
        setRegistrations(res.data || []);
      } else {
        setRegistrations([]);
      }
    } catch (e) {
      console.error("[ManageApprovals] fetchPendingRegistrations error", e);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPendingRegistrations();
  }, []);

  const roles = useMemo(() => {
    const unique = new Set(registrations.map((item) => (item.role || "").toLowerCase()));
    return Array.from(unique).filter(Boolean);
  }, [registrations]);

  const filteredRegistrations = useMemo(() => {
    let data = registrations;
    const query = search.trim().toLowerCase();
    if (query) {
      data = data.filter((item) => {
        const nameMatch = item.name?.toLowerCase().includes(query);
        const ownerMatch =
          item.ownerEmail?.toLowerCase().includes(query) ||
          item.ownerName?.toLowerCase().includes(query);
        return nameMatch || ownerMatch;
      });
    }
    if (typeFilter !== "all") {
      data = data.filter((item) => item.type === typeFilter);
    }
    if (roleFilter !== "all") {
      data = data.filter((item) => (item.role || "").toLowerCase() === roleFilter);
    }
    return data;
  }, [registrations, search, typeFilter, roleFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, roleFilter]);

  const pagedRegistrations = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredRegistrations.slice(startIndex, startIndex + pageSize);
  }, [filteredRegistrations, page]);

  const totalPages = Math.max(1, Math.ceil(filteredRegistrations.length / pageSize));

  const handleApproval = async (item, newStatus) => {
    try {
      if (item.type === 'BarPage') {
        await adminApi.updateBarStatus(item.id, newStatus);
      } else if (item.type === 'BusinessAccount') {
        await adminApi.updateBusinessStatus(item.id, newStatus);
      }
      // Refresh the list after approval/rejection
      fetchPendingRegistrations();
    } catch (e) {
      console.error(`[ManageApprovals] Failed to update status for ${item.id}`, e);
      // Optionally, show a toast notification for the error
    }
  };

  return (
    <div className={cn("w-full px-4 md:px-6 lg:px-8 py-6")}>
      <h1 className={cn("text-2xl md:text-3xl font-bold text-foreground mb-4")}>
        {t("admin.approvals.title", { defaultValue: "Manage Approvals" })}
      </h1>

      <div className={cn("bg-card border-[0.5px] border-border/20 rounded-lg p-4 mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between")}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn("rounded-lg border border-border/40 px-3 py-2 bg-background text-sm flex-1")}
          placeholder={t("admin.approvals.searchPlaceholder", { defaultValue: "Search by name or owner..." })}
        />
        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={cn("rounded-lg border border-border/40 px-3 py-2 bg-background text-sm")}
          >
            <option value="all">{t("admin.approvals.type.all", { defaultValue: "All types" })}</option>
            <option value="BarPage">{t("admin.approvals.type.bar", { defaultValue: "Bar Page" })}</option>
            <option value="BusinessAccount">{t("admin.approvals.type.business", { defaultValue: "Business Account" })}</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={cn("rounded-lg border border-border/40 px-3 py-2 bg-background text-sm")}
          >
            <option value="all">{t("admin.approvals.role.all", { defaultValue: "All roles" })}</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button
            onClick={fetchPendingRegistrations}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            {t("common.refresh", { defaultValue: "Refresh" })}
          </button>
        </div>
      </div>

      <div className={cn(
        "rounded-lg overflow-hidden",
        "bg-card border-[0.5px] border-border/20"
      )}>
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Owner</th>
              <th className="text-left p-3">Registered At</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              if (loading) {
                return (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      {t("common.loading", { defaultValue: "Loading..." })}
                    </td>
                  </tr>
                );
              }
              if (filteredRegistrations.length === 0) {
                return (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      {t("admin.approvals.empty", { defaultValue: "No pending registrations." })}
                    </td>
                  </tr>
                );
              }
              return pagedRegistrations.map(item => (
                <tr key={`${item.type}-${item.id}`} className="border-t border-border/20">
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3">{item.role}</td>
                  <td className="p-3">{item.ownerEmail} ({item.ownerName})</td>
                  <td className="p-3">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="p-3 text-right space-x-2">
                    <button onClick={() => handleApproval(item, 'active')} className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700">
                      {t("admin.approvals.approve", { defaultValue: "Approve" })}
                    </button>
                    <button onClick={() => handleApproval(item, 'banned')} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">
                      {t("admin.approvals.reject", { defaultValue: "Reject" })}
                    </button>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
        <div>
          {t("common.paginationSummary", {
            defaultValue: "Page {{page}} / {{total}}",
            page,
            total: totalPages
          })}
        </div>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={cn(
              "px-3 py-1 rounded border border-border/40 text-sm",
              page <= 1 && "opacity-50 cursor-not-allowed"
            )}
          >
            {t("common.prev", { defaultValue: "Prev" })}
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={cn(
              "px-3 py-1 rounded border border-border/40 text-sm",
              page >= totalPages && "opacity-50 cursor-not-allowed"
            )}
          >
            {t("common.next", { defaultValue: "Next" })}
          </button>
        </div>
      </div>
    </div>
  );
}

