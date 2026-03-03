const router = require("express").Router();
const { verifyToken, requireAdmin } = require("../middleware/auth");
const { getAll, create, processMembership } = require("../controllers/paymentController");

// User payment routes
router.post("/process", verifyToken, processMembership);

// Admin-only payment routes
router.get("/", verifyToken, requireAdmin, getAll);
router.post("/", verifyToken, requireAdmin, create);

module.exports = router;
