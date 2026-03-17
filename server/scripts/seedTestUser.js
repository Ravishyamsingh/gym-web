require("../config/loadEnv");

const mongoose = require("mongoose");
const User = require("../models/User");

const TEST_USER_NAME = process.env.TEST_USER_NAME || "Testing Account";
const TEST_USER_EMAIL = (process.env.TEST_USER_EMAIL || "testing.account@gym.local").toLowerCase();
const TEST_USER_ID = (process.env.TEST_USER_ID || "testmember01").toLowerCase();
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "Test@123456";
const FORCE_IN_PRODUCTION = String(process.env.ALLOW_TEST_ACCOUNT_IN_PRODUCTION || "false").toLowerCase() === "true";

async function seedTestUser() {
  if (process.env.NODE_ENV === "production" && !FORCE_IN_PRODUCTION) {
    throw new Error("Refusing to seed test account in production. Set ALLOW_TEST_ACCOUNT_IN_PRODUCTION=true only if explicitly needed.");
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const now = new Date();
  const membershipExpiry = new Date(now);
  membershipExpiry.setMonth(membershipExpiry.getMonth() + 6);

  let user = await User.findOne({
    $or: [{ email: TEST_USER_EMAIL }, { userId: TEST_USER_ID }],
  }).select("+password");

  if (!user) {
    user = new User({
      name: TEST_USER_NAME,
      email: TEST_USER_EMAIL,
      userId: TEST_USER_ID,
      password: TEST_USER_PASSWORD,
      authProvider: "password",
      isTestAccount: true,
      paymentStatus: "active",
      membershipPlan: "6months",
      membershipStartDate: now,
      membershipExpiry,
      isBlocked: false,
      faceRegistered: false,
      currentStreak: 0,
    });

    await user.save();
    console.log("Created test account:", {
      name: user.name,
      email: user.email,
      userId: user.userId,
      isTestAccount: user.isTestAccount,
    });
  } else {
    user.name = TEST_USER_NAME;
    user.email = TEST_USER_EMAIL;
    user.userId = TEST_USER_ID;
    user.password = TEST_USER_PASSWORD;
    user.authProvider = "password";
    user.isTestAccount = true;
    user.paymentStatus = "active";
    user.membershipPlan = "6months";
    user.membershipStartDate = user.membershipStartDate || now;
    user.membershipExpiry = user.membershipExpiry || membershipExpiry;
    user.isBlocked = false;

    await user.save();
    console.log("Updated existing test account:", {
      name: user.name,
      email: user.email,
      userId: user.userId,
      isTestAccount: user.isTestAccount,
    });
  }

  console.log("Test login credentials:");
  console.log(`  Email: ${TEST_USER_EMAIL}`);
  console.log(`  User ID: ${TEST_USER_ID}`);
  console.log(`  Password: ${TEST_USER_PASSWORD}`);

  await mongoose.disconnect();
}

seedTestUser().catch(async (err) => {
  console.error("seed:test-user failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch (_e) {
    // no-op
  }
  process.exit(1);
});
