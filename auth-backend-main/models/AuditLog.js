const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who performed the action (null for anonymous/failed attempts)
    actorEmail: { type: String }, // captured even if login failed / user not found
    action: {
      type: String,
      required: true,
      enum: [
        "SIGNUP",
        "LOGIN_SUCCESS",
        "LOGIN_FAILURE",
        "ACCOUNT_LOCKED",
        "LOGOUT",
        "LOGOUT_ALL",
        "TOKEN_REFRESH",
        "TOKEN_REUSE_DETECTED",
        "PASSWORD_FORGOT_REQUEST",
        "PASSWORD_RESET",
        "PASSWORD_CHANGE",
        "EMAIL_VERIFIED",
        "EMAIL_VERIFICATION_RESENT",
        "ROLE_CHANGED",
        "USER_SUSPENDED",
        "USER_REACTIVATED",
        "USER_DELETED",
      ],
      index: true,
    },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // affected user, if different from actor
    ip: { type: String },
    userAgent: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", AuditLogSchema);
