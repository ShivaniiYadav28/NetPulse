const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
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
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AlertRule",
      required: true,
    },
    deviceName: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["MonitorDown", "HighLatency"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ["Critical", "High"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Resolved"],
      default: "Active",
      required: true,
    },
    triggeredAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    lastTriggeredAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    occurrences: {
      type: Number,
      min: 1,
      default: 1,
      required: true,
    },
  },
  { timestamps: true },
);

alertSchema.index(
  { ruleId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "Active" } },
);

module.exports = mongoose.model("Alert", alertSchema);
