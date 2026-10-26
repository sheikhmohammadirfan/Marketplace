export const CATEGORIES = [
  "Vehicles",
  "Property",
  "Electronics",
  "Furniture",
  "Fashion",
  "Jobs",
  "Books & Hobbies",
  "Pets",
  "Other",
];

export const CONDITIONS = ["new", "like-new", "good", "fair", "poor"];

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "popular", label: "Most viewed" },
];

export const conditionLabel = (c) => (c ? c.replace("-", " ").replace(/^\w/, (x) => x.toUpperCase()) : "");
