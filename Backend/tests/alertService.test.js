const test = require("node:test");
const assert = require("node:assert/strict");

const Alert = require("../models/Alert");
const AlertRule = require("../models/AlertRule");
const { evaluateRule, processAlerts } = require("../services/alertService");

const originalMethods = {
  find: AlertRule.find,
  findOneAndUpdate: AlertRule.findOneAndUpdate,
  exists: AlertRule.exists,
  updateOne: AlertRule.updateOne,
  alertFindOne: Alert.findOne,
  alertFindOneAndUpdate: Alert.findOneAndUpdate,
  alertCreate: Alert.create,
};
let nextRuleId = 1;

function createHarness(ruleValues) {
  const rules = ruleValues.map((rule) => ({
    _id: rule._id || `rule-${nextRuleId++}`,
    enabled: true,
    failureCount: 1,
    consecutiveFailures: 0,
    ...rule,
  }));
  const alerts = [];
  const counters = { opened: 0, updated: 0, resolved: 0 };

  AlertRule.find = (filter) => ({
    lean: async () =>
      rules.filter((rule) =>
        filter.enabled === undefined ? true : rule.enabled === filter.enabled,
      ),
  });
  AlertRule.findOneAndUpdate = async (filter, update) => {
    const rule = rules.find(
      (item) => item._id === filter._id && item.enabled === filter.enabled,
    );
    if (!rule) return null;
    rule.consecutiveFailures += update.$inc.consecutiveFailures;
    return { ...rule };
  };
  AlertRule.exists = async (filter) =>
    rules.some((rule) =>
      Object.entries(filter).every(([key, value]) => rule[key] === value),
    );
  AlertRule.updateOne = async (filter, update) => {
    const rule = rules.find((item) => item._id === filter._id);
    if (rule) {
      Object.assign(rule, update.$set);
    }
  };
  Alert.findOne = (filter) => ({
    lean: async () =>
      alerts.find((item) =>
        Object.entries(filter).every(([key, value]) => item[key] === value),
      ) || null,
  });
  Alert.create = async (values) => {
    if (
      alerts.some(
        (item) => item.ruleId === values.ruleId && item.status === "Active",
      )
    ) {
      const error = new Error("duplicate active alert");
      error.code = 11000;
      throw error;
    }

    const alert = { _id: `alert-${alerts.length + 1}`, ...values };
    alerts.push(alert);
    counters.opened += 1;
    return { ...alert };
  };
  Alert.findOneAndUpdate = async (filter, update) => {
    const alert = alerts.find((item) =>
      Object.entries(filter).every(([key, value]) => item[key] === value),
    );
    if (!alert) return null;

    Object.assign(alert, update.$set);
    if (update.$inc?.occurrences) {
      alert.occurrences += update.$inc.occurrences;
      counters.updated += 1;
    }
    if (update.$set?.status === "Resolved") counters.resolved += 1;
    return { ...alert };
  };

  return { rules, alerts, counters };
}

test.afterEach(() => {
  AlertRule.find = originalMethods.find;
  AlertRule.findOneAndUpdate = originalMethods.findOneAndUpdate;
  AlertRule.exists = originalMethods.exists;
  AlertRule.updateOne = originalMethods.updateOne;
  Alert.findOne = originalMethods.alertFindOne;
  Alert.findOneAndUpdate = originalMethods.alertFindOneAndUpdate;
  Alert.create = originalMethods.alertCreate;
});

const device = { id: "device-1", name: "Test monitor", address: "https://example.com" };

test("does not open an alert before the failure threshold", async () => {
  const state = createHarness([
    { _id: "rule-1", deviceId: device.id, type: "MonitorDown", failureCount: 2 },
  ]);

  await processAlerts(device, { status: "Offline" });

  assert.equal(state.rules[0].consecutiveFailures, 1);
  assert.equal(state.alerts.length, 0);
});

test("opens at threshold and updates the same active alert on repeated failures", async () => {
  const state = createHarness([
    {
      _id: "rule-1",
      deviceId: device.id,
      type: "MonitorDown",
      failureCount: 2,
      name: "Down",
    },
  ]);

  await processAlerts(device, { status: "Offline" });
  await processAlerts(device, { status: "Offline" });
  await processAlerts(device, { status: "Offline" });

  assert.equal(state.alerts.length, 1);
  assert.equal(state.counters.opened, 1);
  assert.equal(state.counters.updated, 1);
  assert.equal(state.alerts[0].occurrences, 2);
});

test("a concurrent trigger reuses one active alert", async () => {
  const state = createHarness([
    { _id: "rule-race", deviceId: device.id, type: "MonitorDown", name: "Down" },
  ]);

  await Promise.all([
    processAlerts(device, { status: "Offline" }),
    processAlerts(device, { status: "Offline" }),
  ]);

  assert.equal(state.alerts.length, 1);
  assert.equal(state.counters.opened, 1);
  assert.equal(state.alerts[0].occurrences, 2);
});

test("a rule disabled during a check cannot leave a late active alert", async () => {
  const state = createHarness([
    { _id: "rule-disabled-race", deviceId: device.id, type: "MonitorDown" },
  ]);
  const updateRule = AlertRule.findOneAndUpdate;
  AlertRule.findOneAndUpdate = async (...args) => {
    const updated = await updateRule(...args);
    state.rules[0].enabled = false;
    return updated;
  };

  await processAlerts(device, { status: "Offline" });

  assert.equal(state.alerts.length, 1);
  assert.equal(state.alerts[0].status, "Resolved");
  assert.ok(state.alerts[0].resolvedAt instanceof Date);
});

test("online recovery resets failures and resolves the active alert with a timestamp", async () => {
  const state = createHarness([
    { _id: "rule-1", deviceId: device.id, type: "MonitorDown", failureCount: 1 },
  ]);
  await processAlerts(device, { status: "Offline" });
  await processAlerts(device, { status: "Online" });

  assert.equal(state.rules[0].consecutiveFailures, 0);
  assert.equal(state.alerts[0].status, "Resolved");
  assert.ok(state.alerts[0].resolvedAt instanceof Date);
});

test("high latency triggers at the threshold; normal latency recovers", async () => {
  const state = createHarness([
    {
      _id: "rule-1",
      deviceId: device.id,
      type: "HighLatency",
      thresholdMs: 500,
      failureCount: 2,
    },
  ]);
  const rule = { type: "HighLatency", thresholdMs: 500 };
  assert.equal(evaluateRule(rule, { status: "Online", latency: 499 }), false);
  assert.equal(evaluateRule(rule, { status: "Online", latency: 500 }), true);
  assert.equal(evaluateRule(rule, { status: "Online", latency: Number.NaN }), false);

  await processAlerts(device, { status: "Online", latency: 500 });
  assert.equal(state.alerts.length, 0);
  await processAlerts(device, { status: "Online", latency: 500 });
  assert.equal(state.alerts.length, 1);
  await processAlerts(device, { status: "Online", latency: 100 });

  assert.equal(state.rules[0].consecutiveFailures, 0);
  assert.equal(state.alerts[0].status, "Resolved");
});

test("recovery for one rule does not resolve another rule's alert", async () => {
  const state = createHarness([
    { _id: "rule-down", deviceId: device.id, type: "MonitorDown", name: "Down" },
    {
      _id: "rule-latency",
      deviceId: device.id,
      type: "HighLatency",
      thresholdMs: 500,
      name: "Slow",
    },
  ]);

  await processAlerts(device, { status: "Online", latency: 600 });
  await processAlerts(device, { status: "Offline" });

  const downAlert = state.alerts.find((alert) => alert.ruleId === "rule-down");
  const latencyAlert = state.alerts.find(
    (alert) => alert.ruleId === "rule-latency",
  );
  assert.equal(downAlert.status, "Active");
  assert.equal(latencyAlert.status, "Resolved");
});

test("unknown results leave counters and active alerts unchanged", async () => {
  const state = createHarness([
    { _id: "rule-1", deviceId: device.id, type: "MonitorDown", failureCount: 1 },
  ]);
  await processAlerts(device, { status: "Offline" });
  const failuresBeforeUnknown = state.rules[0].consecutiveFailures;
  const occurrencesBeforeUnknown = state.alerts[0].occurrences;

  await processAlerts(device, { status: "Unknown" });

  assert.equal(state.rules[0].consecutiveFailures, failuresBeforeUnknown);
  assert.equal(state.alerts[0].occurrences, occurrencesBeforeUnknown);
  assert.equal(state.alerts[0].status, "Active");
});

test("disabled rules are not evaluated", async () => {
  const state = createHarness([
    { _id: "rule-1", deviceId: device.id, type: "MonitorDown", enabled: false },
  ]);
  await processAlerts(device, { status: "Offline" });

  assert.equal(state.rules[0].consecutiveFailures, 0);
  assert.equal(state.alerts.length, 0);
});

test("invalid device or monitoring inputs are rejected", async () => {
  await assert.rejects(processAlerts(null, { status: "Offline" }), /valid ID/);
  await assert.rejects(
    processAlerts(device, { status: "Broken" }),
    /valid monitoring result/,
  );
});

test("alert persistence errors are logged and propagated", async () => {
  createHarness([
    { _id: "rule-1", deviceId: device.id, type: "MonitorDown", failureCount: 1 },
  ]);
  AlertRule.findOneAndUpdate = async () => {
    throw new Error("simulated persistence failure");
  };
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    await assert.rejects(
      processAlerts(device, { status: "Offline" }),
      /simulated persistence failure/,
    );
  } finally {
    console.error = originalConsoleError;
  }
});
