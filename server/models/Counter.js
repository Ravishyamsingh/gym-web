const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      required: true,
      default: 2000,
    },
  },
  { _id: true, timestamps: true }
);

module.exports = mongoose.model("Counter", counterSchema);
