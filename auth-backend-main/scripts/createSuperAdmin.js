// Bootstraps the very first superadmin account.
// Run locally or as a one-off Render job — never expose this as an HTTP endpoint.
//
// Usage:
//   SUPERADMIN_EMAIL=you@example.com SUPERADMIN_PASSWORD='StrongPass123' node scripts/createSuperAdmin.js
//
// Or set SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD in your .env before running `npm run seed:superadmin`.

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");

async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !password) {
    console.error("❌ Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD before running this script.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("❌ SUPERADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB");

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`⚠️  A user with email ${email} already exists (role: ${existing.role}).`);
    if (existing.role !== "superadmin") {
      existing.role = "superadmin";
      existing.isVerified = true;
      await existing.save();
      console.log("✅ Existing user promoted to superadmin.");
    }
  } else {
    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({
      name: process.env.SUPERADMIN_NAME || "Super Admin",
      email,
      password: hashedPassword,
      role: "superadmin",
      isVerified: true,
    });
    console.log(`✅ Superadmin account created for ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Failed to create superadmin:", err);
  process.exit(1);
});
