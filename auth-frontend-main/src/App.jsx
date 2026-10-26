import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { WishlistProvider } from "./context/WishlistContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import AuthLayout from "./layouts/AuthLayout";
import MainLayout from "./layouts/MainLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Listings from "./pages/Listings";
import ListingDetail from "./pages/ListingDetail";
import PostAd from "./pages/PostAd";
import EditAd from "./pages/EditAd";
import MyListings from "./pages/MyListings";
import Wishlist from "./pages/Wishlist";
import Chat from "./pages/Chat";
import Account from "./pages/Account";
import AdminDashboard from "./pages/AdminDashboard";

const guard = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <WishlistProvider>
          <Routes>
            {/* Login / signup / password pages: split-screen layout */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
            </Route>

            {/* The marketplace: header, categories, footer, floating AI assistant */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/listings" replace />} />
              <Route path="/listings" element={<Listings />} />
              <Route path="/listings/:id" element={<ListingDetail />} />

              <Route path="/post-ad" element={guard(<PostAd />)} />
              <Route path="/edit-ad/:id" element={guard(<EditAd />)} />
              <Route path="/my-listings" element={guard(<MyListings />)} />
              <Route path="/wishlist" element={guard(<Wishlist />)} />
              <Route path="/chat" element={guard(<Chat />)} />
              <Route path="/account" element={guard(<Account />)} />
              <Route path="/user" element={<Navigate to="/account" replace />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/listings" replace />} />
            </Route>
          </Routes>
        </WishlistProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
