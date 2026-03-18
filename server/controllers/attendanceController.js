const Attendance = require("../models/Attendance");
const crypto = require("crypto");
const { sendAttendanceOtpEmail } = require("../utils/emailService");

const ATTENDANCE_RETENTION_DAYS = 30;
const OTP_TTL_MINUTES = Math.max(1, parseInt(process.env.ATTENDANCE_OTP_TTL_MINUTES || "10", 10));
const OTP_MAX_ATTEMPTS = Math.max(1, parseInt(process.env.ATTENDANCE_OTP_MAX_ATTEMPTS || "5", 10));
const OTP_RATE_LIMIT_WINDOW_MINUTES = Math.max(
  1,
  parseInt(process.env.ATTENDANCE_OTP_RATE_LIMIT_WINDOW_MINUTES || "5", 10)
);
const OTP_MAX_SENDS_PER_WINDOW = Math.max(
  1,
  parseInt(process.env.ATTENDANCE_OTP_MAX_SENDS_PER_WINDOW || "3", 10)
);
const OTP_RESEND_COOLDOWN_SECONDS = Math.max(
  10,
  parseInt(process.env.ATTENDANCE_OTP_RESEND_COOLDOWN_SECONDS || "30", 10)
);
const otpStore = new Map();

function getRetentionStartDate() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ATTENDANCE_RETENTION_DAYS);
  return cutoff;
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

function generateSixDigitOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getOtpStoreKey(userId, action) {
  return `${String(userId)}:${action}`;
}

function createHttpError(statusCode, message, payload = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.payload = payload;
  return err;
}

function ensureDateStart(value) {
  const day = new Date(value || new Date());
  day.setHours(0, 0, 0, 0);
  return day;
}

function sanitizeAttendanceRecord(record) {
  if (!record) return null;
  const obj = record.toObject ? record.toObject() : record;
  const entryTime = obj.entryTime || obj.checkInAt || obj.timestamp;
  const exitTime = obj.exitTime || obj.checkOutAt || null;
  const currentStatus = obj.currentStatus || (obj.sessionStatus === "completed" ? "Checked Out" : "Inside Gym");
  return {
    ...obj,
    entryTime,
    exitTime,
    currentStatus,
  };
}

function validateOtpOrThrow({ userId, action, email, otp }) {
  const key = getOtpStoreKey(userId, action);
  const item = otpStore.get(key);

  if (!item) {
    throw createHttpError(400, "OTP not requested or already used");
  }

  if (Date.now() > item.expiresAt) {
    otpStore.delete(key);
    throw createHttpError(400, "OTP has expired. Request a new OTP");
  }

  if (item.email !== email) {
    throw createHttpError(400, "Email does not match OTP request");
  }

  const otpHash = hashOtp(otp);
  if (otpHash !== item.otpHash) {
    item.attempts += 1;
    if (item.attempts >= OTP_MAX_ATTEMPTS) {
      otpStore.delete(key);
      throw createHttpError(400, "Too many invalid OTP attempts. Request a new OTP");
    }
    otpStore.set(key, item);
    throw createHttpError(400, "Invalid OTP");
  }

  otpStore.delete(key);
}

function pruneExpiredOtpEntries() {
  const now = Date.now();
  for (const [key, item] of otpStore.entries()) {
    if (!item) {
      otpStore.delete(key);
      continue;
    }

    const expiredByTtl = Number.isFinite(item.expiresAt) && now > item.expiresAt;
    const expiredByWindow = Number.isFinite(item.rateLimitWindowStart)
      && now - item.rateLimitWindowStart > OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
      && !Number.isFinite(item.expiresAt);

    if (expiredByTtl || expiredByWindow) {
      otpStore.delete(key);
    }
  }
}

function applyOtpRateLimitOrThrow(existingItem) {
  const now = Date.now();
  const defaultWindowStart = now;
  const rateLimitWindowStart = Number.isFinite(existingItem?.rateLimitWindowStart)
    ? existingItem.rateLimitWindowStart
    : defaultWindowStart;

  const windowAgeMs = now - rateLimitWindowStart;
  const windowDurationMs = OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
  const shouldResetWindow = windowAgeMs >= windowDurationMs;

  const sendCountInWindow = shouldResetWindow ? 0 : (existingItem?.sendCountInWindow || 0);

  if (sendCountInWindow >= OTP_MAX_SENDS_PER_WINDOW) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowDurationMs - windowAgeMs) / 1000));
    throw createHttpError(429, "Too many OTP requests. Please try again shortly.", {
      error: "Too many OTP requests. Please try again shortly.",
      retryAfterSeconds,
    });
  }

  const nextAllowedSendAt = Number.isFinite(existingItem?.nextAllowedSendAt)
    ? existingItem.nextAllowedSendAt
    : 0;

  if (nextAllowedSendAt > now) {
    const retryAfterSeconds = Math.max(1, Math.ceil((nextAllowedSendAt - now) / 1000));
    throw createHttpError(429, "Please wait before requesting another OTP.", {
      error: "Please wait before requesting another OTP.",
      retryAfterSeconds,
    });
  }

  return {
    rateLimitWindowStart: shouldResetWindow ? now : rateLimitWindowStart,
    sendCountInWindow,
  };
}

const LONG_SESSION_ALERT_MINUTES = Math.max(
  60,
  parseInt(process.env.LONG_SESSION_ALERT_MINUTES || "240", 10)
);
 
function getEffectiveCheckIn(record) {
  return record.checkInAt || record.timestamp;
}

function getSessionDurationMinutes(checkInAt, checkOutAt = new Date()) {
  if (!checkInAt) return 0;
  return Math.max(
    1,
    Math.round((new Date(checkOutAt).getTime() - new Date(checkInAt).getTime()) / 60000)
  );
}

function getLongSessionAlert(checkInAt, checkOutAt = null) {
  const durationMinutes = getSessionDurationMinutes(checkInAt, checkOutAt || new Date());
  const hasLongSessionAlert = !checkOutAt && durationMinutes >= LONG_SESSION_ALERT_MINUTES;

  return {
    durationMinutes,
    hasLongSessionAlert,
    alertType: hasLongSessionAlert ? "missed_exit_suspected" : null,
    alertMessage: hasLongSessionAlert
      ? `Session active for ${durationMinutes} minutes. Possible missed checkout.`
      : null,
    alertThresholdMinutes: LONG_SESSION_ALERT_MINUTES,
  };
}

async function findActiveSession(userId) {
  return Attendance.findOne({
    userId,
    $or: [{ sessionStatus: "in_gym" }, { checkOutAt: null }],
  }).sort({ checkInAt: -1, timestamp: -1 });
}

async function processEntryForUser(user, verificationMethod = "face") {
  await validateEntryEligibilityOrThrow(user);

  const now = new Date();
  const attendance = await Attendance.create({
    userId: user._id,
    date: ensureDateStart(now),
    entryTime: now,
    exitTime: null,
    currentStatus: "Inside Gym",
    checkInAt: now,
    checkOutAt: null,
    entryVerifiedAt: now,
    sessionStatus: "in_gym",
    timestamp: now,
    verificationMethodEntry: verificationMethod,
  });

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const alreadyCheckedInToday = await Attendance.findOne({
    userId: user._id,
    _id: { $ne: attendance._id },
    $or: [
      { checkInAt: { $gte: todayStart, $lte: todayEnd } },
      { checkInAt: null, timestamp: { $gte: todayStart, $lte: todayEnd } },
      { entryTime: { $gte: todayStart, $lte: todayEnd } },
    ],
  });

  if (!alreadyCheckedInToday) {
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);

    const yesterdayEnd = new Date(now);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const checkedInYesterday = await Attendance.findOne({
      userId: user._id,
      $or: [
        { checkInAt: { $gte: yesterdayStart, $lte: yesterdayEnd } },
        { checkInAt: null, timestamp: { $gte: yesterdayStart, $lte: yesterdayEnd } },
        { entryTime: { $gte: yesterdayStart, $lte: yesterdayEnd } },
      ],
    });

    user.currentStreak = checkedInYesterday ? user.currentStreak + 1 : 1;
    await user.save();
  }

  return {
    attendance,
    currentStreak: user.currentStreak,
    isInGym: true,
  };
}

async function validateEntryEligibilityOrThrow(user) {
  if (!user) {
    throw createHttpError(404, "User not found", { error: "User not found" });
  }

  if (user.isBlocked) {
    throw createHttpError(403, "Access denied — your account is blocked", {
      error: "Access denied — your account is blocked",
    });
  }

  if (user.paymentStatus !== "active") {
    throw createHttpError(403, "Access denied — update your payment", {
      error: "Access denied — update your payment",
    });
  }

  if (user.membershipExpiry && new Date() > new Date(user.membershipExpiry)) {
    throw createHttpError(403, "Access denied — membership expired", {
      error: "Access denied — membership expired",
    });
  }

  const activeSession = await findActiveSession(user._id);
  if (activeSession) {
    const activeCheckIn = getEffectiveCheckIn(activeSession);
    const alert = getLongSessionAlert(activeCheckIn);
    throw createHttpError(409, "You are already checked in. Verify to exit before entering again.", {
      error: "You are already checked in. Verify to exit before entering again.",
      session: sanitizeAttendanceRecord(activeSession),
      ...alert,
    });
  }
}

async function processExitForUser(user, verificationMethod = "face") {
  if (!user) {
    throw createHttpError(404, "User not found", { error: "User not found" });
  }

  const activeSession = await findActiveSession(user._id);
  if (!activeSession) {
    throw createHttpError(409, "No active gym session found. Check in first.", {
      error: "No active gym session found. Check in first.",
    });
  }

  const now = new Date();
  const checkInAt = getEffectiveCheckIn(activeSession);
  const durationMinutes = getSessionDurationMinutes(checkInAt, now);

  activeSession.exitTime = now;
  activeSession.currentStatus = "Checked Out";
  activeSession.checkOutAt = now;
  activeSession.exitVerifiedAt = now;
  activeSession.sessionStatus = "completed";
  activeSession.durationMinutes = durationMinutes;
  activeSession.verificationMethodExit = verificationMethod;
  await activeSession.save();

  return {
    attendance: activeSession,
    isInGym: false,
    durationMinutes,
  };
}

// ─────────────────────────────────────────────
// POST /api/attendance
// Called after successful face match to mark entry.
// ─────────────────────────────────────────────
exports.checkIn = async (req, res, next) => {
  try {
    const user = req.dbUser;
    const result = await processEntryForUser(user, "face");
    const attendance = sanitizeAttendanceRecord(result.attendance);

    return res.status(201).json({
      message: "Check-in successful",
      attendance,
      currentStreak: result.currentStreak,
      currentStatus: attendance.currentStatus,
      entryTime: attendance.entryTime,
      exitTime: attendance.exitTime,
      isInGym: result.isInGym,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json(err.payload || { error: err.message });
    }
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST /api/attendance/checkout
// Called after successful face match to mark exit.
// ─────────────────────────────────────────────
exports.checkOut = async (req, res, next) => {
  try {
    const user = req.dbUser;
    const result = await processExitForUser(user, "face");
    const attendance = sanitizeAttendanceRecord(result.attendance);

    return res.json({
      message: "Check-out successful",
      attendance,
      currentStatus: attendance.currentStatus,
      entryTime: attendance.entryTime,
      exitTime: attendance.exitTime,
      isInGym: result.isInGym,
      durationMinutes: result.durationMinutes,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json(err.payload || { error: err.message });
    }
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST /api/attendance/request-fallback-otp
// User: request email OTP fallback after face failure.
// ─────────────────────────────────────────────
exports.requestFallbackOtp = async (req, res, next) => {
  try {
    pruneExpiredOtpEntries();
    const user = req.dbUser;
    if (!user) return res.status(404).json({ error: "User not found" });

    const email = String(req.body?.email || "").trim();
    const action = String(req.body?.action || "entry").trim().toLowerCase() === "exit" ? "exit" : "entry";

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Exact-match enforcement as requested.
    if (email !== user.email) {
      return res.status(400).json({ error: "Email does not match your registered account email" });
    }

    if (action === "entry") {
      await validateEntryEligibilityOrThrow(user);
    }

    if (action === "exit") {
      const activeSession = await findActiveSession(user._id);
      if (!activeSession) {
        return res.status(409).json({ error: "No active gym session found. Check in first." });
      }
    }

    const key = getOtpStoreKey(user._id, action);
    const existingItem = otpStore.get(key);
    const rateLimitState = applyOtpRateLimitOrThrow(existingItem);

    const otp = generateSixDigitOtp();
    const now = Date.now();
    const nextAllowedSendAt = now + OTP_RESEND_COOLDOWN_SECONDS * 1000;

    // Send email FIRST - only store OTP if email send succeeds
    console.log(`[OTP] Attempting to send ${action} OTP to ${email} for user ${user._id}`);
    try {
      await sendAttendanceOtpEmail({
        toEmail: email,
        otp,
        action,
        memberName: user.name,
        expiresInMinutes: OTP_TTL_MINUTES,
      });
      console.log(`[OTP] Email sent successfully for user ${user._id}`);
    } catch (emailError) {
      console.error(`[OTP] Email send failed for user ${user._id}:`, emailError.message);
      // Don't store OTP if email failed - let error bubble up
      throw emailError;
    }

    // Only store OTP if email was sent successfully
    otpStore.set(key, {
      otpHash: hashOtp(otp),
      email,
      attempts: 0,
      expiresAt: now + OTP_TTL_MINUTES * 60 * 1000,
      action,
      sendCountInWindow: rateLimitState.sendCountInWindow + 1,
      rateLimitWindowStart: rateLimitState.rateLimitWindowStart,
      nextAllowedSendAt,
    });

    return res.json({
      message: `OTP sent to ${email}`,
      otpSent: true,
      action,
      expiresInMinutes: OTP_TTL_MINUTES,
      resendAvailableInSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      ...(process.env.NODE_ENV !== "production" ? { testOtp: otp } : {}),
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json(err.payload || { error: err.message });
    }
    next(err);
  }
};

// Alias endpoint for explicit resend actions from frontend
exports.resendFallbackOtp = exports.requestFallbackOtp;

// ─────────────────────────────────────────────
// POST /api/attendance/verify-entry-otp
// User: verify OTP and mark entry.
// ─────────────────────────────────────────────
exports.verifyEntryOtp = async (req, res, next) => {
  try {
    const user = req.dbUser;
    if (!user) return res.status(404).json({ error: "User not found" });

    const email = String(req.body?.email || "").trim();
    const otp = String(req.body?.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: "OTP must be a valid 6-digit code" });
    }
    if (email !== user.email) {
      return res.status(400).json({ error: "Email does not match your registered account email" });
    }

    validateOtpOrThrow({
      userId: user._id,
      action: "entry",
      email,
      otp,
    });

    const result = await processEntryForUser(user, "email_otp");
    const attendance = sanitizeAttendanceRecord(result.attendance);

    return res.status(201).json({
      message: "Entry verified via OTP",
      attendance,
      currentStreak: result.currentStreak,
      currentStatus: attendance.currentStatus,
      entryTime: attendance.entryTime,
      exitTime: attendance.exitTime,
      isInGym: result.isInGym,
      verificationMethod: "email_otp",
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json(err.payload || { error: err.message });
    }
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST /api/attendance/verify-exit-otp
// User: verify OTP and mark exit.
// ─────────────────────────────────────────────
exports.verifyExitOtp = async (req, res, next) => {
  try {
    const user = req.dbUser;
    if (!user) return res.status(404).json({ error: "User not found" });

    const email = String(req.body?.email || "").trim();
    const otp = String(req.body?.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: "OTP must be a valid 6-digit code" });
    }
    if (email !== user.email) {
      return res.status(400).json({ error: "Email does not match your registered account email" });
    }

    validateOtpOrThrow({
      userId: user._id,
      action: "exit",
      email,
      otp,
    });

    const result = await processExitForUser(user, "email_otp");
    const attendance = sanitizeAttendanceRecord(result.attendance);

    return res.json({
      message: "Exit verified via OTP",
      attendance,
      currentStatus: attendance.currentStatus,
      entryTime: attendance.entryTime,
      exitTime: attendance.exitTime,
      isInGym: result.isInGym,
      durationMinutes: result.durationMinutes,
      verificationMethod: "email_otp",
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json(err.payload || { error: err.message });
    }
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /api/attendance/session
// User: return whether they are currently in gym.
// ─────────────────────────────────────────────
exports.getCurrentSession = async (req, res, next) => {
  try {
    const user = req.dbUser;
    if (!user) return res.status(404).json({ error: "User not found" });

    const activeSession = await findActiveSession(user._id);
    const alert = activeSession
      ? getLongSessionAlert(getEffectiveCheckIn(activeSession))
      : {
          durationMinutes: 0,
          hasLongSessionAlert: false,
          alertType: null,
          alertMessage: null,
          alertThresholdMinutes: LONG_SESSION_ALERT_MINUTES,
        };

    return res.json({
      isInGym: !!activeSession,
      session: activeSession || null,
      ...alert,
    });
  } catch (err) {
    next(err);
  }
};
// GET /api/attendance/my
// User: return the logged-in user's own attendance history.
// ─────────────────────────────────────────────
exports.getMyAttendance = async (req, res, next) => {
  try {
    const user = req.dbUser;
    if (!user) return res.status(404).json({ error: "User not found" });

    const records = await Attendance.find({ userId: user._id })
      .sort({ checkInAt: -1, timestamp: -1 })
      .limit(90); // last ~3 months

    // Build monthly summary for chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyCounts = await Attendance.aggregate([
      {
        $addFields: {
          effectiveCheckIn: { $ifNull: ["$checkInAt", "$timestamp"] },
        },
      },
      { $match: { userId: user._id, effectiveCheckIn: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$effectiveCheckIn" },
            month: { $month: "$effectiveCheckIn" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const totalVisits = await Attendance.countDocuments({ userId: user._id });
    const lastVisit = records.length > 0 ? getEffectiveCheckIn(records[0]) : null;
    const activeSession = await findActiveSession(user._id);

    const normalizedRecords = records.map((record) => {
      const obj = record.toObject();
      obj.timestamp = getEffectiveCheckIn(record);
      return obj;
    });

    return res.json({
      records: normalizedRecords,
      totalVisits,
      lastVisit,
      monthlyCounts,
      isInGym: !!activeSession,
      activeSession,
      ...(activeSession
        ? getLongSessionAlert(getEffectiveCheckIn(activeSession))
        : {
            durationMinutes: 0,
            hasLongSessionAlert: false,
            alertType: null,
            alertMessage: null,
            alertThresholdMinutes: LONG_SESSION_ALERT_MINUTES,
          }),
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /api/attendance/live
// Admin: return users currently inside gym.
// ─────────────────────────────────────────────
exports.getLive = async (_req, res, next) => {
  try {
    const sixteenHoursAgo = new Date(Date.now() - 16 * 60 * 60 * 1000);

    const records = await Attendance.find({
      $and: [
        {
          $or: [{ sessionStatus: "in_gym" }, { checkOutAt: null }],
        },
        {
          $or: [
            { checkInAt: { $gte: sixteenHoursAgo } },
            { checkInAt: null, timestamp: { $gte: sixteenHoursAgo } },
          ],
        },
      ],
    })
      .populate("userId", "name email paymentStatus")
      .sort({ checkInAt: -1, timestamp: -1 });

    const attendees = records.map((record) => {
      const obj = record.toObject();
      const effectiveCheckIn = getEffectiveCheckIn(record);
      obj.timestamp = effectiveCheckIn;
      Object.assign(obj, getLongSessionAlert(effectiveCheckIn));
      return obj;
    });

    const longSessionAlerts = attendees.filter((a) => a.hasLongSessionAlert).length;

    return res.json({
      attendees,
      longSessionAlerts,
      alertThresholdMinutes: LONG_SESSION_ALERT_MINUTES,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /api/attendance
// Admin: return all attendance records (paginated).
// Shows only records from last 30 days (isHidden=false)
// Older records are soft-deleted (isHidden=true) but kept in DB
// ─────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const allRows = String(req.query.all || "").toLowerCase() === "true";
    const page = allRows ? 1 : Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = allRows
      ? 5000
      : Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const q = (req.query.q || "").trim();
    const date = (req.query.date || "").trim();
    const skip = (page - 1) * limit;
    const retentionStart = getRetentionStartDate();

    // NOTE: No hard-delete anymore. Records are marked as isHidden instead.
    // For old records that haven't been marked as hidden yet, mark them now
    await Attendance.updateMany(
      {
        $or: [
          { checkInAt: { $lt: retentionStart }, isHidden: false },
          { checkInAt: null, timestamp: { $lt: retentionStart }, isHidden: false },
        ],
      },
      {
        $set: {
          isHidden: true,
          hiddenAt: new Date(),
        },
      }
    );

    const pipeline = [
      {
        $addFields: {
          effectiveCheckIn: { $ifNull: ["$checkInAt", "$timestamp"] },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const match = {};
    // Filter: Show only visible records (last 30 days, isHidden=false)
    match.isHidden = false;
    match.effectiveCheckIn = { $gte: retentionStart };

    if (q) {
      match.$or = [
        { "user.name": { $regex: q, $options: "i" } },
        { "user.email": { $regex: q, $options: "i" } },
      ];
    }

    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        // Intersect selected date with retention window.
        match.effectiveCheckIn = {
          $gte: start > retentionStart ? start : retentionStart,
          $lte: end,
        };
      }
    }

    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    pipeline.push({
      $facet: {
        data: [
          { $sort: { effectiveCheckIn: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              timestamp: "$effectiveCheckIn",
              checkInAt: "$effectiveCheckIn",
              entryTime: "$effectiveCheckIn",
              checkOutAt: 1,
              exitTime: 1,
              sessionStatus: 1,
              currentStatus: 1,
              durationMinutes: 1,
              isHidden: 1,
              userId: {
                _id: "$user._id",
                name: "$user.name",
                email: "$user.email",
              },
            },
          },
        ],
        count: [{ $count: "total" }],
      },
    });

    const result = await Attendance.aggregate(pipeline);
    const records = (result[0]?.data || []).map((record) => {
      const checkInAt = record.checkInAt || record.timestamp;
      return {
        ...record,
        ...getLongSessionAlert(checkInAt, record.checkOutAt),
      };
    });
    const total = result[0]?.count?.[0]?.total || 0;

    return res.json({
      records,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
      retentionDays: ATTENDANCE_RETENTION_DAYS,
      retentionStart,
      dataIntegrity: {
        note: "Showing only visible records (last 30 days). Older records are archived but kept in database.",
        isHiddenFalseOnly: true,
      },
    });
  } catch (err) {
    next(err);
  }
};
