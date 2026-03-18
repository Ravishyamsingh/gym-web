const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "overdue"],
      default: "pending",
    },
    planId: {
      type: String,
      enum: ["1month", "6months", "1year"],
    },
    duration: {
      type: String,
    },
    // ─────────────────────────────────────────────────
    // Razorpay Integration Fields
    // ─────────────────────────────────────────────────
    // Order ID created on Razorpay
    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Payment ID returned by Razorpay after successful payment
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Signature for webhook verification
    razorpaySignature: {
      type: String,
      sparse: true,
    },
    // Payment processor name
    paymentProcessor: {
      type: String,
      enum: ["manual", "razorpay"],
      default: "razorpay",
    },
    // Was this payment verified via webhook?
    webhookVerified: {
      type: Boolean,
      default: false,
    },
    // Full response from Razorpay API
    processorResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // Idempotency key for duplicate prevention
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Payment method used (UPI, card, etc.)
    paymentMethod: {
      type: String,
      default: "upi",
    },
    // Failure reason if payment failed
    failureReason: {
      type: String,
      default: null,
    },
    // VPA/UPI ID if UPI payment
    vpa: {
      type: String,
      default: null,
    },
    // Registration Fee Tracking
    includesRegistrationFee: {
      type: Boolean,
      default: false,
    },
    registrationFeeAmount: {
      type: Number,
      default: 0,
    },
    membershipFeeAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
