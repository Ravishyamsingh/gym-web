const Attendance = require("../models/Attendance");
const User = require("../models/User");

// ─────────────────────────────────────────────
// POST /api/attendance
// Called from the user's phone after a successful face match.
// Logs a timestamped check-in and bumps the user's streak.
// ─────────────────────────────────────────────
exports.checkIn = async (req, res, next) => {
  try {
    const user = req.dbUser;
    if (!user) return res.status(404).json({ error: "User not found" });

    // Gate: blocked / expired users cannot check in
    if (user.isBlocked) {
      return res.status(403).json({ error: "Access denied — your account is blocked" });
    }
    if (user.paymentStatus !== "active") {
      return res.status(403).json({ error: "Access denied — update your payment" });
    }

    // Prevent double check-in within the last 30 minutes
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recent = await Attendance.findOne({ userId: user._id, timestamp: { $gte: thirtyMinAgo } });
    if (recent) {
      return res.status(409).json({ error: "Already checked in recently", attendance: recent });
    }

    const attendance = await Attendance.create({ userId: user._id });

    // Streak logic: check if the user checked in yesterday.
    // Use an explicit date range for "yesterday" (00:00:00.000 – 23:59:59.999)
    // to avoid off-by-one errors and maintain timezone consistency.
    const now = new Date();
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);

    const yesterdayEnd = new Date(now);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const checkedInYesterday = await Attendance.findOne({
      userId: user._id,
      timestamp: { $gte: yesterdayStart, $lte: yesterdayEnd },
    });

    user.currentStreak = checkedInYesterday ? user.currentStreak + 1 : 1;
    await user.save();

    return res.status(201).json({
      message: "Check-in successful",
      attendance,
      currentStreak: user.currentStreak,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /api/attendance/my
// User: return the logged-in user's own attendance history.
// ─────────────────────────────────────────────
exports.getMyAttendance = async (req, res, next) => {
  try {
    const user = req.dbUser;
    if (!user) return res.status(404).json({ error: "User not found" });

    const records = await Attendance.find({ userId: user._id })
      .sort({ timestamp: -1 })
      .limit(90); // last ~3 months

    // Build monthly summary for chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyCounts = await Attendance.aggregate([
      { $match: { userId: user._id, timestamp: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const totalVisits = await Attendance.countDocuments({ userId: user._id });
    const lastVisit = records.length > 0 ? records[0].timestamp : null;

    return res.json({
      records,
      totalVisits,
      lastVisit,
      monthlyCounts,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /api/attendance/live
// Admin: return users who checked in within the last 3 hours.
// ─────────────────────────────────────────────
exports.getLive = async (_req, res, next) => {
  try {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

    const records = await Attendance.find({ timestamp: { $gte: threeHoursAgo } })
      .populate("userId", "name email paymentStatus")
      .sort({ timestamp: -1 });

    return res.json({ attendees: records });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /api/attendance
// Admin: return all attendance records (paginated).
// ─────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Attendance.find()
        .populate("userId", "name email")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(),
    ]);

    return res.json({ records, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};
