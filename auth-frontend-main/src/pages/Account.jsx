import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BadgeCheck, LogOut, MonitorSmartphone } from "lucide-react";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import PasswordInput, { PasswordRules } from "../components/PasswordInput";
import { getErrorMessage, initials, timeAgo } from "../utils/format";

function describeDevice(ua = "") {
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown device";
  return `${browser} on ${os}`;
}

export default function Account() {
  const { user, logout, logoutAll } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");
  const [sessions, setSessions] = useState([]);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    API.get("/auth/sessions").then((res) => setSessions(res.data.sessions)).catch(() => {});
  }, []);

  const changePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwBusy(true);
    try {
      await API.post("/auth/change-password", { currentPassword, newPassword });
      toast.success("Password changed. Your other devices were signed out.");
      setCurrentPassword("");
      setNewPassword("");
      API.get("/auth/sessions").then((res) => setSessions(res.data.sessions)).catch(() => {});
    } catch (err) {
      setPwError(err.response?.data?.errors?.[0]?.message || getErrorMessage(err, "Failed to change password"));
    } finally {
      setPwBusy(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await API.post("/auth/resend-verification", { email: user.email });
      toast.success("Verification email sent");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm("Sign out of every device, including this one?")) return;
    await logoutAll();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <>
      <div className="page-title">
        <h1>My account</h1>
        <button className="btn btn-outline" onClick={async () => { await logout(); navigate("/listings"); }}>
          <LogOut size={16} /> Log out
        </button>
      </div>

      <div className="account-grid">
        <div className="stack">
          <div className="card card-pad">
            <div className="stack" style={{ alignItems: "center", textAlign: "center", gap: 8, marginBottom: 10 }}>
              <span className="avatar lg">{initials(user.name || user.email)}</span>
              <div>
                <h3 style={{ margin: 0 }}>{user.name || "—"}</h3>
                <span className="muted small">{user.email}</span>
              </div>
            </div>
            <div className="kv"><span>Role</span><span className="badge badge-primary">{user.role}</span></div>
            <div className="kv">
              <span>Email</span>
              {user.isVerified ? <span className="badge badge-success"><BadgeCheck size={13} /> Verified</span> : <span className="badge badge-warn">Not verified</span>}
            </div>
            <div className="kv"><span>Member since</span><span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}</span></div>
            {!user.isVerified && (
              <div className="alert alert-warn" style={{ marginTop: 14 }}>
                <AlertTriangle size={18} />
                <div>
                  <p>Verify your email to post ads.</p>
                  <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={resend} disabled={resending}>
                    {resending ? "Sending…" : "Resend verification email"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card card-pad">
            <h3 className="card-title">Change password</h3>
            <form className="stack" style={{ maxWidth: 420 }} onSubmit={changePassword}>
              <div className="field">
                <label>Current password</label>
                <PasswordInput value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" placeholder="Current password" disabled={pwBusy} />
              </div>
              <div className="field">
                <label>New password</label>
                <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" minLength={8} placeholder="New password" disabled={pwBusy} />
                <PasswordRules password={newPassword} />
              </div>
              {pwError && <div className="alert alert-error"><p>{pwError}</p></div>}
              <div><button className="btn" disabled={pwBusy}>{pwBusy ? "Saving…" : "Update password"}</button></div>
            </form>
          </div>

          <div className="card card-pad">
            <div className="row between wrap" style={{ marginBottom: 6 }}>
              <h3 className="card-title" style={{ margin: 0 }}><MonitorSmartphone size={16} /> Active sessions</h3>
              <button className="btn btn-danger-outline btn-sm" onClick={handleLogoutAll}>Sign out everywhere</button>
            </div>
            <p className="small muted">Devices currently signed in to your account. If you see one you don't recognise, change your password.</p>
            {sessions.length === 0 ? (
              <p className="small muted">No other active sessions.</p>
            ) : (
              sessions.map((s) => (
                <div key={s._id} className="kv">
                  <span style={{ color: "var(--text)" }}>{describeDevice(s.userAgent)}</span>
                  <span className="muted small">Signed in {timeAgo(s.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
