const { checkAndPersistDevice } = require("../services/deviceMonitoringService");
const Device = require("../models/Device");
const MonitorHistory = require("../models/MonitorHistory");
const Incident = require("../models/Incident");
const Alert = require("../models/Alert");
const AlertRule = require("../models/AlertRule");
const deviceService = require("../services/deviceService");

// Get all devices from MongoDB
async function getDevices(req, res) {
  try {
    const devices = await Device.find({ ownerId: req.user.id })
      .sort({ createdAt: 1 })
      .lean();

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

async function getDevice(req, res) {
  if (!validDeviceId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Device ID is invalid",
    });
  }

  try {
    const device = await Device.findOne({
      id: req.params.id,
      ownerId: req.user.id,
    }).lean();
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    return res.json({
      success: true,
      device,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve device",
    });
  }
}
function validDeviceId(id) {
  return typeof id === "string" && id.trim().length > 0 && id.length <= 128;
}

// Add a device to MongoDB
async function addDevice(req, res) {
  try {
    const device = await deviceService.createDevice(req.body, req.user.id);

    res.status(201).json({
      success: true,
      device: device.toObject(),
    });
  } catch (error) {
    console.error("Add device error:", error.message);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to add device",
    });
  }
}

// Manually check one device and save its latest result
async function checkDevice(req, res) {
  try {
    if (!validDeviceId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Device ID is invalid",
      });
    }

    const device = await Device.findOne({ id: req.params.id, ownerId: req.user.id });

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
    if (!validDeviceId(deviceId)) {
      return res.status(400).json({
        success: false,
        message: "Device ID is invalid",
      });
    }

    if (!(await Device.exists({ id: deviceId, ownerId: req.user.id }))) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    const history = await MonitorHistory.find({ deviceId, ownerId: req.user.id })
      .sort({ checkedAt: -1, _id: -1 })
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
    if (!validDeviceId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Device ID is invalid",
      });
    }

    let device;
    try {
      device = await deviceService.updateDevice(req.params.id, req.body, req.user.id);
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      throw error;
    }

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    return res.json({
      success: true,
      device: device.toObject(),
    });
  } catch (error) {
    console.error("Update device error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update device",
    });
  }
}
async function deleteDevice(req, res) {
  if (!validDeviceId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Device ID is invalid",
    });
  }

  const session = await Device.db.startSession();
  let deletedHistoryCount = 0;

  try {
    await session.withTransaction(async () => {
      const device = await Device.findOneAndDelete(
        { id: req.params.id, ownerId: req.user.id },
        { session },
      );

      if (!device) {
        const error = new Error("Device not found");
        error.statusCode = 404;
        throw error;
      }

      await Promise.all([
        Incident.deleteMany(
          { deviceId: req.params.id, ownerId: req.user.id },
          { session },
        ),
        Alert.deleteMany(
          { deviceId: req.params.id, ownerId: req.user.id },
          { session },
        ),
        AlertRule.deleteMany(
          { deviceId: req.params.id, ownerId: req.user.id },
          { session },
        ),
      ]);

      const result = await MonitorHistory.deleteMany(
        { deviceId: req.params.id, ownerId: req.user.id },
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
  getDevice,
  addDevice,
  checkDevice,
  getDeviceHistory,
  updateDevice,
  deleteDevice,
};
