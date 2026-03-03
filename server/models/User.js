const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firebaseId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    // Whether face registration is completed
    faceRegistered: {
      type: Boolean,
      default: false,
    },
    // 128-dimensional Float32 array produced by face-api.js
    // Used for Euclidean-distance matching on subsequent scans
    faceDescriptor: {
      type: [Number],
      default: [],
    },
    // Authentication provider (email, google, etc.)
    authProvider: {
      type: String,
      enum: ["email", "google"],
      default: "email",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
