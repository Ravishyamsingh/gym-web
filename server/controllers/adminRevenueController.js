const membershipService = require("../utils/membershipService");
const MembershipHistory = require("../models/MembershipHistory");
const User = require("../models/User");
const Payment = require("../models/Payment");

/**
 * Admin Revenue Controller
 * Tracks revenue, plan distribution, and membership analytics
 */

/**
 * Get revenue summary (total revenue with breakdown)
 * GET /api/admin/revenue/summary
 *
 * @query {
 *   startDate?: ISO Date,
 *   endDate?: ISO Date
 * }
 */
const getRevenueSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Parse dates if provided
    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const revenueSummary = await membershipService.calculateTotalRevenue(filters);

    res.status(200).json({
      message: "Revenue summary retrieved successfully",
      ...revenueSummary,
      period: {
        start: startDate || "all time",
        end: endDate || "all time",
      },
    });
  } catch (error) {
    console.error("Error fetching revenue summary:", error);
    res.status(500).json({
      error: "Failed to fetch revenue summary",
      details: error.message,
    });
  }
};

/**
 * Get plan-wise distribution
 * GET /api/admin/revenue/plan-distribution
 *
 * @query {
 *   status?: String (active, pending, expired)
 * }
 */
const getPlanDistribution = async (req, res) => {
  try {
    const { status = "active" } = req.query;

    const distribution = await membershipService.getPlanDistribution(status);

    // Calculate totals
    let totalUsers = 0;
    let totalRevenue = 0;
    let totalExpiringSoon = 0;

    Object.values(distribution).forEach((plan) => {
      totalUsers += plan.count;
      totalRevenue += plan.totalRevenue;
      totalExpiringSoon += plan.expiringSoon;
    });

    res.status(200).json({
      message: "Plan distribution retrieved successfully",
      status,
      distribution,
      totals: {
        users: totalUsers,
        revenue: totalRevenue,
        expiringSoon: totalExpiringSoon,
      },
    });
  } catch (error) {
    console.error("Error fetching plan distribution:", error);
    res.status(500).json({
      error: "Failed to fetch plan distribution",
      details: error.message,
    });
  }
};

/**
 * Get membership activation logs (with pagination)
 * GET /api/admin/revenue/membership-logs
 *
 * @query {
 *   page: Number (1-indexed),
 *   limit: Number (default 20),
 *   status?: String (active, pending, expired)
 *   planId?: String (1month, 3months, 6months, 1year)
 *   sortBy?: String (createdAt, totalAmount)
 *   order?: String (asc, desc)
 * }
 */
const getMembershipLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, planId, sortBy = "createdAt", order = "desc" } = req.query;

    const query = { newStatus: "active" };

    if (status) {
      query.newStatus = status;
    }

    if (planId) {
      query.membershipPlan = planId;
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = order === "asc" ? 1 : -1;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Get logs
    const logs = await MembershipHistory.find(query)
      .populate("userId", "name email")
      .populate("adminId", "name email")
      .sort(sortObj)
      .limit(limitNum)
      .skip(skip)
      .lean();

    // Get total count for pagination
    const total = await MembershipHistory.countDocuments(query);

    res.status(200).json({
      message: "Membership logs retrieved successfully",
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      data: logs,
    });
  } catch (error) {
    console.error("Error fetching membership logs:", error);
    res.status(500).json({
      error: "Failed to fetch membership logs",
      details: error.message,
    });
  }
};

/**
 * Get revenue analytics (advanced stats)
 * GET /api/admin/revenue/analytics
 */
const getRevenueAnalytics = async (req, res) => {
  try {
    // Total revenue calculations
    const allTimeRevenue = await membershipService.calculateTotalRevenue({});

    // Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30DaysRevenue = await membershipService.calculateTotalRevenue({
      startDate: thirtyDaysAgo,
    });

    // Last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const last90DaysRevenue = await membershipService.calculateTotalRevenue({
      startDate: ninetyDaysAgo,
    });

    // Plan-wise distribution
    const planDistribution = await membershipService.getPlanDistribution("active");

    // Active users count
    const activeUsers = await User.countDocuments({
      paymentStatus: "active",
      isDeleted: false,
    });

    // First-time users activated
    const firstTimeActivations = await MembershipHistory.countDocuments({
      isFirstTimeUser: true,
      newStatus: "active",
    });

    // Existing user activations
    const existingUserActivations = await MembershipHistory.countDocuments({
      isFirstTimeUser: false,
      newStatus: "active",
    });

    // Average revenue per activation
    const totalActivations = await MembershipHistory.countDocuments({
      newStatus: "active",
    });
    const avgRevenuePerActivation =
      totalActivations > 0 ? Math.round(allTimeRevenue.totalRevenue / totalActivations) : 0;

    // Revenue breakdown
    const registrationFeePercentage =
      allTimeRevenue.totalRevenue > 0
        ? Math.round((allTimeRevenue.registrationFeeRevenue / allTimeRevenue.totalRevenue) * 100)
        : 0;

    res.status(200).json({
      message: "Revenue analytics retrieved successfully",
      revenue: {
        allTime: allTimeRevenue,
        last30Days: last30DaysRevenue,
        last90Days: last90DaysRevenue,
      },
      users: {
        active: activeUsers,
        firstTimeActivated: firstTimeActivations,
        existingActivated: existingUserActivations,
      },
      metrics: {
        totalActivations,
        avgRevenuePerActivation,
        registrationFeePercentage,
      },
      planDistribution,
    });
  } catch (error) {
    console.error("Error fetching revenue analytics:", error);
    res.status(500).json({
      error: "Failed to fetch revenue analytics",
      details: error.message,
    });
  }
};

/**
 * Get membership expiry alerts (users expiring soon)
 * GET /api/admin/revenue/expiry-alerts
 *
 * @query {
 *   daysFromNow: Number (default 30)
 *   limit: Number (default 50)
 * }
 */
const getExpiryAlerts = async (req, res) => {
  try {
    const { daysFromNow = 30, limit = 50 } = req.query;

    const daysFromNowNum = Math.max(1, parseInt(daysFromNow));
    const limitNum = Math.max(1, Math.min(500, parseInt(limit)));

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysFromNowNum);

    const expiringUsers = await User.find({
      paymentStatus: "active",
      isDeleted: false,
      membershipExpiry: {
        $gt: new Date(),
        $lte: futureDate,
      },
    })
      .select("name email membershipPlan membershipExpiry joinDate")
      .sort({ membershipExpiry: 1 })
      .limit(limitNum)
      .lean();

    res.status(200).json({
      message: "Expiry alerts retrieved successfully",
      alertCriteria: {
        expiringWithin: `${daysFromNowNum} days`,
        asOfDate: new Date(),
      },
      count: expiringUsers.length,
      data: expiringUsers,
    });
  } catch (error) {
    console.error("Error fetching expiry alerts:", error);
    res.status(500).json({
      error: "Failed to fetch expiry alerts",
      details: error.message,
    });
  }
};

module.exports = {
  getRevenueSummary,
  getPlanDistribution,
  getMembershipLogs,
  getRevenueAnalytics,
  getExpiryAlerts,
};
