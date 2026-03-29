#!/usr/bin/env node

/**
 * Cleanup Orphaned Emails Script
 * 
 * Finds and removes orphaned email records (users with no firebaseId and no authProvider)
 * These are typically remnants from incomplete deletions or migration issues.
 * 
 * Usage: node cleanupOrphanedEmails.js [email]
 * 
 * Examples:
 *   node cleanupOrphanedEmails.js                    # Find all orphaned emails
 *   node cleanupOrphanedEmails.js rshyamsingh106@gmail.com  # Find specific email
 */

require("../config/loadEnv");
const mongoose = require("mongoose");
const User = require("../models/User");

const targetEmail = process.argv[2];

(async () => {
  try {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`🧹 CLEANUP ORPHANED EMAILS SCRIPT`);
    if (targetEmail) {
      console.log(`Target Email: ${targetEmail.toLowerCase()}`);
    } else {
      console.log(`Finding all orphaned email records...`);
    }
    console.log(`${"=".repeat(70)}`);

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
    });
    console.log("✅ Connected to MongoDB\n");

    // Define query for orphaned records
    let query = {
      $or: [
        { firebaseId: null },
        { firebaseId: "" },
        { authProvider: null },
        { authProvider: "" },
      ],
      // But only if they also have no password (password-based auth wasn't used)
      password: { $exists: false, $eq: null },
    };

    // If target email specified, search for that specific email
    if (targetEmail) {
      query.email = targetEmail.toLowerCase();
    }

    // Find orphaned records
    const orphanedUsers = await User.find(query).select(
      "email firebaseId authProvider name joinDate isBlocked paymentStatus faceRegistered"
    );

    if (orphanedUsers.length === 0) {
      console.log("✅ No orphaned email records found\n");
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`Found ${orphanedUsers.length} orphaned email record(s):\n`);
    orphanedUsers.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.email}`);
      console.log(`   - Firebase ID: ${user.firebaseId || "MISSING"}`);
      console.log(`   - Auth Provider: ${user.authProvider || "MISSING"}`);
      console.log(`   - Name: ${user.name || "N/A"}`);
      console.log(`   - Joined: ${user.joinDate ? new Date(user.joinDate).toLocaleDateString() : "N/A"}`);
      console.log(`   - Status: ${user.paymentStatus || "N/A"}`);
      console.log();
    });

    // Ask for confirmation before deletion
    const userData = orphanedUsers[0];
    if (targetEmail && orphanedUsers.length === 1) {
      console.log(`${"=".repeat(70)}`);
      console.log(`⚠️  Delete this orphaned record?`);
      console.log(`Email: ${userData.email}`);
      console.log(`${"=".repeat(70)}`);
      console.log(`\nTo delete this record, run:`);
      console.log(
        `\n  node deleteUser.js ${userData.email}\n`
      );
      console.log(
        `After deletion, you'll be able to sign in with Google again.`
      );
      console.log(`\nAlternatively, the system will attempt to recover this`);
      console.log(`record automatically on next Google sign-in.\n`);
    }

    console.log(`${"=".repeat(70)}\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(`❌ Error:`, err.message);
    console.error(err);
    process.exit(1);
  }
})();
