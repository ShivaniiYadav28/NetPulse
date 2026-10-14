const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      default: "API Endpoint",
    },
    status: {
      type: String,
      default: "Unknown",
    },
    latency: {
      type: Number,
      default: null,
    },
    httpStatus: {
      type: Number,
      default: null,
    },
    checkedAt: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Device", deviceSchema);
