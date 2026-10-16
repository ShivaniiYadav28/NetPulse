const test = require("node:test");
const assert = require("node:assert/strict");

const Alert = require("../models/Alert");
const AlertRule = require("../models/AlertRule");
const { evaluateRule, processAlerts } = require("../services/alertService");

const originalMethods = {
  find: AlertRule.find,
  findOneAndUpdate: AlertRule.findOneAndUpdate,
  updateOne: AlertRule.updateOne,
  alertFindOneAndUpdate: Alert.findOneAndUpdate,
  alertUpdateOne: Alert.updateOne,
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
  AlertRule.updateOne = async (filter, update) => {
    const rule = rules.find((item) => item._id === filter._id);
    if (rule) {
      Object.assign(rule, update.$set);
    }
  };
  Alert.findOneAndUpdate = async (filter, update, options) => {
    let alert = alerts.find(
      (item) => item.ruleId === filter.ruleId && item.status === "Active",
    );
    if (alert) {
      Object.assign(alert, update.$set);
      alert.occurrences += update.$inc.occurrences;
      counters.updated += 1;
      return { ...alert };
    }
    if (!options.upsert) return null;
    alert = {
      ...update.$setOnInsert,
      ...update.$set,
      ruleId: filter.ruleId,
      occurrences: update.$inc.occurrences,
    };
    alerts.push(alert);
    counters.opened += 1;
    return { ...alert };
  };
  Alert.updateOne = async (filter, update) => {
    const alert = alerts.find(
      (item) =>
        item.deviceId === filter.deviceId &&
        item.ruleId === filter.ruleId &&
        item.status === "Active",
    );
    if (alert) {
      Object.assign(alert, update.$set);
      counters.resolved += 1;
    }
  };

  return { rules, alerts, counters };
}

test.afterEach(() => {
  AlertRule.find = originalMethods.find;
  AlertRule.findOneAndUpdate = originalMethods.findOneAndUpdate;
  AlertRule.updateOne = originalMethods.updateOne;
  Alert.findOneAndUpdate = originalMethods.alertFindOneAndUpdate;
  Alert.updateOne = originalMethods.alertUpdateOne;
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
