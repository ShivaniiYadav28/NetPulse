const Device = require("../models/Device");
const { checkAndPersistDevice } = require("../services/deviceMonitoringService");

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
          const updatedDevice = await checkAndPersistDevice(device);

          if (!updatedDevice) {
            console.warn(`Device ${device.id} no longer exists.`);
          }
        } catch (error) {
          console.error(`Monitoring failed for ${device.name}:`, error.message);
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
