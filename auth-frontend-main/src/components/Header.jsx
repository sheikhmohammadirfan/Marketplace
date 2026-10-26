import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Heart, LayoutList, LogOut, MessageCircle, Plus, Search, ShieldCheck, ShoppingBag, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { initials } from "../utils/format";

export default function Header() {
  const { user, logout } = useAuth();
  const { count } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  // Keep the search box in sync with the URL (e.g. after "clear filters" or AI "see all results").
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    setQ(location.pathname === "/listings" ? sp.get("q") || "" : "");
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/listings?q=${encodeURIComponent(term)}` : "/listings");
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/listings");
  };

  const isStaff = user && (user.role === "admin" || user.role === "superadmin");

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`}>
      <div className="container header-inner">
        <Link to="/listings" className="logo" aria-label="MarketPlace home">
          <span className="logo-mark">
            <ShoppingBag size={20} />
          </span>
          <span className="logo-text">MarketPlace</span>
        </Link>

        <form className="header-search" onSubmit={handleSearch} role="search">
          <Search size={18} className="search-icon" />
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cars, phones, furniture…" aria-label="Search listings" />
          <button type="submit" className="btn btn-sm">
            Search
          </button>
        </form>

        <div className="header-actions">
          {user && (
            <>
              <Link to="/wishlist" className="icon-btn" aria-label={`Wishlist (${count})`} title="Wishlist">
                <Heart size={21} />
                {count > 0 && <span className="count-badge">{count > 99 ? "99+" : count}</span>}
              </Link>
              <Link to="/chat" className="icon-btn" aria-label="Chat" title="Chat">
                <MessageCircle size={21} />
              </Link>
            </>
          )}

          <Link to="/post-ad" className="btn btn-accent">
            <Plus size={18} />
            <span className="btn-label">Sell</span>
          </Link>

          {user ? (
            <div className="user-menu" ref={menuRef}>
              <button className="user-trigger" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen}>
                <span className="avatar sm">{initials(user.name || user.email)}</span>
                <ChevronDown size={16} />
              </button>
              {menuOpen && (
                <div className="dropdown" role="menu">
                  <div className="dropdown-head">
                    <strong>{user.name || "My account"}</strong>
                    <span>{user.email}</span>
                  </div>
                  <NavLink to="/account" role="menuitem">
                    <UserRound size={16} /> Account
                  </NavLink>
                  <NavLink to="/my-listings" role="menuitem">
                    <LayoutList size={16} /> My ads
                  </NavLink>
                  <NavLink to="/wishlist" role="menuitem">
                    <Heart size={16} /> Wishlist
                  </NavLink>
                  <NavLink to="/chat" role="menuitem">
                    <MessageCircle size={16} /> Chat
                  </NavLink>
                  {isStaff && (
                    <NavLink to="/admin" role="menuitem">
                      <ShieldCheck size={16} /> Admin dashboard
                    </NavLink>
                  )}
                  <hr />
                  <button className="danger" onClick={handleLogout} role="menuitem">
                    <LogOut size={16} /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn btn-outline">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
