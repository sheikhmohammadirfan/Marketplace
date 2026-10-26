import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";
import { getErrorMessage } from "../utils/format";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // On success the session is stored in AuthContext and <PublicRoute> redirects
      // (back to the page you came from, an admin to /admin, everyone else to /listings).
      await login(email, password);
    } catch (err) {
      setError(getErrorMessage(err, "Login failed. Please check your credentials."));
      setLoading(false);
    }
  };

  return (
    <>
      <h2>Welcome back</h2>
      <p className="sub">Log in to post ads, chat with sellers and manage your wishlist.</p>

      <form className="stack" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <div className="input-group">
            <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required disabled={loading} />
            <span className="input-addon" style={{ color: "var(--muted)", right: 12 }}><Mail size={16} /></span>
          </div>
        </div>
        <div className="field">
          <div className="row between">
            <label htmlFor="password">Password</label>
            <Link to="/forgot-password" className="small">Forgot password?</Link>
          </div>
          <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" disabled={loading} />
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        <button type="submit" className="btn btn-lg btn-block" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="auth-foot">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </>
  );
}
