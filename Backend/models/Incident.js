const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
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
    status: {
      type: String,
      enum: ["Open", "Resolved"],
      default: "Open",
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    lastCheckedAt: {
      type: Date,
      default: Date.now,
    },
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

// Allow only one open incident per device, while retaining
// as many resolved incidents as needed.
incidentSchema.index(
  { deviceId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "Open" },
  },
);

incidentSchema.index({ status: 1, startedAt: -1 });

module.exports = mongoose.model("Incident", incidentSchema);
