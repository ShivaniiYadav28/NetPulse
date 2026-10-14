const Incident = require("../models/Incident");

async function recordIncident(device, result, checkedAt) {
  const isOffline = result.status === "Offline";

  if (isOffline) {
    // Create an incident if none is open; otherwise update
    // the existing incident without resetting its start time.
    return Incident.findOneAndUpdate(
      { deviceId: device.id, status: "Open" },
      {
        $set: {
          deviceName: device.name,
          address: device.address,
          lastCheckedAt: checkedAt,
          error: result.error ?? null,
        },
        $setOnInsert: {
          deviceId: device.id,
          status: "Open",
          startedAt: checkedAt,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  if (result.status === "Online") {
    // Resolve the open incident when the device recovers.
    return Incident.findOneAndUpdate(
      { deviceId: device.id, status: "Open" },
      {
        $set: {
          status: "Resolved",
          resolvedAt: checkedAt,
          lastCheckedAt: checkedAt,
          error: null,
        },
      },
      { returnDocument: "after", runValidators: true },
    );
  }

  return null;
}

module.exports = { recordIncident };
