const express = require("express");
const {
  getOverview,
  getDeviceAnalytics,
  getDeviceHistory,
} = require("../controllers/analyticsController");

const router = express.Router();

router.get("/overview", getOverview);
router.get("/devices/:id/history", getDeviceHistory);
router.get("/devices/:id", getDeviceAnalytics);

module.exports = router;
