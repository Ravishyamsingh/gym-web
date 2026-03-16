const XLSX = require("xlsx");

const fmtDate = (value) => (value ? new Date(value).toLocaleDateString() : "");
const fmtDateTime = (value) => (value ? new Date(value).toLocaleString() : "");
const getCheckInAt = (record) => record.checkInAt || record.timestamp || record.createdAt || null;
const getCheckOutAt = (record) => record.checkOutAt || null;
const getMemberId = (record) => {
  if (!record?.userId) return "";
  if (typeof record.userId === "object") return String(record.userId._id || "");
  return String(record.userId);
};

const getDurationMinutes = (record) => {
  if (typeof record.durationMinutes === "number") return record.durationMinutes;

  const checkInAt = getCheckInAt(record);
  const checkOutAt = getCheckOutAt(record);
  if (!checkInAt || !checkOutAt) return "";

  return Math.max(0, Math.round((new Date(checkOutAt) - new Date(checkInAt)) / 60000));
};

const mapAttendanceRows = (attendance) =>
  attendance.map((a) => ({
    "Attendance ID": String(a._id || ""),
    "Member Mongo ID": getMemberId(a),
    Name: a.userId?.name || "N/A",
    Email: a.userId?.email || "N/A",
    "Check-in Date": fmtDate(getCheckInAt(a)),
    "Check-in Time": fmtDateTime(getCheckInAt(a)),
    "Check-out Date": fmtDate(getCheckOutAt(a)),
    "Check-out Time": fmtDateTime(getCheckOutAt(a)),
    "Duration (Minutes)": getDurationMinutes(a),
    "Session Status": a.sessionStatus || "completed",
    "In Gym Now": (a.sessionStatus || "completed") === "in_gym" ? "Yes" : "No",
    "Entry Verified At": fmtDateTime(a.entryVerifiedAt),
    "Exit Verified At": fmtDateTime(a.exitVerifiedAt),
    "Recorded At": fmtDateTime(a.createdAt || getCheckInAt(a)),
  }));

/**
 * Build a multi-sheet Excel workbook buffer from raw data.
 * @param {{ users: object[], attendance: object[], payments: object[] }} data
 * @returns {Buffer}
 */
function buildExcelBuffer({ users, attendance, payments }) {
  const wb = XLSX.utils.book_new();

  // ── Users sheet ──────────────────────────
  const usersRows = users.map((u) => ({
    "Member Mongo ID": String(u._id || ""),
    "Member User ID": u.userId || "",
    Name: u.name,
    Email: u.email,
    Role: u.role,
    "Payment Status": u.paymentStatus,
    Blocked: u.isBlocked ? "Yes" : "No",
    Streak: u.currentStreak,
    "Join Date": fmtDate(u.joinDate),
    "Created At": fmtDateTime(u.createdAt),
    "Updated At": fmtDateTime(u.updatedAt),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersRows), "Users");

  // ── Attendance sheet ─────────────────────
  const attendanceRows = mapAttendanceRows(attendance);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attendanceRows), "Attendance");

  // ── Payments sheet ───────────────────────
  const paymentRows = payments.map((p) => ({
    "Payment ID": String(p._id || ""),
    "Member Mongo ID": p.userId?._id ? String(p.userId._id) : "",
    Name: p.userId?.name || "N/A",
    Email: p.userId?.email || "N/A",
    Amount: p.amount,
    Status: p.status,
    "Plan ID": p.planId || "",
    "Processor": p.paymentProcessor || "",
    "Order ID": p.razorpayOrderId || "",
    "Payment Gateway ID": p.razorpayPaymentId || "",
    "Payment Date": fmtDate(p.paymentDate),
    "Expiry Date": fmtDate(p.expiryDate),
    "Created At": fmtDateTime(p.createdAt),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentRows), "Payments");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

/**
 * Build attendance-only Excel workbook buffer.
 * @param {{ attendance: object[] }} data
 * @returns {Buffer}
 */
function buildAttendanceExcelBuffer({ attendance }) {
  const wb = XLSX.utils.book_new();
  const attendanceRows = mapAttendanceRows(attendance || []);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attendanceRows), "Attendance");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

module.exports = { buildExcelBuffer, buildAttendanceExcelBuffer };
