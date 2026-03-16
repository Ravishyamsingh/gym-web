/**
 * ═══════════════════════════════════════════════════════════════════
 * Razorpay Payment Service
 * ═══════════════════════════════════════════════════════════════════
 *
 * Handles all Razorpay-related operations:
 * - Creating orders
 * - Verifying payment signatures
 * - Processing webhooks
 * - Computing plan prices
 */

const crypto = require("crypto");
const Razorpay = require("razorpay");
const { v4: uuidv4 } = require("uuid");

// ─────────────────────────────────────────────────────────────────
// Initialize Razorpay Instance
// ─────────────────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─────────────────────────────────────────────────────────────────
// Plan Prices (in paise — multiply INR by 100)
// ─────────────────────────────────────────────────────────────────
const PLAN_PRICES = {
  "1month": 60000, // ₹600
  "6months": 300000, // ₹3000
  "1year": 540000, // ₹5400
};

/**
 * Get price for a plan in paise
 * @param {string} planId - Plan identifier ("1month", "6months", "1year")
 * @returns {number} Price in paise (to multiply by 100 for INR)
 * @throws {Error} If plan not found
 */
function getPlanPrice(planId) {
  const price = PLAN_PRICES[planId];
  if (!price) {
    throw new Error(`Invalid plan: ${planId}`);
  }
  return price;
}

/**
 * Create a Razorpay order
 *
 * @param {Object} params Payment details
 * @param {string} params.userId User MongoDB ID
 * @param {string} params.planId Plan identifier
 * @param {number} params.amount Amount in paise
 * @returns {Promise<Object>} Razorpay order object
 *
 * @example
 * const order = await createRazorpayOrder({
 *   userId: "507f1f77bcf86cd799439011",
 *   planId: "1year",
 *   amount: 540000
 * });
 * // Returns: { id: "order_...", entity: "order", ... }
 */
async function createRazorpayOrder({ userId, planId, amount }) {
  // Validate inputs
  if (!userId || !planId || !amount) {
    throw new Error("userId, planId, and amount are required");
  }

  // Verify amount matches plan
  const expectedAmount = getPlanPrice(planId);
  if (amount !== expectedAmount) {
    throw new Error(
      `Amount mismatch. Expected ${expectedAmount} paise, got ${amount}`
    );
  }

  // Generate unique receipt ID for idempotency
  // Razorpay receipt max length is 40 chars.
  const receipt = `rcpt_${Date.now()}_${uuidv4().substring(0, 8)}`;

  try {
    // Create order on Razorpay
    const order = await razorpay.orders.create({
      amount, // In paise
      currency: "INR",
      receipt, // Unique receipt ID
      payment_capture: 1, // Auto-capture after payment
      notes: {
        userId,
        planId,
        // These notes help identify payments in Razorpay dashboard
      },
    });

    console.log(`✓ Razorpay order created: ${order.id}`);

    return order;
  } catch (err) {
    const errMsg = err?.error?.description || err?.description || err?.message || JSON.stringify(err);
    console.error("❌ Error creating Razorpay order:", errMsg);
    throw new Error(`Failed to create payment order: ${errMsg}`);
  }
}

/**
 * Verify Razorpay payment signature
 *
 * Payment signature is computed by Razorpay and sent with webhook.
 * We recompute it server-side to verify authenticity.
 *
 * Algorithm: HMAC-SHA256
 * Data: order_id|payment_id
 * Secret: Razorpay key secret
 *
 * @param {string} orderId Razorpay order ID
 * @param {string} paymentId Razorpay payment ID
 * @param {string} signature Signature from Razorpay webhook
 * @returns {boolean} True if signature is valid
 *
 * @example
 * const isValid = verifyPaymentSignature(
 *   "order_123...",
 *   "pay_456...",
 *   "abc123def456..."
 * );
 */
function verifyPaymentSignature(orderId, paymentId, signature) {
  // Create HMAC from orderId and paymentId
  const body = `${orderId}|${paymentId}`;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  // Compare with received signature
  const isValid = expectedSignature === signature;

  if (!isValid) {
    console.warn(
      "❌ Signature verification failed.",
      `Expected: ${expectedSignature}, Got: ${signature}`
    );
  } else {
    console.log("✓ Payment signature verified");
  }

  return isValid;
}

/**
 * Verify webhook authenticity using SHA256 signature
 *
 * Razorpay sends a signature with every webhook, computed as:
 * HMAC-SHA256(body, webhook_secret)
 *
 * @param {string} body Raw request body (must be exact string)
 * @param {string} signature X-Razorpay-Signature header value
 * @returns {boolean} True if webhook is authentic
 *
 * @important
 * Must use raw body string, not parsed JSON
 * Express middleware must preserve raw body for verification
 */
function verifyWebhookSignature(body, signature) {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  const isValid = expectedSignature === signature;

  if (!isValid) {
    console.warn(
      "❌ Webhook signature verification failed.",
      `Expected: ${expectedSignature}, Got: ${signature}`
    );
  } else {
    console.log("✓ Webhook signature verified");
  }

  return isValid;
}

/**
 * Fetch payment details from Razorpay API
 * (For manual verification or debugging)
 *
 * @param {string} paymentId Razorpay payment ID
 * @returns {Promise<Object>} Payment object from Razorpay
 *
 * @example
 * const payment = await fetchPaymentDetails("pay_123...");
 * console.log(payment.status); // "captured"
 */
async function fetchPaymentDetails(paymentId) {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (err) {
    console.error(`Error fetching payment ${paymentId}:`, err.message);
    throw new Error(`Failed to fetch payment details: ${err.message}`);
  }
}

/**
 * Fetch order details from Razorpay API
 *
 * @param {string} orderId Razorpay order ID
 * @returns {Promise<Object>} Order object from Razorpay
 */
async function fetchOrderDetails(orderId) {
  try {
    const order = await razorpay.orders.fetch(orderId);
    return order;
  } catch (err) {
    console.error(`Error fetching order ${orderId}:`, err.message);
    throw new Error(`Failed to fetch order details: ${err.message}`);
  }
}

/**
 * Generate Razorpay checkout config for UPI-only payments
 *
 * @param {Object} params Checkout configuration
 * @param {string} params.orderId Razorpay order ID
 * @param {string} params.keyId Razorpay key ID (public)
 * @param {string} params.userName User's name
 * @param {string} params.userEmail User's email
 * @param {string} params.userPhone User's phone (optional)
 * @returns {Object} Razorpay checkout config
 *
 * @example
 * const config = getRazorpayCheckoutConfig({
 *   orderId: "order_123...",
 *   keyId: "rzp_test_...",
 *   userName: "John Doe",
 *   userEmail: "john@example.com"
 * });
 */
function getRazorpayCheckoutConfig({
  orderId,
  keyId,
  userName,
  userEmail,
  userPhone,
}) {
  const clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";
  return {
    key_id: keyId,
    order_id: orderId,
    customer_notify: 1, // Notify customer via SMS/Email
    amount: undefined, // Amount is already in order
    currency: "INR",
    name: "Om Muruga Olympia Fitness",
    description: "Gym Membership",
    image: `${clientOrigin}/logo.png`,
    prefill: {
      name: userName,
      email: userEmail,
      contact: userPhone || "",
    },
    notes: {
      note_key: "Om Muruga Olympia Fitness Membership Payment",
    },
    theme: {
      color: "#D20A0A", // Om Muruga Olympia Fitness brand red
    },
    // ─────────────────────────────────────────────
    // UPI-ONLY Configuration
    // ─────────────────────────────────────────────
    // Hide all payment methods except UPI/QR
    method: {
      upi: true, // Show UPI payment
      card: false, // Hide card payments
      netbanking: false, // Hide netbanking
      wallet: false, // Hide wallets
      emandate: false, // Hide EMI
    },
    // Alternative: Use display.hide if method doesn't work
    display: {
      hide: [
        { method: "card" },
        { method: "netbanking" },
        { method: "wallet" },
        { method: "emandate" },
      ],
    },
    // Recommended to use handle_response: false
    // So we can verify payment signature on backend before marking as paid
    handler: undefined, // Will be handled in frontend
    modal: {
      onclosed: undefined, // Custom handler
    },
    timeout: 900, // 15 minutes
    backdrop: true,
    readonly: {
      email: true, // Email non-editable
      contact: false, // Phone can be edited if missing
    },
  };
}

/**
 * Check if payment is actually captured (paid)
 *
 * @param {Object} payment Razorpay payment object
 * @returns {boolean} True if payment status is "captured"
 */
function isPaymentCaptured(payment) {
  return payment && payment.status === "captured";
}

/**
 * Extract useful payment info from Razorpay response
 *
 * @param {Object} payment Razorpay payment object
 * @returns {Object} Extracted payment info
 */
function extractPaymentInfo(payment) {
  return {
    paymentId: payment.id,
    orderId: payment.order_id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    method: payment.method,
    vpa: payment.vpa || null,
    email: payment.email,
    contact: payment.contact,
    timestamp: new Date(payment.created_at * 1000),
    fees: payment.fees || 0,
    tax: payment.tax || 0,
  };
}

module.exports = {
  razorpay,
  getPlanPrice,
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPaymentDetails,
  fetchOrderDetails,
  getRazorpayCheckoutConfig,
  isPaymentCaptured,
  extractPaymentInfo,
  PLAN_PRICES,
};
