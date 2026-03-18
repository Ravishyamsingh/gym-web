const mongoose = require("mongoose");

/**
 * AdminAuditLog Schema
 * Tracks all admin actions for security and compliance
 * Never deleted - permanent record of all admin operations
 */
const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        "membership_update",
        "membership_activation",
        "membership_expiry",
        "user_block",
        "user_unblock",
        "payment_status_update",
        "attendance_correction",
        "user_search",
        "report_export",
        "settings_change",
        "other",
      ],
      required: true,
      index: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
      description: "User ID on which action was performed",
    },
    targetEmail: {
      type: String,
      default: null,
      description: "Email of user on which action was performed",
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      description: "Object containing old and new values of changed fields",
    },
    details: {
      type: String,
      default: "",
      description: "Additional details about the action",
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["success", "failure", "partial"],
      default: "success",
    },
    errorMessage: {
      type: String,
      default: null,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      description: "Result data from the action (what was created/modified)",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Index for quick admin action lookup
adminAuditLogSchema.index({ adminId: 1, createdAt: -1 });

// Index for target user history
adminAuditLogSchema.index({ targetUserId: 1, createdAt: -1 });

// Index for action type analytics
adminAuditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema);
