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
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-z0-9_-]+$/i, // alphanumeric, underscore, hyphen only
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
    },
    // 128-dimensional Float32 array for face recognition
    faceDescriptor: {
      type: [Number],
      default: [],
    },
    // Authentication provider
    authProvider: {
      type: String,
      enum: ["email", "password", "google"],
      default: "email",
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
