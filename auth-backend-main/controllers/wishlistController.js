const mongoose = require("mongoose");
const Wishlist = require("../models/Wishlist");
const Listing = require("../models/Listing");

// Full saved listings for the Wishlist page (cards only — no full-size photos).
const getWishlist = async (req, res) => {
  try {
    const entries = await Wishlist.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate({ path: "listing", select: "-images", populate: { path: "seller", select: "name" } });

    // A saved ad may have been deleted or removed since — silently skip those.
    const listings = entries.map((e) => e.listing).filter((l) => l && l.status !== "removed");
    res.json({ listings });
  } catch (err) {
    console.error("Get wishlist error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Just the ids — lets every heart icon on the site know instantly whether it is filled.
const getWishlistIds = async (req, res) => {
  try {
    const entries = await Wishlist.find({ user: req.user.id }).select("listing");
    res.json({ ids: entries.map((e) => e.listing.toString()) });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { listingId } = req.params;
    if (!mongoose.isValidObjectId(listingId)) return res.status(400).json({ message: "Invalid listing id" });

    const listing = await Listing.findById(listingId).select("status");
    if (!listing || listing.status === "removed") return res.status(404).json({ message: "Listing not found" });

    // Upsert keeps this idempotent: double-clicking the heart can never create duplicates.
    await Wishlist.updateOne(
      { user: req.user.id, listing: listingId },
      { $setOnInsert: { user: req.user.id, listing: listingId } },
      { upsert: true }
    );
    res.status(201).json({ wishlisted: true });
  } catch (err) {
    console.error("Add to wishlist error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { listingId } = req.params;
    if (!mongoose.isValidObjectId(listingId)) return res.status(400).json({ message: "Invalid listing id" });
    await Wishlist.deleteOne({ user: req.user.id, listing: listingId });
    res.json({ wishlisted: false });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getWishlist, getWishlistIds, addToWishlist, removeFromWishlist };
