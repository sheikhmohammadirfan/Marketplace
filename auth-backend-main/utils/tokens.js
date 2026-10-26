const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

// Raw refresh token = random bytes. We only ever persist its hash.
function generateRefreshTokenRaw() {
  return crypto.randomBytes(48).toString("hex");
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function refreshExpiryDate() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

// Used for email verification + password reset links.
// We send the raw token in the email link and store only its hash + expiry.
function generateOneTimeToken(ttlMinutes) {
  const raw = crypto.randomBytes(32).toString("hex");
  return {
    raw,
    hash: hashToken(raw),
    expires: new Date(Date.now() + ttlMinutes * 60 * 1000),
  };
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshTokenRaw,
  hashToken,
  refreshExpiryDate,
  generateOneTimeToken,
  REFRESH_TOKEN_TTL_DAYS,
};
