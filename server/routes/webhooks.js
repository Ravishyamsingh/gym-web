const router = require("express").Router();
const {
  handlePaymentWebhook,
  webhookHealth,
  manualPaymentVerify,
} = require("../controllers/webhookController");
const { verifyToken, requireAdmin } = require("../middleware/auth");

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/payment
// Razorpay webhook endpoint (no authentication required)
// ─────────────────────────────────────────────────────────────
// This endpoint receives payment confirmations from Razorpay.
// Signature verification is handled within the controller.
//
// ⚠️ IMPORTANT:
// This endpoint must NOT require authentication.
// Razorpay can't provide Firebase tokens.
// Do NOT use verifyToken middleware.
// ⚠️ Signature verification is REQUIRED in the controller.
// ─────────────────────────────────────────────────────────────
router.post("/payment", handlePaymentWebhook);

// ─────────────────────────────────────────────────────────────
// GET /api/webhooks/health
// Health check endpoint
// Can be used by Razorpay to verify endpoint is alive
// ─────────────────────────────────────────────────────────────
router.get("/health", webhookHealth);

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/verify-manual
// Manual payment verification (admin use only)
// For testing or emergency situations
// ─────────────────────────────────────────────────────────────
router.post(
  "/verify-manual",
  verifyToken,
  requireAdmin,
  manualPaymentVerify
);

module.exports = router;
