const router = require("express").Router();
const { verifyToken, requireAdmin } = require("../middleware/auth");
const { exportExcel, exportAttendanceExcel } = require("../controllers/reportController");

// Admin-only report export
router.get("/export", verifyToken, requireAdmin, exportExcel);
router.get("/attendance-export", verifyToken, requireAdmin, exportAttendanceExcel);

module.exports = router;
