const bcrypt = require("bcrypt");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const AuditLog = require("../models/AuditLog");
const { logAudit } = require("../utils/audit");
const { escapeRegex } = require("../utils/regex");
const { publicUser } = require("./authController");

const BCRYPT_ROUNDS = 12;

const listUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 25);
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.q) filter.email = { $regex: escapeRegex(req.query.q), $options: "i" };

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      users: users.map(publicUser),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Only a superadmin can create admin/superadmin accounts — never done via
// public signup. This is the sanctioned way to grant elevated access.
const createStaffUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!["admin", "superadmin"].includes(role)) {
      return res.status(400).json({ message: "Role must be 'admin' or 'superadmin'" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "A user with this email already exists" });

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isVerified: true, // staff accounts created by a superadmin are pre-verified
      createdBy: req.user.id,
    });

    await logAudit({
      req,
      actor: req.user.id,
      actorEmail: req.user.email,
      action: "ROLE_CHANGED",
      targetUser: user._id,
      meta: { newRole: role, via: "created_by_superadmin" },
    });

    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    console.error("Create staff user error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin", "superadmin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (req.params.userId === req.user.id) {
      return res.status(400).json({ message: "You cannot change your own role" });
    }

    // Only a superadmin may grant admin/superadmin, or modify an existing admin/superadmin.
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const escalating = role !== "user";
    const targetIsStaff = user.role !== "user";
    if ((escalating || targetIsStaff) && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only a superadmin can manage staff roles" });
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    // A demoted/promoted user should re-authenticate under their new privileges.
    await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });

    await logAudit({
      req,
      actor: req.user.id,
      actorEmail: req.user.email,
      action: "ROLE_CHANGED",
      targetUser: user._id,
      meta: { previousRole, newRole: role },
    });

    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const setUserStatus = async (req, res) => {
  try {
    const { status } = req.body; // "active" | "suspended"
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ message: "You cannot change your own status" });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Regular admins can only suspend/reactivate ordinary users, not other staff.
    if (user.role !== "user" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only a superadmin can manage staff accounts" });
    }

    user.status = status;
    await user.save();

    if (status === "suspended") {
      await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
    }

    await logAudit({
      req,
      actor: req.user.id,
      actorEmail: req.user.email,
      action: status === "suspended" ? "USER_SUSPENDED" : "USER_REACTIVATED",
      targetUser: user._id,
    });

    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("Set status error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ message: "User not found" });

    if (target.role !== "user" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only a superadmin can delete staff accounts" });
    }

    const user = await User.findByIdAndDelete(req.params.userId);
    await RefreshToken.deleteMany({ user: user._id });

    await logAudit({
      req,
      actor: req.user.id,
      actorEmail: req.user.email,
      action: "USER_DELETED",
      targetUser: user._id,
      meta: { deletedEmail: user.email, deletedRole: user.role },
    });

    res.json({ message: "User deleted", deletedUser: { email: user.email, role: user.role } });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const filter = {};
    if (req.query.action) filter.action = req.query.action;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("actor", "email role")
        .populate("targetUser", "email role"),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("Get audit logs error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  listUsers,
  getUser,
  createStaffUser,
  updateUserRole,
  setUserStatus,
  deleteUser,
  getAuditLogs,
};
