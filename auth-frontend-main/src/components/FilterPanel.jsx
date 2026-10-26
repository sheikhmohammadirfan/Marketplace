import { useEffect, useState } from "react";
import { LayoutGrid, X } from "lucide-react";
import { CATEGORIES, CONDITIONS, conditionLabel } from "../utils/constants";
import CategoryIcon from "./CategoryIcon";

// Sidebar filters. Category and condition apply immediately; price and city apply on "Apply".
export default function FilterPanel({ params, onChange, onClear, hasFilters, open, onClose }) {
  const [min, setMin] = useState(params.minPrice || "");
  const [max, setMax] = useState(params.maxPrice || "");
  const [city, setCity] = useState(params.city || "");

  // Keep inputs in sync when filters change elsewhere (chips, AI "see all", clear all).
  useEffect(() => {
    setMin(params.minPrice || "");
    setMax(params.maxPrice || "");
    setCity(params.city || "");
  }, [params.minPrice, params.maxPrice, params.city]);

  const selectedConditions = params.condition ? params.condition.split(",") : [];
  const toggleCondition = (c) => {
    const next = selectedConditions.includes(c) ? selectedConditions.filter((x) => x !== c) : [...selectedConditions, c];
    onChange({ condition: next });
  };

  const apply = (e) => {
    e.preventDefault();
    onChange({ minPrice: min, maxPrice: max, city: city.trim() });
  };

  return (
    <aside className={`filters card${open ? " open" : ""}`} aria-label="Filters">
      <div className="filters-head">
        <h3 style={{ margin: 0 }}>Filters</h3>
        <div className="row">
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={onClear}>
              Clear all
            </button>
          )}
          <button className="icon-btn sm filter-toggle" onClick={onClose} aria-label="Close filters">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="filter-group">
        <h4>Category</h4>
        <div className="filter-list">
          <button className={`filter-item${!params.category ? " active" : ""}`} onClick={() => onChange({ category: "" })}>
            <LayoutGrid size={16} /> All categories
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} className={`filter-item${params.category === c ? " active" : ""}`} onClick={() => onChange({ category: c })}>
              <CategoryIcon category={c} size={16} /> {c}
            </button>
          ))}
        </div>
      </div>

      <form className="filter-group" onSubmit={apply}>
        <h4>Price (₹)</h4>
        <div className="price-row">
          <input className="input" type="number" min={0} placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} aria-label="Minimum price" />
          <span className="muted">–</span>
          <input className="input" type="number" min={0} placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} aria-label="Maximum price" />
        </div>
        <h4 style={{ marginTop: 16 }}>Location</h4>
        <input className="input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} aria-label="City" />
        <button type="submit" className="btn btn-block btn-sm" style={{ marginTop: 12 }}>
          Apply
        </button>
      </form>

      <div className="filter-group">
        <h4>Condition</h4>
        <div className="stack" style={{ gap: 8 }}>
          {CONDITIONS.map((c) => (
            <label key={c} className="checkbox">
              <input type="checkbox" checked={selectedConditions.includes(c)} onChange={() => toggleCondition(c)} />
              {conditionLabel(c)}
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
