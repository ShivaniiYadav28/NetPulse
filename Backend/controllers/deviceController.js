const { checkAndPersistDevice } = require("../services/deviceMonitoringService");
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
        checkedAt: device.checkedAt ? new Date(device.checkedAt).toISOString() : null,
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
      type: typeof type === "string" && type.trim() ? type.trim() : "Custom Endpoint",
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

    const updatedDevice = await checkAndPersistDevice(device);

    res.json({
      success: true,
      device: updatedDevice ? updatedDevice.toObject() : device.toObject(),
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
        checkedAt: item.checkedAt ? new Date(item.checkedAt).toISOString() : null,
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

async function updateDevice(req, res) {
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

    const device = await Device.findOneAndUpdate(
      { id: req.params.id },
      {
        $set: {
          name: name.trim(),
          address: address.trim(),
          type:
            typeof type === "string" && type.trim() ? type.trim() : "Custom Endpoint",
        },
      },
      { returnDocument: "after", runValidators: true },
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    return res.json({ success: true, device: device.toObject() });
  } catch (error) {
    console.error("Update device error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update device",
    });
  }
}
async function deleteDevice(req, res) {
  const session = await Device.db.startSession();
  let deletedHistoryCount = 0;

  try {
    await session.withTransaction(async () => {
      const device = await Device.findOneAndDelete({ id: req.params.id }, { session });

      if (!device) {
        const error = new Error("Device not found");
        error.statusCode = 404;
        throw error;
      }

      const result = await MonitorHistory.deleteMany(
        { deviceId: req.params.id },
        { session },
      );

      deletedHistoryCount = result.deletedCount ?? 0;
    });

    return res.json({
      success: true,
      message: "Device and monitoring history deleted",
      deviceId: req.params.id,
      deletedHistoryCount,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Delete device error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete device",
    });
  } finally {
    await session.endSession();
  }
}

module.exports = {
  getDevices,
  addDevice,
  checkDevice,
  getDeviceHistory,
  updateDevice,
  deleteDevice,
};
