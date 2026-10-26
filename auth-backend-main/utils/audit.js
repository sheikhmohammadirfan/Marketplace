const AuditLog = require("../models/AuditLog");

// Never throws — audit logging must never break the main request flow.
async function logAudit({ req, actor, actorEmail, action, targetUser, meta }) {
  try {
    await AuditLog.create({
      actor: actor || null,
      actorEmail: actorEmail || null,
      action,
      targetUser: targetUser || null,
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"],
      meta,
    });
  } catch (err) {
    console.error("⚠️ Audit log write failed:", err.message);
  }
}

module.exports = { logAudit };
