export function formatPrice(amount, currency = "INR") {
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return "";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function timeAgo(date) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const units = [
    [60, "min"],
    [3600, "hr"],
    [86400, "day"],
    [604800, "week"],
    [2592000, "month"],
    [31536000, "year"],
  ];
  let label = "min";
  let divisor = 60;
  for (const [secs, name] of units) {
    if (seconds >= secs) {
      divisor = secs;
      label = name;
    }
  }
  const n = Math.floor(seconds / divisor);
  return `${n} ${label}${n > 1 ? "s" : ""} ago`;
}

export function initials(name) {
  const clean = (name || "").trim();
  if (!clean) return "?";
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// Turns the assistant's filter object into a /listings query string.
export function filtersToQuery(filters = {}) {
  const params = new URLSearchParams();
  ["q", "category", "minPrice", "maxPrice", "city", "condition", "sort"].forEach((k) => {
    if (filters[k] !== null && filters[k] !== undefined && filters[k] !== "") params.set(k, filters[k]);
  });
  return params.toString();
}

export function getErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  return err?.response?.data?.message || fallback;
}
