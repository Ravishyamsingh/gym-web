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
