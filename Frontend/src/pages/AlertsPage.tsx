import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Bell, RefreshCw, Trash2 } from "lucide-react";

import { useDevices } from "../hooks/useDevices";
import ErrorAlert from "../components/common/ErrorAlert";
import {
  axios,
  createAlertRule,
  deleteAlertRule,
  getAlertRules,
  getAlerts,
} from "../services/api";

type Rule = {
  _id: string;
  name: string;
  deviceId: string;
  type: "MonitorDown" | "HighLatency";
  thresholdMs?: number;
  failureCount: number;
  enabled: boolean;
};

type AlertEvent = {
  _id: string;
  deviceName: string;
  severity: "Critical" | "High";
  type: string;
  message: string;
  status: string;
  occurrences: number;
  triggeredAt: string;
  lastTriggeredAt: string;
};

type IncidentFilter = "all" | "ongoing" | "resolved";

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  return fallback;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";

  const date = new Date(value);

  return Number.isFinite(date.getTime())
    ? date.toLocaleString()
    : "Not available";
}

export default function AlertsPage() {
  const dashboard = useDevices();

  const [rules, setRules] = useState<Rule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);

  const [name, setName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [type, setType] = useState<"MonitorDown" | "HighLatency">(
    "MonitorDown",
  );
  const [threshold, setThreshold] = useState("500");
  const [failures, setFailures] = useState("1");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  const mounted = useRef(false);
  const refreshing = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;

    refreshing.current = true;

    if (mounted.current) {
      setLoading(true);
      setError("");
    }

    try {
      const [ruleResponse, eventResponse] = await Promise.all([
        getAlertRules(),
        getAlerts({ limit: 100 }),
      ]);

      if (!mounted.current) return;

      const receivedRules = ruleResponse.data?.data;
      const receivedEvents = eventResponse.data?.data;

      setRules(Array.isArray(receivedRules) ? receivedRules : []);
      setEvents(Array.isArray(receivedEvents) ? receivedEvents : []);
    } catch (requestError: unknown) {
      if (mounted.current) {
        setError(
          getErrorMessage(requestError, "Unable to load alerts."),
        );
      }
    } finally {
      refreshing.current = false;

      if (mounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Enter a name for the alert rule.");
      return;
    }

    if (!deviceId || !dashboard.devices.some((device) => device.id === deviceId)) {
      setError("Select a valid monitor.");
      return;
    }

    const thresholdValue = Number(threshold);
    const failureValue = Number(failures);

    if (
      type === "HighLatency" &&
      (!Number.isInteger(thresholdValue) ||
        thresholdValue < 1 ||
        thresholdValue > 60000)
    ) {
      setError("Latency threshold must be between 1 and 60000 ms.");
      return;
    }

    if (
      type === "MonitorDown" &&
      (!Number.isInteger(failureValue) ||
        failureValue < 1 ||
        failureValue > 20)
    ) {
      setError("Failure count must be between 1 and 20.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await createAlertRule({
        name: trimmedName,
        deviceId,
        type,
        ...(type === "HighLatency"
          ? { thresholdMs: thresholdValue }
          : {}),
        failureCount: type === "MonitorDown" ? failureValue : 1,
      });

      if (!mounted.current) return;

      setName("");
      await refresh();
    } catch (requestError: unknown) {
      if (mounted.current) {
        setError(
          getErrorMessage(requestError, "Unable to create alert rule."),
        );
      }
    } finally {
      if (mounted.current) {
        setSubmitting(false);
      }
    }
  }

  async function removeRule(id: string) {
    if (deletingRuleId) return;

    setDeletingRuleId(id);
    setError("");

    try {
      await deleteAlertRule(id);
      await refresh();
    } catch (requestError: unknown) {
      if (mounted.current) {
        setError(
          getErrorMessage(requestError, "Unable to delete alert rule."),
        );
      }
    } finally {
      if (mounted.current) {
        setDeletingRuleId(null);
      }
    }
  }

  const displayError = error || dashboard.error;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Bell className="text-sky-400" />
            Alerts
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Rules are evaluated on scheduled or manual monitor checks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={`mr-2 inline ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <ErrorAlert
        message={displayError}
        onDismiss={() => {
          setError("");
          dashboard.setError("");
        }}
      />

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="mb-4 font-bold text-white">Create alert rule</h2>

        {dashboard.devices.length === 0 && !dashboard.loading && (
          <p className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-300">
            Add a monitor before creating an alert rule.
          </p>
        )}

        <form
          onSubmit={(event) => void submit(event)}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <input
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Rule name"
            aria-label="Rule name"
            className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-white outline-none focus:border-sky-500"
          />

          <select
            required
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
            aria-label="Select monitor"
            className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-white outline-none focus:border-sky-500"
          >
            <option value="">Select monitor</option>
            {dashboard.devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>

          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as "MonitorDown" | "HighLatency")
            }
            aria-label="Alert type"
            className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-white outline-none focus:border-sky-500"
          >
            <option value="MonitorDown">Monitor down</option>
            <option value="HighLatency">High latency</option>
          </select>

          {type === "HighLatency" ? (
            <input
              required
              type="number"
              min={1}
              max={60000}
              step={1}
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              aria-label="Latency threshold in milliseconds"
              placeholder="Threshold (ms)"
              className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-white outline-none focus:border-sky-500"
            />
          ) : (
            <input
              required
              type="number"
              min={1}
              max={20}
              step={1}
              value={failures}
              onChange={(event) => setFailures(event.target.value)}
              aria-label="Failures before alert"
              placeholder="Failure count"
              className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-white outline-none focus:border-sky-500"
            />
          )}

          <button
            type="submit"
            disabled={
              submitting ||
              dashboard.loading ||
              dashboard.devices.length === 0
            }
            className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add rule"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="mb-3 font-bold text-white">Configured rules</h2>

        {loading ? (
          <p className="text-sm text-slate-400">Loading alert rules...</p>
        ) : rules.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {rules.map((rule) => {
              const monitorName =
                dashboard.devices.find((device) => device.id === rule.deviceId)
                  ?.name || rule.deviceId;

              return (
                <div
                  key={rule._id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm text-slate-200"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium text-white">
                      {rule.name}
                    </p>
                    <p className="mt-1 break-words text-xs text-slate-400">
                      {rule.type === "MonitorDown"
                        ? "Monitor down"
                        : "High latency"}{" "}
                      · {monitorName}
                      {rule.type === "HighLatency"
                        ? ` · ${rule.thresholdMs ?? "—"} ms`
                        : ` · ${rule.failureCount} failures`}
                    </p>
                    <p
                      className={`mt-1 text-xs ${
                        rule.enabled ? "text-emerald-400" : "text-slate-500"
                      }`}
                    >
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void removeRule(rule._id)}
                    disabled={deletingRuleId !== null}
                    aria-label={`Delete ${rule.name}`}
                    title="Delete alert rule"
                    className="rounded-lg p-2 text-rose-400 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingRuleId === rule._id ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            No alert rules configured.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="mb-3 font-bold text-white">Alert history</h2>

        {loading ? (
          <p className="text-sm text-slate-400">Loading alert history...</p>
        ) : events.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {events.map((item) => (
              <article key={item._id} className="py-3 text-sm text-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{item.deviceName || "Unknown monitor"}</strong>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      item.severity === "Critical"
                        ? "bg-rose-500/10 text-rose-300"
                        : "bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {item.severity}
                  </span>
                  <span className="text-xs text-slate-400">
                    {item.status}
                  </span>
                </div>

                <p className="mt-1 break-words">{item.message}</p>

                <p className="mt-1 text-xs text-slate-400">
                  {item.occurrences} qualifying checks
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  First triggered: {formatDate(item.triggeredAt)} · Last
                  triggered: {formatDate(item.lastTriggeredAt)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No alerts recorded.</p>
        )}
      </section>
    </div>
  );
}