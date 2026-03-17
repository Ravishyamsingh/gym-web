const router = require("express").Router();
const { verifyToken, requireAdmin, requireProfileComplete } = require("../middleware/auth");
const {
	checkIn,
	checkOut,
	requestFallbackOtp,
	resendFallbackOtp,
	verifyEntryOtp,
	verifyExitOtp,
	getCurrentSession,
	getLive,
	getAll,
	getMyAttendance,
} = require("../controllers/attendanceController");

// User: log a face-verified check-in (requires profile complete)
router.post("/", verifyToken, requireProfileComplete, checkIn);

// User: log a face-verified check-out
// Keep this available with auth even if membership status changed,
// so members can still exit safely.
router.post("/checkout", verifyToken, checkOut);

// User: get active in-gym session status
router.get("/session", verifyToken, getCurrentSession);

// User: get own attendance history
router.get("/my", verifyToken, getMyAttendance);

// User: email OTP fallback flow when face verification fails
router.post("/request-fallback-otp", verifyToken, requestFallbackOtp);
router.post("/resend-fallback-otp", verifyToken, resendFallbackOtp);
router.post("/verify-entry-otp", verifyToken, verifyEntryOtp);
router.post("/verify-exit-otp", verifyToken, verifyExitOtp);

// Admin: live attendees (last 3 h) & full history
router.get("/live", verifyToken, requireAdmin, getLive);
router.get("/", verifyToken, requireAdmin, getAll);

module.exports = router;
