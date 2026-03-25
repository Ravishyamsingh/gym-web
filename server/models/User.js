const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    // Firebase-based auth (optional, for backwards compatibility)
    firebaseId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    
    // Password-based auth fields
    userId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      minlength: 4,
      maxlength: 4,
      match: /^\d{4}$/, // exactly 4 digits (2000-9999)
      index: true,
    },
    password: {
      type: String,
      minlength: 8,
      select: false, // Don't include in queries by default
    },
    
    // Core user info
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /.+\@.+\..+/, // Basic email validation
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    paymentStatus: {
      type: String,
      enum: ["active", "expired", "pending"],
      default: "pending",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    // Membership details
    membershipPlan: {
      type: String,
      enum: ["1month", "6months", "1year", null],
      default: null,
    },
    membershipStartDate: {
      type: Date,
      default: null,
    },
    membershipExpiry: {
      type: Date,
      default: null,
    },
    // Face registration
    faceRegistered: {
      type: Boolean,
      default: false,
      index: true,
    },
    // 128-dimensional Float32 array for face recognition
    faceDescriptor: {
      type: [Number],
      default: [],
    },
    // Profile picture - Base64 encoded image stored securely
    // Captured during first face registration and locked after that
    profilePicture: {
      type: String,
      default: null,
      description: "Base64 encoded profile picture (JPEG), captured during face registration",
    },
    // Timestamp of first face registration
    faceRegisteredAt: {
      type: Date,
      default: null,
      index: true,
      description: "When user completed their first face registration, never changed",
    },
    // Track if user has completed face registration during onboarding
    // Set to true on first successful registration, determines flow
    faceRegistrationCompleted: {
      type: Boolean,
      default: false,
      index: true,
      description: "Marks if user has completed initial face registration during onboarding",
    },
    // Number of times user has re-registered their face (initial registration = 0)
    faceReregistrationCount: {
      type: Number,
      default: 0,
      description: "Tracks how many times user has re-registered/updated their face",
    },
    // Last re-registration timestamp
    faceLastReregisteredAt: {
      type: Date,
      default: null,
      description: "When user last re-registered their face (after initial registration)",
    },
    // Authentication provider
    authProvider: {
      type: String,
      enum: ["email", "password", "google"],
      default: "email",
    },
    // Reserved account marker for QA/dev automation.
    isTestAccount: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Registration Fee Tracking
    registrationFeePaid: {
      type: Boolean,
      default: false,
    },
    registrationFeePaymentDate: {
      type: Date,
      default: null,
    },
    // First-time user flag (set once, never changed)
    isFirstTimeUser: {
      type: Boolean,
      default: true,
      index: true,
      description: "Set to true on creation, changed to false on first membership activation",
    },
    // Last membership update timestamp
    lastMembershipUpdate: {
      type: Date,
      default: null,
      index: true,
      description: "Timestamp of last membership status/plan change",
    },
    // Historical membership count (never decremented)
    totalMembershipsActivated: {
      type: Number,
      default: 0,
      description: "Total number of times membership has been activated (for analytics)",
    },
    // Soft-delete flag
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
      description: "Never hard-delete users; set isDeleted=true for compliance",
    },
    deletedAt: {
      type: Date,
      default: null,
      description: "When the user account was marked as deleted",
    },
    deletionReason: {
      type: String,
      default: null,
      description: "Reason for account deletion",
    },
  },
  { timestamps: true }
);

// ──────────────────────────────────────────
// Pre-save: Hash password if modified
// ──────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────
// Method: Compare password (for login)
// ──────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ──────────────────────────────────────────
// Method: Return user without sensitive fields
// ──────────────────────────────────────────
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model("User", userSchema);
