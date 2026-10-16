const express = require("express");
const router = express.Router();

const {
  getDevices,
  getDevice,
  addDevice,
  checkDevice,
  getDeviceHistory,
  deleteDevice,
  updateDevice,
} = require("../controllers/deviceController");

// Get all devices
router.get("/", getDevices);
router.get("/:id", getDevice);

// Add a device
router.post("/", addDevice);

// Get monitoring history for a device
router.get("/:id/history", getDeviceHistory);

// Manually check one device
router.post("/:id/check", checkDevice);

router.put("/:id", updateDevice);
router.delete("/:id", deleteDevice);

module.exports = router;
