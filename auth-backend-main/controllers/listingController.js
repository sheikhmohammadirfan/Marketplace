const mongoose = require("mongoose");
const Listing = require("../models/Listing");
const Wishlist = require("../models/Wishlist");
const { buildListingFilter, resolveSort, CARD_PROJECTION } = require("../utils/listingQuery");

const isStaff = (user) => user && (user.role === "admin" || user.role === "superadmin");
const IMAGE_RE = /^(data:image\/(png|jpe?g|webp|gif);base64,|https:\/\/)/i;

// Validates + normalises the fields shared by create and update. Returns { data } or { error }.
function parseListingBody(body, { partial }) {
  const data = {};
  const has = (k) => body[k] !== undefined;

  if (!partial || has("title")) {
    const title = String(body.title ?? "").trim();
    if (!title) return { error: "Title is required" };
    if (title.length > 120) return { error: "Title must be 120 characters or fewer" };
    data.title = title;
  }
  if (!partial || has("description")) {
    const description = String(body.description ?? "").trim();
    if (!description) return { error: "Description is required" };
    if (description.length > 3000) return { error: "Description must be 3000 characters or fewer" };
    data.description = description;
  }
  if (!partial || has("price")) {
    const price = Number(body.price);
    if (body.price === "" || body.price === null || !Number.isFinite(price) || price < 0) {
      return { error: "Price must be a number of 0 or more" };
    }
    data.price = price;
  }
  if (!partial || has("category")) {
    if (!Listing.CATEGORIES.includes(body.category)) {
      return { error: `Category must be one of: ${Listing.CATEGORIES.join(", ")}` };
    }
    data.category = body.category;
  }
  if (has("condition")) {
    if (!Listing.CONDITIONS.includes(body.condition)) return { error: "Invalid condition" };
    data.condition = body.condition;
  }
  if (has("images")) {
    if (!Array.isArray(body.images) || body.images.length > 6) return { error: "Maximum 6 images per listing" };
    if (!body.images.every((img) => typeof img === "string" && IMAGE_RE.test(img))) {
      return { error: "Images must be valid image data" };
    }
    data.images = body.images;
  }
  if (has("thumbnail")) {
    const t = body.thumbnail;
    if (t && (typeof t !== "string" || !t.startsWith("data:image/") || t.length > 250000)) {
      return { error: "Invalid thumbnail" };
    }
    data.thumbnail = t || "";
  }
  ["city", "state"].forEach((f) => {
    if (has(f)) data[f] = String(body[f] ?? "").trim().slice(0, 80);
  });

  return { data };
}

const createListing = async (req, res) => {
  try {
    const { data, error } = parseListingBody(req.body, { partial: false });
    if (error) return res.status(400).json({ message: error });

    const listing = await Listing.create({ ...data, seller: req.user.id });
    res.status(201).json({ listing });
  } catch (err) {
    console.error("Create listing error:", err);
    res.status(err.name === "ValidationError" ? 400 : 500).json({
      message: err.name === "ValidationError" ? err.message : "Internal server error",
    });
  }
};

// Public browse/search with filters + sorting. The AI assistant reuses the same query builder.
const getListings = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const filter = buildListingFilter(req.query);
    const sort = resolveSort(req.query.sort);

    const [listings, total] = await Promise.all([
      Listing.find(filter, CARD_PROJECTION)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("seller", "name"), // never expose seller emails on public pages
      Listing.countDocuments(filter),
    ]);

    res.json({ listings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("Get listings error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getListingById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Listing not found" });

    const listing = await Listing.findById(req.params.id).populate("seller", "name createdAt");
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    const isOwner = !!req.user && listing.seller?._id?.toString() === req.user.id;
    const staff = isStaff(req.user);

    // Ads taken down by moderation are only visible to the owner and staff.
    if (listing.status === "removed" && !isOwner && !staff) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Count a view only for other people — not the owner opening their own ad or the edit page.
    if (!isOwner) {
      Listing.updateOne({ _id: listing._id }, { $inc: { views: 1 } }).catch(() => {});
      listing.views += 1;
    }

    res.json({ listing });
  } catch (err) {
    console.error("Get listing error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getMyListings = async (req, res) => {
  try {
    const listings = await Listing.find({ seller: req.user.id }, CARD_PROJECTION).sort({ createdAt: -1 });
    res.json({ listings });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Loads a listing and checks the caller may manage it. Sends the error response itself and returns null on failure.
async function loadManageable(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ message: "Listing not found" });
    return null;
  }
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    res.status(404).json({ message: "Listing not found" });
    return null;
  }
  if (listing.seller.toString() !== req.user.id && !isStaff(req.user)) {
    res.status(403).json({ message: "You can only manage your own listings" });
    return null;
  }
  return listing;
}

const updateListing = async (req, res) => {
  try {
    const listing = await loadManageable(req, res);
    if (!listing) return;

    const { data, error } = parseListingBody(req.body, { partial: true });
    if (error) return res.status(400).json({ message: error });

    listing.set(data);
    await listing.save();
    res.json({ listing });
  } catch (err) {
    console.error("Update listing error:", err);
    res.status(err.name === "ValidationError" ? 400 : 500).json({
      message: err.name === "ValidationError" ? err.message : "Internal server error",
    });
  }
};

const setListingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "sold", "removed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const listing = await loadManageable(req, res);
    if (!listing) return;

    // An ad removed by moderation can only be restored by staff, not by its owner.
    if (listing.status === "removed" && !isStaff(req.user)) {
      return res.status(403).json({ message: "This listing was removed by a moderator" });
    }

    listing.status = status;
    await listing.save();
    res.json({ listing });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteListing = async (req, res) => {
  try {
    const listing = await loadManageable(req, res);
    if (!listing) return;

    await listing.deleteOne();
    await Wishlist.deleteMany({ listing: listing._id });
    res.json({ message: "Listing deleted" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createListing,
  getListings,
  getListingById,
  getMyListings,
  updateListing,
  setListingStatus,
  deleteListing,
};
