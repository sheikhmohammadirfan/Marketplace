const mongoose = require("mongoose");

const CATEGORIES = [
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

const CONDITIONS = ["new", "like-new", "good", "fair", "poor"];

const ListingSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 3000 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    condition: { type: String, enum: CONDITIONS, default: "good" },
    // Photos are stored as data URIs for MVP simplicity (no cloud storage dependency).
    // For production scale, swap this for Cloudinary/S3 URLs instead.
    images: { type: [String], validate: (v) => v.length <= 6 },
    // Small (~480px) copy of the first photo. List pages only load this, never the full images,
    // which keeps browse/search/wishlist responses small and fast.
    thumbnail: {
      type: String,
      validate: (v) => !v || (v.startsWith("data:image/") && v.length <= 250000),
    },
    city: { type: String, trim: true, index: true },
    state: { type: String, trim: true },
    status: { type: String, enum: ["active", "sold", "removed"], default: "active", index: true },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ListingSchema.index({ status: 1, createdAt: -1 });
ListingSchema.index({ status: 1, category: 1, price: 1 });

ListingSchema.statics.CATEGORIES = CATEGORIES;
ListingSchema.statics.CONDITIONS = CONDITIONS;

module.exports = mongoose.model("Listing", ListingSchema);
