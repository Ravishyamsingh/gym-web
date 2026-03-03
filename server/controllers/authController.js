const User = require("../models/User");
const admin = require("../config/firebase");

// ── Helper: extract & verify Firebase ID-token from Authorization header ──
async function verifyAuthHeader(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  const idToken = header.split("Bearer ")[1];
  return admin.auth().verifyIdToken(idToken);
}

// ── Helper: validate faceDescriptor (must be array of exactly 128 numbers) ──
function isValidFaceDescriptor(fd) {
  return (
    Array.isArray(fd) &&
    fd.length === 128 &&
    fd.every((v) => typeof v === "number" && Number.isFinite(v))
  );
}

// ─────────────────��───────────────────────────
// POST /api/auth/register
// Security: requires a valid Firebase ID-token in the Authorization header.
// The decoded uid must match the firebaseId in the request body.
// Also validates faceDescriptor strictly (128 numeric values).
// ─────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    // ── Firebase token verification ──────────────────────────
    const decoded = await verifyAuthHeader(req);
    if (!decoded) {
      return res.status(401).json({ error: "Authorization Bearer token is required" });
    }

    const { firebaseId, name, email, faceDescriptor, authProvider } = req.body;

    if (!firebaseId || !name || !email) {
      return res.status(400).json({ error: "firebaseId, name, and email are required" });
    }

    // ── Ensure the token uid matches the firebaseId being stored ──
    if (decoded.uid !== firebaseId) {
      return res.status(401).json({ error: "Token uid does not match the provided firebaseId" });
    }

    // ── Validate faceDescriptor if provided ──────────────────
    // Allow empty array for Google users, but if provided must be exactly 128 values
    if (faceDescriptor && faceDescriptor.length > 0 && !isValidFaceDescriptor(faceDescriptor)) {
      return res.status(400).json({ error: "faceDescriptor must be an array of exactly 128 numeric values" });
    }

    // Prevent duplicate registrations
    const existing = await User.findOne({ firebaseId });
    if (existing) {
      return res.status(409).json({ error: "User already registered" });
    }

    // Auto-assign admin role if the email matches ADMIN_EMAIL env var
    const role = email.toLowerCase() === (process.env.ADMIN_EMAIL || "").toLowerCase() ? "admin" : "user";

    const user = await User.create({
      firebaseId,
      name,
      email: email.toLowerCase(),
      role,
      faceDescriptor: faceDescriptor || [],
      authProvider: authProvider || "email",
    });

    return res.status(201).json({ message: "User registered", user });
  } catch (err) {
    // Firebase token verification errors surface here
    if (err.code === "auth/argument-error" || err.code === "auth/id-token-expired") {
      return res.status(401).json({ error: "Invalid or expired Firebase token" });
    }
    // MongoDB duplicate key error (email already exists)
    if (err.code === 11000) {
      return res.status(409).json({ error: "A user with this email already exists" });
    }
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/login
// Security: requires a valid Firebase ID-token in the Authorization header.
// The decoded uid is used to look up the MongoDB user (not the client body).
// Returns 404 if no Mongo doc exists so the client can redirect to registration.
// ─────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    // ── Firebase token verification ──────────────────���───────
    const decoded = await verifyAuthHeader(req);
    if (!decoded) {
      return res.status(401).json({ error: "Authorization Bearer token is required" });
    }

    // Use the verified uid from the token — never trust client-supplied firebaseId
    const user = await User.findOne({ firebaseId: decoded.uid });
    if (!user) {
      return res.status(404).json({ error: "User not found — complete registration first" });
    }

    // Check if user profile is complete (has face descriptor and active payment)
    const profileComplete = 
      user.faceRegistered === true && 
      user.paymentStatus === "active";

    return res.json({ 
      message: "Login successful", 
      user,
      profileComplete 
    });
  } catch (err) {
    // Firebase token verification errors surface here
    if (err.code === "auth/argument-error" || err.code === "auth/id-token-expired") {
      return res.status(401).json({ error: "Invalid or expired Firebase token" });
    }
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /api/auth/check-user
// Public endpoint: check if a user exists by email
// Returns { exists: boolean }
// ─────────────────────────────────────────────
exports.checkUserExists = async (req, res, next) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    return res.json({ exists: !!user });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/google
// Google authentication: login existing user or auto-register new one.
// Requires a valid Firebase ID-token from Google sign-in.
// ─────────────────────────────────────────────
exports.googleAuth = async (req, res, next) => {
  try {
    const decoded = await verifyAuthHeader(req);
    if (!decoded) {
      return res.status(401).json({ error: "Authorization Bearer token is required" });
    }

    // Try to find existing user
    let user = await User.findOne({ firebaseId: decoded.uid });

    if (user) {
      // Existing user — login
      const profileComplete =
        user.faceRegistered === true &&
        user.paymentStatus === "active";

      return res.json({
        message: "Login successful",
        user,
        profileComplete,
        isNewUser: false,
      });
    }

    // New Google user — auto-register
    const { name, email } = req.body;
    const displayName = name || decoded.name || (decoded.email ? decoded.email.split("@")[0] : "User");
    const userEmail = (email || decoded.email || "").toLowerCase();

    if (!userEmail) {
      return res.status(400).json({ error: "Email is required for registration" });
    }

    // Check if email is already taken by another account
    const existingEmail = await User.findOne({ email: userEmail });
    if (existingEmail) {
      return res.status(409).json({ error: "An account with this email already exists. Please use email login." });
    }

    // Auto-assign admin role if the email matches ADMIN_EMAIL env var
    const role = userEmail === (process.env.ADMIN_EMAIL || "").toLowerCase() ? "admin" : "user";

    user = await User.create({
      firebaseId: decoded.uid,
      name: displayName,
      email: userEmail,
      role,
      faceDescriptor: [],
      authProvider: "google",
    });

    return res.status(201).json({
      message: "User registered via Google",
      user,
      profileComplete: false,
      isNewUser: true,
    });
  } catch (err) {
    if (err.code === "auth/argument-error" || err.code === "auth/id-token-expired") {
      return res.status(401).json({ error: "Invalid or expired Firebase token" });
    }
    next(err);
  }
};
