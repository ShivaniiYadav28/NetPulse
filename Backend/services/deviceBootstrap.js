const Device = require("../models/Device");

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

async function ensureStarterDevices() {
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
      { upsert: true },
    );
  }

  console.log("Starter devices verified in MongoDB");
}

module.exports = { ensureStarterDevices };
