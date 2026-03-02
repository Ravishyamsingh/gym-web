const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for fast "who's in the gym right now?" queries
attendanceSchema.index({ timestamp: -1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
