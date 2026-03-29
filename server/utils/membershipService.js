const User = require("../models/User");
const MembershipHistory = require("../models/MembershipHistory");
const Payment = require("../models/Payment");

/**
 * Membership Service
 * Handles membership management, fee calculation, and history tracking
 */

const REGISTRATION_FEE = 800; // ₹800

// Plan details: { duration in months, price in ₹ }
const PLANS = {
  "1month": { months: 1, price: 600 },
  "3months": { months: 3, price: 1500 },
  "6months": { months: 6, price: 3000 },
  "1year": { months: 12, price: 5400 },
};

/**
 * Check if user is a first-time user
 * First-time = no previous membership activations in history
 *
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Boolean>} - true if first-time, false if existing member
 */
async function isFirstTimeUser(userId) {
  // Check if user has ever had a "active" membership status in history
  const previousActivation = await MembershipHistory.findOne({
    userId,
    newStatus: "active",
  });

  return !previousActivation;
}

/**
 * Calculate membership amount with registration fee if applicable
 *
 * @param {String} planId - Plan ID (1month, 3months, 6months, 1year)
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} - {
 *   planAmount, registrationFeeAmount, totalAmount, includesRegistrationFee, isFirstTimeUser
 * }
 */
async function calculateMembershipAmount(planId, userId) {
  if (!PLANS[planId]) {
    throw new Error(`Invalid plan ID: ${planId}`);
  }

  const planAmount = PLANS[planId].price;
  let registrationFeeAmount = 0;
  let includesRegistrationFee = false;

  // Check if this is a first-time user
  const isFirstTime = await isFirstTimeUser(userId);

  if (isFirstTime) {
    registrationFeeAmount = REGISTRATION_FEE;
    includesRegistrationFee = true;
  }

  return {
    planAmount,
    registrationFeeAmount,
    totalAmount: planAmount + registrationFeeAmount,
    includesRegistrationFee,
    isFirstTimeUser: isFirstTime,
  };
}

/**
 * Calculate membership expiry date based on plan and start date
 *
 * @param {String} planId - Plan ID
 * @param {Date} startDate - Start date (defaults to now)
 * @returns {Date} - Expiry date
 */
function calculateExpiryDate(planId, startDate = new Date()) {
  const months = PLANS[planId].months;
  const expiryDate = new Date(startDate);
  expiryDate.setMonth(expiryDate.getMonth() + months);
  return expiryDate;
}

/**
 * Activate or update user membership
 * Creates audit trail in MembershipHistory
 *
 * @param {ObjectId} userId - User ID
 * @param {String} planId - Plan ID (1month, 3months, 6months, 1year)
 * @param {ObjectId} adminId - Admin ID who performed the action (null if system)
 * @param {Object} options - Additional options
 *   - reason: String (reason for change)
 *   - paymentId: ObjectId (associated payment record)
 *   - externalReference: String (external system reference)
 * @returns {Promise<Object>} - Updated user with membership history entry
 */
async function activateMembership(userId, planId, adminId = null, options = {}) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // Calculate amounts and check if first-time
  const amountDetails = await calculateMembershipAmount(planId, userId);

  // Calculate start and expiry dates
  const startDate = new Date();
  const expiryDate = calculateExpiryDate(planId, startDate);

  // Prepare membership history record
  const membershipHistory = new MembershipHistory({
    userId,
    previousStatus: user.paymentStatus,
    newStatus: "active",
    membershipPlan: planId,
    planAmount: amountDetails.planAmount,
    registrationFeeIncluded: amountDetails.includesRegistrationFee,
    registrationFeeAmount: amountDetails.registrationFeeAmount,
    totalAmount: amountDetails.totalAmount,
    startDate,
    expiryDate,
    isFirstTimeUser: amountDetails.isFirstTimeUser,
    adminId,
    reason: options.reason || "Membership activation",
    paymentId: options.paymentId || null,
    notes: options.notes || "",
  });

  // Save membership history
  await membershipHistory.save();

  // Update user document
  user.paymentStatus = "active";
  user.membershipPlan = planId;
  user.membershipStartDate = startDate;
  user.membershipExpiry = expiryDate;
  user.lastMembershipUpdate = new Date();
  user.totalMembershipsActivated = (user.totalMembershipsActivated || 0) + 1;

  // Mark as no longer first-time if this was first activation
  if (amountDetails.isFirstTimeUser) {
    user.isFirstTimeUser = false;
    user.registrationFeePaid = true;
    user.registrationFeePaymentDate = new Date();
  }

  await user.save();

  return {
    user: user.toJSON(),
    membershipHistory: membershipHistory.toObject(),
    amountDetails,
  };
}

/**
 * Update membership status (Active, Pending, Expired)
 * Only updates status, not plan
 *
 * @param {ObjectId} userId - User ID
 * @param {String} newStatus - New status (active, pending, expired)
 * @param {ObjectId} adminId - Admin ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Updated user
 */
async function updateMembershipStatus(userId, newStatus, adminId = null, options = {}) {
  if (!["active", "pending", "expired"].includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const oldStatus = user.paymentStatus;

  // Create history record for status change
  const membershipHistory = new MembershipHistory({
    userId,
    previousStatus: oldStatus,
    newStatus,
    membershipPlan: user.membershipPlan || "1month",
    planAmount: options.planAmount || 0,
    registrationFeeIncluded: false,
    registrationFeeAmount: 0,
    totalAmount: options.planAmount || 0,
    startDate: user.membershipStartDate || new Date(),
    expiryDate: user.membershipExpiry || calculateExpiryDate(user.membershipPlan || "1month"),
    isFirstTimeUser: user.isFirstTimeUser,
    adminId,
    reason: options.reason || `Status changed: ${oldStatus} → ${newStatus}`,
    notes: options.notes || "",
  });

  await membershipHistory.save();

  // Update user
  user.paymentStatus = newStatus;
  user.lastMembershipUpdate = new Date();
  await user.save();

  return user.toJSON();
}

/**
 * Get membership history for a user
 *
 * @param {ObjectId} userId - User ID
 * @param {Number} limit - Max records to return
 * @returns {Promise<Array>} - Membership history records
 */
async function getUserMembershipHistory(userId, limit = 50) {
  return MembershipHistory.find({ userId })
    .populate("adminId", "name email")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Get all users by membership plan
 *
 * @param {String} planId - Plan ID (optional, null returns all active)
 * @param {String} status - Payment status (optional)
 * @returns {Promise<Array>} - User documents with plan details
 */
async function getUsersByPlan(planId, status = "active") {
  const query = { paymentStatus: status, isDeleted: false };

  if (planId) {
    query.membershipPlan = planId;
  }

  return User.find(query)
    .select("name email membershipPlan paymentStatus membershipExpiry joinDate")
    .lean();
}

/**
 * Calculate plan-wise distribution stats (historical from Payment records)
 * Shows actual revenue received per plan, not forecasted based on current users
 *
 * @param {String} status - Filter by payment status (optional - for UI context only)
 * @returns {Promise<Object>} - {
 *   "1month": { count, totalRevenue, expiringSoon },
 *   "6months": { count, totalRevenue, expiringSoon },
 *   "1year": { count, totalRevenue, expiringSoon }
 * }
 */
async function getPlanDistribution(status = "active") {
  // Get historical distribution from Payment records (actual revenue)
  const distribution = {
    "1month": { count: 0, totalRevenue: 0, expiringSoon: 0 },
    "3months": { count: 0, totalRevenue: 0, expiringSoon: 0 },
    "6months": { count: 0, totalRevenue: 0, expiringSoon: 0 },
    "1year": { count: 0, totalRevenue: 0, expiringSoon: 0 },
  };

  // Query Payment records for completed payments
  const payments = await Payment.find({ status: "paid" }).lean();

  for (const payment of payments) {
    const planId = payment.planId;
    if (planId && distribution[planId]) {
      distribution[planId].count += 1;
      distribution[planId].totalRevenue += payment.amount || 0;
    }
  }

  // Also get current expiring users info (separate from historical revenue)
  const query = { isDeleted: false };
  if (status) {
    query.paymentStatus = status;
  }

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const users = await User.find(query).lean();

  for (const user of users) {
    if (user.membershipPlan && distribution[user.membershipPlan]) {
      if (user.membershipExpiry && user.membershipExpiry < thirtyDaysFromNow) {
        distribution[user.membershipPlan].expiringSoon += 1;
      }
    }
  }

  return distribution;
}

/**
 * Calculate total revenue from all completed memberships
 * Includes registration fees from both Payment records and MembershipHistory
 *
 * @param {Object} filters - Query filters
 *   - startDate: Date
 *   - endDate: Date
 *   - includeSource: Boolean (default true - include source breakdown)
 * @returns {Promise<Object>} - {
 *   totalRevenue, registrationFeeRevenue, planRevenue, recordCount, paymentRecords, membershipRecords
 * }
 */
async function calculateTotalRevenue(filters = {}) {
  try {
    // Get from Payment table (actual payments)
    const paymentQuery = { status: "paid" };
    if (filters.startDate || filters.endDate) {
      paymentQuery.paymentDate = {};
      if (filters.startDate) paymentQuery.paymentDate.$gte = filters.startDate;
      if (filters.endDate) paymentQuery.paymentDate.$lte = filters.endDate;
    }

    console.log("💰 Revenue calculation query:", JSON.stringify(paymentQuery, null, 2));

    const paymentRecords = await Payment.find(paymentQuery).lean();
    
    console.log(`📊 Found ${paymentRecords.length} paid payments`);
    if (paymentRecords.length > 0) {
      console.log("Sample payments:", paymentRecords.slice(0, 3).map(p => ({
        userId: p.userId,
        amount: p.amount,
        status: p.status,
        paymentDate: p.paymentDate,
        processor: p.paymentProcessor,
      })));
    }

    let totalRevenue = 0;
    let registrationFeeRevenue = 0;
    let planRevenue = 0;

    // Sum up Payment records
    for (const payment of paymentRecords) {
      const paymentAmount = payment.amount || 0;
      const regFeeAmount = payment.registrationFeeAmount || 0;
      totalRevenue += paymentAmount;
      registrationFeeRevenue += regFeeAmount;
      planRevenue += (paymentAmount - regFeeAmount);
    }

    console.log(`✅ Revenue summary - Total: ₹${totalRevenue}, Reg Fee: ₹${registrationFeeRevenue}, Plan: ₹${planRevenue}`);

    return {
      totalRevenue,
      registrationFeeRevenue,
      planRevenue,
      recordCount: paymentRecords.length,
      source: "Payment records (status: paid)",
    };
  } catch (error) {
    console.error("❌ Error in calculateTotalRevenue:", error);
    throw error;
  }
}

module.exports = {
  activateMembership,
  updateMembershipStatus,
  getUserMembershipHistory,
  getUsersByPlan,
  getPlanDistribution,
  calculateMembershipAmount,
  calculateExpiryDate,
  isFirstTimeUser,
  calculateTotalRevenue,
  REGISTRATION_FEE,
  PLANS,
};
