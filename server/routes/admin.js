const express = require("express");
const router = express.Router();
const { verifyToken, requireAdmin } = require("../middleware/auth");

// Import controllers
const adminMembershipController = require("../controllers/adminMembershipController");
const adminRevenueController = require("../controllers/adminRevenueController");
const adminSearchController = require("../controllers/adminSearchController");

/**
 * ============== ADMIN MEMBERSHIP ROUTES ==============
 * Routes for managing user memberships, plans, and status
 */

// Update membership status and/or plan
router.post(
  "/membership/update",
  verifyToken,
  requireAdmin,
  adminMembershipController.updateMembership
);

// Get membership history for a user
router.get(
  "/membership/history/:userId",
  verifyToken,
  requireAdmin,
  adminMembershipController.getMembershipHistory
);

// Get users by membership plan
router.get(
  "/membership/users-by-plan",
  verifyToken,
  requireAdmin,
  adminMembershipController.getUsersByPlan
);

// Validate membership amount calculation (before confirming update)
router.post(
  "/membership/validate-amount",
  verifyToken,
  requireAdmin,
  adminMembershipController.validateMembershipAmount
);

/**
 * ============== ADMIN REVENUE ROUTES ==============
 * Routes for revenue tracking and analytics
 */

// Get revenue summary (total + breakdown)
router.get(
  "/revenue/summary",
  verifyToken,
  requireAdmin,
  adminRevenueController.getRevenueSummary
);

// Get plan-wise distribution
router.get(
  "/revenue/plan-distribution",
  verifyToken,
  requireAdmin,
  adminRevenueController.getPlanDistribution
);

// Get membership activation logs
router.get(
  "/revenue/membership-logs",
  verifyToken,
  requireAdmin,
  adminRevenueController.getMembershipLogs
);

// Get advanced revenue analytics
router.get(
  "/revenue/analytics",
  verifyToken,
  requireAdmin,
  adminRevenueController.getRevenueAnalytics
);

// Get membership expiry alerts
router.get(
  "/revenue/expiry-alerts",
  verifyToken,
  requireAdmin,
  adminRevenueController.getExpiryAlerts
);

/**
 * ============== ADMIN SEARCH ROUTES ==============
 * Routes for searching and retrieving complete user history
 */

// Global user search (entire database, not time-limited)
router.get("/search", verifyToken, requireAdmin, adminSearchController.searchUsers);

// Get complete user profile with all history
router.get(
  "/user/:userId/complete-history",
  verifyToken,
  requireAdmin,
  adminSearchController.getUserCompleteHistory
);

// Get admin actions performed on a specific user
router.get(
  "/user/:userId/admin-actions",
  verifyToken,
  requireAdmin,
  adminSearchController.getUserAdminActions
);

// Get current admin's action history
router.get("/my-actions", verifyToken, requireAdmin, adminSearchController.getMyAdminActions);

// Get admin statistics
router.get(
  "/statistics",
  verifyToken,
  requireAdmin,
  adminSearchController.getAdminStatistics
);

// Get global activity statistics
router.get(
  "/global-activity",
  verifyToken,
  requireAdmin,
  adminSearchController.getGlobalActivity
);

/**
 * ============== DIAGNOSTIC ROUTES ==============
 * Routes for debugging and verifying system data integrity
 */

// Diagnostic: Check payment records for a specific user
router.get(
  "/diagnostics/user/:userId/payments",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const Payment = require("../models/Payment");
      const User = require("../models/User");
      const { userId } = req.params;

      const user = await User.findById(userId).lean();
      const payments = await Payment.find({ userId }).lean();

      console.log(`📋 Diagnostic check for user ${userId}:`, {
        userFound: !!user,
        paymentCount: payments.length,
        payments: payments.map(p => ({
          id: p._id,
          amount: p.amount,
          status: p.status,
          paymentDate: p.paymentDate,
          processor: p.paymentProcessor,
          createdAt: p.createdAt,
        })),
      });

      res.json({
        user: user ? { name: user.name, email: user.email } : null,
        paymentRecords: payments.length,
        payments: payments.map(p => ({
          id: p._id,
          amount: p.amount,
          status: p.status,
          paymentDate: p.paymentDate,
          paymentProcessor: p.paymentProcessor,
          createdAt: p.createdAt,
          includesRegistrationFee: p.includesRegistrationFee,
          registrationFeeAmount: p.registrationFeeAmount,
        })),
      });
    } catch (error) {
      console.error("Diagnostic error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Diagnostic: Check all paid payments
router.get(
  "/diagnostics/payments/paid",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const Payment = require("../models/Payment");
      const User = require("../models/User");

      const paidPayments = await Payment.find({ status: "paid" })
        .populate("userId", "name email")
        .lean();

      console.log(`💰 Diagnostic - Total paid payments: ${paidPayments.length}`);
      if (paidPayments.length > 0) {
        const total = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        console.log(`💰 Total revenue: ₹${total}`);
        console.log("First 3 payments:", paidPayments.slice(0, 3));
      }

      res.json({
        totalPaidPayments: paidPayments.length,
        totalRevenue: paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        payments: paidPayments.slice(0, 10).map(p => ({
          id: p._id,
          user: p.userId ? { name: p.userId.name, email: p.userId.email } : null,
          amount: p.amount,
          paymentDate: p.paymentDate,
          processor: p.paymentProcessor,
          createdAt: p.createdAt,
        })),
      });
    } catch (error) {
      console.error("Diagnostic error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
