const express = require("express");
const controller = require("../controllers/alertController");

const router = express.Router();

// Get all alert rules
router.get("/rules", controller.listRules);

// Create a new alert rule
router.post("/rules", controller.createRule);

// Update an existing alert rule
router.patch("/rules/:id", controller.updateRule);

// Delete an alert rule
router.delete("/rules/:id", controller.deleteRule);

// Get all alerts
router.get("/", controller.listAlerts);

// Get a single alert by ID
router.get("/:id", controller.getAlert);

module.exports = router;