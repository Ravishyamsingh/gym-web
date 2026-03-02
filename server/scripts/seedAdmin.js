/**
 * Seed script: elevates the ADMIN_EMAIL user to the "admin" role.
 *
 * Usage:
 *   1. Make sure MONGO_URI and ADMIN_EMAIL are set in .env
 *   2. Run:  npm run seed:admin
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error("❌ ADMIN_EMAIL is not set in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const user = await User.findOne({ email: adminEmail.toLowerCase() });
  if (!user) {
    console.log(`⚠️  No user found with email "${adminEmail}". Register first, then re-run this script.`);
  } else {
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
