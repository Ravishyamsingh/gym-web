const XLSX = require("xlsx");

/**
 * Build a multi-sheet Excel workbook buffer from raw data.
 * @param {{ users: object[], attendance: object[], payments: object[] }} data
 * @returns {Buffer}
 */
function buildExcelBuffer({ users, attendance, payments }) {
  const wb = XLSX.utils.book_new();

  // ── Users sheet ──────────────────────────
  const usersRows = users.map((u) => ({
    Name: u.name,
    Email: u.email,
    Role: u.role,
    "Payment Status": u.paymentStatus,
    Blocked: u.isBlocked ? "Yes" : "No",
    Streak: u.currentStreak,
    "Join Date": u.joinDate ? new Date(u.joinDate).toLocaleDateString() : "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersRows), "Users");

  // ── Attendance sheet ─────────────────────
  const attendanceRows = attendance.map((a) => ({
    Name: a.userId?.name || "N/A",
    Email: a.userId?.email || "N/A",
    "Check-in Time": a.timestamp ? new Date(a.timestamp).toLocaleString() : "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attendanceRows), "Attendance");

  // ── Payments sheet ───────────────────────
  const paymentRows = payments.map((p) => ({
    Name: p.userId?.name || "N/A",
    Email: p.userId?.email || "N/A",
    Amount: p.amount,
    Status: p.status,
    "Payment Date": p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "",
    "Expiry Date": p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentRows), "Payments");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

module.exports = { buildExcelBuffer };
