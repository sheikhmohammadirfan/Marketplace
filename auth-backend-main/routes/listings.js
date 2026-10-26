const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/listingController");
const { authenticate, optionalAuth, requireVerifiedEmail } = require("../middleware/auth");

// Public (optionalAuth lets the detail route tell the owner apart from other visitors)
router.get("/", ctrl.getListings);
router.get("/mine/all", authenticate, ctrl.getMyListings);
router.get("/:id", optionalAuth, ctrl.getListingById);

// Authenticated — must be a verified user to post (cuts down on spam/throwaway ads)
router.post("/", authenticate, requireVerifiedEmail, ctrl.createListing);
router.patch("/:id", authenticate, ctrl.updateListing);
router.patch("/:id/status", authenticate, ctrl.setListingStatus);
router.delete("/:id", authenticate, ctrl.deleteListing);

module.exports = router;
