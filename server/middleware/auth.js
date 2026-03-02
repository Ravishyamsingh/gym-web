const admin = require("../config/firebase");
const User = require("../models/User");

/**
 * Verify the Firebase ID‑token sent in the Authorization header.
 * Attaches `req.firebaseUser` (decoded token) and `req.dbUser` (Mongo doc).
 */
const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const idToken = header.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.firebaseUser = decoded;

    // Attach the MongoDB user document — reject if it doesn't exist.
    // Security: allowing req.dbUser = null and calling next() would let
    // unauthenticated users reach protected handlers.
    const dbUser = await User.findOne({ firebaseId: decoded.uid });
    if (!dbUser) {
      return res.status(401).json({ error: "Unauthorized — user record not found in database" });
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
 * Verify user has completed their profile (has face descriptor).
 * Must be used AFTER verifyToken.
 */
const requireProfileComplete = (req, res, next) => {
  if (!req.dbUser) {
    return res.status(401).json({ error: "User not authenticated" });
  }
  if (!req.dbUser.faceDescriptor || req.dbUser.faceDescriptor.length !== 128) {
    return res.status(403).json({ error: "Profile incomplete — complete face registration first" });
  }
  next();
};

module.exports = { verifyToken, requireAdmin, requireProfileComplete };
