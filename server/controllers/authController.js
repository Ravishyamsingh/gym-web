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

// ─────────────────────────────────────────────
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

    const { firebaseId, name, email, faceDescriptor } = req.body;

    if (!firebaseId || !name || !email) {
      return res.status(400).json({ error: "firebaseId, name, and email are required" });
    }

    // ── Ensure the token uid matches the firebaseId being stored ──
    if (decoded.uid !== firebaseId) {
      return res.status(401).json({ error: "Token uid does not match the provided firebaseId" });
    }

    // ── Validate faceDescriptor if provided ──────────────────
    if (faceDescriptor && !isValidFaceDescriptor(faceDescriptor)) {
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
    });

    return res.status(201).json({ message: "User registered", user });
  } catch (err) {
    // Firebase token verification errors surface here
    if (err.code === "auth/argument-error" || err.code === "auth/id-token-expired") {
      return res.status(401).json({ error: "Invalid or expired Firebase token" });
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
    // ── Firebase token verification ──────────────────────────
    const decoded = await verifyAuthHeader(req);
    if (!decoded) {
      return res.status(401).json({ error: "Authorization Bearer token is required" });
    }

    // Use the verified uid from the token — never trust client-supplied firebaseId
    const user = await User.findOne({ firebaseId: decoded.uid });
    if (!user) {
      return res.status(404).json({ error: "User not found — complete registration first" });
    }

    // Check if user profile is complete (has face descriptor)
    const profileComplete = user.faceDescriptor && user.faceDescriptor.length === 128;

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
