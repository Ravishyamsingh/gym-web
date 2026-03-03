const Payment = require("../models/Payment");
const User = require("../models/User");

// ─────────────────────────────────────────────
// GET /api/payments
// Admin: list all payments (paginated).
// ─────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find()
        .populate("userId", "name email")
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(),
    ]);

    return res.json({ payments, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST /api/payments
// Admin: record a payment for a user and update their paymentStatus.
// ─────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const { userId, amount, expiryDate } = req.body;

    if (!userId || !amount || !expiryDate) {
      return res.status(400).json({ error: "userId, amount, and expiryDate are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const payment = await Payment.create({
      userId,
      amount,
      expiryDate: new Date(expiryDate),
      status: "paid",
    });

    // Activate the user's membership
    user.paymentStatus = "active";
    await user.save();

    return res.status(201).json({ message: "Payment recorded", payment });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST /api/payments/process
// User: process membership payment during onboarding.
// Requires authentication. Updates user's paymentStatus to "active".
// ─────────────────────────────────────────────
exports.processMembership = async (req, res, next) => {
  try {
    const { planId, duration, amount } = req.body;
    const userId = req.dbUser._id;

    if (!planId || !duration || !amount) {
      return res.status(400).json({ error: "planId, duration, and amount are required" });
    }

    // Calculate expiry date based on plan
    const expiryDate = new Date();
    if (planId === "1month") {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (planId === "6months") {
      expiryDate.setMonth(expiryDate.getMonth() + 6);
    } else if (planId === "1year") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    // Create payment record
    const payment = await Payment.create({
      userId,
      amount,
      expiryDate,
      status: "paid",
      planId,
      duration,
    });

    // Update user's payment status and membership details
    const user = await User.findByIdAndUpdate(
      userId,
      {
        paymentStatus: "active",
        membershipPlan: planId,
        membershipStartDate: new Date(),
        membershipExpiry: expiryDate,
      },
      { new: true }
    );

    return res.status(201).json({
      message: "Payment processed successfully",
      payment,
      user,
    });
  } catch (err) {
    next(err);
  }
};
