const Payment = require("../models/Payment");
const User = require("../models/User");
const {
  createRazorpayOrder,
  getPlanPrice,
  calculatePaymentAmount,
  getRazorpayCheckoutConfig,
  REGISTRATION_FEE,
} = require("../utils/razorpayService");

// ─────────────────────────────────────────────
// GET /api/payments
// Admin: list all payments (paginated).
// ─────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const q = (req.query.q || "").trim();
    const skip = (page - 1) * limit;

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (q) {
      pipeline.push({
        $match: {
          $or: [
            { "user.name": { $regex: q, $options: "i" } },
            { "user.email": { $regex: q, $options: "i" } },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        data: [
          { $sort: { paymentDate: -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              userId: {
                _id: "$user._id",
                name: "$user.name",
                email: "$user.email",
              },
              amount: 1,
              status: 1,
              paymentDate: 1,
              expiryDate: 1,
              planId: 1,
              paymentProcessor: 1,
              createdAt: 1,
            },
          },
        ],
        count: [{ $count: "total" }],
      },
    });

    const result = await Payment.aggregate(pipeline);
    const payments = result[0]?.data || [];
    const total = result[0]?.count?.[0]?.total || 0;

    return res.json({
      payments,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /api/payments/stats/summary
// Admin: aggregate payment stats across all records.
// ─────────────────────────────────────────────
exports.getStats = async (_req, res, next) => {
  try {
    const [summary] = await Payment.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0],
            },
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0],
            },
          },
          paidCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "paid"] }, 1, 0],
            },
          },
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },
          failedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "failed"] }, 1, 0],
            },
          },
        },
      },
    ]);

    return res.json({
      stats: summary || {
        totalRevenue: 0,
        pendingAmount: 0,
        paidCount: 0,
        pendingCount: 0,
        failedCount: 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST /api/payments/create-order
// User: Create a Razorpay payment order for checkout
// Requires authentication.
// ─────────────────────────────────────────────
/**
 * Creates a Razorpay order which the user pays through checkout.
 *
 * Request body:
 * {
 *   planId: "1month" | "6months" | "1year"
 * }
 *
 * Response:
 * {
 *   orderId: "order_...",
 *   amount: 540000,  // in paise (₹5400)
 *   keyId: "rzp_test_SR9RWdRpVz3HUg",
 *   checkoutConfig: { ... }
 * }
 *
 * ⚠️ IMPORTANT:
 * The frontend uses orderId to open Razorpay checkout.
 * User's payment is verified server-side via webhook.
 * Do NOT mark user as paid based on frontend success callback.
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { planId } = req.body;
    const userId = req.dbUser._id;
    const user = req.dbUser;

    // ─────────────────────────────────────────────────────────────
    // Validate plan
    // ─────────────────────────────────────────────────────────────
    if (!planId || !["1month", "6months", "1year"].includes(planId)) {
      return res
        .status(400)
        .json({ error: "Invalid planId. Must be 1month, 6months, or 1year" });
    }

    // ─────────────────────────────────────────────────────────────
    // Check if user already has active membership
    // ─────────────────────────────────────────────────────────────
    if (user.paymentStatus === "active") {
      // Check if membership hasn't expired yet
      if (user.membershipExpiry && new Date() < user.membershipExpiry) {
        const expiryDate = new Date(user.membershipExpiry).toLocaleDateString(
          "en-US",
          { year: "numeric", month: "short", day: "numeric" }
        );
        return res.status(409).json({
          error: "You already have an active membership",
          expiryDate,
          message: `Your current membership is valid until ${expiryDate}`,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Calculate payment amount (with registration fee for first-time users)
    // ─────────────────────────────────────────────────────────────
    let amount;
    let duration;
    let includesRegistrationFee;
    let registrationFeeAmount;
    let membershipFeeAmount;
    
    try {
      const isFirstTimeUser = !user.registrationFeePaid;
      const paymentDetails = calculatePaymentAmount(planId, isFirstTimeUser);
      
      amount = paymentDetails.totalAmount;
      membershipFeeAmount = paymentDetails.planAmount;
      registrationFeeAmount = paymentDetails.registrationFeeAmount;
      includesRegistrationFee = paymentDetails.includesRegistrationFee;
      
      // Map planId to duration string
      const durationMap = {
        "1month": "1 Month",
        "6months": "6 Months",
        "1year": "1 Year",
      };
      duration = durationMap[planId];
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // ─────────────────────────────────────────────────────────────
    // Calculate membership expiry date
    // ─────────────────────────────────────────────────────────────
    const expiryDate = new Date();
    if (planId === "1month") {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (planId === "6months") {
      expiryDate.setMonth(expiryDate.getMonth() + 6);
    } else if (planId === "1year") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    // ─────────────────────────────────────────────────────────────
    // Create Razorpay order
    // ─────────────────────────────────────────────────────────────
    let razorpayOrder;
    try {
      razorpayOrder = await createRazorpayOrder({
        userId: userId.toString(),
        planId,
        amount,
      });
    } catch (err) {
      return res.status(500).json({
        error: "Failed to create payment order",
        message: err.message,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // Create Payment record in database (status: pending)
    // ─────────────────────────────────────────────────────────────
    const payment = await Payment.create({
      userId,
      amount: amount / 100, // Convert paise to rupees
      planId,
      duration,
      expiryDate,
      status: "pending", // Status will be "paid" only after webhook confirmation
      razorpayOrderId: razorpayOrder.id,
      paymentProcessor: "razorpay",
      webhookVerified: false,
      includesRegistrationFee,
      registrationFeeAmount: registrationFeeAmount / 100, // Convert to rupees
      membershipFeeAmount: membershipFeeAmount / 100, // Convert to rupees
    });

    console.log(`📋 Payment record created: ${payment._id}`);
    console.log(`📊 Razorpay order created: ${razorpayOrder.id}`);

    // ─────────────────────────────────────────────────────────────
    // Generate Razorpay checkout configuration
    // ─────────────────────────────────────────────────────────────
    const checkoutConfig = getRazorpayCheckoutConfig({
      orderId: razorpayOrder.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      userName: user.name,
      userEmail: user.email,
      userPhone: "", // Add user phone if available
    });

    // ─────────────────────────────────────────────────────────────
    // Return order details to frontend
    // ─────────────────────────────────────────────────────────────
    return res.status(201).json({
      orderId: razorpayOrder.id,
      amount, // in paise
      amountINR: amount / 100, // for display
      keyId: process.env.RAZORPAY_KEY_ID,
      planId,
      duration,
      expiryDate: expiryDate.toISOString(),
      checkoutConfig,
      includesRegistrationFee,
      registrationFeeAmount: registrationFeeAmount / 100,
      membershipFeeAmount: membershipFeeAmount / 100,
      message: includesRegistrationFee 
        ? "First-time payment includes ₹800 registration fee + membership plan amount"
        : "Order created. Proceed to payment.",
    });
  } catch (err) {
    console.error("❌ Error creating order:", err.message);
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST /api/payments/verify
// User: Verify payment signature after checkout closes
// Called from frontend as fallback (webhook is primary)
// ─────────────────────────────────────────────
/**
 * Frontend calls this after Razorpay checkout closes with payment details.
 * Verifies the payment signature to ensure it's authentic.
 *
 * Request body:
 * {
 *   orderId: "order_...",
 *   paymentId: "pay_...",
 *   signature: "abc123def456..."
 * }
 *
 * Response:
 * {
 *   status: "success",
 *   message: "Payment verified. Awaiting confirmation.",
 *   orderId: "order_...",
 *   paymentId: "pay_..."
 * }
 *
 * ⚠️ IMPORTANT:
 * This endpoint only verifies signature.
 * Payment status is NOT updated here.
 * Payment status is updated only by webhook (webhookVerified: true).
 * Frontend must poll /api/payments/status or wait for real-time update.
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    // ─────────────────────────────────────────────────────────────
    // Validate inputs
    // ─────────────────────────────────────────────────────────────
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        error: "orderId, paymentId, and signature are required",
      });
    }

    // ─────────────────────────────────────────────────────────────
    // Find payment by order ID
    // ─────────────────────────────────────────────────────────────
    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) {
      return res
        .status(404)
        .json({ error: `Payment not found for order: ${orderId}` });
    }

    // User can only verify their own payment, admins can verify any payment.
    if (
      req.dbUser.role !== "admin" &&
      payment.userId.toString() !== req.dbUser._id.toString()
    ) {
      return res.status(403).json({ error: "Not authorized for this payment" });
    }

    // ─────────────────────────────────────────────────────────────
    // Verify payment signature
    // ─────────────────────────────────────────────────────────────
    const {
      verifyPaymentSignature,
    } = require("../utils/razorpayService");

    const isSignatureValid = verifyPaymentSignature(
      orderId,
      paymentId,
      signature
    );

    if (!isSignatureValid) {
      console.warn(`❌ Invalid signature for payment ${paymentId}`);
      return res.status(403).json({
        error: "Invalid payment signature",
        message: "Payment could not be verified. Please contact support.",
      });
    }

    console.log(`✓ Payment signature verified: ${paymentId}`);

    // ─────────────────────────────────────────────────────────────
    // Store signature and payment ID
    // (Webhook will update status when payment is confirmed)
    // ─────────────────────────────────────────────────────────────
    payment.razorpayPaymentId = paymentId;
    payment.razorpaySignature = signature;
    await payment.save();

    // ─────────────────────────────────────────────────────────────
    // Return success
    // ─────────────────────────────────────────────────────────────
    return res.json({
      status: "verified",
      message:
        "Payment signature verified. Waiting for confirmation from payment gateway.",
      orderId,
      paymentId,
      note: "Your payment will be confirmed shortly. You will be notified via email.",
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /api/payments/:orderId/status
// User: Check payment status
// Returns true status from database (after webhook confirms)
// ─────────────────────────────────────────────
/**
 * Frontend polls this endpoint to check if payment has been confirmed.
 * Used as fallback if real-time updates not available.
 *
 * Returns:
 * {
 *   orderId: "order_...",
 *   status: "pending" | "paid" | "failed",
 *   webhookVerified: true | false,
 *   message: "..."
 * }
 */
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    const payment = await Payment.findOne({ razorpayOrderId: orderId });

    if (!payment) {
      return res
        .status(404)
        .json({ error: `Payment not found for order: ${orderId}` });
    }

    // User can only read status for their own payment, admins can read all.
    if (
      req.dbUser.role !== "admin" &&
      payment.userId.toString() !== req.dbUser._id.toString()
    ) {
      return res.status(403).json({ error: "Not authorized for this payment" });
    }

    // Return actual status
    const isVerified = payment.webhookVerified && payment.status === "paid";

    return res.json({
      orderId,
      status: payment.status,
      webhookVerified: payment.webhookVerified,
      isPaid: isVerified,
      message: isVerified
        ? "Payment confirmed! Your membership is now active."
        : payment.status === "failed"
        ? "Payment failed. Please try again."
        : "Payment pending. Waiting for confirmation...",
      paymentId: payment.razorpayPaymentId || null,
      expiryDate: payment.expiryDate,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// LEGACY: POST /api/payments/process
// Admin-only: manually record payment (for testing)
// ─────────────────────────────────────────────
/**
 * Legacy endpoint for admin-only manual payment recording.
 * Should not be used by regular users.
 * This bypasses Razorpay (for test purposes only).
 */
exports.processMembership = async (req, res, next) => {
  try {
    const { userId, planId, amount, bypassPayment } = req.body;
    const currentUser = req.dbUser;

    // Only allow if explicitly bypassing payment (admin action)
    if (!bypassPayment || currentUser.role !== "admin") {
      return res.status(403).json({
        error:
          "This endpoint is deprecated. Use POST /api/payments/create-order instead.",
      });
    }

    // Admin-only: manually create payment for testing
    if (!userId || !planId || !amount) {
      return res
        .status(400)
        .json({ error: "userId, planId, and amount are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Calculate expiry date
    const expiryDate = new Date();
    if (planId === "1month") {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (planId === "6months") {
      expiryDate.setMonth(expiryDate.getMonth() + 6);
    } else if (planId === "1year") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    // Create payment record (marked as paid but note: not via Razorpay)
    const payment = await Payment.create({
      userId,
      amount,
      expiryDate,
      status: "paid",
      planId,
      paymentProcessor: "manual",
      webhookVerified: false,
    });

    // Activate user
    user.paymentStatus = "active";
    user.membershipPlan = planId;
    user.membershipStartDate = new Date();
    user.membershipExpiry = expiryDate;
    await user.save();

    console.log(`⚠️  Manual payment created by admin: ${payment._id}`);

    return res.status(201).json({
      message: "Payment recorded (manual, for testing only)",
      payment,
      user,
    });
  } catch (err) {
    next(err);
  }
};

