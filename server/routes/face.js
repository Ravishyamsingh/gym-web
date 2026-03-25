const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const {
  registerFace,
  verifyFace,
  reregisterFace,
  getFaceStatus,
  getProfilePicture,
} = require("../controllers/faceController");

// ─────────────────────────────────────────────
// Face Registration & Verification Routes
// All require authentication
// ─────────────────────────────────────────────

/**
 * POST /api/face/register
 * First-time face registration during onboarding
 * Body: { faceDescriptor: number[], profilePictureBase64: string }
 */
router.post("/register", verifyToken, registerFace);

/**
 * POST /api/face/verify
 * Verify face for gym entry/exit
 * Body: { capturedFaceDescriptor: number[], action: "entry" | "exit" }
 */
router.post("/verify", verifyToken, verifyFace);

/**
 * PUT /api/face/re-register
 * Re-register/update face (user can change their face)
 * Body: { faceDescriptor: number[], profilePictureBase64: string }
 */
router.put("/re-register", verifyToken, reregisterFace);

/**
 * GET /api/face/status
 * Get user's face registration status
 */
router.get("/status", verifyToken, getFaceStatus);

/**
 * GET /api/face/profile-picture
 * Get user's profile picture (base64)
 */
router.get("/profile-picture", verifyToken, getProfilePicture);

module.exports = router;
