const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({
    status: "healthy",
    service: "NetPulse API",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

module.exports = router;
