const User = require("../models/User");

// ─────────────────────────────────────────────
// GET /api/users/me
// Return the currently authenticated user's profile.
// ─────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    if (!req.dbUser) {
      return res.status(404).json({ error: "User profile not found" });
    }
    return res.json({ user: req.dbUser });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /api/users
// Admin‑only: return every user in the system.
// ─────────────────────────────────────────────
exports.getAllUsers = async (_req, res, next) => {
  try {
    const users = await User.find().select("-faceDescriptor").sort({ joinDate: -1 });
    return res.json({ users });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /api/users/admin/stats
// Admin-only: lightweight counts for dashboard cards.
// ─────────────────────────────────────────────
exports.getAdminStats = async (_req, res, next) => {
  try {
    const [totalUsers, blocked] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBlocked: true }),
    ]);

    return res.json({
      stats: {
        totalUsers,
        blocked,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// PUT /api/users/:id/block
// Admin‑only: toggle isBlocked flag on a user.
// ─────────────────────────────────────────────
exports.toggleBlock = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.isBlocked = !user.isBlocked;
    await user.save();

    return res.json({
      message: `User ${user.isBlocked ? "blocked" : "unblocked"}`,
      isBlocked: user.isBlocked,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// PUT /api/users/me/face-descriptor
// User updates their baseline face descriptor.
// ──────────────────────────────���──────────────
exports.updateFaceDescriptor = async (req, res, next) => {
  try {
    const { faceDescriptor } = req.body;

    // Strict validation: must be an array of exactly 128 finite numbers
    if (
      !faceDescriptor ||
      !Array.isArray(faceDescriptor) ||
      faceDescriptor.length !== 128 ||
      !faceDescriptor.every((v) => typeof v === "number" && Number.isFinite(v))
    ) {
      return res.status(400).json({ error: "faceDescriptor must be an array of exactly 128 numeric values" });
    }

    req.dbUser.faceDescriptor = faceDescriptor;
    req.dbUser.faceRegistered = true;
    await req.dbUser.save();

    return res.json({ message: "Face descriptor updated" });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /api/users/me/face-descriptor
// Return the stored face descriptor for the authenticated user.
// Used by the client-side verification flow to get a fresh copy
// instead of relying on cached context data.
// ─────────────────────────────────────────────
exports.getFaceDescriptor = async (req, res, next) => {
  try {
    if (!req.dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!req.dbUser.faceRegistered || !req.dbUser.faceDescriptor || req.dbUser.faceDescriptor.length !== 128) {
      return res.status(404).json({ error: "No face descriptor registered" });
    }

    return res.json({
      faceDescriptor: req.dbUser.faceDescriptor,
      faceRegistered: req.dbUser.faceRegistered,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// PUT /api/users/:id/payment-status
// Admin-only: update a user's payment status.
// ⚠️ DEPRECATED: Use POST /api/admin/membership/update instead
// ─────────────────────────────────────────────
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;
    const targetUserId = req.params.id;
    const adminId = req.dbUser._id;
    const adminEmail = req.dbUser.email;

    // ─────────────────────────────────────────────
    // DEPRECATION WARNING - LOG AND NOTIFY
    // ─────────────────────────────────────────────
    console.warn(
      `⚠️  DEPRECATED: Direct payment status update via PUT /api/users/:id/payment-status`
    );
    console.warn(`   Admin: ${adminEmail} (${adminId})`);
    console.warn(`   Target User: ${targetUserId}`);
    console.warn(`   New Status: ${paymentStatus}`);
    console.warn(
      `   ⚠️  WARNING: This endpoint bypasses membership business logic`
    );
    console.warn(
      `   Please use POST /api/admin/membership/update instead`
    );

    if (!["active", "expired", "pending"].includes(paymentStatus)) {
      return res.status(400).json({ 
        error: "Invalid payment status",
        deprecationWarning: {
          message: "This endpoint is deprecated - consider using POST /api/admin/membership/update",
          reason: "Direct status updates do not maintain membership history or business logic",
        }
      });
    }

    const user = await User.findById(targetUserId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const oldPaymentStatus = user.paymentStatus;
    user.paymentStatus = paymentStatus;
    await user.save();

    if (paymentStatus === "active" && !user.membershipPlan) {
      console.warn(
        `⚠️  WARNING: User ${targetUserId} set to active status WITHOUT membership plan`
      );
      console.warn(
        `   This is likely incomplete. Use POST /api/admin/membership/update instead`
      );
    }

    return res.json({
      message: "Payment status updated (DEPRECATED ENDPOINT)",
      deprecationWarning: {
        message: "This endpoint is deprecated",
        replacement: "POST /api/admin/membership/update",
        reason: "Direct status updates bypass membership business logic and audit trail",
        willBeRemovedIn: "v2.0.0"
      },
      statusChange: {
        from: oldPaymentStatus,
        to: paymentStatus
      },
      paymentStatus: user.paymentStatus,
      note: "Note: Only payment status was updated. Consider using admin membership update for complete membership activation."
    });
  } catch (err) {
    next(err);
  }
};
