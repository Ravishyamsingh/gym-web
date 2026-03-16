const router = require("express").Router();
const { verifyToken, requireAdmin } = require("../middleware/auth");
const {
  getAll,
  createOrder,
  verifyPayment,
  getPaymentStatus,
  processMembership,
} = require("../controllers/paymentController");

// ─────────────────────────────────────────────────────────────
// RAZORPAY PAYMENT FLOW
// ─────────────────────────────────────────────────────────────

// Step 1: Create payment order
// User creates Razorpay order to open checkout
router.post("/create-order", verifyToken, createOrder);

// Step 2: Verify payment signature (after checkout closes)
// Frontend sends signature to verify payment authenticity
router.post("/verify", verifyToken, verifyPayment);

// ─────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────

// List all payments
router.get("/", verifyToken, requireAdmin, getAll);

// Aggregate payment stats for admin dashboard/cards
router.get("/stats/summary", verifyToken, requireAdmin, require("../controllers/paymentController").getStats);

// Step 3: Check payment status
// Frontend polls to check if webhook has confirmed payment
// Keep this dynamic route after static routes to avoid path collisions.
router.get("/:orderId/status", verifyToken, getPaymentStatus);

// Legacy: manually record payment (testing only)
router.post("/process", verifyToken, requireAdmin, processMembership);

module.exports = router;

