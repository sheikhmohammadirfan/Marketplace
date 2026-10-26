import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, MailCheck } from "lucide-react";
import API from "../utils/api";
import { getErrorMessage } from "../utils/format";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await API.post("/auth/forgot-password", { email });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2>Reset your password</h2>
      <p className="sub">Enter your email and we'll send you a link to choose a new password.</p>

      {done ? (
        <div className="alert alert-success">
          <MailCheck size={18} />
          <p>
            If <strong>{email}</strong> is registered, a reset link is on its way. It expires in 30 minutes.
          </p>
        </div>
      ) : (
        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required disabled={loading} />
          </div>
          {error && (
            <div className="alert alert-error" role="alert">
              <AlertCircle size={18} />
              <p>{error}</p>
            </div>
          )}
          <button type="submit" className="btn btn-lg btn-block" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="auth-foot">
        <Link to="/login" className="row" style={{ justifyContent: "center" }}>
          <ArrowLeft size={14} /> Back to login
        </Link>
      </p>
    </>
  );
}
