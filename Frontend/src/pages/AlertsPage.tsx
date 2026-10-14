
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Gauge,
  RefreshCw,
  Settings2,
  WifiOff,
} from "lucide-react";

import { useDevices } from "../hooks/useDevices";
import ErrorAlert from "../components/common/ErrorAlert";

export default function AlertsPage() {
  const dashboard = useDevices();
  const [threshold, setThreshold] = useState("500");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const latencyThreshold = Number(threshold);

  const alerts = useMemo(
    () =>
      dashboard.devices.flatMap((device) => {
        const items = [];

        if (device.status.toLowerCase() === "offline") {
          items.push({
            id: `${device.id}-offline`,
            title: `${device.name} is offline`,
            description:
              device.error || "The latest check indicates this monitor is offline.",
            severity: "critical" as const,
            time: device.checkedAt,
          });
        }

        if (
          Number.isFinite(latencyThreshold) &&
          latencyThreshold > 0 &&
          device.latency !== null &&
          device.latency >= latencyThreshold
        ) {
          items.push({
            id: `${device.id}-latency`,
            title: `High latency detected: ${device.name}`,
            description: `Latest recorded latency is ${device.latency} ms, meeting or exceeding your ${latencyThreshold} ms threshold.`,
            severity: "warning" as const,
            time: device.checkedAt,
          });
        }

        return items;
      }),
    [dashboard.devices, latencyThreshold],
  );

  const criticalCount = alerts.filter(
    (alert) => alert.severity === "critical",
  ).length;

  const warningCount = alerts.filter(
    (alert) => alert.severity === "warning",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Bell size={24} className="text-sky-400" />
            Alerts
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Review current monitor conditions and configure your alert threshold.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void dashboard.fetchDashboard(true)}
          disabled={dashboard.refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={dashboard.refreshing ? "animate-spin" : ""}
          />
          {dashboard.refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <ErrorAlert
        message={dashboard.error}
        onDismiss={() => dashboard.setError("")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Active conditions"
          value={alerts.length}
          icon={<Bell size={19} />}
          tone="sky"
        />
        <SummaryCard
          title="Offline alerts"
          value={criticalCount}
          icon={<WifiOff size={19} />}
          tone="rose"
        />
        <SummaryCard
          title="Latency warnings"
          value={warningCount}
          icon={<Gauge size={19} />}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
          <div className="border-b border-slate-800 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-white">Current alerts</h2>
            <p className="mt-1 text-xs text-slate-400">
              Conditions derived from the latest monitor data.
            </p>
          </div>

          {dashboard.loading ? (
            <div className="p-10 text-center text-sm text-slate-400">
              Loading alert conditions...
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-12 text-center">
              <CheckCircle2 size={34} className="mb-3 text-emerald-400" />
              <h3 className="font-semibold text-white">All clear</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                No offline monitors or latency threshold violations are detected in the current data.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {alerts.map((alert) => (
                <article key={alert.id} className="flex gap-3 p-4 sm:p-5">
                  <div
                    className={`mt-0.5 rounded-xl border p-2.5 ${
                      alert.severity === "critical"
                        ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {alert.severity === "critical" ? (
                      <WifiOff size={19} />
                    ) : (
                      <AlertTriangle size={19} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100">
                        {alert.title}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                          alert.severity === "critical"
                            ? "bg-rose-400/10 text-rose-300"
                            : "bg-amber-400/10 text-amber-300"
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {alert.description}
                    </p>
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock size={12} />
                      {formatDate(alert.time)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0a1423] p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2.5 text-sky-300">
              <Settings2 size={20} />
            </div>
            <div>
              <h2 className="font-bold text-white">Alert preferences</h2>
              <p className="mt-1 text-xs text-slate-400">
                Configure the conditions shown here.
              </p>
            </div>
          </div>

          <label className="block text-sm font-medium text-slate-200">
            High latency threshold
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="60000"
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
              />
              <span className="text-sm text-slate-400">ms</span>
            </div>
          </label>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Monitors at or above this latency will show a warning. This setting is not persisted to the backend.
          </p>

          <div className="my-5 border-t border-slate-800" />

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-200">
                Alert display
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Show current alert conditions in this page.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled}
              onClick={() => setNotificationsEnabled((enabled) => !enabled)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                notificationsEnabled ? "bg-sky-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                  notificationsEnabled ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          {!notificationsEnabled && (
            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">
              Alert display is disabled. Your monitors continue to be checked by the existing monitoring system.
            </p>
          )}

          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-xs leading-5 text-slate-400">
              <strong className="text-slate-200">Notification status:</strong>{" "}
              This page displays alert conditions only. Email, SMS, and push notification delivery require backend support.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Time unavailable";
}

function SummaryCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone: "sky" | "rose" | "amber";
}) {
  const tones = {
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  };

  return (
    <article className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0a1423] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        </div>
        <div className={`rounded-xl border p-2.5 ${tones[tone]}`}>{icon}</div>
      </div>
    </article>
  );
}
