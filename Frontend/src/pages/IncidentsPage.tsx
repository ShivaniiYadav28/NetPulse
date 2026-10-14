
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  WifiOff,
} from "lucide-react";

import { useDevices } from "../hooks/useDevices";

import ErrorAlert from "../components/common/ErrorAlert";

type Incident = {
  id: string;
  deviceId: string;
  deviceName: string;
  address: string;
  startedAt: string | null;
  resolvedAt: string | null;
  current: boolean;
  message: string;
};

type IncidentFilter = "all" | "ongoing" | "resolved";

export default function IncidentsPage() {
  const dashboard = useDevices();
  const [filter, setFilter] = useState<IncidentFilter>("all");

  const incidents = useMemo(() => {
    const result: Incident[] = [];

    for (const device of dashboard.devices) {
      const deviceHistory = dashboard.history
        .filter((point) => point.deviceId === device.id && point.checkedAt)
        .filter((point) => point.status === "Online" || point.status === "Offline")
        .sort(
          (a, b) =>
            new Date(a.checkedAt!).getTime() - new Date(b.checkedAt!).getTime(),
        );

      let previousStatus: string | null = null;
      let openIncident: Incident | null = null;

      for (const point of deviceHistory) {
        if (point.status === "Offline" && previousStatus !== "Offline") {
          openIncident = {
            id: `${device.id}-${point.checkedAt}`,
            deviceId: device.id,
            deviceName: device.name,
            address: device.address,
            startedAt: point.checkedAt,
            resolvedAt: null,
            current: true,
            message: point.error || "The monitor was recorded as offline.",
          };

          result.push(openIncident);
        } else if (point.status === "Online" && openIncident) {
          openIncident.resolvedAt = point.checkedAt;
          openIncident.current = false;
          openIncident = null;
        }

        previousStatus = point.status;
      }

      const latestPoint = deviceHistory[deviceHistory.length - 1];
      const currentlyOffline = device.status.toLowerCase() === "offline";
      const hasOpenIncident = Boolean(openIncident);

      if (currentlyOffline && !hasOpenIncident) {
        result.push({
          id: `${device.id}-current`,
          deviceId: device.id,
          deviceName: device.name,
          address: device.address,
          startedAt:
            latestPoint?.status === "Offline" ? latestPoint.checkedAt : device.checkedAt,
          resolvedAt: null,
          current: true,
          message:
            device.error ||
            "This monitor is currently offline. The exact outage start may not be available.",
        });
      }
    }

    return result.sort((a, b) => {
      if (a.current !== b.current) return a.current ? -1 : 1;

      const timeA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const timeB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [dashboard.devices, dashboard.history]);

  const ongoing = incidents.filter((incident) => incident.current);
  const resolved = incidents.filter((incident) => !incident.current);

  const visibleIncidents = incidents.filter((incident) => {
    if (filter === "ongoing") return incident.current;
    if (filter === "resolved") return !incident.current;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <ShieldAlert size={24} className="text-sky-400" />
            Incidents
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Review monitor outages and recoveries based on recorded status changes.
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
          title="Total incidents"
          value={incidents.length}
          description="Derived from recorded status transitions"
          icon={<AlertTriangle size={20} />}
          tone="sky"
        />
        <SummaryCard
          title="Ongoing"
          value={ongoing.length}
          description="Monitors currently marked offline"
          icon={<WifiOff size={20} />}
          tone="rose"
        />
        <SummaryCard
          title="Resolved"
          value={resolved.length}
          description="Recorded offline-to-online recoveries"
          icon={<CheckCircle2 size={20} />}
          tone="emerald"
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-bold text-white">Incident history</h2>
            <p className="mt-1 text-xs text-slate-400">
              Status events inferred from the monitoring history available to NetPulse.
            </p>
          </div>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as IncidentFilter)}
            aria-label="Filter incidents"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500"
          >
            <option value="all">All incidents</option>
            <option value="ongoing">Ongoing</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {dashboard.loading ? (
          <div className="p-10 text-center text-sm text-slate-400">
            Loading monitoring history...
          </div>
        ) : visibleIncidents.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <CheckCircle2 size={34} className="mb-3 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">
              {filter === "ongoing"
                ? "No ongoing incidents"
                : filter === "resolved"
                  ? "No resolved incidents recorded"
                  : "No incidents found"}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              {filter === "ongoing"
                ? "No monitors are currently marked offline."
                : "Offline and recovery events will appear here when status history is available."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {visibleIncidents.map((incident) => (
              <article
                key={incident.id}
                className="flex flex-col gap-4 p-4 transition hover:bg-slate-800/30 sm:flex-row sm:items-start sm:justify-between sm:p-5"
              >
                <div className="flex min-w-0 gap-3">
                  <div
                    className={`mt-0.5 rounded-xl border p-2.5 ${
                      incident.current
                        ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    {incident.current ? (
                      <AlertTriangle size={19} />
                    ) : (
                      <CheckCircle2 size={19} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-100">
                        {incident.deviceName}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          incident.current
                            ? "bg-rose-400/10 text-rose-300"
                            : "bg-emerald-400/10 text-emerald-300"
                        }`}
                      >
                        {incident.current ? "Ongoing" : "Resolved"}
                      </span>
                    </div>

                    <p className="mt-1 break-all text-xs text-slate-500">
                      {incident.address}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {incident.message}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 space-y-2 text-xs text-slate-400 sm:min-w-52">
                  <p className="flex items-center gap-2">
                    <Clock3 size={14} className="text-slate-500" />
                    Started: {formatDate(incident.startedAt)}
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-slate-500" />
                    {incident.current
                      ? "Awaiting recovery"
                      : `Recovered: ${formatDate(incident.resolvedAt)}`}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-slate-500">
        Incident records on this page are calculated from available monitor history and current status. They are not saved as separate incident records, and missing history can limit outage start times.
      </p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Not available";
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  tone: "sky" | "rose" | "emerald";
}) {
  const tones = {
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
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
      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}
