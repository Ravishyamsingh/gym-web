const User = require("../models/User");
const jwt = require("jsonwebtoken");
const admin = require("../config/firebase");
const { generateNextUserId } = require("../utils/userIdGenerator");
const JWT_SECRET = process.env.JWT_SECRET;

function getAdminEmailSet() {
  const raw = [process.env.ADMIN_EMAIL || "", process.env.ADMIN_EMAILS || ""]
    .filter(Boolean)
    .join(",");

  return new Set(
    raw
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isAdminEmail(email) {
  if (!email) return false;
  return getAdminEmailSet().has(String(email).trim().toLowerCase());
}

function sanitizePasswordForStorage(password) {
  if (typeof password !== "string") return "";
  return password.replace(/[\u0000-\u001F\u007F]/g, "");
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateUserId(userId) {
  // Numeric only, exactly 4 digits (2000-9999)
  const userIdRegex = /^\d{4}$/;
  return userIdRegex.test(userId);
}

function validatePassword(password) {
  // 8-64 chars, at least one uppercase, lowercase, number, special char, no spaces
  if (typeof password !== "string") {
    return { valid: false, message: "Password is required" };
  }

  const sanitized = password.replace(/[\u0000-\u001F\u007F]/g, "");
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,64}$/;

  if (!strongRegex.test(sanitized)) {
    return {
      valid: false,
      message:
        "Password must be 8-64 characters and include uppercase, lowercase, number, and special character.",
    };
  }

  return { valid: true, sanitized };
}

function isValidFaceDescriptor(fd) {
  return (
    Array.isArray(fd) &&
    fd.length === 128 &&
    fd.every((v) => typeof v === "number" && Number.isFinite(v))
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PASSWORD-BASED AUTHENTICATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/register
 * Password-based signup with auto-generated numeric user ID
 * Body: { email, password, name }
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        error: "Email, password, and name are required",
      });
    }

    if (!validateEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: passwordValidation.message,
      });
    }

    // Check for existing email
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(409).json({
        error: "Email already registered. Please login instead.",
      });
    }

    // Auto-generate numeric user ID (4 digits: 2000, 2001, etc.)
    const generatedUserId = await generateNextUserId();

    // Create user
    const user = new User({
      email: normalizedEmail,
      userId: generatedUserId,
      password: passwordValidation.sanitized,
      name: name.trim(),
      authProvider: "password",
      role: isAdminEmail(normalizedEmail) ? "admin" : "user",
    });

    await user.save();

    console.log(`[REGISTER] New user created: ${user.email} with ID ${generatedUserId}`);

    // Generate JWT token for password-based auth
    const jwtToken = jwt.sign(
      { userId: user._id.toString(), email: user.email, authType: "password" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return user without password
    return res.status(201).json({
      message: "Account created successfully. Please login.",
      user: user.toJSON(),
      jwtToken: jwtToken,
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      console.error(`[REGISTER] Duplicate key on ${field}`);
      return res.status(409).json({
        error: `This ${field} is already registered.`,
      });
    }
    console.error("[REGISTER] Error:", err.message);
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Password-based login with email or userId
 * Body: { email or userId, password }
 */
exports.login = async (req, res, next) => {
  try {
    const { email, userId, password } = req.body;
    const normalizedEmail = email ? String(email).trim().toLowerCase() : "";
    const normalizedUserId = userId ? String(userId).trim().toLowerCase() : "";
    const normalizedPassword = sanitizePasswordForStorage(password);

    // Validation
    if (!normalizedPassword) {
      console.warn("[LOGIN] Password missing from request");
      return res.status(400).json({ error: "Password is required" });
    }

    if (!normalizedEmail && !normalizedUserId) {
      console.warn("[LOGIN] Email/User ID missing from request");
      return res.status(400).json({
        error: "Email or User ID is required",
      });
    }

    // Find user by email or userId
    let query = {};
    if (normalizedEmail) {
      query.email = normalizedEmail;
    } else if (normalizedUserId) {
      query.userId = normalizedUserId;
    }

    const user = await User.findOne(query).select("+password");

    if (!user) {
      console.warn(
        `[LOGIN] User not found: ${email || userId}`
      );
      return res.status(401).json({
        error:
          "Invalid credentials. Please check your email/user ID and password, or create an account.",
      });
    }

    if (user.isBlocked) {
      console.warn(`[LOGIN] Blocked user attempted login: ${user.email}`);
      return res.status(403).json({
        error: "Your account has been blocked. Contact support.",
      });
    }

    // Verify password
    let isValid = false;
    if (user.password) {
      isValid = await user.comparePassword(normalizedPassword);
    }
    if (!isValid) {
      console.warn(`[LOGIN] Invalid password for user: ${user.email}`);
      return res.status(401).json({
        error:
          "Invalid credentials. Please check your email/user ID and password.",
      });
    }

    // Assign userId if user doesn't have one (legacy users)
    if (!user.userId) {
      user.userId = await generateNextUserId();
      await user.save();
      console.log(`[LOGIN] Assigned userId to legacy user: ${user.email} -> ${user.userId}`);
    }

    console.log(`[LOGIN] Successful login: ${user.email}`);

    // Generate JWT token for password-based auth
    const jwtToken = jwt.sign(
      { userId: user._id.toString(), email: user.email, authType: "password" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Check onboarding status
    const profileComplete =
      user.faceRegistered === true && user.paymentStatus === "active";

    return res.json({
      message: "Login successful",
      user: user.toJSON(),
      jwtToken: jwtToken,
      profileComplete,
    });
  } catch (err) {
    console.error("[LOGIN] Error:", err.message);
    next(err);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// FIREBASE AUTHENTICATION (LEGACY - For backwards compatibility)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Helper: Verify Firebase ID token
 */
async function verifyFirebaseToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  const idToken = header.split("Bearer ")[1];
  if (!idToken || idToken.trim() === "") {
    return null;
  }

  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    console.error("[FIREBASE] Token verification failed:", err.code);
    throw err;
  }
}

/**
 * POST /api/auth/firebase/register
 * Firebase-based signup (deprecated, for legacy clients)
 */
exports.firebaseRegister = async (req, res, next) => {
  try {
    const decoded = await verifyFirebaseToken(req);
    if (!decoded) {
      return res.status(401).json({
        error: "Firebase token required",
      });
    }

    const { name, email, faceDescriptor } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: "Name and email are required",
      });
    }

    if (faceDescriptor && !isValidFaceDescriptor(faceDescriptor)) {
      return res.status(400).json({
        error: "Invalid face descriptor",
      });
    }

    // Check for existing email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        error: "Email already registered",
      });
    }

    // Auto-generate numeric user ID for Firebase users
    const generatedUserId = await generateNextUserId();

    const user = new User({
      firebaseId: decoded.uid,
      userId: generatedUserId,
      name,
      email: email.toLowerCase(),
      faceDescriptor: faceDescriptor || [],
      authProvider: "google",
      role: isAdminEmail(email) ? "admin" : "user",
    });

    await user.save();

    console.log(`[FIREBASE-REGISTER] User created: ${user.email}`);

    return res.status(201).json({
      message: "User registered",
      user,
    });
  } catch (err) {
    if (err.code === "auth/argument-error" ||
      err.code === "auth/id-token-expired"
    ) {
      return res.status(401).json({
        error: "Invalid or expired Firebase token",
      });
    }
    console.error("[FIREBASE-REGISTER] Error:", err.message);
    next(err);
  }
};

/**
 * POST /api/auth/firebase/login
 * Firebase-based login (deprecated, for legacy clients)
 */
exports.firebaseLogin = async (req, res, next) => {
  try {
    const decoded = await verifyFirebaseToken(req);
    if (!decoded) {
      return res.status(401).json({
        error: "Firebase token required",
      });
    }

    let user = await User.findOne({ firebaseId: decoded.uid });

    if (!user) {
      console.warn(
        `[FIREBASE-LOGIN] User not found for Firebase UID: ${decoded.uid}`
      );
      return res.status(404).json({
        error:
          "User not found — please complete registration first",
      });
    }

    // Assign userId if user doesn't have one (legacy users)
    if (!user.userId) {
      user.userId = await generateNextUserId();
      await user.save();
      console.log(`[FIREBASE-LOGIN] Assigned userId to legacy user: ${user.email} -> ${user.userId}`);
    }

    console.log(`[FIREBASE-LOGIN] Successful: ${user.email}`);

    const profileComplete =
      user.faceRegistered === true && user.paymentStatus === "active";

    return res.json({
      message: "Login successful",
      user,
      profileComplete,
    });
  } catch (err) {
    if (err.code === "auth/argument-error" ||
      err.code === "auth/id-token-expired"
    ) {
      return res.status(401).json({
        error: "Invalid or expired Firebase token",
      });
    }
    console.error("[FIREBASE-LOGIN] Error:", err.message);
    next(err);
  }
};

/**
 * POST /api/auth/google
 * Google OAuth login / auto-register
 */
exports.googleAuth = async (req, res, next) => {
  try {
    const decoded = await verifyFirebaseToken(req);
    if (!decoded) {
      return res.status(401).json({
        error: "Firebase token required",
      });
    }

    let user = await User.findOne({ firebaseId: decoded.uid });

    if (user) {
      // Assign userId if user doesn't have one (legacy users)
      if (!user.userId) {
        user.userId = await generateNextUserId();
        await user.save();
        console.log(`[GOOGLE-AUTH] Assigned userId to legacy user: ${user.email} -> ${user.userId}`);
      }

      console.log(`[GOOGLE-AUTH] Existing user: ${user.email}`);
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

    // Auto-register new Google user
    const { name, email } = req.body;
    const displayName =
      name ||
      decoded.name ||
      (decoded.email ? decoded.email.split("@")[0] : "User");
    const userEmail = (email || decoded.email || "").toLowerCase();

    if (!userEmail) {
      return res.status(400).json({
        error: "Email required for registration",
      });
    }

    const existingEmail = await User.findOne({ email: userEmail });
    if (existingEmail) {
      // Case 1: Email exists with a firebaseId that matches → should have been found in first check
      // This shouldn't happen given the logic above, but check anyway
      if (existingEmail.firebaseId === decoded.uid) {
        console.log(`[GOOGLE-AUTH] Email has correct firebaseId, allowing login`);
        const profileComplete =
          existingEmail.faceRegistered === true &&
          existingEmail.paymentStatus === "active";

        return res.status(200).json({
          message: "Login successful",
          user: existingEmail,
          profileComplete,
          isNewUser: false,
        });
      }

      // Case 2: Email exists but has NO firebaseId or is from password auth
      // → Recover and link it to Google account
      if (!existingEmail.firebaseId) {
        console.log(
          `[GOOGLE-AUTH] Recovering orphaned email record: ${userEmail}`
        );
        existingEmail.firebaseId = decoded.uid;
        existingEmail.name = displayName;
        existingEmail.authProvider = "google";
        if (!existingEmail.userId) {
          existingEmail.userId = await generateNextUserId();
        }
        await existingEmail.save();

        const profileComplete =
          existingEmail.faceRegistered === true &&
          existingEmail.paymentStatus === "active";

        console.log(
          `[GOOGLE-AUTH] Recovered user: ${userEmail} with Firebase UID: ${decoded.uid}`
        );

        return res.status(200).json({
          message: "Account recovered successfully",
          user: existingEmail,
          profileComplete,
          isNewUser: false,
          isRecovered: true,
        });
      }

      // Case 3: Email exists with a DIFFERENT firebaseId
      // This means it's previously registered with another Google account
      // Allow re-linking if user consent is implied (they're trying to sign in)
      if (existingEmail.firebaseId && existingEmail.firebaseId !== decoded.uid) {
        console.log(
          `[GOOGLE-AUTH] Email has different firebaseId, updating link: ${userEmail}`
        );
        console.log(
          `[GOOGLE-AUTH] Old Firebase UID: ${existingEmail.firebaseId}, New: ${decoded.uid}`
        );
        
        // Update the record to link to the new Google account
        // (User is trying to sign in, so they consent to this change)
        existingEmail.firebaseId = decoded.uid;
        existingEmail.name = displayName;
        existingEmail.authProvider = "google";
        if (!existingEmail.userId) {
          existingEmail.userId = await generateNextUserId();
        }
        await existingEmail.save();

        const profileComplete =
          existingEmail.faceRegistered === true &&
          existingEmail.paymentStatus === "active";

        console.log(
          `[GOOGLE-AUTH] Linked email to new Google account: ${userEmail}`
        );

        return res.status(200).json({
          message: "Account linked successfully",
          user: existingEmail,
          profileComplete,
          isNewUser: false,
          isRecovered: true,
        });
      }
    }

    // Auto-generate numeric user ID for new Google users
    const generatedUserId = await generateNextUserId();

    user = new User({
      firebaseId: decoded.uid,
      userId: generatedUserId,
      name: displayName,
      email: userEmail,
      authProvider: "google",
      role: isAdminEmail(userEmail) ? "admin" : "user",
    });

    await user.save();

    console.log(`[GOOGLE-AUTH] New user registered: ${userEmail}`);

    return res.status(201).json({
      message: "User registered via Google",
      user,
      profileComplete: false,
      isNewUser: true,
    });
  } catch (err) {
    if (err.code === "auth/argument-error" ||
      err.code === "auth/id-token-expired"
    ) {
      return res.status(401).json({
        error: "Invalid or expired Firebase token",
      });
    }
    console.error("[GOOGLE-AUTH] Error:", err.message);
    next(err);
  }
};

/**
 * GET /api/auth/check-user
 * Public endpoint: check if email exists
 */
exports.checkUserExists = async (req, res, next) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    return res.json({
      exists: !!user,
      message: user
        ? "User found. Please login."
        : "User not found. Please create an account.",
    });
  } catch (err) {
    console.error("[CHECK-USER] Error:", err.message);
    next(err);
  }
};
