const User = require("../models/User");

/**
 * Validate face descriptor format
 * @param {number[]} descriptor - Should be array of 128 numbers
 */
function isValidFaceDescriptor(descriptor) {
  return (
    Array.isArray(descriptor) &&
    descriptor.length === 128 &&
    descriptor.every((v) => typeof v === "number" && Number.isFinite(v))
  );
}

/**
 * Validate base64 image format
 * @param {string} imageBase64 - Base64 encoded image string
 */
function isValidBase64Image(imageBase64) {
  if (typeof imageBase64 !== "string") return false;
  // Check if it matches data URI format: data:image/jpeg;base64,....
  return /^data:image\/(jpeg|png|jpg);base64,/.test(imageBase64);
}

/**
 * Calculate image size in MB
 */
function getImageSizeInMB(base64String) {
  // Remove data URI prefix if present
  const base64Data = base64String.replace(/^data:image\/[^;]+;base64,/, "");
  const bytes = Buffer.from(base64Data, "base64").length;
  return (bytes / (1024 * 1024)).toFixed(2);
}

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/face/register
// First-time face registration during onboarding
// ═════════════════════════════════════════════════════════════════════════════
exports.registerFace = async (req, res, next) => {
  try {
    const { faceDescriptor, profilePictureBase64 } = req.body;

    // Validation
    if (!faceDescriptor) {
      return res.status(400).json({
        error: "Face descriptor is required",
        code: "MISSING_DESCRIPTOR",
      });
    }

    if (!isValidFaceDescriptor(faceDescriptor)) {
      return res.status(400).json({
        error: "Face descriptor must be an array of exactly 128 numeric values",
        code: "INVALID_DESCRIPTOR_FORMAT",
      });
    }

    if (!profilePictureBase64) {
      return res.status(400).json({
        error: "Profile picture is required",
        code: "MISSING_PROFILE_PICTURE",
      });
    }

    if (!isValidBase64Image(profilePictureBase64)) {
      return res.status(400).json({
        error: "Profile picture must be a valid base64 JPEG/PNG image",
        code: "INVALID_IMAGE_FORMAT",
      });
    }

    const imageSizeMB = getImageSizeInMB(profilePictureBase64);
    if (imageSizeMB > 2) {
      return res.status(400).json({
        error: `Profile picture is too large (${imageSizeMB}MB). Max 2MB allowed.`,
        code: "IMAGE_TOO_LARGE",
      });
    }

    // Check if user already has face registered
    if (req.dbUser.faceRegistered && req.dbUser.faceRegistrationCompleted) {
      return res.status(409).json({
        error: "Face already registered for this user",
        code: "FACE_ALREADY_REGISTERED",
        note: "Use /api/face/re-register to update face",
      });
    }

    // Save face registration
    req.dbUser.faceDescriptor = faceDescriptor;
    req.dbUser.profilePicture = profilePictureBase64;
    req.dbUser.faceRegistered = true;
    req.dbUser.faceRegistrationCompleted = true;
    req.dbUser.faceRegisteredAt = new Date();
    req.dbUser.faceReregistrationCount = 0;

    await req.dbUser.save();

    console.log(
      `[FACE-REGISTER] User ${req.dbUser.email} (ID: ${req.dbUser.userId}) registered face successfully`
    );

    return res.status(201).json({
      message: "Face registered successfully",
      faceRegistered: true,
      faceRegisteredAt: req.dbUser.faceRegisteredAt,
      userId: req.dbUser.userId,
    });
  } catch (err) {
    console.error("[FACE-REGISTER] Error:", err.message);
    next(err);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/face/verify
// Verify face during gym entry/exit
// ═════════════════════════════════════════════════════════════════════════════
exports.verifyFace = async (req, res, next) => {
  try {
    const { capturedFaceDescriptor, action } = req.body;

    // Validation
    if (!capturedFaceDescriptor) {
      return res.status(400).json({
        error: "Captured face descriptor is required",
        code: "MISSING_DESCRIPTOR",
      });
    }

    if (!isValidFaceDescriptor(capturedFaceDescriptor)) {
      return res.status(400).json({
        error: "Face descriptor must be an array of exactly 128 numeric values",
        code: "INVALID_DESCRIPTOR_FORMAT",
      });
    }

    if (!action || !["entry", "exit"].includes(action)) {
      return res.status(400).json({
        error: "Action must be 'entry' or 'exit'",
        code: "INVALID_ACTION",
      });
    }

    // Check if user has registered face
    if (!req.dbUser.faceRegistered || !req.dbUser.faceRegistrationCompleted) {
      return res.status(400).json({
        error: "Face not registered. Please complete face registration first.",
        code: "FACE_NOT_REGISTERED",
        faceRegistered: false,
      });
    }

    // Get stored descriptor
    const storedDescriptor = req.dbUser.faceDescriptor;
    if (!isValidFaceDescriptor(storedDescriptor)) {
      return res.status(500).json({
        error: "Invalid stored face descriptor",
        code: "INTERNAL_ERROR",
      });
    }

    // Compare faces
    const { match, distance, confidence } = calculateFaceMatch(
      capturedFaceDescriptor,
      storedDescriptor
    );

    if (match) {
      console.log(
        `[FACE-VERIFY] ✓ Match for ${req.dbUser.email} (${action}): Distance=${distance.toFixed(4)}, Confidence=${confidence.toFixed(1)}%`
      );

      return res.json({
        verified: true,
        match: true,
        confidence,
        distance,
        action,
        userId: req.dbUser.userId,
        email: req.dbUser.email,
        message: `Face verified successfully (${confidence.toFixed(1)}% match)`,
      });
    } else {
      console.warn(
        `[FACE-VERIFY] ✗ No match for ${req.dbUser.email} (${action}): Distance=${distance.toFixed(4)} (threshold: 0.45), Confidence=${confidence.toFixed(1)}%`
      );

      return res.status(401).json({
        verified: false,
        match: false,
        confidence,
        distance,
        code: "FACE_MISMATCH",
        message: "Face does not match registered face. Please try again.",
      });
    }
  } catch (err) {
    console.error("[FACE-VERIFY] Error:", err.message);
    next(err);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// PUT /api/face/re-register
// Allow user to re-register/update their face
// Updates both descriptor and profile picture
// ═════════════════════════════════════════════════════════════════════════════
exports.reregisterFace = async (req, res, next) => {
  try {
    const { faceDescriptor, profilePictureBase64 } = req.body;

    // Validation
    if (!faceDescriptor) {
      return res.status(400).json({
        error: "Face descriptor is required",
        code: "MISSING_DESCRIPTOR",
      });
    }

    if (!isValidFaceDescriptor(faceDescriptor)) {
      return res.status(400).json({
        error: "Face descriptor must be an array of exactly 128 numeric values",
        code: "INVALID_DESCRIPTOR_FORMAT",
      });
    }

    if (!profilePictureBase64) {
      return res.status(400).json({
        error: "Profile picture is required",
        code: "MISSING_PROFILE_PICTURE",
      });
    }

    if (!isValidBase64Image(profilePictureBase64)) {
      return res.status(400).json({
        error: "Profile picture must be a valid base64 JPEG/PNG image",
        code: "INVALID_IMAGE_FORMAT",
      });
    }

    const imageSizeMB = getImageSizeInMB(profilePictureBase64);
    if (imageSizeMB > 2) {
      return res.status(400).json({
        error: `Profile picture is too large (${imageSizeMB}MB). Max 2MB allowed.`,
        code: "IMAGE_TOO_LARGE",
      });
    }

    // Check if user has already registered face initially
    if (!req.dbUser.faceRegistered || !req.dbUser.faceRegistrationCompleted) {
      return res.status(400).json({
        error: "Must complete initial face registration before re-registering",
        code: "NOT_INITIALLY_REGISTERED",
      });
    }

    // Update face data
    req.dbUser.faceDescriptor = faceDescriptor;
    req.dbUser.profilePicture = profilePictureBase64;
    req.dbUser.faceReregistrationCount = (req.dbUser.faceReregistrationCount || 0) + 1;
    req.dbUser.faceLastReregisteredAt = new Date();

    await req.dbUser.save();

    console.log(
      `[FACE-REREGISTER] User ${req.dbUser.email} (ID: ${req.dbUser.userId}) re-registered face (count: ${req.dbUser.faceReregistrationCount})`
    );

    return res.json({
      message: "Face re-registered successfully",
      faceRegistered: true,
      reregistrationCount: req.dbUser.faceReregistrationCount,
      faceLastReregisteredAt: req.dbUser.faceLastReregisteredAt,
      userId: req.dbUser.userId,
    });
  } catch (err) {
    console.error("[FACE-REREGISTER] Error:", err.message);
    next(err);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/face/status
// Get current face registration status for the user
// ═════════════════════════════════════════════════════════════════════════════
exports.getFaceStatus = async (req, res, next) => {
  try {
    return res.json({
      faceRegistered: req.dbUser.faceRegistered,
      faceRegistrationCompleted: req.dbUser.faceRegistrationCompleted,
      faceRegisteredAt: req.dbUser.faceRegisteredAt,
      faceReregistrationCount: req.dbUser.faceReregistrationCount,
      faceLastReregisteredAt: req.dbUser.faceLastReregisteredAt,
      hasProfilePicture: !!req.dbUser.profilePicture,
      userId: req.dbUser.userId,
    });
  } catch (err) {
    console.error("[FACE-STATUS] Error:", err.message);
    next(err);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/face/profile-picture
// Return user's profile picture (base64)
// ═════════════════════════════════════════════════════════════════════════════
exports.getProfilePicture = async (req, res, next) => {
  try {
    if (!req.dbUser.profilePicture) {
      return res.status(404).json({
        error: "No profile picture available",
        code: "NO_PROFILE_PICTURE",
      });
    }

    return res.json({
      profilePicture: req.dbUser.profilePicture,
      faceRegisteredAt: req.dbUser.faceRegisteredAt,
    });
  } catch (err) {
    console.error("[PROFILE-PICTURE] Error:", err.message);
    next(err);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: Calculate face match using Euclidean distance
// ═════════════════════════════════════════════════════════════════════════════
function calculateFaceMatch(descriptor1, descriptor2) {
  const FACE_MATCH_THRESHOLD = 0.45; // Stricter threshold

  if (!descriptor1 || !descriptor2 || descriptor1.length !== 128 || descriptor2.length !== 128) {
    console.error("Invalid descriptors for distance calculation");
    return {
      match: false,
      distance: Infinity,
      confidence: 0,
    };
  }

  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const diff = (descriptor1[i] || 0) - (descriptor2[i] || 0);
    sum += diff * diff;
  }

  const distance = Math.sqrt(sum);
  const match = distance < FACE_MATCH_THRESHOLD;
  const confidence = Math.max(0, Math.min(100, 100 - (distance / FACE_MATCH_THRESHOLD) * 100));

  return { match, distance, confidence };
}
