const User = require("../models/User");
const Payment = require("../models/Payment");
const membershipService = require("../utils/membershipService");
const adminService = require("../utils/adminService");

/**
 * Admin Membership Controller
 * Handles membership status updates, plan selection, and activation
 */

/**
 * Update membership status and optionally select/change plan
 * POST /api/admin/membership/update
 *
 * @body {
 *   userId: ObjectId,
 *   newStatus: String (active, pending, expired),
 *   planId?: String (1month, 6months, 1year),
 *   reason?: String,
 *   notes?: String
 * }
 */
const updateMembership = async (req, res) => {
  try {
    const { userId, newStatus, planId, reason, notes } = req.body;
    const adminId = req.dbUser._id;
    const adminEmail = req.dbUser.email;

    // Validation
    if (!userId || !newStatus) {
      return res.status(400).json({
        error: "Missing required fields: userId, newStatus",
      });
    }

    if (!["active", "pending", "expired"].includes(newStatus)) {
      return res.status(400).json({
        error: "Invalid status. Must be one of: active, pending, expired",
      });
    }

    // If status is being set to active, plan is required
    if (newStatus === "active" && !planId) {
      return res.status(400).json({
        error: "planId is required when activating membership",
      });
    }

    if (planId && !membershipService.PLANS[planId]) {
      return res.status(400).json({
        error: `Invalid plan ID: ${planId}. Must be one of: 1month, 3months, 6months, 1year`,
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let result;

    // Handle activation with plan selection
    if (newStatus === "active" && planId) {
      result = await membershipService.activateMembership(userId, planId, adminId, {
        reason: reason || `Activated by admin ${adminEmail}`,
        notes: notes || "",
      });

      // ─────────────────────────────────────────────────────────────
      // Create Payment record for admin-approved membership
      // Consolidate and clean up pending payments
      // ─────────────────────────────────────────────────────────────
      
      // Cancel/mark as superseded any pending payments for this user
      await Payment.updateMany(
        { userId, status: "pending" },
        { 
          status: "cancelled", 
          failureReason: "Superseded by admin-approved membership",
        }
      );

      // Create new payment record (marked as paid) for admin approval
      const amountDetails = result.amountDetails;
      const adminPayment = await Payment.create({
        userId,
        amount: amountDetails.totalAmount,
        planId,
        duration: membershipService.PLANS[planId] ? `${membershipService.PLANS[planId].months} Month${membershipService.PLANS[planId].months > 1 ? 's' : ''}` : planId,
        expiryDate: result.user.membershipExpiry,
        status: "paid",
        paymentProcessor: "manual",
        webhookVerified: true, // Admin-approved payments are pre-verified
        includesRegistrationFee: amountDetails.includesRegistrationFee,
        registrationFeeAmount: amountDetails.registrationFeeAmount,
        membershipFeeAmount: amountDetails.planAmount,
        paymentDate: new Date(),
      });

      console.log(`✅ Admin-approved payment created: ${adminPayment._id}`);
      console.log(`🔄 Cancelled ${result.membershipHistory.count || 0} pending payments for user ${userId}`);

      // Log the action
      await adminService.logAdminAction(adminId, "membership_activation", {
        targetUserId: userId,
        targetEmail: user.email,
        changes: {
          oldStatus: user.paymentStatus,
          newStatus: "active",
          oldPlan: user.membershipPlan,
          newPlan: planId,
        },
        details: `Membership activated with plan: ${planId}. Admin-approved payment created.`,
        status: "success",
        paymentId: adminPayment._id,
        result: result,
      });

      return res.status(200).json({
        message: "Membership activated successfully",
        ...result,
        payment: adminPayment.toObject(),
        paymentDetails: {
          created: true,
          processor: "manual",
          status: "paid",
          id: adminPayment._id,
        },
      });
    } else {
      // Just update status
      const updatedUser = await membershipService.updateMembershipStatus(
        userId,
        newStatus,
        adminId,
        {
          reason: reason || `Status changed by admin ${adminEmail}`,
          notes: notes || "",
        }
      );

      // Log the action
      await adminService.logAdminAction(adminId, "membership_update", {
        targetUserId: userId,
        targetEmail: user.email,
        changes: {
          oldStatus: user.paymentStatus,
          newStatus,
        },
        details: `Membership status updated to: ${newStatus}`,
        status: "success",
        result: updatedUser,
      });

      return res.status(200).json({
        message: "Membership status updated successfully",
        user: updatedUser,
      });
    }
  } catch (error) {
    console.error("Error updating membership:", error);

    // Log failure
    if (req.dbUser) {
      await adminService.logAdminAction(req.dbUser._id, "membership_update", {
        targetUserId: req.body.userId,
        changes: req.body,
        status: "failure",
        errorMessage: error.message,
      });
    }

    res.status(500).json({
      error: "Failed to update membership",
      details: error.message,
    });
  }
};

/**
 * Get membership history for a user
 * GET /api/admin/membership/history/:userId
 */
const getMembershipHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const history = await membershipService.getUserMembershipHistory(userId, parseInt(limit));

    res.status(200).json({
      message: "Membership history retrieved successfully",
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching membership history:", error);
    res.status(500).json({
      error: "Failed to fetch membership history",
      details: error.message,
    });
  }
};

/**
 * Get users by membership plan
 * GET /api/admin/membership/users-by-plan
 */
const getUsersByPlan = async (req, res) => {
  try {
    const { planId, status = "active" } = req.query;

    const users = await membershipService.getUsersByPlan(planId, status);

    res.status(200).json({
      message: "Users retrieved successfully",
      count: users.length,
      plan: planId || "all",
      status,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users by plan:", error);
    res.status(500).json({
      error: "Failed to fetch users",
      details: error.message,
    });
  }
};

/**
 * Validate membership fee calculation
 * POST /api/admin/membership/validate-amount
 * (Useful for checking what admin will charge before confirming)
 */
const validateMembershipAmount = async (req, res) => {
  try {
    const { userId, planId } = req.body;

    if (!userId || !planId) {
      return res.status(400).json({
        error: "Missing required fields: userId, planId",
      });
    }

    if (!membershipService.PLANS[planId]) {
      return res.status(400).json({
        error: `Invalid plan ID: ${planId}`,
      });
    }

    const amountDetails = await membershipService.calculateMembershipAmount(planId, userId);
    const expiryDate = membershipService.calculateExpiryDate(planId);

    res.status(200).json({
      message: "Membership amount calculated successfully",
      amountDetails,
      expiryDate,
      planDuration: membershipService.PLANS[planId].months,
    });
  } catch (error) {
    console.error("Error validating membership amount:", error);
    res.status(500).json({
      error: "Failed to validate amount",
      details: error.message,
    });
  }
};

module.exports = {
  updateMembership,
  getMembershipHistory,
  getUsersByPlan,
  validateMembershipAmount,
};
