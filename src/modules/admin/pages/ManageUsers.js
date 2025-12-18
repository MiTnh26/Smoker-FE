import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";
import { Search } from "lucide-react";
import adminApi from "../../../api/adminApi";

const ACCOUNT_ROLE_OPTIONS = ["Admin", "Customer"];
const ACCOUNT_STATUS_OPTIONS = ["active", "banned"];

export default function ManageUsers() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [entities, setEntities] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  // Debounce query
  const debouncedQuery = useMemo(() => query, [query]);

  async function fetchUsers(params = {}) {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        q: debouncedQuery,
        role,
        status,
        page,
        pageSize,
        ...params,
      });
      if (res?.success) {
        setUsers(res.items || []);
        setTotal(res.total || 0);
      } else {
        setUsers(res?.items || res?.data || []);
        setTotal(res?.total || 0);
      }
    } catch (e) {
      console.error("[ManageUsers] getUsers error", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, role, status, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleBanToggle = async (u) => {
    const next = u.Status === "banned" ? "active" : "banned";
    try {
      await adminApi.updateUserStatus(u.AccountId, next);
      fetchUsers();
    } catch (e) {
      console.error("[ManageUsers] update status error", e);
    }
  };

  const handleRoleChange = async (u, nextRole) => {
    if (!ACCOUNT_ROLE_OPTIONS.includes(nextRole)) {
      console.warn("[ManageUsers] invalid role selection", nextRole);
      return;
    }
    try {
      await adminApi.updateUserRole(u.AccountId, nextRole);
      fetchUsers();
    } catch (e) {
      console.error("[ManageUsers] update role error", e);
    }
  };

  const openDetail = async (u) => {
    setSelectedUser(u);
    setDetailOpen(true);
    setLoadingEntities(true);
    try {
      const res = await adminApi.getUserBusinesses(u.AccountId);
      const raw = res?.data || res?.items || res || [];
      console.log('[ManageUsers] businesses response:', res);
      setEntities(Array.isArray(raw) ? raw : []);
    } catch (e) {
      console.error("[ManageUsers] load entities error", e);
      setEntities([]);
    } finally {
      setLoadingEntities(false);
    }
  };

  const toggleBusinessBan = async (item) => {
    const next = item.status === 'banned' ? 'active' : 'banned';
    try {
      if ((item.type || '').toLowerCase() === 'barpage') {
        await adminApi.updateBarStatus(item.id, next);
      } else {
        await adminApi.updateBusinessStatus(item.id, next);
      }
      // refresh list in modal
      openDetail(selectedUser);
    } catch (e) {
      console.error("[ManageUsers] update business/bar status error", e);
    }
  };

  return (
    <div className={cn("w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6")}>
      <h1 className={cn("text-2xl md:text-3xl font-bold text-foreground mb-4")}>
        {t("admin.users.title", { defaultValue: "Manage Users" })}
      </h1>

      {/* Filters */}
      <div className={cn(
        "flex flex-col md:flex-row gap-2 md:items-center md:justify-between mb-4"
      )}>
        <div className={cn("flex items-center gap-2 flex-1")}> 
          <div className={cn(
            "flex items-center gap-2 flex-1 rounded-lg px-3 py-2",
            "bg-card border-[0.5px] border-border/20"
          )}>
            <Search size={16} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("admin.users.search", { defaultValue: "Search by email or username..." })}
              className={cn("flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground")}
            />
          </div>
        </div>

        <div className={cn("flex items-center gap-2")}> 
          <select value={role} onChange={(e) => setRole(e.target.value)} className={cn(
            "rounded-lg px-3 py-2 bg-card border-[0.5px] border-border/20 text-foreground"
          )}>
            <option value="">{t("admin.users.allRoles", { defaultValue: "All roles" })}</option>
            {ACCOUNT_ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={cn(
            "rounded-lg px-3 py-2 bg-card border-[0.5px] border-border/20 text-foreground"
          )}>
            <option value="">{t("admin.users.allStatus", { defaultValue: "All status" })}</option>
            {ACCOUNT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={cn(
        "rounded-lg overflow-hidden",
        "bg-card border-[0.5px] border-border/20"
      )}>
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr>
              <th className="text-left p-3">{t("admin.users.table.email", { defaultValue: "Email" })}</th>
              <th className="text-left p-3">{t("admin.users.table.username", { defaultValue: "Username" })}</th>
              <th className="text-left p-3">{t("admin.users.table.role", { defaultValue: "Role" })}</th>
              <th className="text-left p-3">{t("admin.users.table.status", { defaultValue: "Status" })}</th>
              <th className="text-right p-3">{t("admin.users.table.actions", { defaultValue: "Actions" })}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{t("common.loading", { defaultValue: "Loading..." })}</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{t("admin.users.empty", { defaultValue: "No users found." })}</td></tr>
            ) : (
              users.map(u => {
                const rawRole = u.Role || u.role || "";
                const normalizedRole = rawRole.toLowerCase() === "admin"
                  ? "Admin"
                  : rawRole.toLowerCase() === "customer"
                  ? "Customer"
                  : "";
                return (
                <tr key={u.AccountId} className="border-t border-border/20">
                  <td className="p-3">{u.Email}</td>
                  <td className="p-3">{u.UserName}</td>
                  <td className="p-3">
                    <select
                      className="bg-transparent border rounded px-2 py-1"
                      value={normalizedRole}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                    >
                      <option value="">{t("admin.users.selectRole", { defaultValue: "Select role" })}</option>
                      {ACCOUNT_ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <span className={cn("px-2 py-1 rounded text-xs",
                      u.Status === 'active' ? 'bg-green-100 text-green-700' :
                      u.Status === 'banned' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    )}>{t(`admin.users.status.${u.Status}`, { defaultValue: u.Status })}</span>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => openDetail(u)} className="px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 mr-2">{t("admin.users.view", { defaultValue: "View detail" })}</button>
                    <button onClick={() => handleBanToggle(u)} className={cn("px-3 py-1 rounded text-white hover:opacity-90", u.Status === 'banned' ? 'bg-green-600' : 'bg-red-600')}>
                      {u.Status === 'banned' ? t("admin.users.unban", { defaultValue: "Unban" }) : t("admin.users.ban", { defaultValue: "Ban" })}
                    </button>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
        {/* Pagination */}
        <div className="flex items-center justify-between p-3 border-t border-border/20 text-sm text-muted-foreground">
          <div>{t('common.pagination', { defaultValue: 'Page {{page}} / {{totalPages}}', page, totalPages })}</div>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded border disabled:opacity-50">{t('common.prev', { defaultValue: 'Prev' })}</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded border disabled:opacity-50">{t('common.next', { defaultValue: 'Next' })}</button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border/20">
              <h3 className="text-lg font-semibold">{t('admin.users.detail', { defaultValue: 'User details' })}</h3>
              <button onClick={() => setDetailOpen(false)} className="px-2 py-1 rounded border">✕</button>
            </div>
            <div className="p-4">
              {selectedUser && (
                <div className="mb-4 text-sm">
                  <div><span className="font-medium">{t('admin.users.table.email', { defaultValue: 'Email' })}:</span> {selectedUser.Email}</div>
                  <div><span className="font-medium">{t('admin.users.table.username', { defaultValue: 'Username' })}:</span> {selectedUser.UserName}</div>
                  <div><span className="font-medium">{t('admin.users.table.role', { defaultValue: 'Role' })}:</span> {selectedUser.Role}</div>
                  <div><span className="font-medium">{t('admin.users.table.status', { defaultValue: 'Status' })}:</span> {t(`admin.users.status.${selectedUser.Status}`, { defaultValue: selectedUser.Status })}</div>
                </div>
              )}

              <h4 className="font-semibold mb-2">{t('admin.users.businessList', { defaultValue: 'Businesses of this account' })}</h4>
              {loadingEntities ? (
                <div className="text-sm text-muted-foreground">{t('common.loading', { defaultValue: 'Loading...' })}</div>
              ) : entities.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t('admin.users.noBusiness', { defaultValue: 'No business accounts.' })}</div>
              ) : (
                <div className="space-y-2">
                  {entities.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded border border-border/20">
                      <div className="flex items-center gap-3">
                        <img src={b.avatar || ''} alt="" className="w-10 h-10 rounded object-cover bg-muted" />
                        <div>
                          <div className="font-medium">{b.name} <span className="text-xs text-muted-foreground">({b.role})</span></div>
                          <div className="text-xs">{t('admin.users.table.status', { defaultValue: 'Status' })}: <span className={cn('px-1 rounded', b.status === 'active' ? 'bg-green-100 text-green-700' : b.status === 'banned' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700')}>{t(`admin.users.status.${b.status}`, { defaultValue: b.status || 'active' })}</span></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleBusinessBan(b)} className={cn('px-3 py-1 rounded text-white', b.status === 'banned' ? 'bg-green-600' : 'bg-red-600')}>
                          {b.status === 'banned' ? t('admin.users.unban', { defaultValue: 'Unban' }) : t('admin.users.ban', { defaultValue: 'Ban' })}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

