const { checkEndpoint } = require("./monitorService");
const Device = require("../models/Device");
const MonitorHistory = require("../models/MonitorHistory");
const { recordIncident } = require("./incidentService");

const HISTORY_LIMIT = 500;

async function checkAndPersistDevice(device) {
  const result = await checkEndpoint(device.address);
  const checkedAt = result.checkedAt
    ? new Date(result.checkedAt)
    : new Date();

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
    name: device.name,
    ...normalizedResult,
    checkedAt,
  });

  // Keep only the newest 500 history entries per device.
  const oldRecords = await MonitorHistory.find({
    deviceId: device.id,
  })
    .sort({ checkedAt: -1, _id: -1 })
    .skip(HISTORY_LIMIT)
    .select("_id")
    .lean();

  if (oldRecords.length > 0) {
    await MonitorHistory.deleteMany({
      _id: { $in: oldRecords.map((record) => record._id) },
    });
  }

  // Incident failures should be logged without stopping monitoring
  // for this device or the rest of the monitoring cycle.
  try {
    await recordIncident(
      {
        id: device.id,
        name: device.name,
        address: device.address,
      },
      normalizedResult,
      checkedAt,
    );
  } catch (error) {
    console.error(
      `Incident tracking failed for ${device.name}:`,
      error.message,
    );
  }

  return updatedDevice;
}

module.exports = { checkAndPersistDevice };