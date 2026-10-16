const mongoose = require("mongoose");

const alertRuleSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    deviceId: {
      type: String,
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["MonitorDown", "HighLatency"],
      required: true,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    thresholdMs: {
      type: Number,
      min: 1,
      max: 60000,
      default: null,
      validate: {
        validator(value) {
          return (
            this.type !== "HighLatency" ||
            (Number.isFinite(value) && value >= 1 && value <= 60000)
          );
        },
        message: "HighLatency rules require a threshold between 1 and 60000 ms.",
      },
    },

    failureCount: {
      type: Number,
      min: 1,
      max: 20,
      default: 1,
      validate: {
        validator(value) {
          return Number.isInteger(value);
        },
        message: "failureCount must be an integer between 1 and 20.",
      },
    },

    consecutiveFailures: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

alertRuleSchema.index({
  deviceId: 1,
  type: 1,
});

module.exports = mongoose.model("AlertRule", alertRuleSchema);
