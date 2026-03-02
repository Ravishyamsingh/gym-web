const router = require("express").Router();
const { verifyToken, requireAdmin } = require("../middleware/auth");
const { exportExcel } = require("../controllers/reportController");

// Admin-only report export
router.get("/export", verifyToken, requireAdmin, exportExcel);

module.exports = router;
