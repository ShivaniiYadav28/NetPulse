const Incident = require("../models/Incident");

async function getIncidents(req, res) {
  try {
    const filter = { ownerId: req.user.id };

    if (req.query.status) {
      const status = String(req.query.status);

      if (!["Open", "Resolved"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be Open or Resolved",
        });
      }

      filter.status = status;
    }

    const incidents = await Incident.find(filter)
      .sort({ startedAt: -1 })
      .limit(500)
      .lean();

    return res.json({
      success: true,
      count: incidents.length,
      incidents,
    });
  } catch (error) {
    console.error("Get incidents error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve incidents",
    });
  }
}

async function getIncidentSummary(req, res) {
  try {
    const [open, resolved] = await Promise.all([
      Incident.countDocuments({ ownerId: req.user.id, status: "Open" }),
      Incident.countDocuments({ ownerId: req.user.id, status: "Resolved" }),
    ]);

    return res.json({
      success: true,
      summary: {
        open,
        resolved,
        total: open + resolved,
      },
    });
  } catch (error) {
    console.error("Incident summary error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve incident summary",
    });
  }
}

module.exports = { getIncidents, getIncidentSummary };
