#!/usr/bin/env node

/**
 * Reset All Memberships Script
 * 
 * DESTRUCTIVE OPERATION: This script will:
 * - Delete all Payment records
 * - Delete all MembershipHistory records
 * - Delete all AdminAuditLog records
 * - Clear membership data for all users (but keep user accounts)
 * 
 * Usage: node server/scripts/resetMemberships.js --confirm
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// Load models
const User = require("../models/User");
const Payment = require("../models/Payment");
const MembershipHistory = require("../models/MembershipHistory");
const AdminAuditLog = require("../models/AdminAuditLog");

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
};

async function resetMemberships() {
  try {
    log.info("Connecting to MongoDB...");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/gymweb", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    log.success("Connected to MongoDB");
    console.log("");

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Get counts before deletion
    // ─────────────────────────────────────────────────────────────
    log.info("Fetching current statistics...");

    const userCount = await User.countDocuments({});
    const paymentCount = await Payment.countDocuments({});
    const membershipHistoryCount = await MembershipHistory.countDocuments({});
    const auditLogCount = await AdminAuditLog.countDocuments({});

    console.log(
      `\n  Current Data:
  • Users: ${userCount}
  • Payments: ${paymentCount}
  • Membership History: ${membershipHistoryCount}
  • Audit Logs: ${auditLogCount}\n`
    );

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Confirm action
    // ─────────────────────────────────────────────────────────────
    log.warning("⚠️  THIS IS A DESTRUCTIVE OPERATION!");
    console.log(
      `\n  This will DELETE:
  • All ${paymentCount} payment records
  • All ${membershipHistoryCount} membership history records
  • All ${auditLogCount} audit logs
  
  AND CLEAR membership data for all ${userCount} users:
  • Users will be kept in database
  • Membership status reset to "pending"
  • All membership fields cleared\n`
    );

    // Create a simple confirmation - in production, you'd use a library like inquirer
    const args = process.argv.slice(2);
    if (!args.includes("--confirm")) {
      log.error("Aborted. Run with --confirm flag to proceed:");
      console.log(`  ${colors.yellow}node server/scripts/resetMemberships.js --confirm${colors.reset}\n`);
      process.exit(1);
    }

    log.info("Proceeding with reset...\n");

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Clear User Memberships
    // ─────────────────────────────────────────────────────────────
    log.info("Clearing user membership data...");

    const userUpdateResult = await User.updateMany(
      {},
      {
        $set: {
          paymentStatus: "pending",
          membershipPlan: null,
          membershipStartDate: null,
          membershipExpiry: null,
          currentStreak: 0,
          lastMembershipUpdate: null,
          totalMembershipsActivated: 0,
          registrationFeePaid: false,
          registrationFeePaymentDate: null,
          isFirstTimeUser: true,
        },
      }
    );

    log.success(`Updated ${userUpdateResult.modifiedCount} users`);

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Delete Payment Records
    // ─────────────────────────────────────────────────────────────
    log.info("Deleting payment records...");

    const paymentDeleteResult = await Payment.deleteMany({});
    log.success(`Deleted ${paymentDeleteResult.deletedCount} payment records`);

    // ─────────────────────────────────────────────────────────────
    // STEP 5: Delete MembershipHistory
    // ─────────────────────────────────────────────────────────────
    log.info("Deleting membership history...");

    const membershipHistoryDeleteResult = await MembershipHistory.deleteMany({});
    log.success(`Deleted ${membershipHistoryDeleteResult.deletedCount} membership history records`);

    // ─────────────────────────────────────────────────────────────
    // STEP 6: Delete AdminAuditLog
    // ─────────────────────────────────────────────────────────────
    log.info("Deleting admin audit logs...");

    const auditLogDeleteResult = await AdminAuditLog.deleteMany({});
    log.success(`Deleted ${auditLogDeleteResult.deletedCount} audit logs`);

    // ─────────────────────────────────────────────────────────────
    // STEP 7: Summary
    // ─────────────────────────────────────────────────────────────
    console.log("\n" + "═".repeat(50));
    log.success("✅ RESET COMPLETE!\n");
    console.log(`  Summary of changes:
  • User accounts KEPT: ${userUpdateResult.modifiedCount}
  • User membership data cleared: ${userUpdateResult.modifiedCount}
  • Payment records deleted: ${paymentDeleteResult.deletedCount}
  • Membership histories deleted: ${membershipHistoryDeleteResult.deletedCount}
  • Audit logs deleted: ${auditLogDeleteResult.deletedCount}\n`);

    log.info("All membership records have been cleared. All user accounts remain intact.");
    console.log("═".repeat(50) + "\n");

    process.exit(0);
  } catch (error) {
    log.error("Reset failed!");
    console.error(error);
    process.exit(1);
  }
}

// Run the reset
resetMemberships();
