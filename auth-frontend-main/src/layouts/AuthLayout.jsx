import { Link, Outlet } from "react-router-dom";
import { Lock, MessageCircle, ShoppingBag, Sparkles } from "lucide-react";

// Split-screen layout for login / register / password pages.
export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <Link to="/listings" className="logo">
          <span className="logo-mark">
            <ShoppingBag size={20} />
          </span>
          <span className="logo-text">MarketPlace</span>
        </Link>
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1>Buy and sell anything, safely.</h1>
          <p>Join thousands of people trading locally — post an ad in minutes and chat with buyers in real time.</p>
          <ul className="auth-points">
            <li><span className="ico"><Lock size={18} /></span>Secure sign-in with protected sessions and email verification</li>
            <li><span className="ico"><MessageCircle size={18} /></span>Real-time chat between buyers and sellers</li>
            <li><span className="ico"><Sparkles size={18} /></span>AI helper that writes your ad from a photo and finds what you need</li>
          </ul>
        </div>
        <small style={{ opacity: 0.7, position: "relative", zIndex: 1 }}>© {new Date().getFullYear()} MarketPlace</small>
      </aside>
      <section className="auth-form-wrap">
        <div style={{ width: "100%", maxWidth: 420 }}>
          <Link to="/listings" className="logo auth-mobile-logo">
            <span className="logo-mark">
              <ShoppingBag size={20} />
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>MarketPlace</span>
          </Link>
          <div className="auth-card">
            <Outlet />
          </div>
        </div>
      </section>
    </div>
  );
}
