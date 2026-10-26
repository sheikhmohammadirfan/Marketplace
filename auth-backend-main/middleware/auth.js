const { verifyAccessToken } = require("../utils/tokens");
const User = require("../models/User");

// Reads the access token from the httpOnly cookie (preferred) or Authorization header
// (fallback, useful for non-browser clients / Postman testing).
function extractToken(req) {
  if (req.cookies?.access_token) return req.cookies.access_token;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.split(" ")[1];
  return null;
}

// Verifies the token and loads a live user snapshot so suspended/deleted users are rejected
// immediately, not just when their JWT expires. Returns { user } or { error: {status, message} }.
async function resolveUser(req) {
  const token = extractToken(req);
  if (!token) return { error: { status: 401, message: "Authentication required" } };

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    return { error: { status: 401, message: "Invalid or expired session" } };
  }

  const user = await User.findById(decoded.sub).select("email role status isVerified");
  if (!user) return { error: { status: 401, message: "Invalid or expired session" } };
  if (user.status === "suspended") return { error: { status: 403, message: "Account suspended" } };

  return {
    user: { id: user._id.toString(), email: user.email, role: user.role, isVerified: user.isVerified },
  };
}

async function authenticate(req, res, next) {
  try {
    const { user, error } = await resolveUser(req);
    if (error) return res.status(error.status).json({ message: error.message });
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ message: "Invalid or expired session" });
  }
}

// For public pages that behave slightly differently for a logged-in viewer
// (e.g. don't count the owner's own visits as views). Never blocks the request.
async function optionalAuth(req, res, next) {
  try {
    const { user } = await resolveUser(req);
    if (user) req.user = user;
  } catch {
    /* treat as guest */
  }
  next();
}

// Role-based access control. Usage: authorize("admin", "superadmin")
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Authentication required" });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

function requireVerifiedEmail(req, res, next) {
  if (!req.user?.isVerified) {
    return res.status(403).json({ message: "Please verify your email to continue" });
  }
  next();
}

module.exports = { authenticate, optionalAuth, authorize, requireVerifiedEmail };
