const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/aiController");
const { authenticate } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

// Free AI tiers have tight request quotas, and every call costs something — cap usage per person/IP.
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many AI requests, please slow down and try again in a few minutes." },
});

// Public: anyone can chat with the shopping assistant while browsing.
router.post("/assistant", aiLimiter, ctrl.assistant);

// Authenticated: drafting an ad or pricing it implies you're selling.
router.post("/generate-listing", authenticate, aiLimiter, ctrl.generateListingDraft);
router.post("/suggest-price", authenticate, aiLimiter, ctrl.suggestPrice);

module.exports = router;
