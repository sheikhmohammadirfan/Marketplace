import { Link, useLocation } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { CATEGORIES } from "../utils/constants";
import CategoryIcon from "./CategoryIcon";

export default function CategoryBar() {
  const { pathname, search } = useLocation();
  const active = pathname === "/listings" ? new URLSearchParams(search).get("category") : null;

  return (
    <nav className="category-bar" aria-label="Categories">
      <div className="container category-scroll">
        <Link to="/listings" className={`category-link${pathname === "/listings" && !active ? " active" : ""}`}>
          <LayoutGrid size={16} /> All
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c} to={`/listings?category=${encodeURIComponent(c)}`} className={`category-link${active === c ? " active" : ""}`}>
            <CategoryIcon category={c} size={16} /> {c}
          </Link>
        ))}
      </div>
    </nav>
  );
}
