const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/wishlistController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/", ctrl.getWishlist);
router.get("/ids", ctrl.getWishlistIds);
router.post("/:listingId", ctrl.addToWishlist);
router.delete("/:listingId", ctrl.removeFromWishlist);

module.exports = router;
