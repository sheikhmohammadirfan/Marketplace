const mongoose = require("mongoose");

// We never store the raw refresh token — only its SHA-256 hash.
// Rotation + reuse detection: each refresh issues a new token and revokes the old one.
// If a revoked/used token is presented again, it's a signal of theft — we revoke the whole family.
const RefreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true }, // shared id across a rotation chain
    userAgent: { type: String },
    ip: { type: String },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedByTokenHash: { type: String },
  },
  { timestamps: true }
);

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Mongo TTL cleanup

RefreshTokenSchema.methods.isActive = function () {
  return !this.revokedAt && this.expiresAt > new Date();
};

module.exports = mongoose.model("RefreshToken", RefreshTokenSchema);
