// Frontend (Vercel) and backend (Render) live on different domains, so cookies must be
// SameSite=None + Secure to be sent cross-site. That requires HTTPS everywhere, which
// both Vercel and Render give you by default.
const isProd = process.env.NODE_ENV === "production";

console.log("COOKIE DEBUG:", {
  NODE_ENV: process.env.NODE_ENV,
  isProd,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
});

const baseCookieOptions = {
  httpOnly: true,
  secure: isProd, // must be true in production (HTTPS); relaxed locally over http
  sameSite: isProd ? "none" : "lax",
  path: "/",
};

function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie("access_token", accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000, // 15 min, mirrors ACCESS_TOKEN_TTL
  });
  res.cookie("refresh_token", refreshToken, {
    ...baseCookieOptions,
    maxAge: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30) * 24 * 60 * 60 * 1000,
    path: "/api/auth", // only sent to auth endpoints (refresh/logout) — reduces exposure
  });
}

function clearAuthCookies(res) {
  res.clearCookie("access_token", { ...baseCookieOptions });
  res.clearCookie("refresh_token", { ...baseCookieOptions, path: "/api/auth" });
}

module.exports = { setAuthCookies, clearAuthCookies, baseCookieOptions };
