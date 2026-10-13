
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const deviceRoutes = require("./routes/deviceRoutes");
const { startMonitorJob } = require("./jobs/monitorJob");

require("dotenv").config();

const Device = require("./models/Device");

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Routes
app.use("/api/devices", deviceRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "NetPulse API is running",
    status: "success",
  });
});

// Health endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "NetPulse API",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

const PORT = process.env.PORT || 5000;

let server;
let stopMonitorJob;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from Backend/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Atlas connected successfully");

    // Add the two starter devices only if they do not already exist.
    const starterDevices = [
      {
        id: "1",
        name: "Production API",
        address: "https://example.com",
        type: "API Endpoint",
      },
      {
        id: "2",
        name: "Main Web Server",
        address: "https://example.org",
        type: "Web Server",
      },
    ];

    for (const starter of starterDevices) {
      await Device.updateOne(
        { id: starter.id },
        {
          $setOnInsert: {
            ...starter,
            status: "Unknown",
            latency: null,
            httpStatus: null,
            checkedAt: null,
            error: null,
          },
        },
        { upsert: true }
      );
    }

    console.log("Starter devices verified in MongoDB");

    server = app.listen(PORT, () => {
      console.log(`NetPulse server running on port ${PORT}`);

      // Automatic checks now use MongoDB.
      stopMonitorJob = startMonitorJob();
    });
  } catch (error) {
    console.error("Failed to start NetPulse:", error.message);
    process.exitCode = 1;
  }
}

async function shutdown() {
  console.log("Shutting down NetPulse...");

  if (stopMonitorJob) {
    stopMonitorJob();
  }

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  process.exit();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();
