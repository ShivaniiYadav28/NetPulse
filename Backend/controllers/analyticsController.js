const Device = require("../models/Device");
const MonitorHistory = require("../models/MonitorHistory");
const Incident = require("../models/Incident");

const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parseDateRange(query) {
  const to = query.to === undefined ? new Date() : new Date(query.to);
  const from =
    query.from === undefined
      ? new Date(to.getTime() - DEFAULT_WINDOW_MS)
      : new Date(query.from);

  if (
    (query.from !== undefined && !Number.isFinite(from.getTime())) ||
    (query.to !== undefined && !Number.isFinite(to.getTime()))
  ) {
    return { error: "from and to must be valid dates" };
  }

  if (from > to) {
    return { error: "from must be earlier than or equal to to" };
  }

  return { from, to };
}

function parsePositiveInteger(value, fallback, name, maximum) {
  if (value === undefined) return { value: fallback };

  if (!/^\d+$/.test(String(value))) {
    return { error: `${name} must be a positive integer` };
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return { error: `${name} must be a positive integer` };
  }

  return { value: maximum ? Math.min(parsed, maximum) : parsed };
}

function validateDeviceId(id) {
  return typeof id === "string" && id.trim().length > 0 && id.length <= 128;
}

function historyMatch(deviceId, from, to) {
  return {
    deviceId,
    checkedAt: { $gte: from, $lte: to },
  };
}

function historyStatsPipeline(match) {
  return [
    { $match: match },
    {
      $set: {
        validLatency: {
          $cond: [
            {
              $and: [
                { $isNumber: "$latency" },
                { $gte: ["$latency", 0] },
                { $lt: ["$latency", Number.MAX_VALUE] },
              ],
            },
            "$latency",
            "$$REMOVE",
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalChecks: { $sum: 1 },
        onlineChecks: {
          $sum: { $cond: [{ $eq: ["$status", "Online"] }, 1, 0] },
        },
        offlineChecks: {
          $sum: { $cond: [{ $eq: ["$status", "Offline"] }, 1, 0] },
        },
        averageLatency: { $avg: "$validLatency" },
        minimumLatency: { $min: "$validLatency" },
        maximumLatency: { $max: "$validLatency" },
      },
    },
  ];
}

function calculateUptime(online, offline) {
  const eligibleChecks = online + offline;
  return eligibleChecks === 0 ? null : (online / eligibleChecks) * 100;
}

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

async function getOverview(req, res) {
  const range = parseDateRange(req.query);
  if (range.error) return sendError(res, 400, range.error);

  try {
    const { from, to } = range;
    // Overview uptime and latency use the same rolling 24-hour window by default.
    const [deviceCounts, incidentCounts, historyStats] = await Promise.all([
      Device.aggregate([
        {
          $group: {
            _id: null,
            totalMonitors: { $sum: 1 },
            online: { $sum: { $cond: [{ $eq: ["$status", "Online"] }, 1, 0] } },
            offline: { $sum: { $cond: [{ $eq: ["$status", "Offline"] }, 1, 0] } },
            unknown: { $sum: { $cond: [{ $eq: ["$status", "Unknown"] }, 1, 0] } },
          },
        },
      ]),
      Incident.aggregate([
        {
          $group: {
            _id: null,
            openIncidents: { $sum: { $cond: [{ $eq: ["$status", "Open"] }, 1, 0] } },
            resolvedIncidents: {
              $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
            },
          },
        },
      ]),
      MonitorHistory.aggregate([
        { $match: { checkedAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: null,
            onlineChecks: {
              $sum: { $cond: [{ $eq: ["$status", "Online"] }, 1, 0] },
            },
            offlineChecks: {
              $sum: { $cond: [{ $eq: ["$status", "Offline"] }, 1, 0] },
            },
            averageLatency: {
              $avg: {
                $cond: [
                  {
                    $and: [
                      { $isNumber: "$latency" },
                      { $gte: ["$latency", 0] },
                      { $lt: ["$latency", Number.MAX_VALUE] },
                    ],
                  },
                  "$latency",
                  null,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const devices = deviceCounts[0] || {
      totalMonitors: 0,
      online: 0,
      offline: 0,
      unknown: 0,
    };
    const incidents = incidentCounts[0] || { openIncidents: 0, resolvedIncidents: 0 };
    const history = historyStats[0] || {
      onlineChecks: 0,
      offlineChecks: 0,
      averageLatency: null,
    };

    return res.json({
      success: true,
      data: {
        totalMonitors: devices.totalMonitors,
        online: devices.online,
        offline: devices.offline,
        unknown: devices.unknown,
        openIncidents: incidents.openIncidents,
        resolvedIncidents: incidents.resolvedIncidents,
        uptimePercentage: calculateUptime(history.onlineChecks, history.offlineChecks),
        averageLatency: history.averageLatency,
      },
    });
  } catch (error) {
    console.error("Get analytics overview error:", error.message);
    return sendError(res, 500, "Failed to retrieve analytics overview");
  }
}

async function getDeviceAnalytics(req, res) {
  if (!validateDeviceId(req.params.id)) {
    return sendError(res, 400, "Device ID is invalid");
  }

  const range = parseDateRange(req.query);
  if (range.error) return sendError(res, 400, range.error);

  try {
    const device = await Device.findOne({ id: req.params.id }).lean();
    if (!device) return sendError(res, 404, "Device not found");

    const match = historyMatch(req.params.id, range.from, range.to);
    const [statsResult, openIncident] = await Promise.all([
      MonitorHistory.aggregate(historyStatsPipeline(match)),
      Incident.findOne({ deviceId: req.params.id, status: "Open" })
        .sort({ startedAt: -1 })
        .lean(),
    ]);

    const stats = statsResult[0] || {
      totalChecks: 0,
      onlineChecks: 0,
      offlineChecks: 0,
      averageLatency: null,
      minimumLatency: null,
      maximumLatency: null,
    };

    return res.json({
      success: true,
      data: {
        deviceId: device.id,
        currentStatus: device.status,
        uptimePercentage: calculateUptime(stats.onlineChecks, stats.offlineChecks),
        totalChecks: stats.totalChecks,
        onlineChecks: stats.onlineChecks,
        offlineChecks: stats.offlineChecks,
        averageLatency: stats.averageLatency,
        minimumLatency: stats.minimumLatency,
        maximumLatency: stats.maximumLatency,
        openIncident,
      },
    });
  } catch (error) {
    console.error("Get device analytics error:", error.message);
    return sendError(res, 500, "Failed to retrieve device analytics");
  }
}

async function getDeviceHistory(req, res) {
  if (!validateDeviceId(req.params.id)) {
    return sendError(res, 400, "Device ID is invalid");
  }

  const range = parseDateRange(req.query);
  if (range.error) return sendError(res, 400, range.error);

  const pageResult = parsePositiveInteger(req.query.page, 1, "page");
  if (pageResult.error) return sendError(res, 400, pageResult.error);
  const limitResult = parsePositiveInteger(
    req.query.limit,
    DEFAULT_PAGE_SIZE,
    "limit",
    MAX_PAGE_SIZE,
  );
  if (limitResult.error) return sendError(res, 400, limitResult.error);

  try {
    const device = await Device.exists({ id: req.params.id });
    if (!device) return sendError(res, 404, "Device not found");

    const filter = historyMatch(req.params.id, range.from, range.to);
    const page = pageResult.value;
    const limit = limitResult.value;
    const [history, totalRecords] = await Promise.all([
      MonitorHistory.find(filter)
        .sort({ checkedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      MonitorHistory.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        history,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get device analytics history error:", error.message);
    return sendError(res, 500, "Failed to retrieve device history");
  }
}

module.exports = { getOverview, getDeviceAnalytics, getDeviceHistory };
