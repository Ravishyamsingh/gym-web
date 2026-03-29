const mongoose = require("mongoose");

/**
 * MembershipHistory Schema
 * Tracks all membership changes for audit trail and analytics
 * Never deleted - permanent record for complete user history
 */
const membershipHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    previousStatus: {
      type: String,
      enum: ["active", "expired", "pending"],
      default: null,
    },
    newStatus: {
      type: String,
      enum: ["active", "expired", "pending"],
      required: true,
      index: true,
    },
    membershipPlan: {
      type: String,
      enum: ["1month", "3months", "6months", "1year"],
      required: true,
    },
    planAmount: {
      type: Number,
      required: true,
      description: "Amount for the membership plan only (in ₹)",
    },
    registrationFeeIncluded: {
      type: Boolean,
      default: false,
    },
    registrationFeeAmount: {
      type: Number,
      default: 0,
      description: "Registration fee amount if applicable (₹10)",
    },
    totalAmount: {
      type: Number,
      required: true,
      description: "Total amount: planAmount + registrationFeeAmount if applicable",
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    isFirstTimeUser: {
      type: Boolean,
      required: true,
      index: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      description: "ID of admin who performed the update, null if system",
    },
    reason: {
      type: String,
      default: "Membership update",
      description: "Reason for membership change (manual update, renewal, etc.)",
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
      description: "Associated payment record if any",
    },
    notes: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Index for quick lookup of user's membership history
membershipHistorySchema.index({ userId: 1, createdAt: -1 });

// Index for revenue analytics
membershipHistorySchema.index({ newStatus: 1, membershipPlan: 1, createdAt: -1 });

module.exports = mongoose.model("MembershipHistory", membershipHistorySchema);
