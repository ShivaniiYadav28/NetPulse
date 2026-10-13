
const express = require("express");
const router = express.Router();

const {
  getDevices,
  addDevice,
  checkDevice,
  getDeviceHistory,
} = require("../controllers/deviceController");

// Get all devices
router.get("/", getDevices);

// Add a device
router.post("/", addDevice);

// Get monitoring history for a device
router.get("/:id/history", getDeviceHistory);

// Manually check one device
router.post("/:id/check", checkDevice);

module.exports = router;
