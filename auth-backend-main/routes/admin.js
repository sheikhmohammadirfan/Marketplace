const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminController");
const { authenticate, authorize } = require("../middleware/auth");
const { body } = require("express-validator");
const { handleValidation } = require("../middleware/validators");

// Everything here requires an authenticated admin or superadmin.
router.use(authenticate, authorize("admin", "superadmin"));

router.get("/users", ctrl.listUsers);
router.get("/users/:userId", ctrl.getUser);
router.patch("/users/:userId/role", ctrl.updateUserRole);
router.patch("/users/:userId/status", ctrl.setUserStatus);
router.delete("/users/:userId", ctrl.deleteUser);
router.get("/audit-logs", ctrl.getAuditLogs);

// Only a superadmin creates staff accounts (admin/superadmin) — enforced again here in
// addition to the controller check, since this is the most sensitive endpoint in the app.
router.post(
  "/staff",
  authorize("superadmin"),
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }).matches(/[A-Za-z]/).matches(/[0-9]/),
    body("role").isIn(["admin", "superadmin"]),
    handleValidation,
  ],
  ctrl.createStaffUser
);

module.exports = router;
