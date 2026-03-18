const mongoose = require("mongoose");

const ATTENDANCE_RETENTION_DAYS = 30;
const ATTENDANCE_RETENTION_SECONDS = ATTENDANCE_RETENTION_DAYS * 24 * 60 * 60;

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  date: {
    type: Date,
    default: Date.now,
    index: true,
  },
  entryTime: {
    type: Date,
    default: Date.now,
    index: true,
  },
  exitTime: {
    type: Date,
    default: null,
  },
  currentStatus: {
    type: String,
    enum: ["Inside Gym", "Checked Out"],
    default: "Inside Gym",
    index: true,
  },
  checkInAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  checkOutAt: {
    type: Date,
    default: null,
  },
  entryVerifiedAt: {
    type: Date,
    default: Date.now,
  },
  exitVerifiedAt: {
    type: Date,
    default: null,
  },
  sessionStatus: {
    type: String,
    enum: ["in_gym", "completed"],
    default: "in_gym",
    index: true,
  },
  durationMinutes: {
    type: Number,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  verificationMethodEntry: {
    type: String,
    enum: ["face", "email_otp", null],
    default: "face",
  },
  verificationMethodExit: {
    type: String,
    enum: ["face", "email_otp", null],
    default: null,
  },
  // Soft-delete flag: records are never hard-deleted
  isHidden: {
    type: Boolean,
    default: false,
    index: true,
    description: "If true, record is hidden from UI after ATTENDANCE_RETENTION_DAYS but kept in database",
  },
  hiddenAt: {
    type: Date,
    default: null,
    description: "When the record was marked as hidden",
  },
});



attendanceSchema.pre("validate", function syncCompatibilityFields(next) {
  const effectiveEntry = this.entryTime || this.checkInAt || this.timestamp || new Date();

  if (!this.entryTime) this.entryTime = effectiveEntry;
  if (!this.checkInAt) this.checkInAt = effectiveEntry;
  if (!this.date) {
    const day = new Date(effectiveEntry);
    day.setHours(0, 0, 0, 0);
    this.date = day;
  }

  if (!this.exitTime && this.checkOutAt) this.exitTime = this.checkOutAt;
  if (!this.checkOutAt && this.exitTime) this.checkOutAt = this.exitTime;

  if (!this.currentStatus && this.sessionStatus) {
    this.currentStatus = this.sessionStatus === "completed" ? "Checked Out" : "Inside Gym";
  }
  if (!this.sessionStatus && this.currentStatus) {
    this.sessionStatus = this.currentStatus === "Checked Out" ? "completed" : "in_gym";
  }

  next();
});

// Compound index for fast "who's in the gym right now?" queries
attendanceSchema.index({ timestamp: -1 });
attendanceSchema.index({ userId: 1, sessionStatus: 1, checkInAt: -1 });
attendanceSchema.index({ userId: 1, currentStatus: 1, entryTime: -1 });

// Index for filtering visible records (last 30 days)
attendanceSchema.index({ isHidden: 1, entryTime: -1 });
attendanceSchema.index({ userId: 1, isHidden: 1, entryTime: -1 });

// ⚠️ REMOVED: Auto-delete attendance documents older than 30 days
// NOTE: Records are now permanently kept in database but marked as isHidden=true
// for records older than 30 days. This ensures complete audit trail.
// To migrate existing data and hide old records, run:
// db.attendances.updateMany({timestamp: {$lt: new Date(Date.now() - 30*24*60*60*1000)}, isHidden: false}, {$set: {isHidden: true, hiddenAt: new Date()}})

module.exports = mongoose.model("Attendance", attendanceSchema);

