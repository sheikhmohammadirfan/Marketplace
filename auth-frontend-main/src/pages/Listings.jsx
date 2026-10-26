import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, SearchX, SlidersHorizontal, Sparkles, X } from "lucide-react";
import API from "../utils/api";
import ListingCard, { ListingCardSkeleton } from "../components/ListingCard";
import FilterPanel from "../components/FilterPanel";
import { SORT_OPTIONS, conditionLabel } from "../utils/constants";
import { formatPrice, getErrorMessage } from "../utils/format";

const PAGE_SIZE = 12;
const FILTER_KEYS = ["category", "minPrice", "maxPrice", "city", "condition", "q"];

export default function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => Object.fromEntries(searchParams), [searchParams]);
  const queryString = searchParams.toString();

  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const hasFilters = FILTER_KEYS.some((k) => params[k]);
  const sort = params.sort || "newest";
  const page = Number(params.page) || 1;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    API.get("/listings", { params: { ...params, limit: PAGE_SIZE } })
      .then((res) => {
        if (cancelled) return;
        setListings(res.data.listings);
        setPagination(res.data.pagination);
        setError("");
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, "Failed to load listings")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  // Merge a change into the URL. Filters live in the address bar, so results are shareable and Back works.
  const update = (patch, { keepPage = false } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      const v = Array.isArray(value) ? value.join(",") : value;
      if (v === undefined || v === null || v === "") next.delete(key);
      else next.set(key, v);
    });
    if (!keepPage) next.delete("page");
    setSearchParams(next);
  };

  const clearAll = () => {
    const next = new URLSearchParams();
    if (params.sort) next.set("sort", params.sort);
    setSearchParams(next);
  };

  const goToPage = (p) => {
    update({ page: p === 1 ? "" : p }, { keepPage: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const chips = [
    params.q && { key: "q", label: `“${params.q}”` },
    params.category && { key: "category", label: params.category },
    (params.minPrice || params.maxPrice) && {
      key: "price",
      label: `${params.minPrice ? formatPrice(params.minPrice) : "Any"} – ${params.maxPrice ? formatPrice(params.maxPrice) : "Any"}`,
    },
    params.city && { key: "city", label: params.city },
    ...(params.condition ? params.condition.split(",").map((c) => ({ key: `cond:${c}`, label: conditionLabel(c), cond: c })) : []),
  ].filter(Boolean);

  const removeChip = (chip) => {
    if (chip.key === "price") update({ minPrice: "", maxPrice: "" });
    else if (chip.cond) update({ condition: params.condition.split(",").filter((c) => c !== chip.cond) });
    else update({ [chip.key]: "" });
  };

  const title = params.q ? `Results for “${params.q}”` : params.category || "Fresh recommendations";

  return (
    <>
      {!hasFilters && page === 1 && (
        <>
          <section className="hero">
            <div style={{ position: "relative", zIndex: 1 }}>
              <h1>Buy and sell anything, near you.</h1>
              <p>Browse thousands of ads, chat with sellers instantly, or ask our AI assistant to find exactly what you need.</p>
              <div className="row wrap">
                <Link to="/post-ad" className="btn btn-accent btn-lg">
                  <Plus size={18} /> Start selling
                </Link>
                <span className="row small" style={{ color: "rgba(255,255,255,.9)" }}>
                  <Sparkles size={16} /> Try the AI assistant in the corner
                </span>
              </div>
            </div>
            <Sparkles size={150} className="hero-art" />
          </section>

        </>
      )}

      <div className="listing-layout">
        <FilterPanel params={params} onChange={(patch) => update(patch)} onClear={clearAll} hasFilters={hasFilters} open={showFilters} onClose={() => setShowFilters(false)} />

        <section>
          <div className="toolbar">
            <div>
              <h2>{title}</h2>
              <span className="muted small">{loading ? "Loading…" : `${pagination.total} ad${pagination.total === 1 ? "" : "s"} found`}</span>
            </div>
            <div className="row">
              <button className="btn btn-outline filter-toggle" onClick={() => setShowFilters((s) => !s)}>
                <SlidersHorizontal size={16} /> Filters
              </button>
              <select className="select" value={sort} onChange={(e) => update({ sort: e.target.value === "newest" ? "" : e.target.value })} aria-label="Sort by">
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    Sort: {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="chips">
              {chips.map((chip) => (
                <span key={chip.key} className="chip">
                  {chip.label}
                  <button onClick={() => removeChip(chip)} aria-label={`Remove filter ${chip.label}`}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {error && <div className="alert alert-error" style={{ marginBottom: 14 }}><p>{error}</p></div>}

          {loading ? (
            <div className="listing-grid">
              {Array.from({ length: 8 }, (_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">
                <SearchX size={28} />
              </span>
              <h3>No ads found</h3>
              <p>{hasFilters ? "Try removing some filters or searching for something else." : "Nothing has been posted yet — be the first!"}</p>
              {hasFilters ? (
                <button className="btn" onClick={clearAll}>Clear filters</button>
              ) : (
                <Link to="/post-ad" className="btn">Post an ad</Link>
              )}
            </div>
          ) : (
            <>
              <div className="listing-grid">
                {listings.map((l) => (
                  <ListingCard key={l._id} listing={l} />
                ))}
              </div>
              {pagination.pages > 1 && (
                <nav className="pagination" aria-label="Pagination">
                  <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Previous</button>
                  <span className="muted small">Page {pagination.page} of {pagination.pages}</span>
                  <button className="btn btn-outline btn-sm" disabled={page >= pagination.pages} onClick={() => goToPage(page + 1)}>Next</button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
