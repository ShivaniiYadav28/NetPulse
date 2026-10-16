const Alert = require("../models/Alert");
const AlertRule = require("../models/AlertRule");

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

async function openOrUpdateAlert(device, rule) {
  const now = new Date();

  const filter = {
    deviceId: device.id,
    type: rule.type,
    ruleId: rule._id,
    status: "Active",
  };

  const update = {
    $set: {
      deviceName: device.name,
      address: device.address,
      message: rule.name,
      lastTriggeredAt: now,
      severity: rule.type === "MonitorDown" ? "Critical" : "High",
    },

    $setOnInsert: {
      deviceId: device.id,
      ...(device.ownerId ? { ownerId: device.ownerId } : {}),
      type: rule.type,
      ruleId: rule._id,
      status: "Active",
      triggeredAt: now,
      resolvedAt: null,
      occurrences: 0,
    },

    $inc: {
      // Count qualifying checks within this active alert episode.
      occurrences: 1,
    },
  };

  try {
    return await Alert.findOneAndUpdate(filter, update, {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: false,
    });
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    // Another monitoring check may have created the alert concurrently.
    return Alert.findOneAndUpdate(
      filter,
      {
        $set: {
          lastTriggeredAt: now,
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
  await Alert.updateOne(
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
  );
}

async function processAlerts(device, result) {
  if (!device || typeof device.id !== "string" || !device.id.trim()) {
    throw new TypeError("Alert processing requires a device with a valid ID");
  }

  if (!result || !["Online", "Offline", "Unknown"].includes(result.status)) {
    throw new TypeError("Alert processing requires a valid monitoring result");
  }

  try {
    const rules = await AlertRule.find({
      deviceId: device.id,
      ...(device.ownerId ? { ownerId: device.ownerId } : {}),
      enabled: true,
    }).lean();

    for (const rule of rules) {
      const condition = evaluateRule(rule, result);

      // Unknown results must not change alert state or failure counters.
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
        }

        continue;
      }

      // A healthy result resets the failure counter and resolves
      // any active alert associated with this rule.
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
    console.error(`Alert processing failed for ${device.name}:`, error.message);
    throw error;
  }
}

module.exports = {
  processAlerts,
  evaluateRule,
};
