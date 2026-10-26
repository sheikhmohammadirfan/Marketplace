const { body, validationResult } = require("express-validator");

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// Enforces a reasonable password policy without being so strict it blocks real users:
// 8+ chars, at least one letter and one number.
const passwordRule = body("password")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters")
  .matches(/[A-Za-z]/)
  .withMessage("Password must contain at least one letter")
  .matches(/[0-9]/)
  .withMessage("Password must contain at least one number");

const registerValidators = [
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Please enter your name (2-100 characters)"),
  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
  passwordRule,
  handleValidation,
];

const loginValidators = [
  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidation,
];

const forgotPasswordValidators = [
  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
  handleValidation,
];

const resetPasswordValidators = [
  body("token").notEmpty().withMessage("Reset token is required"),
  passwordRule,
  handleValidation,
];

const changePasswordValidators = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    .matches(/[A-Za-z]/)
    .withMessage("New password must contain at least one letter")
    .matches(/[0-9]/)
    .withMessage("New password must contain at least one number"),
  handleValidation,
];

module.exports = {
  registerValidators,
  loginValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  changePasswordValidators,
  handleValidation,
};
