const { buildExcelBuffer } = require("../utils/excelExport");
const Attendance = require("../models/Attendance");
const Payment = require("../models/Payment");
const User = require("../models/User");

// ─────────────────────────────────────────────
// GET /api/reports/export
// Admin: download an Excel workbook with Users, Attendance, and
// Payments sheets.
// ─────────────────────────────────────────────
exports.exportExcel = async (_req, res, next) => {
  try {
    const [users, attendance, payments] = await Promise.all([
      User.find().select("-faceDescriptor").lean(),
      Attendance.find().populate("userId", "name email").sort({ timestamp: -1 }).lean(),
      Payment.find().populate("userId", "name email").sort({ paymentDate: -1 }).lean(),
    ]);

    const buffer = buildExcelBuffer({ users, attendance, payments });

    res.setHeader("Content-Disposition", "attachment; filename=gymweb-report.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};
