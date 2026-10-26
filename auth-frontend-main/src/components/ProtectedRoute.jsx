import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loader">
        <span className="spinner" /> Loading…
      </div>
    );
  }

  // Remember where the visitor was going so login can send them back there.
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/listings" replace />;
  }

  return children;
}
