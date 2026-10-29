const bcrypt = require("bcrypt");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const {
  signAccessToken,
  generateRefreshTokenRaw,
  hashToken,
  refreshExpiryDate,
  generateOneTimeToken,
} = require("../utils/tokens");
const { setAuthCookies, clearAuthCookies } = require("../utils/cookies");
const { sendVerificationEmail, sendPasswordResetEmail, sendAccountLockedEmail } = require("../utils/email");
const { logAudit } = require("../utils/audit");
const crypto = require("crypto");

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const BCRYPT_ROUNDS = 12;

// ---------- helpers ----------

async function issueSession(res, user, req) {
  const accessToken = signAccessToken(user);
  const rawRefresh = generateRefreshTokenRaw();
  const family = crypto.randomUUID();

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(rawRefresh),
    family,
    userAgent: req.headers["user-agent"],
    ip: req.ip,
    expiresAt: refreshExpiryDate(),
  });

  setAuthCookies(res, { accessToken, refreshToken: rawRefresh });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    status: user.status,
    createdAt: user.createdAt,
  };
}

// ---------- controllers ----------

// Public self-registration. Always creates role="user" — admin/superadmin
// accounts cannot be created through this endpoint, on purpose.
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      // Same response whether or not the email exists, to avoid leaking account existence.
      return res.status(201).json({
        message: "If this email isn't already registered, a verification link has been sent.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { raw, hash, expires } = generateOneTimeToken(24 * 60); // 24h

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      isVerified: false,
      emailVerificationTokenHash: hash,
      emailVerificationExpires: expires,
    });

    const verifyLink = `${process.env.FRONTEND_URL}/verify-email?token=${raw}`;
    await sendVerificationEmail(email, verifyLink);
    await logAudit({ req, actor: user._id, actorEmail: email, action: "SIGNUP" });

    res.status(201).json({
      message: "If this email isn't already registered, a verification link has been sent.",
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required" });

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    }).select("+emailVerificationTokenHash +emailVerificationExpires");

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification link" });
    }

    user.isVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    await logAudit({ req, actor: user._id, actorEmail: user.email, action: "EMAIL_VERIFIED" });
    res.json({ message: "Email verified successfully. You can now log in." });
  } catch (err) {
    console.error("Verify email error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always respond the same way to avoid leaking whether the account exists.
    if (!user || user.isVerified) {
      return res.json({ message: "If this account needs verification, an email has been sent." });
    }

    const { raw, hash, expires } = generateOneTimeToken(24 * 60);
    user.emailVerificationTokenHash = hash;
    user.emailVerificationExpires = expires;
    await user.save();

    const verifyLink = `${process.env.FRONTEND_URL}/verify-email?token=${raw}`;
    await sendVerificationEmail(email, verifyLink);
    await logAudit({ req, actor: user._id, actorEmail: email, action: "EMAIL_VERIFICATION_RESENT" });

    res.json({ message: "If this account needs verification, an email has been sent." });
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select(
      "+password +failedLoginAttempts +lockUntil"
    );

    if (!user) {
      await logAudit({ req, actorEmail: email, action: "LOGIN_FAILURE", meta: { reason: "no_such_user" } });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.isLocked()) {
      await logAudit({ req, actor: user._id, actorEmail: email, action: "LOGIN_FAILURE", meta: { reason: "locked" } });
      return res.status(423).json({
        message: "Account temporarily locked due to too many failed attempts. Try again later or reset your password.",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "This account has been suspended" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        user.failedLoginAttempts = 0;
        await user.save();
        await sendAccountLockedEmail(user.email);
        await logAudit({ req, actor: user._id, actorEmail: email, action: "ACCOUNT_LOCKED" });
      } else {
        await user.save();
      }

      await logAudit({ req, actor: user._id, actorEmail: email, action: "LOGIN_FAILURE", meta: { reason: "bad_password" } });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Successful login — reset lockout counters
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;
    await user.save();

    await issueSession(res, user, req);
    await logAudit({ req, actor: user._id, actorEmail: email, action: "LOGIN_SUCCESS" });

    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Rotates the refresh token on every use. If a token that's already been
// revoked/replaced is presented, the whole token family is revoked — that
// pattern only happens if a stolen refresh token is being replayed.
const refresh = async (req, res) => {
  try {
     console.log("REFRESH COOKIE RECEIVED:", Boolean(req.cookies?.refresh_token));
    const rawToken = req.cookies?.refresh_token;
    if (!rawToken) return res.status(401).json({ message: "No refresh token provided" });

    const tokenHash = hashToken(rawToken);
    const stored = await RefreshToken.findOne({ tokenHash });

    if (!stored) {
      clearAuthCookies(res);
      return res.status(401).json({ message: "Invalid session, please log in again" });
    }

    if (stored.revokedAt || stored.expiresAt < new Date()) {
      // Reuse of a dead token — treat as compromise and kill the whole family.
      await RefreshToken.updateMany(
        { family: stored.family, revokedAt: null },
        { revokedAt: new Date() }
      );
      await logAudit({ req, actor: stored.user, action: "TOKEN_REUSE_DETECTED", meta: { family: stored.family } });
      clearAuthCookies(res);
      return res.status(401).json({ message: "Session invalid, please log in again" });
    }

    const user = await User.findById(stored.user);
    if (!user || user.status === "suspended") {
      clearAuthCookies(res);
      return res.status(401).json({ message: "Invalid session, please log in again" });
    }

    // Rotate: revoke old, issue new in the same family
    const newRawRefresh = generateRefreshTokenRaw();
    const newHash = hashToken(newRawRefresh);

    stored.revokedAt = new Date();
    stored.replacedByTokenHash = newHash;
    await stored.save();

    await RefreshToken.create({
      user: user._id,
      tokenHash: newHash,
      family: stored.family,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      expiresAt: refreshExpiryDate(),
    });

    const accessToken = signAccessToken(user);
    setAuthCookies(res, { accessToken, refreshToken: newRawRefresh });

    await logAudit({ req, actor: user._id, actorEmail: user.email, action: "TOKEN_REFRESH" });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const logout = async (req, res) => {
  try {
    const rawToken = req.cookies?.refresh_token;
    if (rawToken) {
      await RefreshToken.updateOne({ tokenHash: hashToken(rawToken) }, { revokedAt: new Date() });
    }
    clearAuthCookies(res);
    if (req.user) {
      await logAudit({ req, actor: req.user.id, actorEmail: req.user.email, action: "LOGOUT" });
    }
    res.json({ message: "Logged out" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Revokes every refresh token for the user — "log out of all devices".
const logoutAll = async (req, res) => {
  try {
    await RefreshToken.updateMany(
      { user: req.user.id, revokedAt: null },
      { revokedAt: new Date() }
    );
    clearAuthCookies(res);
    await logAudit({ req, actor: req.user.id, actorEmail: req.user.email, action: "LOGOUT_ALL" });
    res.json({ message: "Logged out of all devices" });
  } catch (err) {
    console.error("Logout all error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const listSessions = async (req, res) => {
  try {
    const sessions = await RefreshToken.find({ user: req.user.id, revokedAt: null })
      .select("userAgent ip createdAt expiresAt")
      .sort({ createdAt: -1 });
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always respond identically — do not reveal whether the email is registered.
    const genericResponse = { message: "If that email is registered, a reset link has been sent." };

    if (!user) return res.json(genericResponse);

    const { raw, hash, expires } = generateOneTimeToken(30); // 30 min
    user.passwordResetTokenHash = hash;
    user.passwordResetExpires = expires;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${raw}`;
    await sendPasswordResetEmail(email, resetLink);
    await logAudit({ req, actor: user._id, actorEmail: email, action: "PASSWORD_FORGOT_REQUEST" });

    res.json(genericResponse);
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const tokenHash = hashToken(token);

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpires");

    if (!user) return res.status(400).json({ message: "Invalid or expired reset link" });

    user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Resetting the password invalidates every existing session — a stolen
    // session shouldn't survive a password reset.
    await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
    clearAuthCookies(res);

    await logAudit({ req, actor: user._id, actorEmail: user.email, action: "PASSWORD_RESET" });
    res.json({ message: "Password reset successfully. Please log in with your new password." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select("+password");

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) return res.status(401).json({ message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.passwordChangedAt = new Date();
    await user.save();

    // Keep the current session alive, but kill every other session/device.
    const currentRaw = req.cookies?.refresh_token;
    const currentHash = currentRaw ? hashToken(currentRaw) : null;
    await RefreshToken.updateMany(
      { user: user._id, revokedAt: null, tokenHash: { $ne: currentHash } },
      { revokedAt: new Date() }
    );

    await logAudit({ req, actor: user._id, actorEmail: user.email, action: "PASSWORD_CHANGE" });
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  refresh,
  logout,
  logoutAll,
  listSessions,
  forgotPassword,
  resetPassword,
  changePassword,
  getCurrentUser,
  publicUser,
};
