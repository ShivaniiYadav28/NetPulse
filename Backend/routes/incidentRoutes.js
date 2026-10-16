const express = require("express");
const router = express.Router();

const {
  getIncidents,
  getIncidentSummary,
} = require("../controllers/incidentController");

router.get("/", getIncidents);
router.get("/summary", getIncidentSummary);

module.exports = router;
