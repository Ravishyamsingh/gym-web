const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { register, login } = require("../controllers/authController");

// ── Rate limiter for public auth endpoints ──────────────────────
// Prevents brute-force and abuse: max 5 requests per minute per IP.
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,              // 5 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please try again after a minute" },
});

// Public routes — Firebase token is now verified inside each controller,
// and rate limiting protects against abuse.
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

module.exports = router;
