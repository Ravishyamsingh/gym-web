const router = require("express").Router();
const { verifyToken, requireAdmin, requireProfileComplete } = require("../middleware/auth");
const { checkIn, getLive, getAll, getMyAttendance } = require("../controllers/attendanceController");

// User: log a face-verified check-in (requires profile complete)
router.post("/", verifyToken, requireProfileComplete, checkIn);

// User: get own attendance history
router.get("/my", verifyToken, getMyAttendance);

// Admin: live attendees (last 3 h) & full history
router.get("/live", verifyToken, requireAdmin, getLive);
router.get("/", verifyToken, requireAdmin, getAll);

module.exports = router;
