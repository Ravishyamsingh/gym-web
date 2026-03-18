const User = require("../models/User");
const MembershipHistory = require("../models/MembershipHistory");
const Attendance = require("../models/Attendance");
const AdminAuditLog = require("../models/AdminAuditLog");
const Payment = require("../models/Payment");

/**
 * Admin Service
 * Handles admin operations, audit logging, and analytics
 */

/**
 * Log admin action in audit trail
 *
 * @param {ObjectId} adminId - Admin user ID
 * @param {String} action - Action type
 * @param {Object} logData - Log data
 *   - targetUserId: ObjectId (user being acted upon)
 *   - targetEmail: String
 *   - changes: Object (before/after changes)
 *   - details: String
 *   - status: String (success, failure, partial)
 *   - errorMessage: String
 *   - result: Object
 *   - ipAddress: String
 *   - userAgent: String
 * @returns {Promise<Object>} - Created audit log
 */
async function logAdminAction(adminId, action, logData = {}) {
  const auditLog = new AdminAuditLog({
    adminId,
    action,
    targetUserId: logData.targetUserId || null,
    targetEmail: logData.targetEmail || null,
    changes: logData.changes || {},
    details: logData.details || "",
    status: logData.status || "success",
    errorMessage: logData.errorMessage || null,
    result: logData.result || null,
    ipAddress: logData.ipAddress || null,
    userAgent: logData.userAgent || null,
  });

  return auditLog.save();
}

/**
 * Get audit logs for a specific admin
 *
 * @param {ObjectId} adminId - Admin ID
 * @param {Number} limit - Max records
 * @param {Number} skip - Pagination offset
 * @returns {Promise<Array>} - Audit logs
 */
async function getAdminAuditLogs(adminId, limit = 100, skip = 0) {
  return AdminAuditLog.find({ adminId })
    .populate("adminId", "name email")
    .populate("targetUserId", "name email")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
}

/**
 * Get audit logs for a specific target user
 *
 * @param {ObjectId} targetUserId - Target user ID
 * @param {Number} limit - Max records
 * @returns {Promise<Array>} - Audit logs
 */
async function getActionHistoryForUser(targetUserId, limit = 100) {
  return AdminAuditLog.find({ targetUserId })
    .populate("adminId", "name email")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Search for users globally (not limited by date range)
 * Returns complete user history including membership and activity
 *
 * @param {String} query - Search query (name, email, userId)
 * @param {Object} options - Search options
 *   - limit: Number (default 50)
 *   - skip: Number (default 0)
 *   - includeDeleted: Boolean (default false)
 *   - includeFaceDescriptor: Boolean (default false)
 * @returns {Promise<Array>} - Found users with complete history
 */
async function globalUserSearch(query, options = {}) {
  const {
    limit = 50,
    skip = 0,
    includeDeleted = false,
    includeFaceDescriptor = false,
  } = options;

  // Build search query (case-insensitive)
  const searchQuery = {
    $or: [
      { name: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
      { userId: { $regex: query, $options: "i" } },
    ],
  };

  if (!includeDeleted) {
    searchQuery.isDeleted = false;
  }

  // Find users
  let userSelect = "-password";
  if (!includeFaceDescriptor) {
    userSelect += " -faceDescriptor";
  }

  const users = await User.find(searchQuery)
    .select(userSelect)
    .limit(limit)
    .skip(skip)
    .lean();

  // Enrich with complete history for each user
  const enrichedUsers = await Promise.all(
    users.map(async (user) => {
      // Get membership history
      const membershipHistory = await MembershipHistory.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // Get attendance count (last 30 days and total)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentAttendance = await Attendance.countDocuments({
        userId: user._id,
        isHidden: false,
        entryTime: { $gte: thirtyDaysAgo },
      });

      const totalAttendance = await Attendance.countDocuments({
        userId: user._id,
      });

      // Get payment history
      const paymentHistory = await Payment.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // Get admin actions on this user
      const adminActions = await AdminAuditLog.find({ targetUserId: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("adminId", "name email")
        .lean();

      return {
        ...user,
        membershipHistory,
        attendanceStats: {
          last30Days: recentAttendance,
          allTime: totalAttendance,
        },
        paymentHistory,
        adminActions,
      };
    })
  );

  return enrichedUsers;
}

/**
 * Get single user with complete history
 *
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} - User with complete history
 */
async function getUserWithCompleteHistory(userId) {
  const user = await User.findById(userId)
    .select("-password -faceDescriptor")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  // Get membership history
  const membershipHistory = await MembershipHistory.find({ userId })
    .sort({ createdAt: -1 })
    .populate("adminId", "name email")
    .lean();

  // Get attendance records (both visible and hidden)
  const attendanceRecords = await Attendance.find({ userId })
    .sort({ entryTime: -1 })
    .lean();

  // Separate visible (last 30 days) and hidden
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const visibleAttendance = attendanceRecords.filter((a) =>
    !a.isHidden && a.entryTime >= thirtyDaysAgo ? true : false
  );
  const hiddenAttendance = attendanceRecords.filter((a) => a.isHidden);

  // Get payment history
  const paymentHistory = await Payment.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  // Get admin actions on this user
  const adminActions = await AdminAuditLog.find({ targetUserId: userId })
    .sort({ createdAt: -1 })
    .populate("adminId", "name email")
    .lean();

  return {
    user,
    membershipHistory,
    attendanceStats: {
      visible: visibleAttendance.length,
      hidden: hiddenAttendance.length,
      total: attendanceRecords.length,
    },
    visibleAttendance,
    hiddenAttendance,
    paymentHistory,
    adminActions,
  };
}

/**
 * Get admin statistics and activity summary
 *
 * @param {ObjectId} adminId - Admin ID (optional, all if not provided)
 * @param {Date} startDate - Start date for stats
 * @param {Date} endDate - End date for stats
 * @returns {Promise<Object>} - Statistics
 */
async function getAdminStats(adminId, startDate, endDate) {
  const query = {};

  if (adminId) {
    query.adminId = adminId;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  const logs = await AdminAuditLog.find(query).lean();

  const stats = {
    totalActions: logs.length,
    actionsByType: {},
    successCount: 0,
    failureCount: 0,
    usersModified: new Set(),
  };

  logs.forEach((log) => {
    // Count by action type
    stats.actionsByType[log.action] = (stats.actionsByType[log.action] || 0) + 1;

    // Count success/failure
    if (log.status === "success") stats.successCount += 1;
    else if (log.status === "failure") stats.failureCount += 1;

    // Track unique users modified
    if (log.targetUserId) {
      stats.usersModified.add(log.targetUserId.toString());
    }
  });

  stats.uniqueUsersModified = stats.usersModified.size;
  delete stats.usersModified;

  return stats;
}

/**
 * Get global activity stats
 *
 * @returns {Promise<Object>} - System-wide statistics
 */
async function getGlobalActivityStats() {
  // Total users
  const totalUsers = await User.countDocuments({ isDeleted: false });

  // Users by status
  const usersByStatus = await User.countDocuments({
    isDeleted: false,
    paymentStatus: "active",
  });

  // Total attendance records
  const totalAttendanceRecords = await Attendance.countDocuments({});

  // Visible attendance (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const visibleAttendanceRecords = await Attendance.countDocuments({
    isHidden: false,
    entryTime: { $gte: thirtyDaysAgo },
  });

  // Hidden attendance (older than 30 days)
  const hiddenAttendanceRecords = await Attendance.countDocuments({
    isHidden: true,
  });

  // Total membership history records
  const totalMembershipRecords = await MembershipHistory.countDocuments({});

  // Total admin actions logged
  const totalAdminActions = await AdminAuditLog.countDocuments({});

  // Total payments processed
  const totalPayments = await Payment.countDocuments({});

  return {
    users: {
      total: totalUsers,
      active: usersByStatus,
    },
    attendance: {
      totalRecords: totalAttendanceRecords,
      visible30Days: visibleAttendanceRecords,
      hidden: hiddenAttendanceRecords,
    },
    membershipHistory: totalMembershipRecords,
    adminActions: totalAdminActions,
    payments: totalPayments,
  };
}

module.exports = {
  logAdminAction,
  getAdminAuditLogs,
  getActionHistoryForUser,
  globalUserSearch,
  getUserWithCompleteHistory,
  getAdminStats,
  getGlobalActivityStats,
};
