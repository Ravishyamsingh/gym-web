const adminService = require("../utils/adminService");

/**
 * Admin Search Controller
 * Handles global user search with complete history
 */

/**
 * Global user search with history
 * GET /api/admin/search
 *
 * @query {
 *   q: String (search query - name, email, or userId),
 *   limit?: Number (default 20),
 *   skip?: Number (default 0),
 *   includeDeleted?: Boolean (default false)
 * }
 */
const searchUsers = async (req, res) => {
  try {
    const { q, limit = 20, skip = 0, includeDeleted = false } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        error: "Search query is required. Provide ?q=search_term",
      });
    }

    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const skipNum = Math.max(0, parseInt(skip));

    const results = await adminService.globalUserSearch(q, {
      limit: limitNum,
      skip: skipNum,
      includeDeleted: includeDeleted === "true" || includeDeleted === true,
      includeFaceDescriptor: false,
    });

    res.status(200).json({
      message: "User search completed successfully",
      query: q,
      pagination: {
        returned: results.length,
        limit: limitNum,
        skip: skipNum,
      },
      data: results,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({
      error: "Failed to search users",
      details: error.message,
    });
  }
};

/**
 * Get complete user profile with all history
 * GET /api/admin/user/:userId/complete-history
 */
const getUserCompleteHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const userWithHistory = await adminService.getUserWithCompleteHistory(userId);

    res.status(200).json({
      message: "User complete history retrieved successfully",
      data: userWithHistory,
    });
  } catch (error) {
    console.error("Error fetching user complete history:", error);

    if (error.message === "User not found") {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.status(500).json({
      error: "Failed to fetch user history",
      details: error.message,
    });
  }
};

/**
 * Get admin audit history for a specific user
 * GET /api/admin/user/:userId/admin-actions
 *
 * @query {
 *   limit?: Number (default 50)
 * }
 */
const getUserAdminActions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const actions = await adminService.getActionHistoryForUser(userId, parseInt(limit));

    res.status(200).json({
      message: "Admin actions retrieved successfully",
      userId,
      count: actions.length,
      data: actions,
    });
  } catch (error) {
    console.error("Error fetching admin actions:", error);
    res.status(500).json({
      error: "Failed to fetch admin actions",
      details: error.message,
    });
  }
};

/**
 * Get admin's own action history
 * GET /api/admin/my-actions
 *
 * @query {
 *   limit?: Number (default 50),
 *   skip?: Number (default 0),
 *   action?: String (filter by action type)
 * }
 */
const getMyAdminActions = async (req, res) => {
  try {
    const adminId = req.dbUser._id;
    const { limit = 50, skip = 0 } = req.query;

    const actions = await adminService.getAdminAuditLogs(
      adminId,
      parseInt(limit),
      parseInt(skip)
    );

    res.status(200).json({
      message: "Your admin actions retrieved successfully",
      count: actions.length,
      data: actions,
    });
  } catch (error) {
    console.error("Error fetching admin actions:", error);
    res.status(500).json({
      error: "Failed to fetch admin actions",
      details: error.message,
    });
  }
};

/**
 * Get admin statistics
 * GET /api/admin/statistics
 *
 * @query {
 *   adminId?: ObjectId (default current logged-in admin),
 *   startDate?: ISO Date,
 *   endDate?: ISO Date
 * }
 */
const getAdminStatistics = async (req, res) => {
  try {
    const { adminId, startDate, endDate } = req.query;

    // Use provided adminId or current logged-in admin
    const targetAdminId = adminId || req.dbUser._id;

    let startDateObj = null;
    let endDateObj = null;

    if (startDate) startDateObj = new Date(startDate);
    if (endDate) endDateObj = new Date(endDate);

    const stats = await adminService.getAdminStats(targetAdminId, startDateObj, endDateObj);

    res.status(200).json({
      message: "Admin statistics retrieved successfully",
      adminId: targetAdminId,
      period: {
        start: startDate || "all time",
        end: endDate || "all time",
      },
      ...stats,
    });
  } catch (error) {
    console.error("Error fetching admin statistics:", error);
    res.status(500).json({
      error: "Failed to fetch admin statistics",
      details: error.message,
    });
  }
};

/**
 * Get global activity statistics
 * GET /api/admin/global-activity
 */
const getGlobalActivity = async (req, res) => {
  try {
    const stats = await adminService.getGlobalActivityStats();

    res.status(200).json({
      message: "Global activity statistics retrieved successfully",
      asOfDate: new Date(),
      ...stats,
    });
  } catch (error) {
    console.error("Error fetching global activity:", error);
    res.status(500).json({
      error: "Failed to fetch global activity",
      details: error.message,
    });
  }
};

module.exports = {
  searchUsers,
  getUserCompleteHistory,
  getUserAdminActions,
  getMyAdminActions,
  getAdminStatistics,
  getGlobalActivity,
};
