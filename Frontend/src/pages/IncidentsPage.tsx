import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
import { axios, getIncidents } from "../services/api";

type Incident = {
  _id: string;
  deviceId: string;
  deviceName: string;
  address: string;
  startedAt: string | null;
  resolvedAt: string | null;
  lastCheckedAt: string | null;
  status: "Open" | "Resolved";
  error: string | null;
};

type IncidentFilter = "all" | "ongoing" | "resolved";

export default function IncidentsPage() {
  const dashboard = useDevices();

  const [filter, setFilter] = useState<IncidentFilter>("all");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);

  const mounted = useRef(false);

  const fetchIncidents = useCallback(async () => {
    setIncidentsLoading(true);

    try {
      const response = await getIncidents();

      if (mounted.current) {
        setIncidents(
          Array.isArray(response.data?.incidents)
            ? response.data.incidents
            : [],
        );
      }
    } catch (error: unknown) {
      if (mounted.current) {
        dashboard.setError(
          axios.isAxiosError(error)
            ? error.response?.data?.message || "Unable to load incidents."
            : "Unable to load incidents.",
        );
      }
    } finally {
      if (mounted.current) {
        setIncidentsLoading(false);
      }
    }
  }, [dashboard.setError]);

  useEffect(() => {
    mounted.current = true;
    void fetchIncidents();

    return () => {
      mounted.current = false;
    };
  }, [fetchIncidents]);

  const handleRefresh = () => {
    void dashboard.fetchDashboard(true);
    void fetchIncidents();
  };

  const ongoing = incidents.filter(
    (incident) => incident.status === "Open",
  );

  const resolved = incidents.filter(
    (incident) => incident.status === "Resolved",
  );

  const visibleIncidents = incidents.filter((incident) => {
    if (filter === "ongoing") return incident.status === "Open";
    if (filter === "resolved") return incident.status === "Resolved";
    return true;
  });

  const isLoading = dashboard.loading || incidentsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <ShieldAlert size={24} className="text-sky-400" />
            Incidents
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Review persisted monitor outages and recoveries.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={dashboard.refreshing || incidentsLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={
              dashboard.refreshing || incidentsLoading
                ? "animate-spin"
                : ""
            }
          />
          {dashboard.refreshing || incidentsLoading
            ? "Refreshing..."
            : "Refresh"}
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
          description="Recorded monitor outages"
          icon={<AlertTriangle size={20} />}
          tone="sky"
        />

        <SummaryCard
          title="Ongoing"
          value={ongoing.length}
          description="Incidents awaiting recovery"
          icon={<WifiOff size={20} />}
          tone="rose"
        />

        <SummaryCard
          title="Resolved"
          value={resolved.length}
          description="Incidents with recorded recovery"
          icon={<CheckCircle2 size={20} />}
          tone="emerald"
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-bold text-white">
              Incident history
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Incidents are opened and resolved by scheduled and manual checks.
            </p>
          </div>

          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as IncidentFilter)
            }
            aria-label="Filter incidents"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500"
          >
            <option value="all">All incidents</option>
            <option value="ongoing">Ongoing</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-slate-400">
            Loading incident history...
          </div>
        ) : visibleIncidents.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <CheckCircle2
              size={34}
              className="mb-3 text-emerald-400"
            />

            <h3 className="text-base font-semibold text-white">
              {filter === "ongoing"
                ? "No ongoing incidents"
                : filter === "resolved"
                  ? "No resolved incidents recorded"
                  : "No incidents found"}
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              {filter === "ongoing"
                ? "No incidents are currently marked as open."
                : filter === "resolved"
                  ? "Resolved incidents will appear here after monitors recover."
                  : "Offline and recovery events will appear here when incidents are recorded."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {visibleIncidents.map((incident) => (
              <article
                key={incident._id}
                className="flex flex-col gap-4 p-4 transition hover:bg-slate-800/30 sm:flex-row sm:items-start sm:justify-between sm:p-5"
              >
                <div className="flex min-w-0 gap-3">
                  <div
                    className={`mt-0.5 rounded-xl border p-2.5 ${
                      incident.status === "Open"
                        ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    {incident.status === "Open" ? (
                      <AlertTriangle size={19} />
                    ) : (
                      <CheckCircle2 size={19} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-100">
                        {incident.deviceName || "Unknown monitor"}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          incident.status === "Open"
                            ? "bg-rose-400/10 text-rose-300"
                            : "bg-emerald-400/10 text-emerald-300"
                        }`}
                      >
                        {incident.status === "Open"
                          ? "Ongoing"
                          : "Resolved"}
                      </span>
                    </div>

                    <p className="mt-1 break-all text-xs text-slate-500">
                      {incident.address || "Address unavailable"}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {incident.error ||
                        (incident.status === "Open"
                          ? "Monitor is offline."
                          : "Monitor recovered.")}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 space-y-2 text-xs text-slate-400 sm:min-w-52">
                  <p className="flex items-center gap-2">
                    <Clock3
                      size={14}
                      className="shrink-0 text-slate-500"
                    />
                    <span>
                      Started: {formatDate(incident.startedAt)}
                    </span>
                  </p>

                  <p className="flex items-center gap-2">
                    <CheckCircle2
                      size={14}
                      className="shrink-0 text-slate-500"
                    />
                    <span>
                      {incident.status === "Open"
                        ? "Awaiting recovery"
                        : `Recovered: ${formatDate(incident.resolvedAt)}`}
                    </span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-slate-500">
        Incident history remains available according to the backend's incident
        retention and monitor deletion behavior.
      </p>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "Not available";

  const date = new Date(value);

  return Number.isFinite(date.getTime())
    ? date.toLocaleString()
    : "Not available";
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
  icon: ReactNode;
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

        <div className={`rounded-xl border p-2.5 ${tones[tone]}`}>
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </article>
  );
}