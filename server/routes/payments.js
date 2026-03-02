const router = require("express").Router();
const { verifyToken, requireAdmin } = require("../middleware/auth");
const { getAll, create } = require("../controllers/paymentController");

// Admin-only payment routes
router.get("/", verifyToken, requireAdmin, getAll);
router.post("/", verifyToken, requireAdmin, create);

module.exports = router;
