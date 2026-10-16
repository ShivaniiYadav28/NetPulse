const { checkEndpoint } = require("./monitorService");
const Device = require("../models/Device");
const MonitorHistory = require("../models/MonitorHistory");
const { recordIncident } = require("./incidentService");
const { processAlerts } = require("./alertService");

const HISTORY_LIMIT = 500;
const deviceChecks = new Map();

async function runDeviceCheck(device) {
  const result = await checkEndpoint(device.address);
  const checkedAt = result.checkedAt ? new Date(result.checkedAt) : new Date();

  const normalizedResult = {
    status: result.status ?? "Unknown",
    latency: result.latency ?? null,
    httpStatus: result.httpStatus ?? null,
    error: result.error ?? null,
  };

  const updatedDevice = await Device.findOneAndUpdate(
    { id: device.id },
    {
      $set: {
        ...normalizedResult,
        checkedAt,
      },
    },
    { returnDocument: "after" },
  );

  if (!updatedDevice) {
    return null;
  }

  await MonitorHistory.create({
    deviceId: device.id,
    ownerId: device.ownerId,
    name: device.name,
    ...normalizedResult,
    checkedAt,
  });

  // Keep only the newest 500 history entries per device.
  const oldestRetained = await MonitorHistory.find({ deviceId: device.id })
    .sort({ checkedAt: -1, _id: -1 })
    .skip(HISTORY_LIMIT)
    .limit(1)
    .select("_id checkedAt")
    .lean();

  if (oldestRetained.length > 0) {
    await MonitorHistory.deleteMany({
      deviceId: device.id,
      $or: [
        { checkedAt: { $lt: oldestRetained[0].checkedAt } },
        { checkedAt: oldestRetained[0].checkedAt, _id: { $lt: oldestRetained[0]._id } },
      ],
    });
  }

  // Incident failures should be logged without stopping monitoring
  // for this device or the rest of the monitoring cycle.
  try {
    await recordIncident(
      {
        id: device.id,
        ownerId: device.ownerId,
        name: device.name,
        address: device.address,
      },
      normalizedResult,
      checkedAt,
    );
  } catch (error) {
    console.error(`Incident tracking failed for ${device.name}:`, error.message);
  }

  await processAlerts(
    {
      id: device.id,
      ownerId: device.ownerId,
      name: device.name,
      address: device.address,
    },
    normalizedResult,
  );

  return updatedDevice;
}

async function checkAndPersistDevice(device) {
  const previous = deviceChecks.get(device.id) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => current);
  deviceChecks.set(device.id, queued);
  await previous;
  try {
    return await runDeviceCheck(device);
  } finally {
    release();
    if (deviceChecks.get(device.id) === queued) deviceChecks.delete(device.id);
  }
}

module.exports = { checkAndPersistDevice };
