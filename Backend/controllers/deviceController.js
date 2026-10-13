
const { checkEndpoint } = require("../services/monitorService");
const Device = require("../models/Device");
const MonitorHistory = require("../models/MonitorHistory");

// Get all devices from MongoDB
async function getDevices(req, res) {
  try {
    const devices = await Device.find().sort({ createdAt: 1 }).lean();

    res.json({
      success: true,
      count: devices.length,
      devices: devices.map((device) => ({
        ...device,
        checkedAt: device.checkedAt
          ? new Date(device.checkedAt).toISOString()
          : null,
      })),
    });
  } catch (error) {
    console.error("Get devices error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve devices",
    });
  }
}

// Add a device to MongoDB
async function addDevice(req, res) {
  try {
    const { name, address, type } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof address !== "string" ||
      !address.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Device name and address are required",
      });
    }

    const device = await Device.create({
      id: Date.now().toString(),
      name: name.trim(),
      address: address.trim(),
      type:
        typeof type === "string" && type.trim()
          ? type.trim()
          : "Custom Endpoint",
      status: "Unknown",
      latency: null,
      httpStatus: null,
      checkedAt: null,
      error: null,
    });

    res.status(201).json({
      success: true,
      device: device.toObject(),
    });
  } catch (error) {
    console.error("Add device error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to add device",
    });
  }
}

// Manually check one device and save its latest result
async function checkDevice(req, res) {
  try {
    const device = await Device.findOne({ id: req.params.id });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    const result = await checkEndpoint(device.address);

    device.status = result.status ?? "Unknown";
    device.latency = result.latency ?? null;
    device.httpStatus = result.httpStatus ?? null;
    device.checkedAt = result.checkedAt
      ? new Date(result.checkedAt)
      : new Date();
    device.error = result.error ?? null;

    await device.save();

    await MonitorHistory.create({
      deviceId: device.id,
      name: device.name,
      status: device.status,
      latency: device.latency,
      httpStatus: device.httpStatus,
      checkedAt: device.checkedAt,
      error: device.error,
    });

    res.json({
      success: true,
      device: device.toObject(),
    });
  } catch (error) {
    console.error("Check device error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to check device",
    });
  }
}

// Get monitoring history from MongoDB
async function getDeviceHistory(req, res) {
  try {
    const deviceId = req.params.id;

    const history = await MonitorHistory.find({ deviceId })
      .sort({ checkedAt: 1 })
      .limit(500)
      .lean();

    res.json({
      success: true,
      deviceId,
      count: history.length,
      history: history.map((item) => ({
        ...item,
        checkedAt: item.checkedAt
          ? new Date(item.checkedAt).toISOString()
          : null,
      })),
    });
  } catch (error) {
    console.error("Get device history error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve device history",
    });
  }
}

module.exports = {
  getDevices,
  addDevice,
  checkDevice,
  getDeviceHistory,
};
