import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../utils/format";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const { user, refreshMe } = useAuth();
  const [status, setStatus] = useState(token ? "verifying" : "error");
  const [message, setMessage] = useState(token ? "" : "This link is missing its verification token.");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await API.post("/auth/verify-email", { token });
        if (cancelled) return;
        setStatus("success");
        setMessage(res.data.message);
        if (user) refreshMe(); // update the "verified" flag if they're already logged in
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(getErrorMessage(err, "Verification failed. The link may have expired."));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="center">
      <h2>Email verification</h2>
      {status === "verifying" && (
        <p className="page-loader">
          <span className="spinner" /> Verifying your email…
        </p>
      )}
      {status === "success" && (
        <div className="alert alert-success" style={{ margin: "14px 0", textAlign: "left" }}>
          <CheckCircle2 size={18} />
          <p>{message}</p>
        </div>
      )}
      {status === "error" && (
        <div className="alert alert-error" style={{ margin: "14px 0", textAlign: "left" }}>
          <XCircle size={18} />
          <p>{message}</p>
        </div>
      )}
      <Link to={user ? "/listings" : "/login"} className="btn btn-block">
        {user ? "Continue to MarketPlace" : "Go to login"}
      </Link>
    </div>
  );
}
