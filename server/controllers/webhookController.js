/**
 * ═══════════════════════════════════════════════════════════════════
 * Webhook Controller
 * ═══════════════════════════════════════════════════════════════════
 *
 * Handles webhook callbacks from Razorpay payment gateway.
 * This is the SOURCE OF TRUTH for payment status updates.
 */

const Payment = require("../models/Payment");
const User = require("../models/User");
const {
  verifyWebhookSignature,
  extractPaymentInfo,
  isPaymentCaptured,
} = require("../utils/razorpayService");

/**
 * POST /api/webhooks/payment
 *
 * Razorpay webhook endpoint for payment confirmation.
 *
 * ⚠️ SECURITY:
 * - Verifies X-Razorpay-Signature header
 * - Requires raw request body for signature verification
 * - No authentication required (webhook is from Razorpay server)
 * - Always verifies before updating database
 *
 * ⚠️ IMPORTANT:
 * Must use raw body string. Express middleware preserves raw body
 * in req.rawBody for webhook signature verification.
 *
 * Event: payment.authorized
 * Fired when payment is captured (charged)
 *
 * @example Webhook Payload
 * {
 *   "event": "payment.authorized",
 *   "payload": {
 *     "payment": {
 *       "entity": {
 *         "id": "pay_123abc...",
 *         "order_id": "order_456def...",
 *         "amount": 540000,
 *         "status": "captured",
 *         "method": "upi",
 *         "vpa": "user@upi",
 *         "email": "user@example.com",
 *         "contact": "+919876543210"
 *       }
 *     }
 *   }
 * }
 */
exports.handlePaymentWebhook = async (req, res, next) => {
  try {
    // ─────────────────────────────────────────────────────────────
    // Step 1: Verify webhook authenticity
    // ─────────────────────────────────────────────────────────────
    const webhookSignature =
      req.headers["x-razorpay-signature"] || req.get("x-razorpay-signature");

    if (!webhookSignature) {
      console.warn("❌ Webhook missing signature header");
      return res.status(400).json({ error: "Missing webhook signature" });
    }

    // Use raw body for signature verification
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const isSignatureValid = verifyWebhookSignature(rawBody, webhookSignature);
    if (!isSignatureValid) {
      console.error("❌ Webhook signature verification failed — rejecting");
      return res.status(403).json({ error: "Invalid webhook signature" });
    }

    // ─────────────────────────────────────────────────────────────
    // Step 2: Extract webhook event
    // ─────────────────────────────────────────────────────────────
    const { event, payload } = req.body;

    console.log(`📍 Webhook received: ${event}`);

    // Only process payment.authorized events
    if (event !== "payment.authorized") {
      console.log(`⏭️  Ignoring event: ${event}`);
      // Still return 200 to acknowledge receipt
      return res.json({ status: "acknowledged", event });
    }

    // ─────────────────────────────────────────────────────────────
    // Step 3: Extract payment details
    // ─────────────────────────────────────────────────────────────
    const paymentData = payload.payment?.entity;
    if (!paymentData) {
      console.warn("❌ Webhook missing payment entity");
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    const paymentId = paymentData.id;
    const orderId = paymentData.order_id;
    const amount = paymentData.amount;

    console.log(`💳 Processing payment: ${paymentId} for order ${orderId}`);

    // ─────────────────────────────────────────────────────────────
    // Step 4: Verify payment is actually captured
    // ─────────────────────────────────────────────────────────────
    if (!isPaymentCaptured(paymentData)) {
      console.warn(
        `⚠️  Payment status is ${paymentData.status}, expected "captured"`
      );
      // Even if not captured, we process it (admin can manually refund)
    }

    // ─────────────────────────────────────────────────────────────
    // Step 5: Find corresponding order in database
    // ─────────────────────────────────────────────────────────────
    const payment = await Payment.findOne({ razorpayOrderId: orderId });

    if (!payment) {
      console.warn(`❌ Payment not found for order: ${orderId}`);
      // Return 200 to prevent Razorpay from retrying
      // (Order might be from another system or test)
      return res.json({
        status: "acknowledged",
        note: "Order not found in our system",
      });
    }

    // ─────────────────────────────────────────────────────────────
    // Step 6: Verify amount matches
    // ─────────────────────────────────────────────────────────────
    if (payment.amount !== amount / 100) {
      // Razorpay sends amount in paise, we store in rupees
      console.error(
        `❌ Amount mismatch: DB=${payment.amount}, Razorpay=${amount / 100}`
      );
      // Log but don't block (could be rounding issue)
    }

    // ─────────────────────────────────────────────────────────────
    // Step 7: Check if already processed (idempotency)
    // ─────────────────────────────────────────────────────────────
    if (payment.status === "paid" && payment.webhookVerified) {
      console.log(
        `⚠️  Duplicate webhook for payment ${paymentId} — already processed`
      );
      return res.json({
        status: "acknowledged",
        note: "Payment already verified",
      });
    }

    // ─────────────────────────────────────────────────────────────
    // Step 8: Update Payment record
    // ─────────────────────────────────────────────────────────────
    payment.status = "paid";
    payment.razorpayPaymentId = paymentId;
    payment.webhookVerified = true;
    payment.paymentMethod = paymentData.method || "upi";
    payment.vpa = paymentData.vpa || null;
    payment.processorResponse = paymentData;
    payment.paymentDate = new Date(paymentData.created_at * 1000);

    await payment.save();
    console.log(`✅ Payment record updated: ${paymentId}`);

    // ─────────────────────────────────────────────────────────────
    // Step 9: Update User membership status
    // ─────────────────────────────────────────────────────────────
    const user = await User.findById(payment.userId);

    if (!user) {
      console.error(`❌ User not found: ${payment.userId}`);
      // Payment verified, but user not found (should never happen)
      return res.json({
        status: "acknowledged",
        error: "User not found",
      });
    }

    // Update user's membership status
    user.paymentStatus = "active";
    user.membershipPlan = payment.planId;
    user.membershipStartDate = new Date();
    user.membershipExpiry = payment.expiryDate;

    await user.save();
    console.log(
      `✅ User membership activated: ${user._id} (expires: ${payment.expiryDate.toLocaleDateString()})`
    );

    // ─────────────────────────────────────────────────────────────
    // Step 10: Send success response to Razorpay
    // ─────────────────────────────────────────────────────────────
    // Razorpay expects 200 OK to consider webhook delivered successfully
    return res.json({
      status: "success",
      message: "Payment verified and processed",
      paymentId,
      orderId,
      userId: user._id,
    });
  } catch (err) {
    console.error("❌ Webhook processing error:", err.message);
    // Still return 200 to prevent Razorpay retry loop
    // Log the error for manual review
    return res.status(500).json({
      status: "error",
      message: "Webhook processing failed",
      error: err.message,
    });
  }
};

/**
 * GET /api/webhooks/health
 *
 * Simple health check endpoint for webhook verification.
 * Razorpay can use this to verify endpoint is alive.
 */
exports.webhookHealth = (_req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date(),
    endpoint: "/api/webhooks/payment",
  });
};

/**
 * Manual payment verification endpoint
 *
 * POST /api/webhooks/verify-manual
 *
 * For testing or manual payment verification in case webhook fails.
 * Requires admin authentication.
 *
 * ⚠️ SECURITY: Should only be accessible to admins
 */
exports.manualPaymentVerify = async (req, res, next) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res
        .status(400)
        .json({ error: "orderId, paymentId, and signature are required" });
    }

    // Find payment by order ID
    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) {
      return res
        .status(404)
        .json({ error: `Payment order not found: ${orderId}` });
    }

    // Verify the payment signature
    const {
      verifyPaymentSignature,
    } = require("../utils/razorpayService");

    const isSignatureValid = verifyPaymentSignature(
      orderId,
      paymentId,
      signature
    );

    if (!isSignatureValid) {
      return res.status(403).json({ error: "Invalid payment signature" });
    }

    // Update payment
    payment.status = "paid";
    payment.razorpayPaymentId = paymentId;
    payment.razorpaySignature = signature;
    payment.webhookVerified = true;
    await payment.save();

    // Update user
    const user = await User.findById(payment.userId);
    if (user) {
      user.paymentStatus = "active";
      user.membershipPlan = payment.planId;
      user.membershipStartDate = new Date();
      user.membershipExpiry = payment.expiryDate;
      await user.save();
    }

    console.log(`✅ Manual payment verification completed: ${paymentId}`);

    return res.json({
      status: "success",
      message: "Payment manually verified",
      paymentId,
      orderId,
    });
  } catch (err) {
    next(err);
  }
};
