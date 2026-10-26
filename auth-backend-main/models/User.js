const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false },

    // RBAC — "user" is the only role obtainable via public signup.
    // "admin" and "superadmin" are assigned only by a superadmin or the seed script.
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },

    // Email verification
    isVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    // Forgot / reset password
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordChangedAt: { type: Date },

    // Brute-force protection
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },

    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who created this account (for admin/superadmin created by superadmin)
  },
  { timestamps: true }
);

UserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

module.exports = mongoose.model("User", UserSchema);
