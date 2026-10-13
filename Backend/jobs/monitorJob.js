
const { checkEndpoint } = require("../services/monitorService");
const Device = require("../models/Device");
const MonitorHistory = require("../models/MonitorHistory");

const INTERVAL_MS = 30_000; // Run monitoring every 30 seconds

function startMonitorJob() {
  let isRunning = false;

  async function runChecks() {
    // Prevent overlapping monitoring cycles
    if (isRunning) return;

    isRunning = true;

    try {
      const devices = await Device.find().lean();

      for (const device of devices) {
        try {
          // Check whether the endpoint is reachable
          const result = await checkEndpoint(device.address);

          const checkedAt = result.checkedAt
            ? new Date(result.checkedAt)
            : new Date();

          // Update the latest device status in MongoDB
          const updatedDevice = await Device.findOneAndUpdate(
            { id: device.id },
            {
              $set: {
                status: result.status ?? "Unknown",
                latency: result.latency ?? null,
                httpStatus: result.httpStatus ?? null,
                checkedAt,
                error: result.error ?? null,
              },
            },
            {
              returnDocument: "after",
            }
          );

          // Save this check to monitoring history
          await MonitorHistory.create({
            deviceId: device.id,
            name: device.name,
            status: result.status ?? "Unknown",
            latency: result.latency ?? null,
            httpStatus: result.httpStatus ?? null,
            checkedAt,
            error: result.error ?? null,
          });

          // Keep only the latest 500 history records per device
          const oldRecords = await MonitorHistory.find({
            deviceId: device.id,
          })
            .sort({ checkedAt: -1, _id: -1 })
            .skip(500)
            .select("_id")
            .lean();

          if (oldRecords.length > 0) {
            await MonitorHistory.deleteMany({
              _id: {
                $in: oldRecords.map((record) => record._id),
              },
            });
          }

          if (!updatedDevice) {
            console.warn(`Device ${device.id} no longer exists.`);
          }
        } catch (error) {
          console.error(
            `Monitoring failed for ${device.name}:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error("Monitoring job failed:", error.message);
    } finally {
      isRunning = false;
    }
  }

  // Run one monitoring cycle immediately
  void runChecks();

  // Continue monitoring every 30 seconds
  const timer = setInterval(() => {
    void runChecks();
  }, INTERVAL_MS);

  // Return a function that stops the monitoring job
  return () => clearInterval(timer);
}

module.exports = { startMonitorJob };
