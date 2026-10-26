const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { loginLimiter, signupLimiter, forgotPasswordLimiter } = require("../middleware/rateLimit");
const {
  registerValidators,
  loginValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  changePasswordValidators,
} = require("../middleware/validators");

// Public
router.post("/register", signupLimiter, registerValidators, ctrl.register);
router.post("/verify-email", ctrl.verifyEmail);
router.post("/resend-verification", signupLimiter, ctrl.resendVerification);
router.post("/login", loginLimiter, loginValidators, ctrl.login);
router.post("/refresh", ctrl.refresh);
router.post("/forgot-password", forgotPasswordLimiter, forgotPasswordValidators, ctrl.forgotPassword);
router.post("/reset-password", resetPasswordValidators, ctrl.resetPassword);

// Authenticated
router.post("/logout", authenticate, ctrl.logout);
router.post("/logout-all", authenticate, ctrl.logoutAll);
router.get("/sessions", authenticate, ctrl.listSessions);
router.post("/change-password", authenticate, changePasswordValidators, ctrl.changePassword);
router.get("/me", authenticate, ctrl.getCurrentUser);

module.exports = router;
