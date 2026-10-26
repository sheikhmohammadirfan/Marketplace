import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, MailCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PasswordInput, { PasswordRules } from "../components/PasswordInput";
import { getErrorMessage } from "../utils/format";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name.trim(), email, password);
      setDone(true);
    } catch (err) {
      const first = err.response?.data?.errors?.[0]?.message;
      setError(first || getErrorMessage(err, "Signup failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="center">
        <span className="empty-icon avatar lg" style={{ background: "var(--success-50)", color: "var(--success)", marginBottom: 14 }}>
          <MailCheck size={28} />
        </span>
        <h2>Check your email</h2>
        <p className="sub">
          If <strong>{email}</strong> isn't already registered, we've sent a verification link. Click it to activate your account, then log in.
        </p>
        <Link to="/login" className="btn btn-block">Back to login</Link>
      </div>
    );
  }

  return (
    <>
      <h2>Create your account</h2>
      <p className="sub">Free to join. Start buying and selling in minutes.</p>

      <form className="stack" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" required minLength={2} maxLength={100} disabled={loading} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required disabled={loading} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} disabled={loading} />
          <PasswordRules password={password} />
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        <button type="submit" className="btn btn-lg btn-block" disabled={loading}>
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="auth-foot">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </>
  );
}
