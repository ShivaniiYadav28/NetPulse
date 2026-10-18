
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
      trim: true,
    },

    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AlertRule",
      required: true,
      index: true,
    },

    deviceName: {
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
      enum: ["MonitorDown", "HighLatency"],
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
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
      index: true,
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
      index: true,
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
  {
    timestamps: true,
  },
);

// Prevent duplicate active alerts for the same rule.
// Resolved alerts remain in the database as history.
alertSchema.index(
  { ruleId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "Active",
    },
  },
);

// Improve owner-specific alert filtering and sorting.
alertSchema.index({
  ownerId: 1,
  status: 1,
  lastTriggeredAt: -1,
});

module.exports = mongoose.model("Alert", alertSchema);
