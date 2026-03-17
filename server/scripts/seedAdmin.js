/**
 * Seed script: elevates configured admin email users to the "admin" role.
 *
 * Usage:
 *   1. Make sure MONGO_URI and ADMIN_EMAIL/ADMIN_EMAILS are set in .env
 *   2. Run:  npm run seed:admin
 */
require("../config/loadEnv");
const mongoose = require("mongoose");
const User = require("../models/User");

async function seedAdmin() {
  const adminEmails = [process.env.ADMIN_EMAIL || "", process.env.ADMIN_EMAILS || ""]
    .join(",")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.length) {
    console.error("❌ ADMIN_EMAIL or ADMIN_EMAILS is not set in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  for (const adminEmail of adminEmails) {
    const user = await User.findOne({ email: adminEmail });
    if (!user) {
      console.log(`⚠️  No user found with email "${adminEmail}". Register first, then re-run this script.`);
      continue;
    }

    user.role = "admin";
    await user.save();
    console.log(`✅ ${user.name} (${user.email}) is now an admin.`);
  }

  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
