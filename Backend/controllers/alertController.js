const mongoose = require("mongoose");

const Alert = require("../models/Alert");
const AlertRule = require("../models/AlertRule");
const Device = require("../models/Device");

function fail(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function validId(id) {
  return typeof id === "string" && id.trim().length > 0 && id.length <= 128;
}

async function findDevice(deviceId, ownerId) {
  const device = await Device.findOne({ id: deviceId, ownerId });
  if (device || !mongoose.isValidObjectId(deviceId)) {
    return device;
  }

  return Device.findOne({ _id: deviceId, ownerId });
}

function validateRule(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be an object";
  }

  const allowedFields = [
    "name",
    "deviceId",
    "type",
    "enabled",
    "thresholdMs",
    "failureCount",
  ];

  if (Object.keys(body).some((key) => !allowedFields.includes(key))) {
    return "Request contains unsupported fields";
  }

  const { name, deviceId, type, enabled, thresholdMs, failureCount } = body;

  if (!partial) {
    if (typeof name !== "string" || !name.trim()) {
      return "name is required";
    }

    if (!validId(deviceId)) {
      return "deviceId is invalid";
    }

    if (!["MonitorDown", "HighLatency"].includes(type)) {
      return "type must be MonitorDown or HighLatency";
    }
  }

  if (
    name !== undefined &&
    (typeof name !== "string" || !name.trim() || name.trim().length > 100)
  ) {
    return "name must be 1 to 100 characters";
  }

  if (deviceId !== undefined && !validId(deviceId)) {
    return "deviceId is invalid";
  }

  if (type !== undefined && !["MonitorDown", "HighLatency"].includes(type)) {
    return "type is invalid";
  }

  if (enabled !== undefined && typeof enabled !== "boolean") {
    return "enabled must be a boolean";
  }

  if (
    thresholdMs !== undefined &&
    thresholdMs !== null &&
    (!Number.isFinite(thresholdMs) || thresholdMs < 1 || thresholdMs > 60000)
  ) {
    return "thresholdMs must be between 1 and 60000";
  }

  if (
    failureCount !== undefined &&
    (!Number.isInteger(failureCount) || failureCount < 1 || failureCount > 20)
  ) {
    return "failureCount must be an integer between 1 and 20";
  }

  return null;
}

function validateThreshold(type, thresholdMs) {
  if (
    type === "HighLatency" &&
    (!Number.isFinite(thresholdMs) || thresholdMs < 1 || thresholdMs > 60000)
  ) {
    return "HighLatency rules require thresholdMs between 1 and 60000";
  }

  return null;
}

async function listAlerts(req, res) {
  const { status, type, page = "1", limit = "20" } = req.query;

  if (status && !["Active", "Resolved"].includes(status)) {
    return fail(res, 400, "status must be Active or Resolved");
  }

  if (type && !["MonitorDown", "HighLatency"].includes(type)) {
    return fail(res, 400, "type is invalid");
  }

  if (
    !/^\d+$/.test(page) ||
    !/^\d+$/.test(limit) ||
    !Number.isSafeInteger(Number(page)) ||
    !Number.isSafeInteger(Number(limit)) ||
    Number(page) < 1 ||
    Number(limit) < 1 ||
    Number(page) > 1000000
  ) {
    return fail(
      res,
      400,
      "page and limit must be positive integers within the supported range",
    );
  }

  const size = Math.min(Number(limit), 100);

  const filter = {
    ownerId: req.user.id,
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
  };

  const [alerts, total] = await Promise.all([
    Alert.find(filter)
      .sort({ lastTriggeredAt: -1, _id: -1 })
      .skip((Number(page) - 1) * size)
      .limit(size)
      .lean(),

    Alert.countDocuments(filter),
  ]);

  return res.json({
    success: true,
    data: alerts,
    pagination: {
      page: Number(page),
      limit: size,
      total,
      totalPages: Math.ceil(total / size),
    },
  });
}

async function getAlert(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Alert ID is invalid");
  }

  const alert = await Alert.findOne({
    _id: req.params.id,
    ownerId: req.user.id,
  }).lean();

  if (!alert) {
    return fail(res, 404, "Alert not found");
  }

  return res.json({
    success: true,
    data: alert,
  });
}

async function listRules(req, res) {
  const rules = await AlertRule.find({ ownerId: req.user.id })
    .sort({ createdAt: -1, _id: -1 })
    .limit(500)
    .lean();

  return res.json({
    success: true,
    data: rules,
  });
}

async function createRule(req, res) {
  const error = validateRule(req.body);

  if (error) {
    return fail(res, 400, error);
  }

  const thresholdError = validateThreshold(req.body.type, req.body.thresholdMs);

  if (thresholdError) {
    return fail(res, 400, thresholdError);
  }

  const device = await findDevice(req.body.deviceId, req.user.id);

  if (!device) {
    return fail(res, 404, "Device not found");
  }

  const ruleData = {
    name: req.body.name.trim(),
    ownerId: req.user.id,
    deviceId: device.id,
    type: req.body.type,
    enabled: req.body.enabled ?? true,
    failureCount: req.body.failureCount ?? 1,
    thresholdMs: req.body.type === "HighLatency" ? req.body.thresholdMs : null,
    consecutiveFailures: 0,
  };

  const rule = await AlertRule.create(ruleData);

  return res.status(201).json({
    success: true,
    data: rule,
  });
}

async function updateRule(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Alert rule ID is invalid");
  }

  const error = validateRule(req.body, true);

  if (error) {
    return fail(res, 400, error);
  }

  const existing = await AlertRule.findOne({
    _id: req.params.id,
    ownerId: req.user.id,
  });

  if (!existing) {
    return fail(res, 404, "Alert rule not found");
  }

  const updatedType = req.body.type ?? existing.type;

  const updatedThreshold =
    req.body.thresholdMs !== undefined ? req.body.thresholdMs : existing.thresholdMs;

  const thresholdError = validateThreshold(updatedType, updatedThreshold);

  if (thresholdError) {
    return fail(res, 400, thresholdError);
  }

  let updatedDeviceId = existing.deviceId;

  if (req.body.deviceId !== undefined) {
    const device = await findDevice(req.body.deviceId, req.user.id);

    if (!device) {
      return fail(res, 404, "Device not found");
    }

    updatedDeviceId = device.id;
  }

  const deviceChanged = updatedDeviceId !== existing.deviceId;
  const typeChanged = updatedType !== existing.type;

  const update = {
    ...req.body,
    ...(req.body.deviceId !== undefined ? { deviceId: updatedDeviceId } : {}),
    thresholdMs: updatedType === "HighLatency" ? updatedThreshold : null,
  };

  if (deviceChanged || typeChanged) {
    update.consecutiveFailures = 0;
  }

  const rule = await AlertRule.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.id },
    {
      $set: update,
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (!rule) {
    return fail(res, 404, "Alert rule not found");
  }

  if (deviceChanged || typeChanged || rule.enabled === false) {
    await Alert.updateMany(
      {
        ruleId: rule._id,
        ownerId: req.user.id,
        status: "Active",
      },
      {
        $set: {
          status: "Resolved",
          resolvedAt: new Date(),
        },
      },
    );
  }

  return res.json({
    success: true,
    data: rule,
  });
}

async function deleteRule(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Alert rule ID is invalid");
  }

  const rule = await AlertRule.findOneAndDelete({
    _id: req.params.id,
    ownerId: req.user.id,
  });

  if (!rule) {
    return fail(res, 404, "Alert rule not found");
  }

  await Alert.updateMany(
    {
      ruleId: rule._id,
      ownerId: req.user.id,
      status: "Active",
    },
    {
      $set: {
        status: "Resolved",
        resolvedAt: new Date(),
      },
    },
  );

  return res.json({
    success: true,
    data: rule,
  });
}

module.exports = {
  listAlerts,
  getAlert,
  listRules,
  createRule,
  updateRule,
  deleteRule,
};
