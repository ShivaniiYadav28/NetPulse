require("dotenv").config();

const mongoose = require("mongoose");

const app = require("./app");
const { connectDatabase } = require("./config/db");
const { startMonitorJob } = require("./jobs/monitorJob");
const { ensureStarterDevices } = require("./services/deviceBootstrap");

const port = process.env.PORT || 5000;

let server;
let stopMonitorJob;
let isShuttingDown = false;

async function startServer() {
  try {
    await connectDatabase();
    await ensureStarterDevices();

    server = app.listen(port, () => {
      console.log(`NetPulse server running on port ${port}`);
      stopMonitorJob = startMonitorJob();
    });

    server.on("error", (error) => {
      console.error("Failed to start NetPulse:", error.message);
      process.exitCode = 1;
    });
  } catch (error) {
    console.error("Failed to start NetPulse:", error.message);

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    process.exitCode = 1;
  }
}

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("Shutting down NetPulse...");

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  if (stopMonitorJob) {
    await stopMonitorJob();
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

void startServer();
