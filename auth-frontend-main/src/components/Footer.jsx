import { Link } from "react-router-dom";
import { ShieldAlert, ShoppingBag } from "lucide-react";
import { CATEGORIES } from "../utils/constants";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link to="/listings" className="logo">
              <span className="logo-mark">
                <ShoppingBag size={20} />
              </span>
              <span className="logo-text">MarketPlace</span>
            </Link>
            <p>Buy and sell anything near you — chat directly with sellers, save your favourites and let our AI assistant do the searching.</p>
            <div className="safety-note">
              <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Stay safe: meet in a public place and never pay in advance.</span>
            </div>
          </div>
          <div>
            <h4>Marketplace</h4>
            <ul>
              <li><Link to="/listings">Browse all ads</Link></li>
              <li><Link to="/post-ad">Post an ad</Link></li>
              <li><Link to="/wishlist">Wishlist</Link></li>
            </ul>
          </div>
          <div>
            <h4>Categories</h4>
            <ul>
              {CATEGORIES.slice(0, 5).map((c) => (
                <li key={c}><Link to={`/listings?category=${encodeURIComponent(c)}`}>{c}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Your account</h4>
            <ul>
              <li><Link to="/account">Profile &amp; security</Link></li>
              <li><Link to="/my-listings">My ads</Link></li>
              <li><Link to="/chat">Messages</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} MarketPlace. All rights reserved.</span>
          <span>Made for buyers and sellers everywhere.</span>
        </div>
      </div>
    </footer>
  );
}
