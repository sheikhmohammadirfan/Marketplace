import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import API from "../utils/api";
import PasswordInput, { PasswordRules } from "../components/PasswordInput";
import { getErrorMessage } from "../utils/format";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Passwords do not match");
    setLoading(true);
    try {
      await API.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      const first = err.response?.data?.errors?.[0]?.message;
      setError(first || getErrorMessage(err, "Reset failed. The link may have expired."));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="center">
        <h2>Password updated</h2>
        <div className="alert alert-success" style={{ margin: "14px 0" }}>
          <CheckCircle2 size={18} />
          <p>Your password has been changed. You can now log in.</p>
        </div>
        <Link to="/login" className="btn btn-block">Go to login</Link>
      </div>
    );
  }

  return (
    <>
      <h2>Choose a new password</h2>
      <p className="sub">Pick something strong you don't use anywhere else.</p>

      {!token && (
        <div className="alert alert-error" style={{ marginBottom: 14 }}>
          <AlertCircle size={18} />
          <p>This link is missing its reset token. Request a new one.</p>
        </div>
      )}

      <form className="stack" onSubmit={handleSubmit}>
        <div className="field">
          <label>New password</label>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} placeholder="New password" disabled={loading} />
          <PasswordRules password={password} />
        </div>
        <div className="field">
          <label>Confirm password</label>
          <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={8} placeholder="Confirm password" disabled={loading} />
        </div>
        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}
        <button type="submit" className="btn btn-lg btn-block" disabled={loading || !token}>
          {loading ? "Saving…" : "Reset password"}
        </button>
      </form>
    </>
  );
}
