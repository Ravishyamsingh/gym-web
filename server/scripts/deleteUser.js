#!/usr/bin/env node

require("../config/loadEnv");
const mongoose = require("mongoose");
const User = require("../models/User");
const Payment = require("../models/Payment");
const Attendance = require("../models/Attendance");
const MembershipHistory = require("../models/MembershipHistory");
const AdminAuditLog = require("../models/AdminAuditLog");

const email = process.argv[2];

if (!email) {
  console.error("❌ Usage: node deleteUser.js <email>");
  process.exit(1);
}

(async () => {
  try {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`🗑️ DELETE USER SCRIPT`);
    console.log(`Target Email: ${email}`);
    console.log(`${"=".repeat(70)}`);

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
    });
    console.log("✅ Connected to MongoDB");

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    const userId = user._id;
    console.log(`✅ User found: ${user.name} (ID: ${userId})`);

    // Delete all related data
    const paymentResult = await Payment.deleteMany({ userId });
    console.log(`🗑️ Deleted ${paymentResult.deletedCount} payment(s)`);

    const attendanceResult = await Attendance.deleteMany({ userId });
    console.log(`🗑️ Deleted ${attendanceResult.deletedCount} attendance record(s)`);

    const membershipResult = await MembershipHistory.deleteMany({ userId });
    console.log(`🗑️ Deleted ${membershipResult.deletedCount} membership history record(s)`);

    const auditResult = await AdminAuditLog.deleteMany({ targetUserId: userId });
    console.log(`🗑️ Deleted ${auditResult.deletedCount} audit log(s)`);

    // Delete user
    const userResult = await User.deleteOne({ _id: userId });
    console.log(`🗑️ Deleted user account`);

    console.log(`${"=".repeat(70)}`);
    console.log(`✅ USER DELETION COMPLETE`);
    console.log(`Total records deleted: ${
      paymentResult.deletedCount +
      attendanceResult.deletedCount +
      membershipResult.deletedCount +
      auditResult.deletedCount +
      userResult.deletedCount
    }`);
    console.log(`${"=".repeat(70)}\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(`❌ Error:`, err.message);
    process.exit(1);
  }
})();
