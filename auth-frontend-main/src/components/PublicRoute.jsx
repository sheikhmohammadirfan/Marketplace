import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Wraps pages that only make sense for logged-out visitors (login, register, forgot password).
// If a valid session exists, send the person onward instead of showing a login form.
export default function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait for the session check, otherwise a logged-in user would see the form flash.
  if (loading) {
    return (
      <div className="page-loader">
        <span className="spinner" /> Loading…
      </div>
    );
  }

  if (user) {
    const from = location.state?.from;
    if (from?.pathname) return <Navigate to={`${from.pathname}${from.search || ""}`} replace />;
    const isStaff = user.role === "admin" || user.role === "superadmin";
    return <Navigate to={isStaff ? "/admin" : "/listings"} replace />;
  }

  return children;
}
