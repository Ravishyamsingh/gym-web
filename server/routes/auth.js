const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const {
  register,
  login,
  checkUserExists,
  firebaseRegister,
  firebaseLogin,
  googleAuth,
} = require("../controllers/authController");

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login/signup attempts. Please try again later." },
});

const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// PASSWORD-BASED AUTH (primary)
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

// FIREBASE AUTH (legacy / Google OAuth)
router.post("/firebase/register", authLimiter, firebaseRegister);
router.post("/firebase/login", authLimiter, firebaseLogin);
router.post("/google", googleLimiter, googleAuth);

// PUBLIC
router.get("/check-user", checkUserExists);

module.exports = router;
