const mongoose = require("mongoose");

// One row per (user, listing) pair — a user's saved/favourited ads.
const WishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  },
  { timestamps: true }
);

WishlistSchema.index({ user: 1, listing: 1 }, { unique: true });

module.exports = mongoose.model("Wishlist", WishlistSchema);
