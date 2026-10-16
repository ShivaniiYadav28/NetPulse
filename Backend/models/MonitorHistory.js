const mongoose = require("mongoose");

const monitorHistorySchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
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
      default: Date.now,
      index: true,
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

monitorHistorySchema.index({
  deviceId: 1,
  checkedAt: -1,
});

module.exports = mongoose.model("MonitorHistory", monitorHistorySchema);
