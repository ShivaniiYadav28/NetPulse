const Alert = require("../models/Alert");
const AlertRule = require("../models/AlertRule");
const User = require("../models/User");
const { sendEmail } = require("./emailService");

function evaluateRule(rule, result) {
  if (result.status === "Unknown") {
    return null;
  }

  if (rule.type === "MonitorDown") {
    return result.status === "Offline";
  }

  if (rule.type === "HighLatency") {
    return (
      result.status === "Online" &&
      Number.isFinite(result.latency) &&
      Number.isFinite(rule.thresholdMs) &&
      result.latency >= rule.thresholdMs
    );
  }

  return false;
}

async function sendAlertEmail(alert, eventType) {
  try {
    if (!alert?.ownerId) {
      console.warn("Alert email skipped: ownerId is missing.");
      return;
    }

    const owner = await User.findById(alert.ownerId)
      .select("email alertEmail alertEmails")
      .lean();

    const configuredRecipients =
      Array.isArray(owner?.alertEmails) && owner.alertEmails.length > 0
        ? owner.alertEmails
        : [owner?.alertEmail || owner?.email].filter(Boolean);

    const recipients = [
      ...new Set(
        configuredRecipients
          .filter((recipient) => typeof recipient === "string")
          .map((recipient) => recipient.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];

    if (recipients.length === 0) {
      console.warn(
        `Alert email skipped for ${alert._id}: no recipient email found.`,
      );
      return;
    }

    const isResolved = eventType === "resolved";

    const subject = isResolved
      ? `[NetPulse] Alert Resolved: ${alert.deviceName}`
      : `[NetPulse] ${alert.severity}: ${alert.deviceName}`;

    const lines = [
      "Hello,",
      "",
      isResolved
        ? "A monitoring alert has been resolved."
        : "A monitoring alert has been triggered.",
      "",
      `Alert: ${alert.message || alert.type}`,
      `Device: ${alert.deviceName || "Unknown"}`,
      `Address: ${alert.address || "Not provided"}`,
      `Type: ${alert.type}`,
      `Severity: ${alert.severity || "Not specified"}`,
      `Status: ${isResolved ? "Resolved" : "Active"}`,
      `Triggered at: ${
        alert.triggeredAt
          ? new Date(alert.triggeredAt).toISOString()
          : "Not available"
      }`,
    ];

    if (isResolved && alert.resolvedAt) {
      lines.push(
        `Resolved at: ${new Date(alert.resolvedAt).toISOString()}`,
      );
    }

    lines.push("", "This is an automated notification from NetPulse.");

    console.log(
      `Attempting ${eventType} email for alert ${alert._id} to ${recipients.length} recipient(s).`,
    );

    const result = await sendEmail({
      to: recipients,
      subject,
      text: lines.join("\n"),
    });

    const acceptedCount = Array.isArray(result?.accepted)
      ? result.accepted.length
      : 0;
    const rejectedCount = Array.isArray(result?.rejected)
      ? result.rejected.length
      : 0;

    console.log(
      `SMTP accepted ${eventType} email for alert ${alert._id}: ${acceptedCount}/${recipients.length} recipient(s) accepted, ${rejectedCount} rejected. Message ID: ${result?.messageId || "not provided"}`,
    );
  } catch (error) {
    // Email failures must not interrupt monitoring.
    console.error(
      `Failed to send ${eventType} email for alert ${alert?._id || "unknown"}:`,
      error.message,
      error.code ? `Code: ${error.code}` : "",
    );
  }
}

async function openOrUpdateAlert(device, rule) {
  const now = new Date();

  const filter = {
    deviceId: device.id,
    type: rule.type,
    ruleId: rule._id,
    status: "Active",
  };

  const existingAlert = await Alert.findOne(filter).lean();

  if (existingAlert) {
    return Alert.findOneAndUpdate(
      {
        _id: existingAlert._id,
        status: "Active",
      },
      {
        $set: {
          deviceName: device.name,
          address: device.address || "Not provided",
          message: rule.name,
          lastTriggeredAt: now,
          severity: rule.type === "MonitorDown" ? "Critical" : "High",
        },
        $inc: {
          occurrences: 1,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );
  }

  try {
    const alert = await Alert.create({
      deviceId: device.id,
      ...(device.ownerId ? { ownerId: device.ownerId } : {}),
      ruleId: rule._id,
      deviceName: device.name,
      address: device.address || "Not provided",
      type: rule.type,
      message: rule.name,
      severity: rule.type === "MonitorDown" ? "Critical" : "High",
      status: "Active",
      triggeredAt: now,
      lastTriggeredAt: now,
      resolvedAt: null,
      occurrences: 1,
    });

    // Send only when a new alert has been created.
    void sendAlertEmail(alert, "triggered");

    return alert;
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    // Another request created the active alert first.
    const concurrentAlert = await Alert.findOne(filter).lean();

    if (!concurrentAlert) {
      throw error;
    }

    return Alert.findOneAndUpdate(
      {
        _id: concurrentAlert._id,
        status: "Active",
      },
      {
        $set: {
          lastTriggeredAt: now,
          deviceName: device.name,
          address: device.address || "Not provided",
          message: rule.name,
          severity: rule.type === "MonitorDown" ? "Critical" : "High",
        },
        $inc: {
          occurrences: 1,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );
  }
}

async function resolveAlert(deviceId, ruleId, checkedAt = new Date()) {
  const alert = await Alert.findOneAndUpdate(
    {
      deviceId,
      ruleId,
      status: "Active",
    },
    {
      $set: {
        status: "Resolved",
        resolvedAt: checkedAt,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (alert) {
    void sendAlertEmail(alert, "resolved");
  }
}

async function processAlerts(device, result) {
  if (!device || typeof device.id !== "string" || !device.id.trim()) {
    throw new TypeError(
      "Alert processing requires a device with a valid ID",
    );
  }

  if (!result || !["Online", "Offline", "Unknown"].includes(result.status)) {
    throw new TypeError(
      "Alert processing requires a valid monitoring result",
    );
  }

  try {
    const rules = await AlertRule.find({
      deviceId: device.id,
      ...(device.ownerId ? { ownerId: device.ownerId } : {}),
      enabled: true,
    }).lean();

    for (const rule of rules) {
      const condition = evaluateRule(rule, result);

      if (condition === null) {
        continue;
      }

      if (condition) {
        const updatedRule = await AlertRule.findOneAndUpdate(
          {
            _id: rule._id,
            enabled: true,
          },
          {
            $inc: {
              consecutiveFailures: 1,
            },
          },
          {
            returnDocument: "after",
            runValidators: true,
          },
        );

        if (!updatedRule) {
          continue;
        }

        if (updatedRule.consecutiveFailures >= updatedRule.failureCount) {
          await openOrUpdateAlert(device, rule);

          // A rule can be disabled, deleted, or moved while this check is in
          // flight. Its controller cleanup may run before the alert exists.
          const ruleStillApplies = await AlertRule.exists({
            _id: rule._id,
            deviceId: device.id,
            type: rule.type,
            enabled: true,
          });

          if (!ruleStillApplies) {
            await resolveAlert(device.id, rule._id, new Date());
          }
        }

        continue;
      }

      await AlertRule.updateOne(
        {
          _id: rule._id,
        },
        {
          $set: {
            consecutiveFailures: 0,
          },
        },
      );

      await resolveAlert(device.id, rule._id, new Date());
    }
  } catch (error) {
    console.error(
      `Alert processing failed for ${device.name}:`,
      error.message,
    );
    throw error;
  }
}

module.exports = {
  processAlerts,
  evaluateRule,
};
