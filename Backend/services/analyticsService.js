const mongoose = require("mongoose");
const Device = require("../models/Device");
const MonitorHistory = require("../models/MonitorHistory");
const Incident = require("../models/Incident");

function calculateUptime(online, offline) {
  const known = online + offline;
  return known ? (online / known) * 100 : null;
}

async function getOverview(ownerId, { from, to }) {
  const [devices, incidents, checks] = await Promise.all([
    Device.aggregate([
      { $match: { ownerId: new mongoose.Types.ObjectId(ownerId) } },
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
      { $match: { ownerId: new mongoose.Types.ObjectId(ownerId) } },
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
      {
        $match: {
          ownerId: new mongoose.Types.ObjectId(ownerId),
          checkedAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: null,
          online: { $sum: { $cond: [{ $eq: ["$status", "Online"] }, 1, 0] } },
          offline: { $sum: { $cond: [{ $eq: ["$status", "Offline"] }, 1, 0] } },
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
  const d = devices[0] || { totalMonitors: 0, online: 0, offline: 0, unknown: 0 };
  const i = incidents[0] || { openIncidents: 0, resolvedIncidents: 0 };
  const h = checks[0] || { online: 0, offline: 0, averageLatency: null };
  return {
    totalMonitors: d.totalMonitors,
    online: d.online,
    offline: d.offline,
    unknown: d.unknown,
    openIncidents: i.openIncidents,
    resolvedIncidents: i.resolvedIncidents,
    uptimePercentage: calculateUptime(h.online, h.offline),
    averageLatency: h.averageLatency,
  };
}

const validLatencyStages = [
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
      onlineChecks: { $sum: { $cond: [{ $eq: ["$status", "Online"] }, 1, 0] } },
      offlineChecks: { $sum: { $cond: [{ $eq: ["$status", "Offline"] }, 1, 0] } },
      averageLatency: { $avg: "$validLatency" },
      minimumLatency: { $min: "$validLatency" },
      maximumLatency: { $max: "$validLatency" },
    },
  },
];

async function getDeviceAnalytics(deviceId, ownerId, range) {
  const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
  const device = await Device.findOne({ id: deviceId, ownerId: ownerObjectId }).lean();
  if (!device) return null;
  const match = {
    deviceId,
    ownerId: ownerObjectId,
    checkedAt: { $gte: range.from, $lte: range.to },
  };
  const [statsResult, openIncident] = await Promise.all([
    MonitorHistory.aggregate([{ $match: match }, ...validLatencyStages]),
    Incident.findOne({ deviceId, ownerId: ownerObjectId, status: "Open" })
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
  return {
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
  };
}

async function getDeviceHistory(deviceId, ownerId, range, page, limit) {
  if (!(await Device.exists({ id: deviceId, ownerId }))) return null;
  const filter = { deviceId, ownerId, checkedAt: { $gte: range.from, $lte: range.to } };
  const [history, totalRecords] = await Promise.all([
    MonitorHistory.find(filter)
      .sort({ checkedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    MonitorHistory.countDocuments(filter),
  ]);
  return {
    history,
    pagination: {
      page,
      limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
    },
  };
}

module.exports = { getOverview, getDeviceAnalytics, getDeviceHistory };
