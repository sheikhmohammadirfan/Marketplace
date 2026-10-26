// One place that turns request parameters into a MongoDB filter + sort.
// Used by the browse page (GET /api/listings) AND the AI assistant, so both behave identically.
const Listing = require("../models/Listing");
const { escapeRegex } = require("./regex");

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { price: 1, createdAt: -1 },
  price_desc: { price: -1, createdAt: -1 },
  popular: { views: -1, createdAt: -1 },
};

// List responses never include the full-size photos (they can be several hundred KB each).
const CARD_PROJECTION = { images: 0 };

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function buildListingFilter(params = {}) {
  const filter = { status: "active" };

  if (typeof params.category === "string" && Listing.CATEGORIES.includes(params.category)) {
    filter.category = params.category;
  }

  const city = typeof params.city === "string" ? params.city.trim() : "";
  if (city) filter.city = new RegExp(escapeRegex(city), "i");

  const min = toNumber(params.minPrice);
  const max = toNumber(params.maxPrice);
  if (min !== null || max !== null) {
    filter.price = {};
    if (min !== null) filter.price.$gte = min;
    if (max !== null) filter.price.$lte = max;
  }

  const rawCond = Array.isArray(params.condition) ? params.condition : String(params.condition || "").split(",");
  const conditions = rawCond.map((c) => String(c).trim()).filter((c) => Listing.CONDITIONS.includes(c));
  if (conditions.length === 1) filter.condition = conditions[0];
  else if (conditions.length > 1) filter.condition = { $in: conditions };

  // Every search word must appear in the title or description (partial words work: "bik" finds "bike").
  const words = String(params.q || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  if (words.length) {
    filter.$and = words.map((w) => {
      const re = new RegExp(escapeRegex(w), "i");
      return { $or: [{ title: re }, { description: re }] };
    });
  }

  return filter;
}

function resolveSort(sort) {
  return SORTS[sort] || SORTS.newest;
}

module.exports = { buildListingFilter, resolveSort, SORTS, CARD_PROJECTION };
