import { useCallback, useEffect, useState } from "react";
import { Plus, ShieldCheck, UserPlus } from "lucide-react";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import PasswordInput from "../components/PasswordInput";
import { getErrorMessage, timeAgo } from "../utils/format";

const roleBadge = { superadmin: "badge-purple", admin: "badge-primary", user: "" };

export default function AdminDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const isSuperadmin = user?.role === "superadmin";

  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [staff, setStaff] = useState({ name: "", email: "", password: "", role: "admin" });
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffError, setStaffError] = useState("");

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/users", { params: { page, limit: 15, q: search || undefined, role: roleFilter || undefined } });
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load users"));
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (tab !== "audit" || !isSuperadmin) return;
    setLogsLoading(true);
    API.get("/admin/audit-logs", { params: { limit: 100 } })
      .then((res) => setLogs(res.data.logs))
      .catch((err) => toast.error(getErrorMessage(err, "Failed to load audit log")))
      .finally(() => setLogsLoading(false));
  }, [tab, isSuperadmin, toast]);

  const run = async (id, fn, okMessage) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(okMessage);
      await fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = (u, role) => run(u.id, () => API.patch(`/admin/users/${u.id}/role`, { role }), "Role updated");
  const toggleStatus = (u) =>
    run(u.id, () => API.patch(`/admin/users/${u.id}/status`, { status: u.status === "active" ? "suspended" : "active" }), u.status === "active" ? "User suspended" : "User reactivated");
  const remove = (u) => window.confirm(`Delete ${u.email}? This cannot be undone.`) && run(u.id, () => API.delete(`/admin/users/${u.id}`), "User deleted");

  const createStaff = async (e) => {
    e.preventDefault();
    setStaffError("");
    setStaffBusy(true);
    try {
      await API.post("/admin/staff", staff);
      toast.success("Staff account created");
      setStaff({ name: "", email: "", password: "", role: "admin" });
      setShowCreate(false);
      fetchUsers();
    } catch (err) {
      setStaffError(err.response?.data?.errors?.[0]?.message || getErrorMessage(err, "Failed to create account"));
    } finally {
      setStaffBusy(false);
    }
  };

  const stats = [
    ["Users (matching)", pagination.total],
    ["Suspended on this page", users.filter((u) => u.status === "suspended").length],
    ["Staff on this page", users.filter((u) => u.role !== "user").length],
    ["Unverified on this page", users.filter((u) => !u.isVerified).length],
  ];

  return (
    <>
      <div className="page-title">
        <div>
          <h1 className="row"><ShieldCheck size={26} color="var(--primary)" /> {isSuperadmin ? "Superadmin" : "Admin"} dashboard</h1>
          <span className="muted small">Manage accounts, roles and security{isSuperadmin ? ", and review the audit log" : ""}.</span>
        </div>
        {isSuperadmin && (
          <button className="btn" onClick={() => setShowCreate(true)}>
            <UserPlus size={16} /> Create staff account
          </button>
        )}
      </div>

      <div className="stat-grid">
        {stats.map(([label, num]) => (
          <div key={label} className="card stat">
            <div className="num">{num}</div>
            <div className="lbl">{label}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        <button className={`tab${tab === "users" ? " active" : ""}`} onClick={() => setTab("users")}>Users</button>
        {isSuperadmin && <button className={`tab${tab === "audit" ? " active" : ""}`} onClick={() => setTab("audit")}>Audit log</button>}
      </div>

      {tab === "users" && (
        <>
          <form className="toolbar-row" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(query.trim()); }}>
            <input className="input" placeholder="Search by email…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select className="select" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} aria-label="Filter by role">
              <option value="">All roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
              <option value="superadmin">Superadmins</option>
            </select>
            <button className="btn btn-outline">Search</button>
          </form>

          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Status</th><th>Email</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="center muted" style={{ padding: 32 }}><span className="spinner" /></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="6" className="center muted" style={{ padding: 32 }}>No users found</td></tr>
                ) : (
                  users.map((u) => {
                    const canManage = isSuperadmin || u.role === "user";
                    const self = u.id === user.id;
                    return (
                      <tr key={u.id}>
                        <td><strong>{u.name || "—"}</strong><div className="small muted">{u.email}</div></td>
                        <td><span className={`badge ${roleBadge[u.role]}`}>{u.role}</span></td>
                        <td><span className={`badge ${u.status === "active" ? "badge-success" : "badge-danger"}`}>{u.status}</span></td>
                        <td>{u.isVerified ? <span className="badge badge-success">Verified</span> : <span className="badge badge-warn">Pending</span>}</td>
                        <td className="small muted">{timeAgo(u.createdAt)}</td>
                        <td>
                          {self ? (
                            <span className="small muted">You</span>
                          ) : !canManage ? (
                            <span className="small muted">Superadmin only</span>
                          ) : (
                            <div className="row wrap" style={{ gap: 6 }}>
                              {isSuperadmin && (
                                <select className="select" style={{ width: "auto", padding: "5px 28px 5px 8px", fontSize: 13 }} value={u.role} disabled={busyId === u.id} onChange={(e) => changeRole(u, e.target.value)} aria-label={`Role for ${u.email}`}>
                                  <option value="user">user</option>
                                  <option value="admin">admin</option>
                                  <option value="superadmin">superadmin</option>
                                </select>
                              )}
                              <button className={`btn btn-sm ${u.status === "active" ? "btn-outline" : "btn-success"}`} disabled={busyId === u.id} onClick={() => toggleStatus(u)}>
                                {u.status === "active" ? "Suspend" : "Reactivate"}
                              </button>
                              <button className="btn btn-sm btn-danger-outline" disabled={busyId === u.id} onClick={() => remove(u)}>Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="pagination">
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span className="muted small">Page {pagination.page} of {pagination.pages}</span>
              <button className="btn btn-outline btn-sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {tab === "audit" && isSuperadmin && (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>When</th><th>Action</th><th>Actor</th><th>Target</th><th>IP</th></tr></thead>
            <tbody>
              {logsLoading ? (
                <tr><td colSpan="5" className="center muted" style={{ padding: 32 }}><span className="spinner" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="5" className="center muted" style={{ padding: 32 }}>No events yet</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id}>
                    <td className="small muted" title={new Date(log.createdAt).toLocaleString()}>{timeAgo(log.createdAt)}</td>
                    <td><span className={`badge ${/FAIL|LOCK|REUSE|SUSPEND|DELETE/.test(log.action) ? "badge-danger" : /SUCCESS|VERIFIED|REACTIV/.test(log.action) ? "badge-success" : ""}`}>{log.action}</span></td>
                    <td className="small">{log.actor?.email || log.actorEmail || "—"}</td>
                    <td className="small">{log.targetUser?.email || "—"}</td>
                    <td className="small muted">{log.ip || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <form className="modal stack" onSubmit={createStaff} role="dialog" aria-label="Create staff account">
            <h3 style={{ margin: 0 }}><Plus size={18} style={{ verticalAlign: -3 }} /> Create staff account</h3>
            <p className="small muted" style={{ margin: 0 }}>Staff accounts are pre-verified. Choose a strong temporary password and ask them to change it.</p>
            <div className="field"><label>Name</label><input className="input" required minLength={2} value={staff.name} onChange={(e) => setStaff({ ...staff, name: e.target.value })} /></div>
            <div className="field"><label>Email</label><input className="input" type="email" required value={staff.email} onChange={(e) => setStaff({ ...staff, email: e.target.value })} /></div>
            <div className="field"><label>Temporary password</label><PasswordInput value={staff.password} onChange={(e) => setStaff({ ...staff, password: e.target.value })} minLength={8} autoComplete="new-password" placeholder="Min 8 chars, letters + numbers" /></div>
            <div className="field">
              <label>Role</label>
              <select className="select" value={staff.role} onChange={(e) => setStaff({ ...staff, role: e.target.value })}>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
            {staffError && <div className="alert alert-error"><p>{staffError}</p></div>}
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn" disabled={staffBusy}>{staffBusy ? "Creating…" : "Create account"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
