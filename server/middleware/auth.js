const admin = require("../config/firebase");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verify the Firebase ID‑token OR JWT token sent in the Authorization header.
 * Attaches `req.firebaseUser` (for Firebase) or `req.jwtUser` (for JWT), and `req.dbUser` (Mongo doc).
 */
const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split("Bearer ")[1];

  try {
    // Try to verify as JWT first (password-based auth)
    try {
      const decoded = jwt.verify(
        token,
        JWT_SECRET
      );

      // JWT token verified successfully
      req.jwtUser = decoded;

      // Fetch the MongoDB user document
      const dbUser = await User.findById(decoded.userId);
      if (!dbUser) {
        return res.status(401).json({ error: "User not found in database" });
      }
      req.dbUser = dbUser;
      return next();
    }
    catch (_jwtErr) {
      // JWT verification failed; continue to Firebase token verification.
      // This supports users with stale/expired JWTs but valid Firebase sessions.
    }

    // Try Firebase token (OAuth auth)
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded;

    // Attach the MongoDB user document
    const dbUser = await User.findOne({ firebaseId: decoded.uid });
    if (!dbUser) {
      return res.status(401).json({
        error: "Unauthorized — user record not found in database",
      });
    }
    req.dbUser = dbUser;

    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

/**
 * Gate admin‑only routes.
 * Must be used AFTER verifyToken.
 */
const requireAdmin = (req, res, next) => {
  if (!req.dbUser || req.dbUser.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

/**
 * Verify user has completed onboarding (active payment + face registered).
 * Must be used AFTER verifyToken.
 */
const requireProfileComplete = (req, res, next) => {
  if (!req.dbUser) {
    return res.status(401).json({ error: "User not authenticated" });
  }
  if (req.dbUser.paymentStatus !== "active") {
    return res.status(403).json({ error: "Profile incomplete — complete membership payment first" });
  }
  if (!req.dbUser.faceRegistered) {
    return res.status(403).json({ error: "Profile incomplete — complete face registration first" });
  }
  next();
};

module.exports = { verifyToken, requireAdmin, requireProfileComplete };
