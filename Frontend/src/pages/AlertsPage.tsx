
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";

import { useDevices } from "../hooks/useDevices";
import ErrorAlert from "../components/common/ErrorAlert";
import {
  axios,
  createAlertRule,
  deleteAlertRule,
  getAlertRules,
  getAlerts,
  updateAlertRule,
} from "../services/api";

type AlertType = "MonitorDown" | "HighLatency";
type AlertStatus = "Active" | "Resolved";
type AlertSeverity = "Critical" | "High";

type Rule = {
  _id: string;
  name: string;
  deviceId: string;
  type: AlertType;
  thresholdMs?: number | null;
  failureCount: number;
  consecutiveFailures?: number;
  enabled: boolean;
};

type AlertEvent = {
  _id: string;
  deviceId?: string;
  deviceName: string;
  address?: string;
  ruleId?: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  status: AlertStatus;
  occurrences: number;
  triggeredAt: string;
  lastTriggeredAt: string;
  resolvedAt?: string | null;
};

type FilterStatus = "all" | AlertStatus;
type FilterType = "all" | AlertType;

const PAGE_SIZE = 10;

const panelClass =
  "rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0a1423] p-5";

const inputClass =
  "w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-sky-500";

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

function getRuleTypeLabel(type: AlertType) {
  return type === "MonitorDown" ? "Monitor down" : "High latency";
}

function StatusBadge({ status }: { status: AlertStatus }) {
  const active = status === "Active";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? "border border-rose-500/20 bg-rose-500/10 text-rose-300"
          : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-rose-400" : "bg-emerald-400"
        }`}
      />
      {status}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        severity === "Critical"
          ? "bg-rose-500/10 text-rose-300"
          : "bg-amber-500/10 text-amber-300"
      }`}
    >
      {severity}
    </span>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  accent,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof Bell;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0a1423] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white">
            {value.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <div className={`rounded-lg border p-2.5 ${accent}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const dashboard = useDevices();

  const [rules, setRules] = useState<Rule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [name, setName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [type, setType] = useState<AlertType>("MonitorDown");
  const [threshold, setThreshold] = useState("500");
  const [failures, setFailures] = useState("1");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [updatingRuleId, setUpdatingRuleId] = useState<string | null>(null);

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
        getAlerts({
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
          ...(typeFilter !== "all" ? { type: typeFilter } : {}),
          page,
          limit: PAGE_SIZE,
        }),
      ]);

      if (!mounted.current) return;

      const receivedRules = ruleResponse.data?.data;
      const receivedEvents = eventResponse.data?.data;
      const pagination = eventResponse.data?.pagination;

      setRules(Array.isArray(receivedRules) ? receivedRules : []);
      setEvents(Array.isArray(receivedEvents) ? receivedEvents : []);
      setTotalAlerts(
        typeof pagination?.total === "number"
          ? pagination.total
          : Array.isArray(receivedEvents)
            ? receivedEvents.length
            : 0,
      );
      setTotalPages(
        Math.max(
          1,
          typeof pagination?.totalPages === "number"
            ? pagination.totalPages
            : 1,
        ),
      );
    } catch (requestError: unknown) {
      if (mounted.current) {
        setError(getErrorMessage(requestError, "Unable to load alerts."));
      }
    } finally {
      refreshing.current = false;

      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [page, statusFilter, typeFilter]);

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
      !Number.isInteger(failureValue) ||
      failureValue < 1 ||
      failureValue > 20
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
        ...(type === "HighLatency" ? { thresholdMs: thresholdValue } : {}),
        failureCount: failureValue,
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
      if (mounted.current) setSubmitting(false);
    }
  }

  async function removeRule(id: string) {
    if (deletingRuleId || updatingRuleId) return;

    const rule = rules.find((item) => item._id === id);

    if (
      !window.confirm(
        `Delete the rule "${rule?.name ?? "this rule"}"? Active alerts for this rule will be resolved by the backend.`,
      )
    ) {
      return;
    }

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
      if (mounted.current) setDeletingRuleId(null);
    }
  }

  async function toggleRule(rule: Rule) {
    if (updatingRuleId || deletingRuleId) return;

    setUpdatingRuleId(rule._id);
    setError("");

    try {
      await updateAlertRule(rule._id, {
        enabled: !rule.enabled,
      });

      if (!mounted.current) return;

      setRules((current) =>
        current.map((item) =>
          item._id === rule._id
            ? { ...item, enabled: !rule.enabled }
            : item,
        ),
      );

      // Refresh alerts because disabling a rule resolves its active alerts.
      await refresh();
    } catch (requestError: unknown) {
      if (mounted.current) {
        setError(
          getErrorMessage(requestError, "Unable to update alert rule."),
        );
      }
    } finally {
      if (mounted.current) setUpdatingRuleId(null);
    }
  }

  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return events;

    return events.filter((item) =>
      [
        item.deviceName,
        item.message,
        item.address,
        item.type,
        item.severity,
        item.status,
      ].some((value) => String(value ?? "").toLowerCase().includes(query)),
    );
  }, [events, search]);

  const activeCount = events.filter((item) => item.status === "Active").length;
  const criticalCount = events.filter(
    (item) => item.severity === "Critical" && item.status === "Active",
  ).length;
  const resolvedCount = events.filter(
    (item) => item.status === "Resolved",
  ).length;

  const displayError = error || dashboard.error;

  function changeStatus(value: FilterStatus) {
    setStatusFilter(value);
    setPage(1);
  }

  function changeType(value: FilterType) {
    setTypeFilter(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Bell className="text-sky-400" size={25} />
            Alert Management
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor incidents, configure alert rules, and track resolution history.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-sky-500/50 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total alerts"
          value={totalAlerts}
          description="Matching alerts across all pages"
          icon={Activity}
          accent="border-sky-500/20 bg-sky-500/10 text-sky-300"
        />
        <SummaryCard
          title="Active on this page"
          value={activeCount}
          description="Currently active alerts shown"
          icon={AlertTriangle}
          accent="border-rose-500/20 bg-rose-500/10 text-rose-300"
        />
        <SummaryCard
          title="Critical on this page"
          value={criticalCount}
          description="Active critical alerts shown"
          icon={ShieldAlert}
          accent="border-rose-500/20 bg-rose-500/10 text-rose-300"
        />
        <SummaryCard
          title="Resolved on this page"
          value={resolvedCount}
          description="Resolved alerts shown"
          icon={CheckCircle2}
          accent="border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
        />
      </section>

      <section className={panelClass}>
        <div className="mb-4 flex items-center gap-2">
          <Plus className="text-sky-400" size={19} />
          <h2 className="font-bold text-white">Create alert rule</h2>
        </div>

        {dashboard.devices.length === 0 && !dashboard.loading && (
          <p className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-300">
            Add a monitor before creating an alert rule.
          </p>
        )}

        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <input
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Rule name"
              aria-label="Rule name"
              className={inputClass}
            />

            <select
              required
              value={deviceId}
              onChange={(event) => setDeviceId(event.target.value)}
              aria-label="Select monitor"
              className={inputClass}
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
                setType(event.target.value as AlertType)
              }
              aria-label="Alert type"
              className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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
          </div>

          <p className="text-xs text-slate-500">
            High-latency rules use a threshold in milliseconds. Failure count
            determines how many qualifying checks are required before an alert
            is raised.
          </p>
        </form>
      </section>

      <section className={panelClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-white">Configured rules</h2>
            <p className="mt-1 text-xs text-slate-500">
              {rules.length} rule{rules.length === 1 ? "" : "s"} configured
            </p>
          </div>
        </div>

        {loading && rules.length === 0 ? (
          <p className="text-sm text-slate-400">Loading alert rules...</p>
        ) : rules.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {rules.map((rule) => {
              const monitorName =
                dashboard.devices.find(
                  (device) => device.id === rule.deviceId,
                )?.name || rule.deviceId;

              return (
                <div
                  key={rule._id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words font-medium text-white">
                        {rule.name}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          rule.enabled
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>

                    <p className="mt-1 break-words text-xs text-slate-400">
                      {getRuleTypeLabel(rule.type)} · {monitorName}
                      {rule.type === "HighLatency"
                        ? ` · ${rule.thresholdMs ?? "—"} ms`
                        : ` · ${rule.failureCount} failures`}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Consecutive failures: {rule.consecutiveFailures ?? 0}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleRule(rule)}
                      disabled={
                        updatingRuleId !== null || deletingRuleId !== null
                      }
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
                        rule.enabled
                          ? "border-amber-500/20 text-amber-300 hover:bg-amber-500/10"
                          : "border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/10"
                      }`}
                    >
                      {updatingRuleId === rule._id
                        ? "Saving..."
                        : rule.enabled
                          ? "Disable"
                          : "Enable"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void removeRule(rule._id)}
                      disabled={
                        deletingRuleId !== null || updatingRuleId !== null
                      }
                      aria-label={`Delete ${rule.name}`}
                      title="Delete alert rule"
                      className="rounded-lg border border-slate-700 p-2 text-rose-400 transition hover:border-rose-500/30 hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      {deletingRuleId === rule._id ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No alert rules configured.</p>
        )}
      </section>

      <section className={panelClass}>
        <div className="mb-5">
          <h2 className="font-bold text-white">Alert history</h2>
          <p className="mt-1 text-sm text-slate-400">
            Search and filter alerts returned by your monitoring service.
          </p>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative xl:col-span-2">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search device, message, address..."
              aria-label="Search alert history"
              className={`${inputClass} pl-9`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              changeStatus(event.target.value as FilterStatus)
            }
            aria-label="Filter by status"
            className={inputClass}
          >
            <option value="all">All statuses</option>
            <option value="Active">Active</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) => changeType(event.target.value as FilterType)}
            aria-label="Filter by alert type"
            className={inputClass}
          >
            <option value="all">All alert types</option>
            <option value="MonitorDown">Monitor down</option>
            <option value="HighLatency">High latency</option>
          </select>
        </div>

        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
            <RefreshCw size={17} className="animate-spin" />
            Loading alert history...
          </div>
        ) : visibleEvents.length > 0 ? (
          <>
            <div className="space-y-3">
              {visibleEvents.map((item) => (
                <article
                  key={item._id}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 transition hover:border-sky-500/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-lg p-2 ${
                          item.status === "Active"
                            ? "bg-rose-500/10 text-rose-300"
                            : "bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        {item.status === "Active" ? (
                          <XCircle size={19} />
                        ) : (
                          <CheckCircle2 size={19} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words font-semibold text-white">
                            {item.deviceName || "Unknown monitor"}
                          </h3>
                          <SeverityBadge severity={item.severity} />
                          <StatusBadge status={item.status} />
                        </div>

                        <p className="mt-2 break-words text-sm text-slate-300">
                          {item.message}
                        </p>

                        <p className="mt-1 break-all text-xs text-slate-500">
                          {item.address || item.deviceId || "No address"}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-md bg-slate-800/80 px-2 py-1 text-xs text-slate-300">
                      {getRuleTypeLabel(item.type)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-slate-800 pt-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-slate-500">First triggered</p>
                      <p className="mt-1 text-slate-300">
                        {formatDate(item.triggeredAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Last triggered</p>
                      <p className="mt-1 text-slate-300">
                        {formatDate(item.lastTriggeredAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Occurrences</p>
                      <p className="mt-1 text-slate-300">
                        {item.occurrences} qualifying checks
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Resolved at</p>
                      <p className="mt-1 text-slate-300">
                        {formatDate(item.resolvedAt)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <p className="text-xs text-slate-500">
                Page {page} of {totalPages} · {totalAlerts} matching alerts
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={17} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page >= totalPages || loading}
                  className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 px-4 py-12 text-center">
            <div className="rounded-full bg-slate-800 p-3 text-slate-400">
              <Bell size={22} />
            </div>
            <h3 className="mt-3 font-medium text-white">
              {search ? "No matching alerts" : "No alerts found"}
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-400">
              {search
                ? "Try another search term or change your filters."
                : "Alerts will appear here when your monitoring rules detect an issue."}
            </p>
            {(search || statusFilter !== "all" || typeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  changeStatus("all");
                  changeType("all");
                }}
                className="mt-4 rounded-lg border border-slate-700 px-3 py-2 text-sm text-sky-300 transition hover:border-sky-500/40 hover:bg-slate-800"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
